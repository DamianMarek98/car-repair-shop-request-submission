# Specification — Customer confirmation email lambda

> Author perspective: Senior Software Architect
> Date: 2026-07-27 (spec) — implemented and deployed 2026-07-31, see **Progress** below
> Status: **Live.** Deployed to AWS, wired to the `repair_request` DynamoDB stream, and
> verified end-to-end (test submission → confirmation email received). No open work items.
> Builds on: `spec/features-development-spec.md` §Feature 1, `spec/features-implementation-plan.md`
> §Feature 1, `spec/02-product-and-growth-spec.md` (RODO/consent context). **Deviates from
> both** on one point — see §1.
> Scope: submission-confirmation email only (DynamoDB `INSERT` → email). Appointment and
> completion emails (spec/02 §C5, gated behind Feature 2's state-machine rework) are
> explicitly **out of scope** — see §1.3.
> Language: spec in English; all customer-facing copy in Polish.

---

## Progress (updated 2026-07-31) — ✅ COMPLETE, live in production

- [x] Region confirmed: SES available in `eu-north-1` (Stockholm) — no cross-region client needed.
- [x] SES domain identity created + **Verified**: `renocar-zgloszenie.pl`
      (`arn:aws:ses:eu-north-1:009160054371:identity/renocar-zgloszenie.pl`).
- [x] DKIM (Easy DKIM, RSA 2048-bit) — 3 CNAME records added and verified live.
- [x] SPF TXT record added: `v=spf1 include:amazonses.com ~all` (merged as an additional
      value into the domain's existing apex TXT record set — did not overwrite the
      pre-existing token there).
- [x] DMARC TXT record added at `_dmarc.renocar-zgloszenie.pl`:
      `v=DMARC1; p=none; rua=mailto:damian.marek1998@gmail.com`. Known caveat: major
      reporters (Google/Microsoft/Yahoo) likely won't deliver aggregate reports to a
      `gmail.com` address, per DMARC's external-destination-verification rule (RFC 7489
      §7.1) — accepted as non-blocking (doesn't affect actual mail delivery/DMARC
      evaluation, only the reporting feed). See §7 Q3.
- [x] **Correction to decision D3 below**: the domain is *registered* at home.pl, but its
      DNS is actually **hosted in Route53** in this same AWS account (NS records delegate to
      `awsdns-*`) — discovered mid-implementation via `dig NS`. All DNS records above were
      added in **Route53**, not home.pl. Any CNAME entries added at home.pl earlier are
      inert (not authoritative) — harmless if left, fine to delete for hygiene.
- [x] Test recipient address verified in SES (for sandbox testing).
- [x] SES production-access request **submitted and approved**. Account is now out of
      sandbox: limits **50,000 emails / 24h, 14 emails/sec** — vastly over this feature's
      ~10–20/month, no headroom concern.
- [x] Lambda module code written and passing: `build.gradle.kts`, `settings.gradle.kts`,
      Gradle wrapper (copied from the sibling notifier), `NewRepairRequestSubmittedEmailNotifier`,
      `NewRepairRequestSubmittedEmailNotifierTest` (6 tests), module `CLAUDE.md`. Verified
      with `./gradlew test` — all pass.
- [x] IAM role created (dedicated, not shared with the sibling notifier's role) — §5.4.
      `arn:aws:iam::009160054371:role/NewRepiarRequestConfirmationEmailLambdaRole` (note: has
      a typo, "Repiar" — cosmetic only, IAM role names can't be renamed in place so left
      as-is; doesn't affect function).
- [x] **Design change (2026-07-31): SES config moved from env vars to hardcoded constants**
      in the class, mirroring the sibling notifier's own hardcoded `TOPIC_ARN` convention —
      owner's explicit choice ("won't change; will redeploy if it does"). The Lambda function
      now needs **no environment variables at all**. Final values baked into the code:
      region `eu-north-1`, `SES_FROM=info@renocar-zgloszenie.pl`,
      `SES_REPLY_TO=info@renocar.pl`, `SHOP_PHONE_NUMBER="58 520 19 14 lub 690 182 354"`.
      Resolves §7 Q1/Q4. Jar rebuilt (`./gradlew test shadowJar`) — 6/6 tests still pass.
      §5.5 step 3 (env vars) below is **superseded** — skip it.
- [x] Lambda function `new-repair-request-confirmation-email-lambda` created (Java 21,
      512 MB / 15s, role from §5.4), jar uploaded, handler set, **no env vars** (per the
      constants refactor above). DynamoDB stream trigger added on `repair_request`
      (batch size 10, starting position Latest, filter criteria `{"eventName": ["INSERT"]}`)
      — §5.5 done.
- [x] SES production access confirmed granted — **50,000 emails / 24h, 14 emails/sec**.
- [x] **Manual end-to-end test passed (2026-07-31)**: live test submission → confirmation
      email received correctly; sibling SNS shop-notification unaffected. §5.6 step 5 done.
- [x] **Related change, sibling module**: `new-repair-request-notification-lambda` now skips
      its shop-facing SNS alert when `submitter_first_name` is exactly `"test"`
      (case-insensitive), so test submissions don't spam the shop inbox. This lambda has
      **no such filter** — it still emails test submissions, so the SES path stays verifiable
      end-to-end. Full detail in that module's own `CLAUDE.md`. Sibling redeployed and live.

**Nothing left outstanding for this feature.** Both lambdas are deployed, tested, and live.

---

## 0. Decisions locked for this spec (owner-confirmed 2026-07-27)

These were open architecture questions; answered before writing the rest of this document
so the design below isn't built on a guess:

| # | Question | Decision |
|---|---|---|
| D1 | How does the new lambda deliver mail to the customer's own address? | **Direct Amazon SES send** from inside the new lambda. Not SNS-mediated — see §1.1 for why SNS can't do this. |
| D2 | Scope: confirmation-only, or also appointment/completion emails? | **Confirmation only** (`INSERT` events). Stream view stays `NEW_IMAGE`; no dependency on Feature 2. |
| D3 | DNS control for `renocar-zgloszenie.pl`? | Believed **registered at home.pl**, not Route53, at spec time. **Corrected during implementation**: home.pl is only the registrar — actual DNS is hosted in **Route53** in this same AWS account (NS records delegate to `awsdns-*`). All DNS steps were executed in Route53; see **Progress** above. |

---

## 1. Why this isn't literally "same behaviour, another SNS topic"

### 1.1 The blocking constraint

`new-repair-request-notification-lambda` publishes to one hardcoded SNS topic
(`NewRepairRequestSubmittedTopic`) with a single, manually pre-confirmed email
subscription — the shop's own inbox. That's the *only* delivery mode SNS's email protocol
supports: a fixed, statically-subscribed address per topic. There is no way to parameterize
the "to" address per `Publish` call from data in the DynamoDB record, and SNS cannot
programmatically subscribe-and-auto-confirm an arbitrary address (email subscriptions
require the recipient to click a confirmation link once, which obviously can't happen for a
customer who's never seen the topic before). So a second SNS topic, configured the same way
as the first, would only ever be able to email one more fixed address — not the submitter.

This is the same conclusion `features-development-spec.md` §0.2 and §1.2 already reached:
**customer-facing email requires SES**, called directly with the address taken from the
record. That analysis holds; nothing here overrides it.

### 1.2 What "triggered the same way" *does* carry over

The part of your request that's fully valid and is exactly what this spec builds:

- A **second, independent Lambda function**, not new code bolted onto the existing notifier.
- Subscribed to the **same DynamoDB stream** via its own event-source mapping, filtered to
  `INSERT`, mirroring `NewRepairRequestSubmittedSnsNotifier`'s per-record loop, try/catch
  isolation, and dual-constructor (real client / injected client for tests) style.
- Fully decoupled failure domain: if SES throttles, misconfigures, or the identity gets
  suspended, the shop's SNS notification is **structurally unaffected** — it's a different
  function with a different event-source mapping, not a shared try/catch inside one handler.
  This is actually a cleaner isolation story than `features-implementation-plan.md`'s
  original Step 1.4 (which planned to add the SES call *inside* the existing notifier's
  `INSERT` branch, wrapped in its own try/catch). Your instinct to keep it as a separate
  lambda is the better call, consistent with this repo's existing philosophy of splitting
  Lambdas for cold-start/failure isolation (documented in the root `CLAUDE.md` for the
  consumer vs. monolith split).

So: same trigger, same per-record resilience pattern, own function — just SES instead of a
second SNS topic for the actual send.

### 1.3 Why appointment/completion emails are explicitly out of scope here (D2)

`spec/02-product-and-growth-spec.md` §C5 designs a `MODIFY`-triggered appointment email and
completion email, keyed off `status_value` transitions that don't exist in the codebase yet
(`appointment_at`, `completed_at` — both depend on Feature 2's state-machine rework, which
hasn't started). Building `MODIFY` handling now means guarding against transitions the code
can't currently produce, on data model fields that don't exist. That's speculative scope for
a feature that isn't ready.

There's also a hard AWS constraint worth flagging now because it shapes future decisions,
not this one: **a DynamoDB stream supports at most 2 Lambda event-source-mapping
subscribers by default** (AWS soft limit, raisable via support ticket but not raised here).
The existing notifier already holds slot 1; this new lambda takes slot 2. **When
appointment/completion emails are built (post–Feature 2), they should be added as new
branches inside *this* lambda, not as a third separate Lambda subscribing to the same
stream** — otherwise you hit the subscriber limit. Note this constraint in this lambda's
future `CLAUDE.md` when it's created.

---

## 2. Architecture

```
DynamoDB repair_request table
         │  (stream: INSERT)
         │
         ├──────────────────────────────┬───────────────────────────────────
         ▼                               ▼
new-repair-request-              new-repair-request-confirmation-
notification-lambda              email-lambda   (NEW — this spec)
(existing, unchanged)                     │
         │                                │  reads: email, submitter_first_name, id
         ▼                                ▼
   SNS topic                        Amazon SES
   NewRepairRequestSubmittedTopic   SendEmail (identity: renocar-zgloszenie.pl)
         │                                │
         ▼                                ▼
   shop's inbox (fixed,              customer's own address
   pre-confirmed subscriber)         (from the submitted record)
```

Two independent event-source mappings on the same stream. Neither lambda knows the other
exists. Both keep `NEW_IMAGE` (this feature needs no old-image comparison).

---

## 3. New module ✅ scaffolded and implemented

`car-repair-shop-backend/new-repair-request-confirmation-email-lambda/` — plain Java 21,
**Gradle (Kotlin DSL) + Shadow plugin**, mirroring the sibling notification lambda exactly
(same build tool, same dependency style, same lack of Spring). This is a deliberate
consistency choice, not a default — the codebase's other new-module precedent
(`repair-request-submitted-consumer`, and the planned `repair-request-status-consumer` in
`features-implementation-plan.md`) is Maven-shaded instead. Gradle is chosen here because
this lambda is the direct sibling of `new-repair-request-notification-lambda` (same trigger,
same event shape, same "small notifier off the stream" role) — copy that project's shape,
not the consumer's.

```
new-repair-request-confirmation-email-lambda/
├── build.gradle.kts
├── settings.gradle.kts
├── gradlew / gradlew.bat / gradle/
├── CLAUDE.md                          ✅ written
└── src/
    ├── main/java/car/repair/shop/confirmation/
    │   └── NewRepairRequestSubmittedEmailNotifier.java
    └── test/java/
        └── NewRepairRequestSubmittedEmailNotifierTest.java
```

### 3.1 `build.gradle.kts`

Same shape as the sibling's, dependencies trimmed to what this lambda needs:

```kotlin
plugins {
    id("java")
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

private val awsSdkVersion: String = "2.31.26"          // match sibling, keep in lockstep
private val awsJavaLambdaCoreVersion: String = "1.2.3"
private val awsLambdaJavaEventsVersion: String = "3.15.0"

group = "car.repair.shop"
version = "1.0-SNAPSHOT"

repositories { mavenCentral() }

dependencies {
    implementation("com.amazonaws:aws-lambda-java-core:$awsJavaLambdaCoreVersion")
    implementation("com.amazonaws:aws-lambda-java-events:$awsLambdaJavaEventsVersion")
    implementation("software.amazon.awssdk:sesv2:$awsSdkVersion")   // SESv2, not classic ses

    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("org.mockito:mockito-junit-jupiter:5.17.0")
}

tasks { test { useJUnitPlatform() } }
```

Use **SESv2** (`software.amazon.awssdk:sesv2`), not the classic `ses` artifact — simpler
`SendEmailRequest`/`Content` API for a plain templated message, no reason to take on the v1
API's extra ceremony here.

### 3.2 Handler design ✅ implemented

Implemented as designed, two deviations from the original sketch below: (1) the constructor
and email-builder both take a 4th parameter, `shopPhoneNumber`, used in the email footer
(§3.3) — added for testability once the phone number needed a home; (2) **as of 2026-07-31,
config is hardcoded constants, not env vars** (owner's explicit choice, matches the sibling
notifier's hardcoded `TOPIC_ARN` — see Progress above). See the real, compiling source
instead of a pseudocode duplicate:

`src/main/java/car/repair/shop/confirmation/NewRepairRequestSubmittedEmailNotifier.java`

Shape (for quick reference — read the file for the actual, current code):
- Two constructors: no-arg (delegates to the 4-arg one using hardcoded constants
  `SES_REGION`/`SES_FROM`/`SES_REPLY_TO`/`SHOP_PHONE_NUMBER`, builds a real `SesV2Client`)
  and a 4-arg test-injectable one (`SesV2Client, fromAddress, replyTo, shopPhoneNumber`) —
  tests still inject explicit values regardless of how the no-arg constructor sources them.
- `handleRequest` loops records, filters `INSERT`, per-record try/catch logging only the
  request `id` on error (mirrors sibling's isolation pattern).
- `sendConfirmationIfPossible` reads `email`/`submitter_first_name`/`id` from the new image;
  blank/missing `email` is a silent no-op (Q5 resolved this way — see §7).
- `buildSendEmailRequest` / `buildBody` are `static` package-private, unit-testable without
  a real `SesV2Client` — matches the plan.

Design notes:
- Guard on blank `email` is a silent no-op, not a logged warning — the consumer Lambda's
  `SubmitRepairRequestDto` already requires `email` as `@NotEmail`-ish (verify exact
  constraint — see `RepairRequestSubmittedHandler`), so a missing address on a live-path
  record would itself indicate an upstream validation bug worth knowing about. If you want
  that surfaced, log at `WARN`-equivalent when `email` is blank instead of silently
  returning — cheap to add now if you want it; left out here to match the sibling's minimal
  style (skip and move on, spec's own §1.4.3 guard language). **Decide and note in code.**
- Subject/body construction lives in a `static` package-private method (mirrors
  `features-implementation-plan.md` Step 1.3.2's advice) so the email content is unit
  testable without touching AWS.
- **UTF-8 charset must be set explicitly** on both subject and body `Content` objects — SES
  defaults can mangle Polish diacritics (ą, ę, ł, ń, ó, ś, ź, ż) otherwise.

### 3.3 Email copy (Polish)

No status link — Feature 12 (tokenised status page) doesn't exist yet, so there's nothing to
link to. Leave a comment marking where it slots in later; don't build a placeholder URL that
404s today.

> **Temat:** Potwierdzenie zgłoszenia naprawy — RENO CAR
>
> Dzień dobry {imię},
>
> dziękujemy za zgłoszenie naprawy w warsztacie RENO CAR. Otrzymaliśmy Twoje zgłoszenie
> (nr {id}) i skontaktujemy się z Tobą wkrótce, aby ustalić termin wizyty.
>
> W razie pytań prosimy o kontakt: tel. {telefon warsztatu}.
>
> Pozdrawiamy,
> Zespół RENO CAR

`{telefon warsztatu}` — no phone number is hardcoded anywhere in this backend today; take it
from an env var (`SHOP_PHONE_NUMBER`) rather than hardcoding it in the jar, consistent with
§8.4's config-hygiene rule elsewhere in these specs.

---

## 4. Data read (no schema changes needed)

Reads only fields the consumer Lambda already writes today: `email`, `submitter_first_name`,
`id`. **No new DynamoDB attribute, no change to `RepairRequestItemConverter` or `RepairRequest`
entity.** This is worth stating explicitly because every other feature in `spec/02` and
`features-development-spec.md` trips over the dual-write-path duplication rule (§0.1) — this
one doesn't, because it only *reads* the stream, on fields both write paths already produce
identically. Confirm that stays true if anyone touches the item shape before this ships.

---

## 5. AWS setup runbook (manual — nothing scripted, per repo convention)

Nothing SES-related exists in this AWS account today. This is the actual blocking work —
expect more elapsed calendar time here than in the code above.

### 5.1 Confirm SES availability + pick the region ✅ done

1. Open the SES console. Check whether SES is offered in the region this account's Lambdas
   already run in (`eu-north-1` / Stockholm — the region baked into the existing hardcoded
   SNS ARN). SES has expanded regions over time; confirm current availability rather than
   assuming.
2. If unavailable in `eu-north-1`, pick a nearby supported region (`eu-west-1`/Ireland or
   `eu-central-1`/Frankfurt are the usual EU fallbacks) and set `SES_REGION` to that region's
   code. The Lambda function itself stays in `eu-north-1`; the SES SDK client just points
   cross-region — no functional difference beyond a few extra ms of latency per send, which
   doesn't matter for an async stream consumer.

**Outcome:** `eu-north-1` confirmed available — no cross-region client needed. `SES_REGION=eu-north-1`.

### 5.2 Verify the domain identity ✅ done

1. SES console → **Verified identities** → **Create identity** → Domain →
   `renocar-zgloszenie.pl`. Verify at the **domain** level (not a single mailbox address) —
   this lets every future email feature (appointment confirmations, completion/review asks,
   reminders — `spec/02` G4/G5/G6) reuse the same identity without repeating this process.
2. **Before adding records, check whether `renocar-zgloszenie.pl` already sends or receives
   any mail** (existing MX record, existing SPF TXT record). Confirmed clean — no MX, no SPF
   existed before this work.
3. ~~SES generates 3 DKIM CNAME records (Easy DKIM). Add all 3 in home.pl's DNS panel~~ —
   **correction**: home.pl's own DNS zone is not authoritative for this domain (see
   Progress/D3 above). The 3 DKIM CNAMEs were added in **Route53** instead (hosted zone
   `renocar-zgloszenie.pl` in this same AWS account), each entered as host
   `{token}._domainkey` (Route53 appends the zone name) → canonical name
   `{token}.dkim.amazonses.com` (a trailing dot is accepted but not required in Route53,
   unlike some registrar panels).
4. Add SPF: TXT `renocar-zgloszenie.pl` → `v=spf1 include:amazonses.com ~all`. **Done** —
   added as a second value line inside the domain's pre-existing apex TXT record set in
   Route53 (there was one unrelated existing token there; both values now coexist correctly,
   verified via `dig TXT`).
5. Add DMARC: TXT `_dmarc.renocar-zgloszenie.pl` →
   `v=DMARC1; p=none; rua=mailto:damian.marek1998@gmail.com`. **Done**, added in Route53.
   Start at `p=none` (monitor-only); tightening to `quarantine`/`reject` is a later,
   separate decision once/if DMARC reports show clean alignment (see the Gmail-recipient
   caveat in Progress above — reports may not actually arrive from major providers).
6. ~~Wait for SES to show all records Verified~~ — **confirmed Verified.** Identity ARN:
   `arn:aws:ses:eu-north-1:009160054371:identity/renocar-zgloszenie.pl`.

### 5.3 Sandbox → production access (the actual long-lead item) ✅ approved

1. While in sandbox (default for a brand-new SES account), SES can **only** send to
   individually verified recipient addresses. Verify 1–2 developer/test addresses (SES
   console → Verified identities → Create identity → Email address) so you can test the
   full send path before production access is granted. **Done** — one test address verified.
2. SES console → **Account dashboard** → **Request production access**. Fill the use-case
   form: *transactional* email (submission confirmations), expected volume — this platform
   runs at **~10–20 online submissions/month** (confirmed volume, `spec/02` Addendum Q1) —
   state that explicitly, it's a trivially-approvable volume. Typical turnaround is next
   business day. **Done** — request submitted (the console's current form didn't present a
   distinct "use case description" field, request went through without it regardless).
3. **This is the actual go-live blocker, not the code.** Submit this request on day one,
   independent of when the Lambda code is ready — the code can be built, tested (against
   verified test addresses), and sit ready while this is pending. **✅ Approved** — account
   is out of sandbox with limits **50,000 emails / 24h, 14 emails/sec**, far above this
   feature's actual volume. No longer a go-live blocker; remaining work is purely §5.4/§5.5
   (IAM role, Lambda function, event source mapping) and the E2E test.

### 5.4 IAM ✅ done

Create a **new**, dedicated execution role for this function — do not extend the existing
notifier's role. They're separate functions with non-overlapping permission needs (SNS
`Publish` vs. SES `SendEmail`); sharing a role just widens each function's blast radius for
no benefit.

Role needs:
- Standard Lambda basic execution (CloudWatch Logs: `CreateLogGroup`, `CreateLogStream`,
  `PutLogEvents`).
- DynamoDB Streams read on the `repair_request` table's stream ARN: `dynamodb:GetRecords`,
  `dynamodb:GetShardIterator`, `dynamodb:DescribeStream`, `dynamodb:ListStreams`.
- `ses:SendEmail` (and `ses:SendRawEmail` only if you later switch to raw MIME messages —
  not needed for a simple templated `SendEmail` call), scoped to the verified identity ARN:
  `arn:aws:ses:{region}:{account-id}:identity/renocar-zgloszenie.pl`.

**Outcome:** role created via IAM console (Lambda trust policy + one inline policy covering
the three permission groups above, each scoped as tightly as the action allows). ARN:
`arn:aws:iam::009160054371:role/NewRepiarRequestConfirmationEmailLambdaRole` (name has a
typo — "Repiar" — left as-is since IAM role names can't be renamed without delete+recreate;
purely cosmetic, doesn't affect the role's function).

### 5.5 Lambda function ✅ done

1. Create function, runtime **Java 21**, handler
  `car.repair.shop.confirmation.NewRepairRequestSubmittedEmailNotifier::handleRequest`.
   Permissions: use the existing role from §5.4 above, not a new auto-created one.
2. Upload `build/libs/new-repair-request-confirmation-email-lambda-1.0-SNAPSHOT-all.jar`
   (Shadow's fat-jar output, same pattern as the sibling).
3. ~~Env vars: `SES_REGION`, `SES_FROM`, `SES_REPLY_TO`, `SHOP_PHONE_NUMBER`~~ —
   **superseded, skip this step.** As of 2026-07-31 these are hardcoded constants in the
   class instead (see Progress above) — the function needs **no environment variables**.
4. Memory/timeout: 512 MB / 15 s is a reasonable starting point for a small Java stream
   consumer doing one network call; adjust from actual CloudWatch duration once it's live.
5. **Event source mapping**: DynamoDB stream of `repair_request`, starting position
   `LATEST` (do not replay historical INSERTs — no reason to email every past customer the
   day this ships), batch size small (1–10 is plenty at this volume).
6. **Optional but recommended**: attach a Lambda event-source **filter criteria**
   (`{"Filters": [{"Pattern": "{\"eventName\": [\"INSERT\"]}"}]}`) so `MODIFY`/`REMOVE`
   records never even invoke the function — the code already guards on `INSERT`, but the
   filter avoids a wasted invocation (and its log line) for every admin status change,
   cutting noise and cost to exactly zero for non-INSERT events, and matches how the sibling
   would ideally be configured too (it currently isn't — comment noted, not this spec's job
   to change).

### 5.6 Deployment order — ✅ all steps done

1. ✅ Confirm SES region (§5.1), start production-access request (§5.3.2) — approved.
2. ✅ DNS records + domain verification (§5.2).
3. ✅ Build + test the jar locally (`./gradlew test`) — 6/6 tests pass.
4. ✅ IAM role (§5.4), Lambda function + event source mapping (§5.5) — deployed.
5. ✅ Manual E2E: live test submission → confirmation email received correctly, Polish
   rendering fine, existing shop SNS notification unaffected.
6. ✅ Live for real customer traffic — production access confirmed granted, function
   deployed and verified.

---

## 6. Risks / review checklist

- **6.1 SPF record collision** — the single highest-risk step in §5.2; a duplicate SPF TXT
  breaks the whole domain's SPF, not just SES's portion. Check before adding, merge if one
  exists.
- **6.2 Sandbox go-live gate** — §5.3.3/§5.6.6; the code will look fully working in testing
  (verified addresses) and then silently do nothing for real customers if deployed before
  production access lands. Make this an explicit go/no-go checklist item at deploy time.
- **6.3 Bounce/complaint monitoring is not built here** — deliberately deferred. At ~15
  emails/month the operational cost of *not* having it is low today, but a string of typo'd
  customer emails (bounces) with zero visibility could eventually push the account toward
  SES's automatic sending pause. Recommended next step once this lambda is live: an SES
  configuration set + SNS topic for bounce/complaint notifications, subscribed by the shop's
  dev email — a half-day follow-up, not a blocker for this spec.
- **6.4 At-least-once delivery** — DynamoDB Streams + Lambda retries can redeliver a record;
  accept rare duplicate confirmation emails at this volume rather than building dedup
  (matches the accepted-tolerance decision already made for the sibling's SNS path in
  `features-implementation-plan.md`'s standing defaults).
- **6.5 PII in logs** — log the request `id` only, never the full stream image or the raw
  email address, in CloudWatch (§3.2 handler design already reflects this).
- **6.6 UTF-8 encoding** — explicit charset on subject and body; verify rendering against
  Gmail, Outlook, and at least one Polish provider (onet.pl / wp.pl) before calling this
  done — Polish-provider spam filtering can behave differently than the majors.
- **6.7 Two-subscriber stream limit** — see §1.3; this lambda is the second and last
  "free" subscriber on the `repair_request` stream under the default AWS limit. Future
  MODIFY-triggered email variants extend this lambda, they don't get their own.
- **6.8 RODO** — transactional confirmation, not marketing; covered by existing RODO
  consent per `features-development-spec.md` §1.6.3, but confirm the privacy policy text
  actually mentions transactional email once this ships (it may not today — not verified in
  this pass, worth a quick check).

---

## 7. Open questions for the owner

| # | Question | Status |
|---|---|---|
| Q1 | Exact `SES_FROM` address and `SES_REPLY_TO` (which monitored inbox should customer replies land in?) | **Resolved.** `SES_FROM=info@renocar-zgloszenie.pl`, `SES_REPLY_TO=info@renocar.pl` — hardcoded as constants (not env vars, see Progress 2026-07-31). Note: `renocar-zgloszenie.pl` has no MX record, so `info@renocar-zgloszenie.pl` can't itself receive mail — relies on mail clients honoring `Reply-To` (near-universal in practice), low-risk edge case. |
| Q2 | Does `renocar-zgloszenie.pl` currently have **any** mail configuration (MX, existing SPF TXT)? | **Resolved.** No — confirmed clean, no merge conflict. (Also: DNS turned out to be Route53, not home.pl — see Progress/D3.) |
| Q3 | Who should receive DMARC aggregate reports (`rua=mailto:...`)? | **Resolved.** `damian.marek1998@gmail.com` — added, with the noted caveat that major providers may not actually deliver reports there (non-blocking). |
| Q4 | Shop phone number for the email footer (`SHOP_PHONE_NUMBER`) — confirm the number to publish. | **Resolved.** `"58 520 19 14 lub 690 182 354"` (landline + mobile, both fit in one string) — hardcoded as a constant. |
| Q5 | Should a blank/missing `email` on a live submission log a visible warning (possible upstream validation bug) instead of silently no-op'ing? | **Resolved (pragmatic default).** Kept as a silent no-op, matching the sibling notifier's minimal style. Easy to change later in `sendConfirmationIfPossible` if you want visibility. |

---

## 8. Cost

Same negligible-cost profile as `features-development-spec.md` §1.5: SES $0.10 per 1,000
emails at ~15/month is fractions of a cent; a second small Lambda's invocation cost at this
volume is likewise negligible. The only real cost of this feature is the SES production-access
lead time and the DNS/setup effort in §5, not AWS spend.

---

## 9. Test plan ✅ implemented, 6/6 passing

Mirrors `NewRepairRequestSubmittedSnsNotifierTest`'s style (JUnit 5 + Mockito, `DynamodbEvent`
fixtures, mocked client, default package, raw `assert` statements — no AssertJ dependency
added, consistent with the sibling). All in
`src/test/java/NewRepairRequestSubmittedEmailNotifierTest.java`:

1. `givenInsertWithEmailShouldSendConfirmation` — `INSERT` with `email` present →
   `SesV2Client.sendEmail` called once; asserts destination, `source` = `SES_FROM`, subject
   non-blank, body contains the request `id` and first name, charset UTF-8 on both subject
   and body.
2. `givenInsertWithMissingEmailShouldNotSend` / `givenInsertWithBlankEmailShouldNotSend` →
   `verifyNoInteractions(sesClient)`.
3. `givenNonInsertEventShouldNotSend` — `MODIFY` event → `verifyNoInteractions(sesClient)`.
4. `givenSesThrowingShouldNotPropagateOutOfHandler` — `sendEmail` throws → exception caught,
   `handleRequest` returns normally.
5. `givenPolishDiacriticsInFirstNameShouldRenderCorrectlyInBody` — `"Łukasz"` in
   `submitter_first_name` → renders correctly in the body.

Verified via `./gradlew test` — `BUILD SUCCESSFUL`, `tests="6" skipped="0" failures="0" errors="0"`.

---

## 10. Cross-references to update once this ships

- `features-implementation-plan.md` Feature 1 (Steps 1.2–1.6) currently plans to extend
  `new-repair-request-notification-lambda` in place. That plan is **superseded by this spec**
  for the confirmation-email piece specifically — flag it there (or ask to have it edited)
  so a future reader doesn't implement Feature 1 twice, once each way.
- `spec/02-product-and-growth-spec.md` §C5's MODIFY-branch table assumes appointment/
  completion emails live in "the notification Lambda" (ambiguous which one, post-Feature 2).
  Per §1.3 above, they should land in **this** lambda, not the SNS one — worth a one-line
  correction there when Feature 2 is picked up.
