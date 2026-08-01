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

Local run: start `ShopApplication` with `SPRING_PROFILES_ACTIVE=local` (IDE run config is
simplest; `spring-boot-maven-plugin` is not declared in `<build>`, so `mvn spring-boot:run`
prefix resolution may fail). The `local` profile (`src/main/resources/application-local.properties`)
expects DynamoDB Local on `http://localhost:8081`; table-creation CLI commands are in
`src/main/resources/dynamodb/*.txt`. A Postman collection lives in `src/main/resources/postman/`.

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
  `MarkAsHandledCommandHandler`, `MarkAsAppointmentMadeCommandHandler`), query handlers,
  State pattern for status transitions (`RepairRequestState` + `NewRepairRequest` /
  `HandledRepairRequest` / `AppointmentMadeRepairRequest`, built by `RepairRequestStateFactory`),
  Spring events in `events/`. REST: public `POST /api/repair-request/submit`,
  admin `/api/internal/repair-request/**` (search, get, mark-as-handled, mark-as-appointment-made).
- `commons/` — shared `DomainEvent`, `PhoneNumberPattern`, DynamoDB type converters
  (`commons/dynamodb/converter/`). Module-specific converters live next to their module
  (e.g. `repair/request/PreferredVisitWindowConverter`).
- `config/` — security (CORS + JWT), Jackson, DynamoDB client, `GlobalExceptionHandler`.

DynamoDB tables: `repair_request` (hash key `id`; GSI `SubmittedAtIndex` on constant
`dummyPartitionKey="DUMMY"` + range `submittedAt` — this is how listing sorted by submission
date works, keep it) and `unavailable_day`.

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
- TODO(owner): document the actual Lambda deployment procedure (how `lambda-shaded.jar` is
  uploaded / which function name) — not derivable from this repo.
