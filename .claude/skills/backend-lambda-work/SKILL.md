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
  `ShopApplication` (local, profile `local`, DynamoDB Local on :8081 — table DDL in
  `src/main/resources/dynamodb/*.txt`).
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
The Lambdas read no custom env vars (execution-role credentials); the notification topic ARN
is hardcoded in the notifier.
