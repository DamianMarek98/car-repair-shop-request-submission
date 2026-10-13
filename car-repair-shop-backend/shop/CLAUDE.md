# shop — core backend monolith

Spring Boot 3.3.1 / Java 21 / Maven. DDD **modular monolith** (spring-modulith) that
powers the admin portal API and (legacy path) request submission. Persists to DynamoDB.
Deployed as an AWS Lambda behind API Gateway via `StreamLambdaHandler`
(`aws-serverless-java-container` bridge). See root `CLAUDE.md` for the platform picture.

## Build / test / run

No Maven wrapper — use system `mvn` (repo verified with Maven 3.9.x, Java 21).

```bash
mvn test       # unit + integration tests; integration tests REQUIRE Docker
               # (Testcontainers spins up localstack/localstack:3.2 for DynamoDB)
mvn package    # runs tests, then maven-shade-plugin -> target/lambda-shaded.jar (Lambda artifact)
```

Local run: start the local environment first (`npm run local:up` from the repo root —
LocalStack + mail sink, see `local-env/README.md`), then `npm run local:shop` (wraps
`spring-boot-maven-plugin:3.3.1:run` by full coordinates, since the pom doesn't declare it) or
`ShopApplication` from the IDE with `SPRING_PROFILES_ACTIVE=local`. The `local` profile
(`src/main/resources/application-local.properties`) points DynamoDB at LocalStack `:4566` and
SES at the mail sink `:8025` (`ses-endpoint`), so **local runs never send real e-mail**.
Tables are created by `local-env/init/ready.d/10-resources.sh`; the old
`src/main/resources/dynamodb/*.txt` CLI notes are superseded. A Postman collection lives in
`src/main/resources/postman/`.

If a test fails with "Unresolved compilation problem", an IDE language server compiled
`target/` without Lombok — run `mvn clean test`.

## Configuration (names only — never commit real values)

Spring properties under prefix `car.repair.shop.aws` (see `AwsConfigurationProperties`,
`SecurityConfig`, `JwtHelper`): `access-key`, `secret-access-key`, `region`, `endpoint`
(optional, set for local/localstack), `username`, `password` (portal login), `jwt-secret-key`.

## Architecture

Packages under `car.repair.shop` are modulith modules — **cross-module access only through
facades/events, never internals** (e.g. `availability.UnavailableDayFacade`):

- `auth/` — JWT login (`POST /api/internal/login`), `JwtAuthFilter`, `JwtHelper`.
- `availability/` — unavailable appointment days; `UnavailableDayFacade` is the public API;
  REST at `/api/internal/unavailable-day`.
- `repair/request/` — the domain core. Command handlers (`SubmitNewRepairRequestHandler`,
  `SetAppointmentCommandHandler`, `MarkAsAppointmentMadeCommandHandler`), query handlers,
  State pattern for status transitions (`RepairRequestState` + `NewRepairRequest` /
  `HandledRepairRequest` / `AppointmentMadeRepairRequest`, built by `RepairRequestStateFactory`),
  Spring events in `events/`. REST: public `POST /api/repair-request/submit`,
  admin `/api/internal/repair-request/**` (search, get, appointment, mark-as-appointment-made).
  `POST {id}/appointment {appointmentAt}` replaced `mark-as-handled`: the visit time is
  required, validated by `AppointmentTimePolicy` (future, working day, not an unavailable day,
  08:00–16:00 **Europe/Warsaw**), and triggers the "Termin wizyty" e-mail.
- **Public status API** (`/api/public/repair-request/status/{token}`, no auth,
  `RepairRequestPublicController` → `RepairRequestPublicStatusQueryHandler`): the customer's
  status page. Looks the request up by `tracking_token` on GSI `TrackingTokenIndex`, returns
  the allowlisted `PublicRepairRequestStatusDto` with VIN/phone/e-mail masked
  (`PersonalDataMask`), `Cache-Control: no-store`. Unknown, malformed and expired tokens (90
  days after completion) all return the identical `404 {"message":"Not found"}`. The token is
  a secret — never log or return it. See `submission-portal/STATUS-PAGE-PLAN.md`.
- **Timestamps are UTC** `LocalDateTime` without offset (`appointment_at`, `completed_at`,
  `handled_at`, `submittedAt`, …). Only e-mails format them, in `Europe/Warsaw`.
- `notification/` — customer-facing e-mails sent from the monolith. `NotificationFacade` is
  the **only** public type; `ReviewRequestEmailSender`, `AppointmentEmailSender` (SESv2, Polish copy) and `SesConfig`
  (`SesV2Client` bean, `eu-north-1`, `url-connection-client`) are package-private. The facade
  never throws — a SES outage must not fail the action that triggered the e-mail.
- `commons/` — shared `DomainEvent`, `PhoneNumberPattern`, DynamoDB type converters
  (`commons/dynamodb/converter/`). Module-specific converters live next to their module
  (e.g. `repair/request/PreferredVisitWindowConverter`).
- `config/` — security (CORS + JWT), Jackson, DynamoDB client, `GlobalExceptionHandler`.

DynamoDB tables: `repair_request` (hash key `id`; GSI `SubmittedAtIndex` on constant
`dummyPartitionKey="DUMMY"` + range `submittedAt` — this is how listing sorted by submission
date works, keep it; GSI `TrackingTokenIndex` on `tracking_token`, projection ALL — the
status-page lookup, sparse because older rows have no token) and `unavailable_day`.

## Kept-in-sync duplication (critical)

`repair-request-submitted-consumer/` (sibling Lambda) duplicates from this module:
`SubmitRepairRequestDto` (+ validation annotations), `PhoneNumberPattern`, and the business
rules in `RepairRequest.from()` (rodo must be accepted; vin OR plateNumber required).
It also duplicates the DynamoDB attribute names via its `RepairRequestItemConverter`
(`plate_number`, `submitter_first_name`, `status_value="NEW"`, `submittedAt`, …) which must
match the `@DynamoDBAttribute` names on `RepairRequest` here. **Any change to submission
validation, the DTO shape, or attribute names must be applied to both modules.**

**Deliberate asymmetry:** `review_email_consent` is written by both submit paths, but
`review_email_sent_at` is written **only here**, when the post-visit review e-mail is sent at
close time. See `spec/04-post-visit-review-email-spec.md`.

`new-repair-request-confirmation-email-lambda/` duplicates the **SES sending configuration**:
`SES_FROM`, `SES_REPLY_TO` and `SHOP_PHONE_NUMBER` are hardcoded constants both there and in
`notification/ReviewRequestEmailSender` here, and the AWS SDK v2 version (`aws-sdk-v2.version`
in `pom.xml` ⟷ `awsSdkVersion` in that module's `build.gradle.kts`). Change the shop's phone
number or sender address in **both**, or the two customer e-mails will disagree.

## Conventions & pitfalls

- Java 21, Lombok, records for DTOs; tests use JUnit 5 + AssertJ; integration tests extend
  `RepairRequestIntegrationTest` (LocalStack base class).
- `mvn test` without Docker running fails on the integration tests — that is environmental,
  not your change.
- Status transitions go through the state classes; don't set `RepairRequestStatus` directly.
- Status semantics (owner-confirmed 2026-07): `NEW` = submitted; `HANDLED` = client contacted
  & appointment booked (portal label "Umówiono"); `APPOINTMENT_MADE` = visit finished, car
  fixed (label "Zakończono"). The enum name is historical and misleading — do NOT "fix" the
  label mapping, and hang completion-triggered behavior (e.g. review requests) on
  `APPOINTMENT_MADE`.
- Prod submissions flow through the consumer Lambda, not this app's `/api/repair-request/submit`
  — both paths must stay behaviorally identical.
- Don't fold the sibling Lambdas' logic back into this monolith (cold-start isolation is
  deliberate) and don't add module-internal imports across module boundaries.
- `target/` and `dependency-reduced-pom.xml` are build artifacts — never edit.

## AWS deployment target (owner-confirmed 2026-08-02)

| Thing | Value |
|---|---|
| Lambda (entry point `StreamLambdaHandler`) | `arn:aws:lambda:eu-north-1:009160054371:function:CarRepairShopBeTest` |
| Execution role | `arn:aws:iam::009160054371:role/service-role/CarRepairShopBe` |
| Region | `eu-north-1` |
| Artifact | `target/lambda-shaded.jar` (from `mvn package`) |

The execution role carries an inline policy **`SesSendReviewEmail`** (added 2026-08-02)
granting `ses:SendEmail` on `arn:aws:ses:eu-north-1:009160054371:identity/renocar-zgloszenie.pl`.
Without it the post-visit review e-mail fails **silently** — `NotificationFacade` swallows the
`AccessDeniedException` and the close still succeeds, but `APPOINTMENT_MADE` is terminal so that
request can never be re-closed to retry. See `spec/04-post-visit-review-email-spec.md` §8 / C4.

⚠️ The function name ends in `Test` but is the live target. Don't "correct" it, and don't assume
a separate production function exists without checking.

Deployment mechanism: **console upload** — Lambda → function → Code → *Upload from → .zip or
.jar file* → `target/lambda-shaded.jar`.

## ⚠️ Production config is NOT in this repo — read before building for deploy

`src/main/resources/application.properties` **does not exist here and must not be committed**
(it is in `.gitignore`). The production copy lives **only in the owner's private Obsidian note**.

This means **`mvn package` on a clean checkout produces a jar that cannot start in Lambda.** It
fails at context refresh with:

```
IllegalArgumentException: Could not resolve placeholder 'car.repair.shop.aws.username'
```

…which surfaces as `Runtime.BadFunctionCode` and a **502 on every request, including login** —
there is no partial degradation. This happened on the 2026-08-02 deploy; see
`spec/04-post-visit-review-email-spec.md` §8.2.

**To build a deployable jar:** paste the prod `application.properties` from the Obsidian note
into `src/main/resources/` first, build, then delete it again.

Keys it must define (all consumed at startup):

| Property | Used by | Notes |
|---|---|---|
| `car.repair.shop.aws.region` | `DynamoDBConfig` | **must be `eu-north-1`** — tables live there; a wrong region starts fine then fails every query |
| `car.repair.shop.aws.username` / `.password` | `SecurityConfig:32,35` | admin portal login |
| `car.repair.shop.aws.jwt-secret-key` | `JwtHelper:25` | changing it logs all sessions out once |
| `car.repair.shop.aws.access-key` / `.secret-access-key` | `AwsConfigurationProperties` | `@NotBlank` only — the prod `amazonDynamoDB` bean (`@Profile("!local && !test")`) ignores them and uses the execution role. Any non-blank placeholder works |
| `car.repair.shop.aws.endpoint` | `DynamoDBConfig`, `SesConfig` | **leave unset in prod** — blank means real AWS; a value is LocalStack-only (and also redirects SES) |
| `car.repair.shop.aws.ses-endpoint` | `SesConfig` | **leave unset in prod** — local only, the mail sink; falls back to `endpoint` |
| `car.repair.shop.status-page-base-url` | `AppointmentEmailSender` | **leave unset in prod** — defaults to `https://renocar-zgloszenie.pl`; local profile sets `http://localhost:4200` so e-mailed status links open the local page |

`application-local.properties` (committed) is the **`local` profile** file and holds fake
values — LocalStack `localhost:4566`, mail sink `localhost:8025`, `renocar`/`12345`. **Never ship it as
`application.properties`:** its endpoints point every DynamoDB and SES call at localhost, and it
would publish working admin credentials plus the JWT signing key.

Verify before uploading: `unzip -p target/lambda-shaded.jar application.properties` — if that
prints nothing, the deploy will 502.
