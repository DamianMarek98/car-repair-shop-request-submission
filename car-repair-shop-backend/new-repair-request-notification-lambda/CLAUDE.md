# new-repair-request-notification-lambda — SNS notifier

Plain Java AWS Lambda, built with **Gradle (Kotlin DSL) + Shadow plugin** (the only Gradle
module in the repo; the other backend modules are Maven). Triggered by the DynamoDB **stream**
of the `repair_request` table; on `INSERT` records it publishes a Polish notification message
("Nowe zgłoszenie od …") to an SNS topic that emails the shop.

## Build / test

```bash
./gradlew test        # JUnit 5 + Mockito, no AWS/Docker needed
./gradlew build       # compiles + tests
./gradlew shadowJar   # fat jar -> build/libs/new-repair-request-notification-lambda-1.0-SNAPSHOT-all.jar
```

No local runtime; the unit test (`NewRepairRequestSubmittedSnsNotifierTest`) shows how to
construct `DynamodbEvent` fixtures with a mocked `SnsClient`.

## Key file

`src/main/java/car/repair/shop/notification/NewRepairRequestSubmittedSnsNotifier.java` —
handler (`RequestHandler<DynamodbEvent, String>`):

- Processes only records with `eventName == "INSERT"`; other stream events are ignored.
- Reads `submitter_first_name` / `submitter_last_name` from the record's **NewImage** —
  these attribute names must match what `repair-request-submitted-consumer`'s
  `RepairRequestItemConverter` and shop's `RepairRequest` entity write. If those attribute
  names ever change, change them here too.
- `TOPIC_ARN` is **hardcoded** (`arn:aws:sns:eu-north-1:009160054371:NewRepairRequestSubmittedTopic`).
  If you make it configurable, use an env var name like `SNS_TOPIC_ARN` and update the test.
- Per-record errors are caught and logged so one bad record doesn't fail the batch.
- **Test-submission suppression (2026-07-31):** if `submitter_first_name` is exactly `"test"`
  (case-insensitive, trimmed — not a substring match, so "Tester"/"Testosteron" still
  notify), the SNS publish to the shop is skipped. This lets staff/devs exercise the live
  form end-to-end without spamming the shop's real inbox. Deliberately **asymmetric** with
  the sibling `new-repair-request-confirmation-email-lambda`, which has no such filter and
  emails test submissions too (so the SES path can still be verified during testing).

## Conventions & pitfalls

- Keep it minimal: only `aws-lambda-java-core`, `aws-lambda-java-events`, and the SNS SDK v2
  client. No Spring, no shared code with the monolith. Cold-start isolation is deliberate —
  do not fold this into `shop/`.
- No Java toolchain is pinned in `build.gradle.kts` — it builds with whatever JDK runs Gradle;
  the rest of the backend targets Java 21, so use that.
- Message text is user-facing Polish; keep it Polish and keep the portal URL
  (`https://portal.renocar-zgloszenie.pl/`) correct.
- The AWS credentials/region come from the Lambda execution role; no custom env vars are read.
- TODO(owner): document deployment (function name, DynamoDB stream event-source mapping,
  SNS topic subscription) — not derivable from this repo.
