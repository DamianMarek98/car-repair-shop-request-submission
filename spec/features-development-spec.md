# Features Development Specification

> **⚠️ CORRECTIONS NOTICE (2026-07-11).** The status-semantics assumptions in §0.5, section B1 and Feature 2 are **outdated**. Owner confirmed (2026-07-04): `HANDLED` = "Umówiono" (appointment booked), `APPOINTMENT_MADE` = "Zakończono" (visit done, terminal) — the live portal labels are correct; this document's model `NEW → APPOINTMENT_MADE → HANDLED` is inverted. **Before implementing F1/F2/F12, apply the corrections layer C1–C10 in [`02-product-and-growth-spec.md`](02-product-and-growth-spec.md) and follow [`00-master-plan.md`](00-master-plan.md).** In particular: the appointment date/body and appointment email belong on the transition **to `HANDLED`** (`mark-as-handled`), and the completion/review email on the transition **to `APPOINTMENT_MADE`**.

> Author perspective: Senior Software Engineer
> Date: 2026-06-13
> Scope: B1, B2, B4, 1 (customer confirmation email), 2 (capture agreed appointment date/time), 3 (photo upload), 12 (customer self-service status link)
> Platform: AWS (eu-north-1) — API Gateway + Lambda + DynamoDB + SNS, two Angular SPAs, static marketing site.

---

## 0. Architecture context (read before any work)

These facts are derived from the current code and constrain every feature below.

1. **There are two write paths for a repair request and they can drift.**
   - **Live submission path:** `submission-portal` → API Gateway (`5jq3oglx45...execute-api.eu-north-1`) → **`repair-request-submitted-consumer` Lambda** → `DynamoDbClient.putItem` directly into the `repair_request` table. Item shape is built by `RepairRequestItemConverter.toItem(...)`.
   - **Monolith path:** `shop` module has `RepairRequestSubmitController` → `SubmitNewRepairRequestHandler` → `RepairRequest.from(...)`. This persists via Spring Data DynamoDB and publishes an in-process `NewRepairRequestEvent`. This path is **not** the one the public form hits today, but it shares the table and the DTO shape.
   - **Implication:** any new persisted field (tracking token, appointment date, attachments) must be added in **both** `RepairRequestItemConverter` (consumer) **and** `RepairRequest` / `SubmitRepairRequestDto` (shop), or the two paths produce inconsistent items. This duplication is the single biggest source of risk in this spec.

2. **Notifications today use SNS topic → fixed email subscription** (`NewRepairRequestSubmittedTopic`, ARN hardcoded in `NewRepairRequestSubmittedSnsNotifier`). SNS email subscriptions only deliver to **pre-confirmed** addresses, so they **cannot** be used to email arbitrary customers. Customer-facing email (features 1 & 2) requires **Amazon SES**.

3. **The notification Lambda is DynamoDB-stream triggered** and currently only acts on `INSERT`. It is the natural, decoupled home for customer emails (INSERT → confirmation; MODIFY → appointment confirmation). This requires the stream to use **`NEW_AND_OLD_IMAGES`** so transitions can be detected.

4. **No IaC in repo.** `infrastructure/` is an empty scaffold; there is no SAM/CDK/Serverless template. All AWS resources (API Gateway routes, Lambda config, IAM, GSIs, stream settings, SNS) are configured **manually in the console**. Every infra change below is therefore a **manual, documented, console operation** and a deployment risk. Strongly recommend capturing new resources in IaC as part of this work (see §8).

5. **Status model is `NEW → APPOINTMENT_MADE → HANDLED`**, but the state machine (`NewRepairRequest.markAsAppointmentMade()`) calls *both* `markAsHandled()` and `maskAsAppointmentMade()`, and the admin label mapper has the labels **swapped** (B1). The semantics are currently muddled; feature 2 cleans this up.

6. **Region note:** SES is **not** available in `eu-north-1` (Stockholm) as a sending region historically — verify current availability; if unavailable, send via SES in `eu-west-1`/`eu-central-1` cross-region. This affects features 1, 2, 12.

---

## B1. Fix swapped status labels in admin portal ✅ DONE

### B1.1 Problem
`repair-requests-portal/src/app/commons/status-mapper.ts` maps:
- `APPOINTMENT_MADE` → `"Zakończono"` (Finished)
- `HANDLED` → `"Umówiono"` (Appointment made)

These are inverted relative to backend semantics. Workshop staff read the wrong status on every request and in the colour coding.

### B1.2 Operations
- [x] B1.2.1 In `mapStatus`: map `APPOINTMENT_MADE` → `"Umówiono"`, `HANDLED` → `"Zakończono"`.
- [x] B1.2.2 In `mapStatusToColor`: confirm the colour intent matches the corrected labels (currently `APPOINTMENT_MADE` green `#009933`, `HANDLED` grey `#e0e0d1`). Decide whether green should follow "Umówiono" (appointment booked) or "Zakończono" (done). Recommended: green = appointment made (actionable/positive), grey = closed. **Done: kept green=APPOINTMENT_MADE (Umówiono), grey=HANDLED (Zakończono) per decision.**
- [x] B1.2.3 Fix the `mapStatusToColor` `!status` branch — it returns the string `'Brak'` as a colour, which is invalid CSS. Return a neutral colour (e.g. `'#ffffff'` or `'transparent'`). **Done: returns `'transparent'`; also fixed the unknown-status fallback which returned `'NIEZNANY'` (same invalid-CSS bug).**
- [x] B1.2.4 Update unit tests in `repair-request-table.component.spec.ts` / add a dedicated `status-mapper` spec asserting the corrected mapping. **Done: added `status-mapper.spec.ts`.**

### B1.3 Risks / review
- Confirm the **definition of done** with the shop owner: which Polish word means "appointment booked" vs "request closed". Do not assume — the whole point is that the current code got it wrong.
- Search both portals for any other place that hardcodes these labels (grep `Zakończono`, `Umówiono`).
- No backend, no infra, no cost impact.

---

## B2. Remove artificial 5s delay on the admin request table ✅ DONE

### B2.1 Problem
`repair-request-table.component.ts:loadPage` wraps the search call in `this.sleep(5000).then(...)`. Every page load on the shop's most-used screen is delayed 5 seconds. Leftover debug code.

### B2.2 Operations
- [x] B2.2.1 Remove the `sleep(5000).then(...)` wrapper; call `repairRequestService.searchRequests(...)` directly inside `loadPage`.
- [x] B2.2.2 Delete the now-unused `sleep(ms)` helper.
- [x] B2.2.3 Keep the `loading` spinner state (set `true` before the call, `false` in both `next`/`error`). **Done: spinner state preserved.**
- [x] B2.2.4 Update/adjust any spec that relied on the delay (e.g. `tick(5000)` / `fakeAsync`). **N/A: existing table spec only asserts "should create"; no timing dependency.**

### B2.3 Risks / review
- Check there is no race the delay was masking (e.g. paginator `@ViewChild` setter running before data). The `set paginator` logic binds `_intl`; verify it still initialises on fast loads.
- No backend, no infra, no cost impact (marginally fewer Lambda warm-hold seconds — negligible).

---

## B4. Align plate-number validation across frontend and backend ✅ DONE (length-only, per decision)

### B4.1 Problem
Three sources disagree:
- Frontend (`repair-request-submission.component.ts`): `minLength(6), maxLength(8)`.
- Shop DTO (`SubmitRepairRequestDto`): `@Size(min = 6, max = 7)`.
- Consumer DTO (`SubmitRepairRequestDto` in consumer): `@Size(min = 6, max = 7)`.

A valid 8-char plate accepted by the form is rejected server-side (HTTP 400), and the latest commit ("Validation plate number 6-8 length") shows the **intended** rule is 6–8.

### B4.2 Decision required
- B4.2.1 Confirm the canonical rule. Polish plates are commonly 7–8 chars without spaces but can be shorter (4–8) for some series. Recommended canonical: **length 6–8, uppercase A–Z and digits, no whitespace** — but get sign-off, because legacy data may contain spaces.

### B4.3 Operations
- [x] B4.3.1 Update **both** backend DTOs to `@Size(min = 6, max = 8, ...)`. **Done: consumer + shop DTOs now `max = 8`, message updated to "6 to 8 characters".**
- [ ] B4.3.2 Add normalisation **before validation/persistence**: trim, remove internal spaces, uppercase. **SKIPPED per decision (length-only scope) — no change to stored format.**
- [ ] B4.3.3 Optionally add a `@Pattern` for allowed character set. **SKIPPED per decision.**
- [x] B4.3.4 Update frontend validators/messages to match the final rule; ensure the "VIN or plate" cross-field rule still holds. **N/A: frontend already validates 6–8 with a generic length message (no number to change); cross-field rule unchanged.**
- [ ] B4.3.5 Backfill consideration. **N/A: no normalisation introduced, existing rows unaffected.**

### B4.4 Risks / review
- Backend DTO duplication (consumer vs shop) — update both or drift returns.
- Changing stored format (normalisation) can break any exact-match lookups elsewhere; grep for `plateNumber` / `plate_number` usages.
- No infra, no cost impact.

---

## Feature 1 — Customer confirmation email on submission

### 1.1 Goal
Immediately after a successful submission, email the customer a confirmation ("we received request, we'll contact you", include a reference and — once feature 12 ships — a status link). Closes the biggest trust gap; reduces "did it go through?" calls.

### 1.2 Architecture decision
- Use **Amazon SES** (SNS cannot email arbitrary recipients).
- Trigger from the **`new-repair-request-notification-lambda`** on the DynamoDB-stream `INSERT` event (the customer email is already in the new image as `email`). This keeps email side-effects decoupled from the synchronous submit path, so a slow/failed email never blocks or fails the customer's submission.
- Keep the existing shop SNS notification as-is; add the SES customer email alongside it.

### 1.3 Prerequisites (infra / AWS)
- 1.3.1 **SES setup:** verify the sending domain (`renocar-zgloszenie.pl`) with DKIM + SPF + DMARC DNS records (Route53). Domain verification (not just a single from-address) is required for good deliverability.
- 1.3.2 **SES production access:** by default SES is in **sandbox** (can only send to verified addresses). Submit a production-access request (1–2 business days). Until granted, customer emails to arbitrary addresses will silently fail — **blocker for go-live**, plan ahead.
- 1.3.3 **Region:** confirm SES region; if `eu-north-1` lacks SES, configure the SES client in a supported region (e.g. `eu-west-1`). Cross-region call is fine.
- 1.3.4 **IAM:** add `ses:SendEmail` / `ses:SendRawEmail` to the notification Lambda's execution role, scoped to the verified identity ARN.
- 1.3.5 **DynamoDB stream view type:** ensure `NEW_AND_OLD_IMAGES` (needed anyway for feature 2). For feature 1, `NEW_IMAGE` suffices.

### 1.4 Code operations
- 1.4.1 Add SES SDK dependency to the notification Lambda `build.gradle` (`software.amazon.awssdk:ses` or `sesv2`, same `awsSdkVersion`).
- 1.4.2 Create `CustomerConfirmationEmailSender` (SES client wrapper) with constructor injection mirroring `NewRepairRequestSubmittedSnsNotifier` (real client + test-injectable client).
- 1.4.3 In the INSERT branch of `handleRequest`, read `email`, `submitter_first_name`, `id` from the new image; send a templated email. **Guard:** skip if `email` is missing/blank; never throw out of the loop (wrap in try/catch and log, exactly like the SNS path).
- 1.4.4 Build the email body (Polish). Use an **SES template** or an in-code HTML+text multipart. Include reference id and contact info. Leave a placeholder for the status link (feature 12).
- 1.4.5 Add a config for the from-address and reply-to (env var, not hardcoded — unlike the current hardcoded SNS ARN, which should also be moved to env in passing).
- 1.4.6 Tests: extend `NewRepairRequestSubmittedSnsNotifierTest` style — assert SES `SendEmailRequest` is built with correct destination/subject/body; assert no send when email absent; assert non-INSERT ignored; assert SES failure does not abort SNS send and vice-versa.

### 1.5 Cost (eu-north-1 scale: tens of emails/day)
- SES: **$0.10 per 1,000 emails** + ~$0.12/GB attachments (none here). Negligible (< a few cents/month).
- Extra Lambda compute per email: negligible (same invocation already running).
- CloudWatch logs: negligible.
- **Main cost is engineering + the SES production-access lead time, not AWS spend.**

### 1.6 Risks / review checklist
- 1.6.1 **Deliverability/spam:** without DKIM/SPF/DMARC the mail lands in spam. Verify DNS before launch; test against Gmail/Outlook/onet/wp.pl (Polish providers).
- 1.6.2 **Bounce/complaint handling:** SES enforces bounce/complaint rate thresholds. Subscribe an SNS topic to SES bounce/complaint notifications and monitor; high bounce rate (from typo'd customer emails) can get the account throttled/suspended.
- 1.6.3 **GDPR/RODO:** confirm the existing RODO consent text covers transactional email. Transactional (not marketing) confirmation is generally fine, but the privacy policy should mention it.
- 1.6.4 **Idempotency:** DynamoDB streams can deliver a record more than once and the Lambda retries on failure → risk of duplicate emails. Decide tolerance; if not acceptable, dedupe on the stream record `eventID` (e.g. a short-TTL marker) — but for this volume, at-least-once with rare dupes is likely acceptable. Document the decision.
- 1.6.5 **Failure isolation:** SES throttling/error must never fail the stream batch in a way that blocks the shop SNS notification or causes infinite ret# retries. Ensure errors are caught and logged; consider a DLQ on the Lambda.
- 1.6.6 **PII in logs:** the Lambda logs the full event today (`Received event:`/message). Customer email + name will be in CloudWatch. Reduce log verbosity or set log retention; flag for RODO.
- 1.6.7 **Localisation/encoding:** ensure UTF-8 for Polish diacritics in subject and body (SES requires explicit charset).

---

## Feature 2 — Capture the agreed appointment date/time

### 2.1 Goal
`APPOINTMENT_MADE` is currently a bare status flag with no scheduled datetime, so the shop can't see *when* anyone is coming and the customer is never told the agreed slot. Add a real `appointmentAt` (date + time, optionally end time) captured when staff confirm an appointment; surface it in the admin detail/list and feed the customer confirmation email (combine with feature 1) and the status link (feature 12).

### 2.2 Data model changes (`repair_request` table)
- 2.2.1 New attributes: `appointment_at` (ISO datetime, stored like `submittedAt`), optional `appointment_end_at`, and optional `appointment_note` (free text from staff, e.g. bay/advisor).
- 2.2.2 No new key/index required for core feature (looked up by `id`). DynamoDB is schemaless so no migration needed for storage; existing rows simply lack the attribute (treat null as "not scheduled").
- 2.2.3 Update `RepairRequest` entity (`@DynamoDBAttribute` + `LocalDateTimeConverter`), `RepairRequestDto`, `RepairRequestListItem` (add appointment date so the list/table can show it), and the admin `RepairRequest`/list-item TS models.

### 2.3 Backend operations
- 2.3.1 **Clean up the state transition.** Today `NewRepairRequest.markAsAppointmentMade()` calls both `markAsHandled()` and `maskAsAppointmentMade()`, conflating "appointment booked" with "handled". Redefine:
  - `markAsAppointmentMade(appointmentAt, note)` → sets `status = APPOINTMENT_MADE`, sets `appointmentAt`, does **not** set `handledAt`.
  - `markAsHandled()` → sets `status = HANDLED`, sets `handledAt`.
  - Review `RepairRequestState` subclasses (`NewRepairRequest`, `AppointmentMadeRepairRequest`, `HandledRepairRequest`) and the `RepairRequestStateFactory` for the allowed transitions; forbid illegal ones (e.g. handling a request with no appointment if business rules require it — confirm with shop).
- 2.3.2 Change `POST /api/internal/repair-request/{id}/mark-as-appointment-made` to accept a body `{ appointmentAt, appointmentEndAt?, note? }`. Validate: not in the past, within working hours, not on an `UnavailableDay`/weekend (reuse `UnavailableDayFacade`). Return updated DTO.
- 2.3.3 `MarkAsAppointmentMadeCommandHandler.handle(id, command)` updated accordingly; persist via `RepairRequestRepository`.
- 2.3.4 Decide whether re-scheduling (changing `appointmentAt` after it's set) is allowed and whether it re-triggers the customer email. Recommended: allow edit while status `APPOINTMENT_MADE`, re-send updated confirmation.

### 2.4 Frontend operations (admin portal)
- 2.4.1 Replace the bare "mark as appointment made" button with a small form/dialog: date picker (reuse Material datepicker; disable weekends + unavailable days like the public form), from/to time selects (reuse the `times` list), optional note.
- 2.4.2 Show `appointmentAt` in `repair-request-summary` and as a column in `repair-request-table` (with the existing `toBrowserTimeZone` conversion — note current UTC→local handling).
- 2.4.3 Update `repair-request-service.ts` to send the body.

### 2.5 Customer notification (depends on Feature 1 infra)
- 2.5.1 On the DynamoDB stream **MODIFY** event, the notification Lambda detects `status` changed to `APPOINTMENT_MADE` (compare old vs new image — requires `NEW_AND_OLD_IMAGES`) and `appointment_at` present, then sends the customer an "appointment confirmed for <date/time>" SES email.
- 2.5.2 Guard against re-sends on unrelated MODIFY events (only send when the appointment fields actually changed).

### 2.6 Cost
- DynamoDB: a few extra attributes per item — negligible storage; same WCU on update.
- Stream now processes MODIFY events too (previously ignored) → slightly more Lambda invocations, still trivial at this volume.
- SES email per appointment — negligible (see 1.5).

### 2.7 Risks / review checklist
- 2.7.1 **Dual write path drift** (see §0.1): the consumer-Lambda submit path doesn't set appointment fields (correct — appointments are set later via the monolith's internal API), but ensure the monolith update path is the only one touching `appointment_at`.
- 2.7.2 **Timezone correctness.** `submittedAt` is stored UTC; frontends convert with ad-hoc string surgery (`replace(/\.\d+/, '')` + `'Z'`). Appointment times are local (Europe/Warsaw) business hours — define and document the storage convention (recommend store UTC, render Europe/Warsaw) and reuse one consistent conversion. Off-by-one/DST bugs are likely if this is sloppy.
- 2.7.3 **Validation against availability:** an appointment set on an unavailable/closed day is a real-world failure; enforce server-side, not just UI.
- 2.7.4 **State-machine regression:** existing data has `APPOINTMENT_MADE`/`HANDLED` rows created under the old conflated logic. Verify the new transitions don't break display of historical rows (which may have `handledAt` set even though status is `APPOINTMENT_MADE`).
- 2.7.5 **Backward compatibility of the API:** changing the endpoint to require a body breaks the current admin frontend until redeployed together; coordinate deploy.
- 2.7.6 Confirm with shop whether they actually want to enter the slot in this tool, or just in their on-site local app (the brief notes they run on-site software). If they double-enter, adoption suffers — validate the workflow first.

---

## Feature 3 — Photo / attachment upload on the request

### 3.1 Goal
Let the customer attach photos (damage, dashboard light, part) to a submission so the shop can triage and pre-order parts. Improves description quality and feeds the parts-scraper workflow.

### 3.2 Architecture decision
- Store files in a dedicated **S3 bucket**, not DynamoDB (item size limit 400 KB; images are larger).
- Upload **directly from the browser to S3 using pre-signed URLs** — do not proxy image bytes through Lambda (avoids Lambda payload limits, memory, and cost). Flow:
  1. Browser requests N pre-signed PUT URLs from a small public endpoint (new lightweight Lambda or an addition to the submit API) given file count/types/sizes.
  2. Browser PUTs files to S3 under a per-submission prefix (e.g. a client-generated UUID).
  3. Browser submits the repair request including the list of uploaded object keys.
  4. The submit (consumer Lambda) stores the keys/URLs on the item.
- Admin portal renders thumbnails/links via pre-signed **GET** URLs (or CloudFront with signed URLs).

### 3.3 Infra / AWS
- 3.3.1 Create S3 bucket `renocar-repair-request-uploads` (private, Block Public Access ON). Server-side encryption (SSE-S3 or SSE-KMS).
- 3.3.2 **CORS** config on the bucket to allow PUT from `https://renocar-zgloszenie.pl` with the needed headers.
- 3.3.3 **Lifecycle policy:** auto-expire objects after a retention window (e.g. 90–180 days) — controls cost and supports RODO data minimisation.
- 3.3.4 **IAM:** the pre-sign Lambda needs `s3:PutObject` (for PUT pre-sign) on the upload prefix; the admin read path needs `s3:GetObject`. Scope tightly to the bucket/prefix. Pre-signed URLs inherit the signer's permissions, so the signer role must be least-privilege.
- 3.3.5 Pre-signed URL constraints: short expiry (e.g. 5 min), enforce `Content-Type` and a **max size** via `Content-Length-Range` policy conditions to prevent abuse/huge uploads.
- 3.3.6 Optional: CloudFront in front of the bucket for admin viewing; otherwise pre-signed GET URLs are sufficient at this scale.

### 3.4 Data model
- 3.4.1 New attribute `attachments` on `repair_request`: list of objects `{ key, contentType, sizeBytes, originalFilename }`. Add to `RepairRequestItemConverter`, `RepairRequest`, DTOs, and TS models.
- 3.4.2 Do **not** store public URLs (bucket is private); store keys and generate signed GETs on read.

### 3.5 Backend operations
- 3.5.1 New endpoint (public, throttled): `POST /api/repair-request/upload-urls` → returns pre-signed PUT URLs + the keys. Validate count (e.g. ≤5), declared content-type (image/jpeg, image/png, image/webp, maybe application/pdf), and size cap.
- 3.5.2 On submit, the consumer Lambda must **verify** the referenced keys actually exist in S3 under the expected prefix before persisting (prevents storing dangling/forged keys). `HeadObject` per key.
- 3.5.3 New internal read endpoint or DTO enrichment: when admin fetches a request, return signed GET URLs (short expiry) for each attachment.

### 3.6 Frontend operations
- 3.6.1 Submission form: add a file input with client-side validation (type, size, count), preview thumbnails, progress, and the request→PUT→submit orchestration. Handle partial-upload failure gracefully.
- 3.6.2 Admin summary: render thumbnails/lightbox + download links from signed URLs.

### 3.7 Cost (low volume)
- S3 storage: ~$0.023/GB-month (eu-north-1 ~similar) — trivial; lifecycle expiry keeps it bounded.
- PUT/GET requests: fractions of a cent.
- Data transfer out (admin viewing): small; first cost driver if many large images viewed repeatedly — CloudFront caching mitigates if needed.
- Extra Lambda for pre-signing: negligible.
- **Overall: a few cents to low single-digit dollars/month at this scale.**

### 3.8 Risks / review checklist
- 3.8.1 **Abuse of public pre-sign endpoint:** anyone could request URLs and dump files. Mitigate with throttling (API Gateway), size/type/count limits in the policy, lifecycle expiry, and (ideally) the same anti-spam control added for submissions (CAPTCHA). Orphaned uploads (URLs requested, request never submitted) must be lifecycle-expired.
- 3.8.2 **Content safety / malware:** files uploaded by the public. At minimum restrict content-types and size; consider not executing/serving inline (force download, set `Content-Disposition`). Antivirus scanning (e.g. Lambda + ClamAV / GuardDuty Malware Protection for S3) is optional but worth noting for staff safety.
- 3.8.3 **EXIF / privacy:** phone photos carry GPS EXIF. RODO-relevant; consider stripping metadata, and cover image storage in the privacy policy + retention.
- 3.8.4 **CORS misconfig** is the most common failure mode — test the full browser PUT path early.
- 3.8.5 **Key verification on submit** (3.5.2) is essential, else the DB can reference non-existent objects.
- 3.8.6 **Dual write path** again: only the consumer path needs attachment persistence for the public form, but keep `RepairRequest`/DTO in sync.
- 3.8.7 Decide deletion semantics: deleting a request (future RODO feature) must also delete S3 objects.

---

## Feature 12 — Customer self-service status link

### 12.1 Goal
Give the customer a tokenised URL ("track your request") to view status (received → appointment booked for <date> → completed) without calling the shop or authenticating. Reduces inbound calls; pairs with features 1 & 2 (link embedded in emails).

### 12.2 Architecture & infrastructure (designed in detail per request)

**High-level flow**
```
Email (SES)  ──contains──▶  https://renocar-zgloszenie.pl/status/{token}
                                        │
                          submission-portal Angular route /status/:token
                                        │  GET /api/public/repair-request/status/{token}
                                        ▼
                         API Gateway (public, throttled, WAF)
                                        │  (no auth)
                                        ▼
                       status-read Lambda (new, lightweight, cold-start isolated)
                                        │  Query GSI: TrackingTokenIndex
                                        ▼
                          DynamoDB repair_request table
```

**Why a dedicated public read Lambda (not the monolith):**
- The shop monolith is JWT-protected and intended for admin only; exposing it publicly widens attack surface and couples public traffic to the heavier monolith cold start.
- A tiny dedicated Lambda mirrors the existing pattern (consumer + notification Lambdas are deliberately separate for cold-start isolation per CLAUDE.md).

**Token design**
- 12.2.1 Generate a **cryptographically random, unguessable token** at submission (≥128-bit, URL-safe; e.g. `UUIDv4` is acceptable, a 256-bit random base64url is stronger). Store as `tracking_token` attribute.
- 12.2.2 The token is the capability — anyone with the link can view. Therefore return **only minimal data** (status, appointment datetime, submitted date, maybe first name + masked plate). Never return full PII (email, phone, full VIN) over this endpoint.
- 12.2.3 Consider a token **expiry / TTL** (e.g. valid 90 days, or until 30 days after `HANDLED`) and/or pairing token with a second factor (last 4 of plate) for sensitive deployments — likely overkill here; document the choice.

**DynamoDB access pattern**
- 12.2.4 Add a **Global Secondary Index `TrackingTokenIndex`** (hash key = `tracking_token`, project only the fields the status page needs — `KEYS_ONLY` + a follow-up `GetItem`, or `INCLUDE` the needed attributes to avoid a second read). A GSI is required because you can't query a non-key attribute; avoid table `Scan`.
- 12.2.5 Provisioned vs on-demand: match the table's existing mode. GSI inherits cost implications (extra storage + write amplification on every item write).

**API Gateway**
- 12.2.6 New public route `GET /api/public/repair-request/status/{token}` → status-read Lambda. CORS for `https://renocar-zgloszenie.pl`.
- 12.2.7 **Throttling / WAF:** because it's public and token-guessing is the threat, set a low rate limit and consider AWS WAF rate-based rules. Return generic `404` for unknown/expired tokens (no enumeration signal).

**Frontend (submission-portal)**
- 12.2.8 New route `/status/:token` + a `StatusComponent` showing a read-only timeline. New service method `getStatus(token)`. New env entry if a different API base is used.
- 12.2.9 Handle not-found/expired gracefully ("link expired or invalid, please contact the shop").

### 12.3 Code operations
- 12.3.1 Add `tracking_token` generation to **`RepairRequestItemConverter`** (consumer path) and `RepairRequest.from` (monolith path). Backfill existing rows with tokens via a one-off script if you want old requests to be trackable (optional).
- 12.3.2 New Lambda module `repair-request-status-consumer` (Maven, shaded jar — mirror the consumer Lambda project): handler queries `TrackingTokenIndex`, maps to a **public-safe DTO**, returns 200/404.
- 12.3.3 IAM role: `dynamodb:Query` on `TrackingTokenIndex` only.
- 12.3.4 Embed the status URL into the SES emails from features 1 & 2.
- 12.3.5 Tests: token lookup hit/miss/expired; ensure no PII leakage in the response DTO.

### 12.4 Cost
- DynamoDB GSI: extra storage (~item size × rows, tiny) + **write cost on every item write** (GSI is updated on each put/update) — at tens/day, negligible. Reads via Query are single-digit RCU.
- New Lambda + API Gateway requests: negligible at this volume; API Gateway REST is ~$3.50/million requests, HTTP API cheaper — well under a dollar/month.
- WAF (if enabled): WAF has a base monthly cost (~$5/web ACL + rule costs) — **the only non-trivial recurring cost in this whole spec.** Decide whether throttling at API Gateway alone is sufficient (likely yes at this scale) and skip WAF to avoid the fixed fee.

### 12.5 Risks / review checklist
- 12.5.1 **Token enumeration / IDOR:** the entire security model rests on token unguessability + minimal data exposure. Do not use sequential ids or the DynamoDB `id` as the token. Return generic 404s.
- 12.5.2 **PII exposure:** explicitly define the public DTO; review it adversarially. Masked plate, first name only, status, appointment date. No email/phone/VIN/full address.
- 12.5.3 **GSI write amplification & throttling:** every write now writes to the GSI; if the table is provisioned with tight capacity a hot GSI partition (all on `dummyPartitionKey` pattern is already a concern in the existing `SubmittedAtIndex`) could throttle. Use a high-cardinality key (the token itself is high-cardinality — good).
- 12.5.4 **Caching:** consider short CDN/`Cache-Control` so repeated refreshes don't hit Lambda; balance against showing stale status.
- 12.5.5 **Link longevity vs RODO:** a permanent public link to personal-ish data conflicts with data minimisation; pair with retention/expiry (12.2.3) and the future deletion feature.
- 12.5.6 **Dual write path drift** (token must be generated on whichever path actually runs — the consumer Lambda is the live one; the monolith path must not create tokenless rows if it's ever used).
- 12.5.7 New Lambda cold start on a customer-facing read — acceptable, but if status pages are rare the Lambda will almost always cold-start (~hundreds of ms for Java). Consider a lighter runtime (the status reader is trivial — could be Node/Python to cut cold start, at the cost of a new language in the stack) or provisioned concurrency (adds cost — likely not worth it).

---

## 8. Cross-cutting concerns & global review checklist

- 8.1 **Infrastructure as Code:** with no SAM/CDK in repo, every resource above (SES identities, S3 bucket+policy+CORS+lifecycle, GSI, new Lambda, API routes, IAM, stream config, WAF) is a manual console change — error-prone and undocumented. **Strong recommendation:** introduce SAM or CDK for the new resources at minimum, and document manual steps in a runbook. This is itself a meaningful effort line item.
- 8.2 **DynamoDB stream view type** must become `NEW_AND_OLD_IMAGES` (features 1 & 2). Changing it may require recreating the stream → reattach the Lambda trigger; verify no events are lost during the switch.
- 8.3 **Deployment coordination:** features 2 and B4 change both backend and frontend contracts; deploy together or behind tolerant validation to avoid breaking the live form/portal.
- 8.4 **Secrets/config hygiene:** several values are hardcoded today (SNS ARN, account id, CORS origin). Move new config (SES from-address, bucket name, region) to env vars / SSM Parameter Store; do not add more hardcoded ARNs.
- 8.5 **RODO/GDPR thread runs through 1, 3, 12:** new personal data flows (email sends, photos with EXIF, public status links). Update the privacy policy, set retention/lifecycle, restrict CloudWatch log retention and PII logging.
- 8.6 **Anti-spam (B3 from the review, not in this scope) is a soft dependency:** features 1 (email send cost/bounce risk) and 3 (public upload) get worse if the public endpoints stay unthrottled. Sequence a basic CAPTCHA/throttle alongside.
- 8.7 **Monitoring:** add CloudWatch alarms on Lambda errors/throttles, SES bounce/complaint rates, and DLQs for the notification Lambda before relying on these in production.
- 8.8 **Testing matrix:** unit (handlers/converters/mappers), contract (DTO shape across both write paths), and a manual E2E across the live API Gateway for each public path (submit, upload, status). The existing tests are Mockito-based unit tests — extend in kind.

---

## 9. Suggested sequencing

1. **B1, B2, B4** — hours each, no infra; ship first (B1 actively misleads staff).
2. **SES foundation** (1.3) — kick off domain verification + production access *early* (lead time), then Feature 1.
3. **Feature 2** — appointment date + state-machine cleanup; combine its customer email with Feature 1's SES work.
4. **Feature 12** — depends on SES (for the link) and benefits from Features 1/2 being live.
5. **Feature 3** — independent; can run in parallel once S3/IaC is in place.

---

## 10. Critical self-review of this specification

The following issues with the spec above were identified on review; adjustments are folded into the sections (kept here as the rationale/changelog).

- **10.1 Feature 1's hard dependency was understated.** The original framing treated "send a customer email" as a small add-on. In reality **SES domain verification + production-access approval is a multi-day, external-to-code blocker**, and SES may not exist in `eu-north-1`. Adjustment: §1.3 now lists this as a prerequisite/blocker and §0.6 + §9.2 tell you to start it first. Without this, the feature cannot ship regardless of code readiness.

- **10.2 The dual write-path drift risk was the most important thing and is easy to miss.** Every persisted-field feature (1's token reuse, 2, 3, 12) touches **two** code locations (consumer Lambda converter + monolith entity/DTO). Adjustment: promoted to §0.1 and repeated as a risk in each feature. If a reader implements only the consumer path they'll be right for the live form but leave a latent bug.

- **10.3 Feature 2 quietly requires fixing a pre-existing bug.** The `markAsAppointmentMade()` → `markAsHandled()` conflation means you cannot cleanly add an appointment date without untangling the state machine. Original draft treated feature 2 as additive. Adjustment: §2.3.1 makes the state-machine cleanup an explicit, mandatory sub-task and §2.7.4 flags historical-data impact.

- **10.4 Stream view type is a shared, breaking infra change.** Features 1 and 2 both need MODIFY/old-image data; flipping the stream type can drop in-flight events and must be coordinated. Adjustment: pulled into §8.2 as a cross-cutting item rather than buried in feature 2.

- **10.5 WAF cost was the only real recurring AWS cost and was nearly recommended by default.** At tens of requests/day, a ~$5+/month WAF web ACL likely outweighs its benefit versus free API Gateway throttling. Adjustment: §12.4/§12.5 now say API Gateway throttling is probably sufficient and WAF is optional — avoid the fixed fee unless abuse appears.

- **10.6 Photo upload's biggest risk is operational, not architectural.** The pre-signed-URL design is standard; the real failure modes are **CORS misconfiguration, orphaned/abusive uploads, and unverified keys**. Adjustment: §3.5.2 (key verification) and §3.8.1/§3.8.4 emphasise these over the (well-understood) upload mechanics.

- **10.7 Adoption risk for features 2 (and partly 12) was missing.** The brief states the shop already runs an on-site local application for all processes. If staff must re-enter appointment data here, they won't. Adjustment: §2.7.6 adds an explicit "validate the workflow with the shop before building" gate — a product risk a senior engineer should surface, not assume away.

- **10.8 Cold-start for the new public status Lambda (Java) undercuts the UX goal.** A rarely-hit Java Lambda almost always cold-starts; a "fast status check" that takes a second is a weak win. Adjustment: §12.5.7 raises the trade-off (lighter runtime vs provisioned concurrency vs accept it) rather than silently shipping a slow path.

- **10.9 Effort/ordering realism.** SES lead time and the (recommended) IaC introduction (§8.1) are real schedule items that aren't "features." The sequencing in §9 front-loads the zero-infra fixes (B1/B2/B4) and the long-lead SES setup so calendar time isn't wasted waiting on AWS approvals.
