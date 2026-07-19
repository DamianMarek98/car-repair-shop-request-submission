# Features Implementation Plan

> **⚠️ CORRECTIONS NOTICE (2026-07-11).** Feature 2 in this plan binds the appointment body/dialog/email to the wrong transition. Owner-confirmed semantics: `HANDLED` = "Umówiono" (booked), `APPOINTMENT_MADE` = "Zakończono" (done, terminal). The appointment body goes on **`mark-as-handled`** (not `mark-as-appointment-made`), the appointment email fires on the transition **to `HANDLED`**, the completion email on **to `APPOINTMENT_MADE`**, and decision D4 must be re-read accordingly (reschedule = `HANDLED → HANDLED`). **Apply corrections C1–C10 from [`02-product-and-growth-spec.md`](02-product-and-growth-spec.md) before executing Feature 2 steps 2.2–2.8, and follow [`00-master-plan.md`](00-master-plan.md).**

> Companion to `features-development-spec.md`. Covers the **not-yet-implemented** features only:
> **Feature 1** (customer confirmation email), **Feature 2** (capture appointment date/time),
> **Feature 12** (customer self-service status link), **Feature 3** (photo upload).
> Bug fixes **B1, B2, B4 are already done** and excluded here.
>
> Step-by-step, feature by feature, with tests inline. Global verification + deployment at the end (§V, §D).

---

## Confirmed technical decisions (drive this plan)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Infra provisioning | **Documented manual runbook** (console/CLI steps per resource). No SAM/CDK introduced. |
| D2 | Feature 12 status-read Lambda runtime | **Java**, mirroring `repair-request-submitted-consumer` (shaded-jar Maven). Accept cold start; mitigate with `Cache-Control`. |
| D3 | Feature 3 attachment policy | **Images only** (`image/jpeg`, `image/png`, `image/webp`), **max 5 files, 10 MB each**, admin views via short-lived **pre-signed GET** (no CloudFront). |
| D4 | Feature 2 state machine | **Allow direct `NEW→HANDLED`** (close without appointment) and **allow reschedule** while `APPOINTMENT_MADE` (re-sends customer email). |

### Standing defaults applied throughout
- **SES region:** verify SES availability in `eu-north-1` first; if unavailable, deploy the SES identity + send from **`eu-west-1`** and point the notification Lambda's SES client at that region via env var. (Lambda stays in `eu-north-1`.)
- **Email idempotency:** accept **at-least-once** delivery (rare duplicate emails tolerated at this volume). Documented, not engineered around.
- **Tracking token:** **UUIDv4**, stored as `tracking_token`. **No hard TTL** initially (retention handled by a future RODO purge job); documented choice.
- **WAF:** **not used** — rely on API Gateway throttling.
- **Config hygiene:** all new ARNs/addresses/bucket names via **Lambda environment variables**, never hardcoded (carry the existing hardcoded SNS ARN into an env var while we're in that file).

### Recommended sequencing
**Feature 1 → Feature 2 → Feature 12 → Feature 3.** Feature 1 establishes the SES foundation reused by 2 and 12; Feature 2 cleans the state machine; Feature 12 reuses the token/email; Feature 3 is independent and can run in parallel after S3 is ready.

> **Long-lead action — start on day 1, in parallel with everything:** SES domain verification + **production-access request** (sandbox → production is a 1–2 business-day AWS approval). See §1, Step 1.1. Code can proceed while this is pending; **go-live for Features 1/2/12 emails is blocked until production access is granted.**

---

# Feature 1 — Customer confirmation email on submission

**Goal:** on a successful submission, email the customer "we received your request #<id>" (Polish). Decoupled in the DynamoDB-stream `new-repair-request-notification-lambda` on `INSERT`. Leaves a placeholder for the Feature 12 status link.

**Modules touched:** `car-repair-shop-backend/new-repair-request-notification-lambda` (Gradle). Plus AWS (SES, IAM, DNS).

### Step 1.1 — SES foundation (infra, long-lead) ⏳ start first
1.1.1 In the AWS console (SES, chosen region per default above), create a **domain identity** for `renocar-zgloszenie.pl`.
1.1.2 Add the generated **DKIM CNAME** records, an **SPF** TXT (`v=spf1 include:amazonses.com ~all`), and a **DMARC** TXT (`v=DMARC1; p=none; rua=mailto:dmarc@renocar-zgloszenie.pl`) to Route53. Wait for SES to show "Verified".
1.1.3 Decide the **From** address (e.g. `no-reply@renocar-zgloszenie.pl`) and **Reply-To** (e.g. the shop's monitored inbox). Record both for env vars.
1.1.4 Submit the **SES production-access request** (move out of sandbox). Until granted, verify the developer test recipient addresses so code can be tested.
1.1.5 Create an **SNS topic** `ses-bounces-complaints` and subscribe the shop/dev email; configure the SES identity's **bounce + complaint notifications** to publish to it (deliverability monitoring per spec §1.6.2).
1.1.6 **Runbook:** capture every value (region, identity ARN, From/Reply-To, bounce topic ARN) in `car-repair-shop-backend/infrastructure/RUNBOOK.md` (create it).

### Step 1.2 — Add SES SDK + config to the notification Lambda
1.2.1 In `new-repair-request-notification-lambda/build.gradle`, add `implementation("software.amazon.awssdk:ses:$awsSdkVersion")` (SESv1 `ses`, matching the existing SNS SDK style; v2 client API).
1.2.2 No new shadow config needed — the existing `com.github.johnrengelman.shadow` plugin already builds the fat jar.

### Step 1.3 — Create the email sender
1.3.1 New class `car.repair.shop.notification.CustomerConfirmationEmailSender`:
- Constructor `(SesClient ses, String fromAddress, String replyTo, String statusBaseUrl)` plus a no-arg constructor that builds `SesClient` from `Region.of(System.getenv("SES_REGION"))` and reads `SES_FROM`, `SES_REPLY_TO`, `STATUS_BASE_URL` env vars (mirror the dual-constructor pattern of `NewRepairRequestSubmittedSnsNotifier`).
- Method `void sendSubmissionConfirmation(String toEmail, String firstName, String requestId)`:
  - Guard: if `toEmail` is null/blank → log and return (no send).
  - Build subject + HTML + plain-text body in Polish, **UTF-8 charset explicitly set** (spec §1.6.7).
  - Body includes request id and contact phone; include a **status link placeholder** `STATUS_BASE_URL + "/status/" + <token>` — for Feature 1 alone the token isn't available yet, so render contact-only text and wire the link in Feature 12 Step 12.5.
  - Send via `SesClient.sendEmail(...)`.
1.3.2 Keep the message-building logic in a `static` package-private method so it's unit-testable without AWS.

### Step 1.4 — Wire into the stream handler
1.4.1 In `NewRepairRequestSubmittedSnsNotifier.handleRequest`, inside the existing `INSERT` branch, after the SNS publish, call the email sender reading `email`, `submitter_first_name`, `id` from `getNewImage()`.
1.4.2 Wrap the email call in its **own try/catch** that logs and swallows — SES failure must not abort the SNS notification or fail the batch (spec §1.6.5). Likewise the existing SNS try/catch already isolates that path.
1.4.3 Move the **hardcoded `TOPIC_ARN`** into an env var `SNS_TOPIC_ARN` (config hygiene; do it while in this file).
1.4.4 Reduce **PII logging**: stop logging the full event/new image at info; log only `id`. (spec §1.6.6)

### Step 1.5 — Tests (`src/test/java`, JUnit5 + Mockito, mirror existing test)
1.5.1 `CustomerConfirmationEmailSenderTest`:
- given valid email → `SesClient.sendEmail` called once; assert destination, source = From, subject non-empty, body contains the request id, charset UTF-8.
- given null/blank email → `verifyNoInteractions(ses)`.
1.5.2 Extend `NewRepairRequestSubmittedSnsNotifierTest`:
- INSERT → both SNS publish **and** SES send invoked.
- INSERT with SES throwing → SNS still invoked, no exception escapes `handleRequest`.
- INSERT with SNS throwing → SES still invoked (failure isolation both directions).
- non-INSERT → neither invoked.
1.5.3 Run `./gradlew test` for the module.

### Step 1.6 — AWS wiring (runbook)
1.6.1 Set the notification Lambda **env vars**: `SES_REGION`, `SES_FROM`, `SES_REPLY_TO`, `SNS_TOPIC_ARN`, `STATUS_BASE_URL` (`https://renocar-zgloszenie.pl`).
1.6.2 Add an IAM policy to the Lambda **execution role**: `ses:SendEmail` + `ses:SendRawEmail` scoped to the verified identity ARN (spec §1.3.4).
1.6.3 Confirm the stream view type is at least `NEW_IMAGE` (already true). The change to `NEW_AND_OLD_IMAGES` happens in Feature 2 §2.6.
1.6.4 (Optional) attach a **DLQ** (SQS) to the Lambda for poison events.

**Feature 1 acceptance:** submitting via the live form results in a confirmation email to the submitter (verified recipient while in sandbox), shop SNS email unaffected, no Lambda errors.

---

# Feature 2 — Capture the agreed appointment date/time

**Goal:** staff set a real appointment datetime when confirming; surface it in admin list/detail; notify the customer by email (reuses Feature 1 SES). Untangle the muddled state machine. Per **D4**: allow direct `NEW→HANDLED`, allow reschedule.

**Modules touched:** `shop` (Java/Spring), `repair-requests-portal` (Angular), `new-repair-request-notification-lambda` (MODIFY email), plus the live-path converter for field consistency.

### Step 2.1 — Data model (shop entity + DTOs)
2.1.1 `RepairRequest` entity — add attributes with converters (mirror `submittedAt`):
- `appointment_at` → `LocalDateTime appointmentAt` (`@DynamoDBTypeConverted(LocalDateTimeConverter)`).
- `appointment_end_at` → `LocalDateTime appointmentEndAt` (optional).
- `appointment_note` → `String appointmentNote` (optional, `@DynamoDBAttribute`).
2.1.2 `RepairRequestDto` — add `appointmentAt`, `appointmentEndAt`, `appointmentNote` and map them in `from(...)`.
2.1.3 `RepairRequestListItem` — add `appointmentAt` so the table can show it; map in `from(...)`.
2.1.4 Admin TS models: `repair-request.ts` and `repair-request-list-item.ts` — add the same fields (`appointmentAt: string | null`, etc.).
2.1.5 **No DynamoDB migration** (schemaless); existing rows simply lack the attribute → treat null as "not scheduled".

### Step 2.2 — State machine cleanup (the core of this feature)
2.2.1 In `RepairRequest`:
- `markAsAppointmentMade(LocalDateTime at, LocalDateTime endAt, String note)` → sets `status = APPOINTMENT_MADE`, sets the three appointment fields. **Does NOT touch `handledAt`.**
- keep `markAsHandled()` → sets `status = HANDLED`, sets `handledAt`.
2.2.2 In `NewRepairRequest` (state): remove the line that also calls `markAsHandled()` from `markAsAppointmentMade()`. `markAsAppointmentMade` must only book; `markAsHandled` must only close.
2.2.3 Review `AppointmentMadeRepairRequest` and `HandledRepairRequest` states + `RepairRequestStateFactory`:
- Allowed transitions per **D4**: `NEW → APPOINTMENT_MADE`, `NEW → HANDLED` (direct close), `APPOINTMENT_MADE → APPOINTMENT_MADE` (reschedule), `APPOINTMENT_MADE → HANDLED`.
- Forbid: any transition out of `HANDLED` (terminal) → throw `RepairRequestStateException`.
2.2.4 Confirm historical rows that have both `status=APPOINTMENT_MADE` and a non-null `handledAt` (from the old conflated logic) still **read** fine — display logic must rely on `status`, not on `handledAt` presence (spec §2.7.4). No data backfill required, but note it.

### Step 2.3 — API + handler
2.3.1 Change `RepairRequestInternalController` `mark-as-appointment-made` to accept a body:
```java
record MarkAppointmentRequest(@NotNull LocalDateTime appointmentAt,
                              LocalDateTime appointmentEndAt,
                              @Size(max = 200) String note) {}
```
Return the updated `RepairRequestDto` (status 200).
2.3.2 `MarkAsAppointmentMadeCommandHandler.handle(String id, MarkAppointmentRequest cmd)`:
- load via `RepairRequestStateFactory`; call `markAsAppointmentMade(...)`; save.
- **Server-side validation** (spec §2.7.3): `appointmentAt` not in the past; `appointmentEndAt` (if present) after `appointmentAt`; the date is not a weekend and not in `UnavailableDayFacade.getAllUnavailableDays()`. Throw a 400-mapped exception otherwise (reuse `RepairRequestValidationException` / `GlobalExceptionHandler`).
2.3.3 `mark-as-handled` endpoint unchanged in signature; verify it still allows `NEW → HANDLED` directly per D4.

### Step 2.4 — Admin frontend
2.4.1 In `repair-request-summary.component`: replace the bare "appointment made" button with an inline form / `MatDialog`:
- Material datepicker with a `dateFilter` disabling weekends + unavailable days (reuse the public form's pattern; fetch via the admin `UnavailableDaysService`).
- `from`/`to` `mat-select` using a shared `times` list.
- optional note `matInput`.
- On submit, call the service with the body; on success reload the request.
- Allow editing when status is already `APPOINTMENT_MADE` (reschedule, D4) — same form pre-filled.
2.4.2 Show `appointmentAt` (+ end + note) in the summary; add an **Appointment** column to `repair-request-table`, rendered with the existing `toBrowserTimeZone` helper.
2.4.3 `repair-request-service.ts`: change `markRepairRequestAsAppointmentMade(id)` → `(id, body)` POSTing the JSON.
2.4.4 **Timezone convention** (spec §2.7.2): store appointment as `LocalDateTime` interpreted/displayed in **Europe/Warsaw**; the admin form sends local wall-clock time; document that `appointment_at` is wall-clock local (consistent with how staff think), distinct from `submittedAt` which is UTC. Keep one documented convention; add a comment where converted.

### Step 2.5 — Customer appointment email (reuses Feature 1 SES)
2.5.1 In `CustomerConfirmationEmailSender` add `sendAppointmentConfirmation(toEmail, firstName, requestId, appointmentAt, note)` (Polish, UTF-8), including the formatted date/time and the status link.
2.5.2 In the notification Lambda, handle **`MODIFY`** events:
- compare old vs new image; if `status_value` is now `APPOINTMENT_MADE` **and** (`appointment_at` changed or status just transitioned) → send appointment email. (Covers reschedule per D4.)
- guard against unrelated MODIFY (e.g. handled transition) → no send (spec §2.5.2).
2.5.3 Read `email`, `submitter_first_name`, `id`, `appointment_at` from the new image.

### Step 2.6 — Stream view type (infra, shared/breaking — coordinate)
2.6.1 Change the `repair_request` DynamoDB **stream view type to `NEW_AND_OLD_IMAGES`** (required to detect transitions). This may require **disabling+re-enabling the stream**, which creates a new stream ARN → **re-point the notification Lambda's event-source mapping** to the new ARN (spec §8.2).
2.6.2 Do this in a maintenance window; verify no INSERT events are missed (the form is low-traffic — pick a quiet time). Record in RUNBOOK.

### Step 2.7 — Field consistency on the live write path
2.7.1 The consumer Lambda submit path does **not** set appointment fields (correct — appointments are set later). **Do not** add them to `RepairRequestItemConverter`. Just confirm the monolith's internal API is the **only** writer of `appointment_*` (spec §2.7.1).

### Step 2.8 — Tests
2.8.1 Shop unit/integration:
- state machine: `NEW→APPOINTMENT_MADE` sets appointment + status, leaves `handledAt` null; `APPOINTMENT_MADE→APPOINTMENT_MADE` reschedules; `NEW→HANDLED` allowed; any transition from `HANDLED` throws.
- handler validation: past date rejected; weekend/unavailable-day rejected; `end<start` rejected.
- DTO mapping includes the new fields (extend `GetRepairRequestIntegrationTest`).
2.8.2 Notification Lambda:
- MODIFY to `APPOINTMENT_MADE` with appointment_at → appointment email sent.
- MODIFY unrelated (e.g. → HANDLED) → no appointment email.
- reschedule (appointment_at changed, still APPOINTMENT_MADE) → email re-sent.
2.8.3 Admin portal: spec for the appointment form (date filter disables weekend/unavailable; service called with body); table renders appointment column.
2.8.4 Run `./mvnw test` (shop), `./gradlew test` (notification), `ng test` (admin).

**Feature 2 acceptance:** staff set/reschedule an appointment with server-side availability validation; admin list+detail show it; customer receives appointment email; `NEW→HANDLED` still possible; `HANDLED` is terminal.

---

# Feature 12 — Customer self-service status link

**Goal:** tokenised public URL `https://renocar-zgloszenie.pl/status/{token}` showing a read-only status timeline, no auth. Per **D2**: new **Java** read Lambda mirroring the consumer.

**Modules touched:** new `repair-request-status-consumer` Maven module, `repair-request-submitted-consumer` (token generation), `shop` (token on monolith path), `submission-portal` (status page), notification Lambda (embed link), plus AWS (GSI, Lambda, API route, IAM).

### Step 12.1 — Token generation on write paths (do this first; harmless without the reader)
12.1.1 `RepairRequestItemConverter.toItem(...)` (live path): add `item.put("tracking_token", stringAttribute(UUID.randomUUID().toString()))`.
12.1.2 `RepairRequest.from(...)` (monolith path): set `trackingToken = UUID.randomUUID().toString()`; add `tracking_token` attribute + getter to the entity (spec §0.1 dual-path).
12.1.3 (Optional) one-off backfill script to add tokens to existing rows — only needed if old requests must be trackable; document as optional in RUNBOOK.
12.1.4 Tests: converter test asserts a non-blank `tracking_token` present; entity `from` test asserts token set.

### Step 12.2 — DynamoDB GSI (infra/runbook)
12.2.1 Add GSI **`TrackingTokenIndex`** to `repair_request`: hash key = `tracking_token`. Projection = **INCLUDE** (`status_value`, `submittedAt`, `appointment_at`, `submitter_first_name`, `plate_number`) to satisfy the status page in one query (avoid second `GetItem`).
12.2.2 Match the table's existing capacity mode (on-demand vs provisioned). Record in RUNBOOK.
12.2.3 Note: GSI builds asynchronously; wait for "Active" before the reader relies on it.

### Step 12.3 — New `repair-request-status-consumer` Lambda module (Java, mirror consumer)
12.3.1 Scaffold a Maven module mirroring `repair-request-submitted-consumer` (shaded jar; same Java version; `dynamodb` SDK).
12.3.2 Handler `RepairRequestStatusHandler implements RequestHandler<Map<String,Object>, APIGatewayProxyResponseEvent>`:
- read `token` from `pathParameters.token`.
- `Query` `TrackingTokenIndex` for the token (limit 1).
- if not found → **generic 404** `{"message":"Not found"}` (no enumeration signal, spec §12.5.1).
- if found → map to a **public-safe DTO** and return 200.
12.3.3 **Public-safe DTO** (spec §12.5.2) — only: `status`, `submittedAt`, `appointmentAt`, `firstName`, `plateMasked` (e.g. show last 3 chars: `***345`). **Never** email, phone, VIN, issue description, note.
12.3.4 CORS headers for `https://renocar-zgloszenie.pl`; add `Cache-Control: public, max-age=60` to reduce repeat Lambda hits (spec §12.5.4).
12.3.5 Tests: token hit → 200 + only allowed fields (assert email/phone/VIN absent); miss → 404; malformed token → 404; assert no PII leakage explicitly.

### Step 12.4 — API Gateway + IAM (runbook)
12.4.1 New public route `GET /api/public/repair-request/status/{token}` → status Lambda. No authorizer.
12.4.2 Enable **throttling** (low rate/burst limit) on this route/stage (spec §12.2.7). No WAF (per default).
12.4.3 IAM execution role: `dynamodb:Query` on the **`TrackingTokenIndex`** ARN only (least privilege, spec §12.3.3).
12.4.4 Enable CORS on the route for the production origin.

### Step 12.5 — Embed link into emails (closes Feature 1/2 placeholder)
12.5.1 Now that the token exists, update the notification Lambda emails to include `STATUS_BASE_URL + "/status/" + <tracking_token>` (read `tracking_token` from the stream image). Update Feature 1 confirmation + Feature 2 appointment emails.
12.5.2 Update those email tests to assert the link is present and well-formed.

### Step 12.6 — Submission portal status page
12.6.1 New route in `app.routes.ts`: `{ path: 'status/:token', component: StatusComponent }`.
12.6.2 New `StatusComponent` (standalone) + `status.service.ts` calling `GET {apiBase}/public/repair-request/status/{token}`. Add the API base to `environment.ts` (reuse existing `apiUrl`).
12.6.3 Render a **read-only timeline**: Otrzymano → Umówiono (with date) → Zakończono, highlighting current status; show masked plate + first name.
12.6.4 Handle 404/expired gracefully: friendly Polish message + shop contact (spec §12.2.9).
12.6.5 Tests: component renders each status correctly; 404 shows the fallback message; no console errors.

### Step 12.7 — Tests roll-up
Run new status-Lambda tests (`./mvnw test` in the new module), updated notification tests, and submission-portal `ng test`.

**Feature 12 acceptance:** the link in a confirmation/appointment email opens a status page showing correct, minimal info; unknown tokens show a friendly 404; the endpoint never returns email/phone/VIN.

---

# Feature 3 — Photo / attachment upload on the request

**Goal:** customer attaches up to 5 images to a submission; shop views them in admin. Per **D3**: images only (jpeg/png/webp), 5×10 MB, pre-signed GET, no CloudFront.

**Modules touched:** new pre-sign endpoint (extend consumer or new tiny Lambda), `repair-request-submitted-consumer` (persist + verify keys), `shop` (entity/DTO + admin read enrichment), both portals, plus AWS (S3 bucket).

### Step 3.1 — S3 bucket (infra/runbook)
3.1.1 Create private bucket `renocar-repair-request-uploads`, **Block Public Access ON**, **SSE-S3** encryption.
3.1.2 **CORS**: allow `PUT` + `GET` from `https://renocar-zgloszenie.pl`, headers `Content-Type`, expose none beyond defaults (spec §3.3.2).
3.1.3 **Lifecycle rule**: expire objects after **120 days** (cost + RODO minimisation, spec §3.3.3). Also expire incomplete/orphaned uploads.
3.1.4 Prefix convention: `uploads/{submissionUuid}/{fileUuid}.{ext}` — `submissionUuid` generated by the browser before upload.
3.1.5 Record bucket name/region/prefix in RUNBOOK.

### Step 3.2 — Pre-sign endpoint
3.2.1 Add `POST /api/repair-request/upload-urls` (extend the consumer Lambda with a second handler/route, or a small sibling Lambda — prefer extending the consumer project to avoid a new module). Request: `{ submissionId, files: [{ filename, contentType, sizeBytes }] }`.
3.2.2 **Validate**: ≤5 files; each `contentType` ∈ {image/jpeg, image/png, image/webp}; each `sizeBytes` ≤ 10 MB. Reject otherwise (400).
3.2.3 Generate a **pre-signed PUT URL** per file with **5-min expiry**, pinned `Content-Type`, and a **`Content-Length-Range`** condition enforcing the size cap (spec §3.3.5). Return `[{ key, url }]`.
3.2.4 IAM: signer role limited to `s3:PutObject` on `arn:.../uploads/*` (spec §3.3.4).
3.2.5 Tests: valid request → N URLs + keys; >5 files rejected; bad content-type rejected; oversize rejected.

### Step 3.3 — Persist + verify keys on submit
3.3.1 Extend `SubmitRepairRequestDto` (both consumer and shop copies — dual path §0.1) with `List<Attachment> attachments` where `Attachment = { key, contentType, sizeBytes, originalFilename }`.
3.3.2 In `RepairRequestItemConverter`, persist `attachments` (serialize to JSON string attribute, like `preferred_visit_windows`).
3.3.3 **Key verification** (spec §3.5.2, essential): before persisting, `HeadObject` each referenced key; ensure it exists under `uploads/{submissionId}/` and matches the declared content-type/size; drop or reject unknown keys. IAM: add `s3:GetObject`/`s3:ListBucket` (HeadObject needs `GetObject`) on the prefix to the consumer role.
3.3.4 Add `attachments` to `RepairRequest` entity + `RepairRequestDto` (shop) and admin TS model.
3.3.5 Tests: submit with valid keys → stored; submit referencing a non-existent key → that key rejected/omitted; submit with no attachments → unchanged behavior.

### Step 3.4 — Admin read (signed GET)
3.4.1 When admin fetches a request (`RepairRequestGetQueryHandler` / `RepairRequestInternalController.getRepairRequest`), enrich each attachment with a **short-lived (e.g. 15-min) pre-signed GET URL**. IAM: `s3:GetObject` on the prefix for the shop Lambda role.
3.4.2 Set `Content-Disposition: attachment` (or inline only for images) when generating URLs to avoid serving arbitrary content inline (spec §3.8.2).
3.4.3 Tests: DTO contains signed URLs for stored keys; empty when none.

### Step 3.5 — Frontend
3.5.1 **Submission form** (`repair-request-submission.component`): add a file input (accept images), client-side validation (type/size/count mirroring server), thumbnail previews, and orchestration: on submit → generate `submissionId` → request pre-sign URLs → PUT files (show progress) → include returned keys in the submit payload. Handle partial-upload failure (let the user retry/remove a file) (spec §3.6.1).
3.5.2 **Admin summary** (`repair-request-summary.component`): render thumbnails + open/download links from the signed GET URLs; simple lightbox optional.
3.5.3 Tests: form rejects >5 / wrong type / oversize before upload; happy path includes keys in payload; admin renders thumbnails.

### Step 3.6 — RODO / privacy
3.6.1 Add a line to the privacy policy / RODO consent covering image storage + 120-day retention (spec §3.8.3).
3.6.2 Note (future): a request-deletion flow must also delete the S3 objects (spec §3.8.7) — out of scope here, recorded as a follow-up.

**Feature 3 acceptance:** customer attaches ≤5 valid images that upload directly to S3; the submission stores verified keys; admin views thumbnails via signed URLs; oversize/wrong-type/forged-key inputs are rejected; objects expire after 120 days.

---

# §V — Verification (per feature + global)

### Local / CI build gates (run before any deploy)
- **Shop:** `cd car-repair-shop-backend/shop && ./mvnw test`
- **Submit consumer:** `cd car-repair-shop-backend/repair-request-submitted-consumer && ./mvnw test`
- **Status consumer (new):** `./mvnw test` in the new module
- **Notification Lambda:** `cd car-repair-shop-backend/new-repair-request-notification-lambda && ./gradlew test`
- **Admin portal:** `cd repair-requests-portal && npm ci && ng test && npm run build:admin-portal` (from root)
- **Submission portal:** `cd submission-portal && npm ci && ng test && npm run build:submission-portal` (from root)

### Feature 1 verification
1. With SES still in **sandbox**, submit a request using a **verified** test email → confirmation email arrives; shop SNS email also arrives; CloudWatch shows no errors.
2. Submit with a deliberately missing email payload → no SES send, no crash.
3. Inspect headers/body: UTF-8 Polish renders correctly; SPF/DKIM/DMARC pass (use mail-tester.com).
4. **Go-live gate:** SES production access granted (otherwise arbitrary customer emails silently fail).

### Feature 2 verification
1. From admin, set an appointment on a valid weekday → success; list + detail show it; customer receives appointment email with date/time.
2. Try an appointment on a weekend/unavailable day or in the past → server rejects (400) with a clear message.
3. Reschedule an existing `APPOINTMENT_MADE` → updates and re-sends email.
4. Mark a `NEW` request directly as handled → allowed; mark anything from `HANDLED` → rejected.
5. Open an old `APPOINTMENT_MADE` row created before this change → displays without error.

### Feature 12 verification
1. Submit → DynamoDB item has `tracking_token`; the email link `…/status/{token}` opens the status page with correct status, masked plate, first name only.
2. Hit the endpoint with a random/invalid token → generic 404; status page shows the friendly fallback.
3. Inspect the JSON response → **no** email/phone/VIN/issue/note fields present.
4. Refresh several times → served from cache where applicable; throttling rejects a rapid burst.

### Feature 3 verification
1. Attach 1–5 valid images → upload succeeds (network tab shows direct S3 PUTs), submission stores the keys, admin shows thumbnails via signed URLs.
2. Attach a 6th file / a non-image / a >10 MB file → blocked client-side and server-side.
3. Forge a submit payload with a key that was never uploaded → that key is rejected (HeadObject verification).
4. Confirm CORS works from the production origin (the classic failure mode); confirm objects carry an expiry.

### Global
- Re-run the **whole** test suite per module (not just changed-feature tests) to catch regressions (spec §8.8).
- Manual E2E against the live API Gateway for each public path: submit, upload-urls, status.
- Check CloudWatch logs/alarms for new Lambda errors/throttles and SES bounce/complaint rate.

---

# §D — Deployment

> No CI/CD or IaC in repo (D1). Deployments are **manual artifact uploads** + **console/CLI infra changes**, all recorded in `car-repair-shop-backend/infrastructure/RUNBOOK.md`.

### D.0 Pre-deploy (long-lead, do first)
- SES domain verified + **production access granted** (Feature 1 §1.1). This is the critical-path blocker.

### D.1 Order of deployment (respects dependencies)
1. **Infra-only, non-breaking, deploy early:**
   - SES identity, IAM for notification Lambda, bounce/complaint SNS (Feature 1).
   - S3 bucket + CORS + lifecycle + IAM (Feature 3).
   - GSI `TrackingTokenIndex` (Feature 12) — additive, build to Active.
2. **Token generation** (Feature 12 §12.1) — deploy consumer + shop jars that *write* `tracking_token`. Harmless before the reader exists.
3. **DynamoDB stream → `NEW_AND_OLD_IMAGES`** (Feature 2 §2.6) in a quiet window; **re-point the notification Lambda event-source mapping** to the new stream ARN. Verify an INSERT still triggers.
4. **Notification Lambda** (Features 1 + 2 + 12 emails): `./gradlew build` → upload `build/libs/*-all.jar`; set env vars (`SES_*`, `SNS_TOPIC_ARN`, `STATUS_BASE_URL`).
5. **Shop monolith jar** (Feature 2 API + Feature 3 admin read + token): `./mvnw package` → upload shaded jar to the shop Lambda.
6. **Submit consumer jar** (Feature 3 persist/verify, pre-sign route, token): `./mvnw package` → upload.
7. **Status consumer jar** (Feature 12): `./mvnw package` → upload; create the API Gateway route + throttling + IAM.
8. **API Gateway**: add `POST /api/repair-request/upload-urls` and `GET /api/public/repair-request/status/{token}`; deploy the stage.
9. **Frontends** (deploy together with their backend contracts — spec §8.3):
   - Admin portal (Feature 2 appointment UI + Feature 3 viewing): `npm run build:admin-portal` → publish `dist/`.
   - Submission portal (Feature 12 status page + Feature 3 upload): `npm run build:submission-portal` → publish `dist/`.

### D.2 Coordination notes
- **Feature 2 is a breaking API change** (`mark-as-appointment-made` now needs a body). Deploy the shop jar and the admin portal **together**.
- The **stream-type switch** (D.1.3) is the riskiest step — schedule it in a low-traffic window and verify before/after.
- Keep each step independently reversible (see rollback).

### D.3 Rollback
- **Lambda jars:** re-upload the previous jar (keep the prior artifact). Lambda versioning/aliases recommended.
- **Stream type:** reverting `NEW_AND_OLD_IMAGES`→`NEW_IMAGE` again rotates the stream ARN; only do if MODIFY handling misbehaves, and re-point the mapping.
- **GSI / S3 bucket / SES identity:** additive; leave in place on rollback (no harm). Disable the new API routes to fully revert customer-facing surface.
- **Frontends:** redeploy the previous `dist/`.

### D.4 Post-deploy monitoring (first 48h)
- CloudWatch: Lambda error/throttle alarms; notification-Lambda DLQ depth.
- SES: bounce + complaint rate (keep well under thresholds; a spike from typo'd emails can throttle the account).
- API Gateway: 4xx/5xx and throttle counts on the new public routes.
- Spot-check S3 object growth vs lifecycle expiry.

---

## Cross-references
- Architecture constraints & per-feature risks: `features-development-spec.md` §0–§12.
- Cost notes (all negligible except optional WAF, which we skip): spec §1.5, §2.6, §3.7, §12.4.
- RODO/GDPR thread (emails, photos+EXIF, public links): spec §8.5 — privacy-policy updates tracked in Features 1.6.3, 3.6, 12.5.5.
