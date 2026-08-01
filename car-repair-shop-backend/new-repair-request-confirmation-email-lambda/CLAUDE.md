# new-repair-request-confirmation-email-lambda — customer confirmation email

Plain Java AWS Lambda, **Gradle (Kotlin DSL) + Shadow plugin** — mirrors the sibling
`new-repair-request-notification-lambda` in build tooling and style, but sends the
*customer* their own confirmation email via **Amazon SES**, independently of that sibling's
SNS notification to the shop. Full design rationale in `SPEC.md` in this directory.

Triggered by the same DynamoDB **stream** of the `repair_request` table, via its own
independent event-source mapping filtered to `INSERT`. Not implemented as an extension of
the sibling lambda — see `SPEC.md` §1 for why (SNS can't target a dynamic per-record
recipient; this needs a direct SES call).

## Build / test

```bash
./gradlew test        # JUnit 5 + Mockito, no AWS/Docker needed
./gradlew build       # compiles + tests
./gradlew shadowJar   # fat jar -> build/libs/new-repair-request-confirmation-email-lambda-1.0-SNAPSHOT-all.jar
```

No local runtime; `NewRepairRequestSubmittedEmailNotifierTest` shows how to construct
`DynamodbEvent` fixtures with a mocked `SesV2Client`.

## Key file

`src/main/java/car/repair/shop/confirmation/NewRepairRequestSubmittedEmailNotifier.java` —
handler (`RequestHandler<DynamodbEvent, String>`):

- Processes only records with `eventName == "INSERT"`; other stream events are ignored.
- Reads `email`, `submitter_first_name`, `id` from the record's **NewImage** — these
  attribute names must match what `repair-request-submitted-consumer`'s
  `RepairRequestItemConverter` and shop's `RepairRequest` entity write.
- Blank/missing `email` is a silent no-op, not an error (see `SPEC.md` §3.2 / open question
  Q5 if you want to change that).
- Config (region, `SES_FROM`, `SES_REPLY_TO`, `SHOP_PHONE_NUMBER`) is **hardcoded as
  constants** at the top of the class, not env vars — deliberate choice, mirrors the
  sibling's hardcoded `TOPIC_ARN`. To change any of them: edit the constant, rebuild,
  redeploy the jar. The no-arg constructor delegates to the 4-arg one with these constants;
  the 4-arg constructor still takes explicit values for testing.
- Per-record errors are caught and logged so one bad record doesn't fail the batch — and,
  because this is a wholly separate Lambda from the sibling SNS notifier, an SES outage here
  structurally cannot affect that one's delivery either.
- Uses **SESv2** (`software.amazon.awssdk:sesv2`), not the classic `ses` SDK module.

## Conventions & pitfalls

- Keep it minimal: only `aws-lambda-java-core`, `aws-lambda-java-events`, and the SESv2 SDK
  client. No Spring, no shared code with the monolith or the sibling notifier. Cold-start /
  failure isolation is deliberate — do not fold this into `shop/` or into the SNS notifier.
- No Java toolchain is pinned in `build.gradle.kts` — builds with whatever JDK runs Gradle;
  the rest of the backend targets Java 21, use that.
- Test class sits in the **default package** under `src/test/java/`, matching the sibling's
  convention — not a mistake, keep it consistent.
- Tests use raw `assert` statements (mirroring the sibling), not AssertJ — no AssertJ
  dependency is declared. Gradle's `test` task enables JVM assertions by default, so these do
  run under `./gradlew test`; be aware they'd silently no-op under a runner that doesn't
  enable `-ea`.
- Email body is Polish, UTF-8 explicit on both subject and body — verify diacritics if you
  touch the copy.
- No status-link placeholder in the email body — Feature 12 (tokenised status page) doesn't
  exist yet; don't add a link that 404s.
- **Sends to test submissions too, deliberately.** The sibling SNS notifier suppresses its
  shop-facing alert when `submitter_first_name` is exactly `"test"` (2026-07-31), so staff
  can poke the live form without spamming the shop inbox. This lambda has **no such filter**
  — it should keep emailing test submissions, so the SES path stays verifiable during
  testing. Don't "fix" this asymmetry without checking with the owner first.
- **Two-subscriber stream limit** (AWS default): this lambda and the sibling SNS notifier are
  the two Lambda consumers of the `repair_request` stream. Future MODIFY-triggered emails
  (appointment/completion, spec/02 §C5) should extend *this* lambda, not add a third stream
  subscriber. See `SPEC.md` §1.3.
- AWS setup (SES domain identity, DNS, IAM, Lambda function, event-source mapping) is manual
  — see `SPEC.md` §5 for the full runbook and its checked-off progress.
- **Kept-in-sync duplication:** `SES_FROM`, `SES_REPLY_TO`, `SHOP_PHONE_NUMBER` and
  `awsSdkVersion` are duplicated in `shop/`'s `notification` module
  (`ReviewRequestEmailSender` + the `aws-sdk-v2.version` property in `shop/pom.xml`), which
  sends the post-visit review e-mail. Change them in both, or the two customer e-mails will
  disagree about the shop's phone number. See `spec/04-post-visit-review-email-spec.md` §C7.
