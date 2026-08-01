# repair-request-submitted-consumer — submission Lambda

Plain Java 21 / Maven AWS Lambda (no Spring) that handles the **public repair-request
submission**: API Gateway proxy event → Jakarta Bean Validation + business rules →
`PutItem` into DynamoDB table `repair_request`. Split out of `shop/` to minimize cold-start
time for the one endpoint end users hit. Despite the artifact name, there is **no SQS** —
API Gateway invokes it directly (see the class javadoc).

## Build / test

No Maven wrapper — use system `mvn`.

```bash
mvn test      # JUnit 5 + Mockito + AssertJ, no Docker/AWS needed
mvn package   # maven-shade-plugin -> shaded target/repair-request-submitted-consumer-1.0-SNAPSHOT.jar
```

There is no local runtime; test via unit tests. Sample request payloads for manual Lambda
test events: `src/main/resources/sample-asap.json`, `sample-with-time-windows.json`.

## Key files (all in `car.repair.shop`)

- `RepairRequestSubmittedHandler` — the Lambda handler
  (`RequestHandler<Map<String,Object>, APIGatewayProxyResponseEvent>`). Parses `body`,
  validates, writes to DynamoDB (`DynamoDbClient` SDK v2). Table name `repair_request` is
  hardcoded. CORS response headers are hardcoded to `https://renocar-zgloszenie.pl`.
- `SubmitRepairRequestDto` — request record with validation annotations.
- `RepairRequestItemConverter` — DTO → DynamoDB attribute map.
- `PhoneNumberPattern` — shared phone regex (duplicated from shop).

## Kept-in-sync duplication (critical)

This module intentionally duplicates code from `../shop/` — **keep both sides identical when
touching any of it**:

- `SubmitRepairRequestDto` ⟷ `shop/.../repair/request/controller/dto/SubmitRepairRequestDto.java`
- `PhoneNumberPattern` ⟷ `shop/.../commons/patterns/PhoneNumberPattern.java`
- Business rules in `validateInput()` (rodo accepted; vin OR plateNumber present) ⟷
  `shop/.../repair/request/RepairRequest.from()`
- Attribute names written by `RepairRequestItemConverter` (`plate_number`,
  `submitter_first_name`, `submitter_last_name`, `preferred_visit_windows`, `status_value`,
  `submittedAt`, `dummyPartitionKey="DUMMY"`, `review_email_consent`, …) ⟷
  `@DynamoDBAttribute` names on shop's `RepairRequest` entity, and ⟷ what
  `new-repair-request-notification-lambda` reads from the DynamoDB stream
  (`submitter_first_name`, `submitter_last_name`).

**Deliberate asymmetry:** `review_email_consent` is written by *both* submit paths, but
`review_email_sent_at` is written by the **shop monolith only** (set when the post-visit review
e-mail actually goes out at close time). Do not add it here. See `spec/04-post-visit-review-email-spec.md`.

`FAIL_ON_UNKNOWN_PROPERTIES` is **disabled** in `RepairRequestSubmittedHandler` on purpose: the
submission portal deploys independently, so a portal shipping a new field ahead of this Lambda
must be ignored rather than 500 every submission. Do not re-enable it.

Known drift (verify before relying on `@NotNull` here): this module's DTO imports
`software.amazon.awssdk.annotations.NotNull`, which is **not** a Bean Validation annotation —
it is not enforced by the validator, unlike shop's `jakarta.validation.constraints.NotNull`.
If you touch validation, prefer fixing this to jakarta and mirroring shop exactly.

## Conventions & pitfalls

- Keep this Lambda dependency-light — no Spring, no shop imports; cold start is the whole
  reason it exists. Do not fold it back into `shop/`.
- SDK v2 (`software.amazon.awssdk`) here vs SDK v1 in shop — don't "unify" them casually.
- `ObjectMapper` needs `JavaTimeModule` (time slots use `LocalDate`/`LocalTime`).
- `target/` and `dependency-reduced-pom.xml` are build artifacts — never edit.
- Env/credentials: standard Lambda execution role provides AWS credentials/region; no custom
  env vars are read by this code.
- TODO(owner): document deployment (function name, how API Gateway request-schema validation
  is configured — the javadoc says API Gateway verifies the schema, but that config is not in
  this repo).
