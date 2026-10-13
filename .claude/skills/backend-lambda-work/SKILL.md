---
name: backend-lambda-work
description: Use when changing backend Java code under car-repair-shop-backend/ (shop monolith, submission consumer Lambda, or notification Lambda) — enforces the cross-module sync rules for validation/DTOs/DynamoDB attribute names and the packaging steps for each Lambda artifact.
---

# Working on the backend (shop + Lambdas)

Three deliberately separate projects. Never merge Lambda logic into `shop/` and never make
the Lambdas depend on shop classes — cold-start isolation is the point.

## The sync contract (check this FIRST on any submission/domain change)

The repair-request submission path is duplicated between the monolith and the consumer
Lambda. When you touch any of the following in one place, apply the same change in the other
and say so in your summary:

| Concern | shop/ | repair-request-submitted-consumer/ |
|---|---|---|
| Submit DTO + validation annotations | `repair/request/controller/dto/SubmitRepairRequestDto.java` | `car/repair/shop/SubmitRepairRequestDto.java` |
| Phone regex | `commons/patterns/PhoneNumberPattern.java` | `car/repair/shop/PhoneNumberPattern.java` |
| Business rules (rodo accepted; vin OR plateNumber) | `RepairRequest.from()` | `RepairRequestSubmittedHandler.validateInput()` |
| DynamoDB attribute names | `@DynamoDBAttribute` on `RepairRequest` | `RepairRequestItemConverter.toItem()` |
| `tracking_token` (status-link secret: 32 bytes `SecureRandom`, base64url, no padding) | `TrackingToken.generate()`, called in `RepairRequest.from()` | `RepairRequestItemConverter.generateTrackingToken()` |

Attributes written **only** by shop (no consumer change needed): `appointment_at`,
`completed_at`, `handled_at`, `review_email_sent_at`.

`tracking_token` is also the hash key of GSI **`TrackingTokenIndex`** (projection ALL) and is
read from the stream NEW_IMAGE by the confirmation-email Lambda to build the status link.
It is a **secret**: never log it, never return it from any API. A new GSI or attribute must be
added in three places: the `RepairRequest` annotations, `RepairRequestIntegrationTest.init()`
(test table) and `local-env/init/ready.d/10-resources.sh` — plus the AWS console for production.

**Public (unauthenticated) API** lives in shop under `/api/public/**`
(`RepairRequestPublicController`): the customer's status page. It returns
`PublicRepairRequestStatusDto` — an allowlist with VIN/phone/e-mail masked by
`PersonalDataMask`. Adding a field there publishes it; extend the leak test in
`PublicRepairRequestStatusIntegrationTest`. Unknown/malformed/expired tokens must stay
byte-identical 404s. A new public path needs `permitAll` in `SecurityConfig` **and** a skip
in `JwtAuthFilter.shouldNotFilter`.

**Time convention (all modules):** every `*_at` timestamp (and `submittedAt`) is stored as a
**UTC** `LocalDateTime` without offset (`2026-09-23T07:00:00`). Frontends append `Z` and
format in the browser time zone; only e-mails format on the server, in `Europe/Warsaw`.
Business rules on shop-local days/hours (weekend, `unavailable_day`, 08:00–16:00 in
`AppointmentTimePolicy`) must convert to `Europe/Warsaw` first. Visit windows
(`preferred_visit_windows`) are local wall-clock `{date, from, to}`, **not** UTC.

Third consumer of the same contract: `new-repair-request-notification-lambda` reads
`submitter_first_name` / `submitter_last_name` from the DynamoDB stream NewImage — renaming
attributes breaks it silently. The Angular `submission-portal` form validators mirror the
same rules (vin=17, plate 6–8, description ≤500, vin-or-plate) — flag frontend impact.

Known pre-existing drift: the consumer DTO's `@NotNull` is
`software.amazon.awssdk.annotations.NotNull` (not enforced by Bean Validation); shop uses
`jakarta.validation.constraints.NotNull` (enforced). Don't copy that mistake into new fields.

## Build / package per project

- `shop/`: `mvn test` (integration tests need Docker/LocalStack), `mvn package` →
  `target/lambda-shaded.jar` (shade finalName). Entry points: `StreamLambdaHandler` (Lambda),
  `ShopApplication` (local, profile `local`, against `local-env/` — LocalStack :4566 +
  SES v2 mail sink :8025; `npm run local:shop`).
- **End-to-end locally:** `npm run local:up` builds all three Lambdas and deploys them into
  LocalStack with the DynamoDB stream wired, exactly as in production. After changing Lambda code:
  `npm run local:lambdas`. See `local-env/README.md` (ports, inspection commands, gotchas).
- `repair-request-submitted-consumer/`: `mvn test && mvn package` → shaded
  `target/repair-request-submitted-consumer-1.0-SNAPSHOT.jar`. Handler:
  `car.repair.shop.RepairRequestSubmittedHandler`. Sample Lambda test events in
  `src/main/resources/sample-*.json`.
- `new-repair-request-notification-lambda/`: `./gradlew build`, fat jar `./gradlew shadowJar`
  → `build/libs/*-all.jar`. Handler:
  `car.repair.shop.notification.NewRepairRequestSubmittedSnsNotifier`.

No Maven wrappers exist; use system `mvn` + JDK 21. The Gradle module has its wrapper.

## Conventions in shop/

- Spring-modulith boundaries: cross-module calls only via facades (`UnavailableDayFacade`)
  or Spring events — never another module's internals.
- Status changes go through the State pattern (`RepairRequestStateFactory` →
  `NewRepairRequest`/`HandledRepairRequest`/`AppointmentMadeRepairRequest`), not direct
  status field writes.
- DynamoDB type converters: shared ones in `commons/dynamodb/converter/`, module-specific
  ones next to the entity (`PreferredVisitWindowConverter`). Keep the `dummyPartitionKey="DUMMY"`
  + `SubmittedAtIndex` GSI pattern — it is what makes date-sorted listing work.
- SDK versions differ on purpose: shop uses AWS SDK v1 (`com.amazonaws`) via
  spring-data-dynamodb; the Lambdas use SDK v2 (`software.amazon.awssdk`). Don't unify.

## Config names (values never in code/docs)

Shop Spring properties: `car.repair.shop.aws.{access-key,secret-access-key,region,endpoint,username,password,jwt-secret-key}`.
The Lambdas read no custom env vars in AWS (execution-role credentials) — the confirmation
Lambda's optional `STATUS_PAGE_BASE_URL` exists only for `local-env`; the notification topic ARN
is hardcoded in the notifier.
