# Engineering Remediation Specification

> **Document:** `spec/01-engineering-remediation-spec.md`
> **Author perspective:** Senior Software Engineer
> **Date:** 2026-07-11
> **Primary input:** `docs/engineering-capabilities-review.md` (§7 risk register; §8 recommendations Q1–Q6 / M1–M7 / S1–S5)
> **Authoritative overrides:** `docs/consultancy-summary.md` §"Owner answers received (2026-07-04)"
> **Coordinates with:** `features-development-spec.md` + `features-implementation-plan.md` (Features 1, 2, 12, 3)
> **Sibling spec:** `spec/02-product-and-growth-spec.md` — owns product/growth items **G1–G9** and the feature-plan **corrections C1–C10** (status-semantics re-keying of Feature 2, anti-spam, analytics, review emails…). Overlaps are **cross-referenced from here, never duplicated**.
> **Rule of this document:** spec only — no application code was changed. Every claim below was re-verified against the working tree on 2026-07-11; where reality differs from the review, the item specs against reality and flags the discrepancy.

---

## 0. How to read this spec

- **Tiers:** A = critical hotfixes (this week), B = hardening (this month), C = strategic (quarter+).
- **Effort:** S = hours, M = days, L = week+.
- **IDs** are stable (`E1`…`E18`); reference them in commits/PRs. `Gx`/`Cx` IDs refer to `spec/02-product-and-growth-spec.md`.
- Owner-confirmed facts that drive priorities:
  1. **Production `/submit` is the consumer Lambda** (`repair-request-submitted-consumer/`) — its validation bugs are live production bugs. Fix there first (E1).
  2. **The credential-bearing zip never left the shop PC** — rotation urgency is *low*, but rotation is still required (E3).
  3. **Status semantics:** `HANDLED` = "Umówiono" (client contacted, appointment booked); `APPOINTMENT_MADE` = "Zakończono" (visit done, terminal). The live mapper is correct; the enum *names* are misleading. Per owner preference: **document, do not rename** — this adjusts review recommendation S2 (see E16 and spec/02 C9).

### 0.1 Verification results — review claims vs. actual code

All key review claims were re-verified against source. Confirmed as stated (exact current locations):

| Claim | Verified at |
|---|---|
| Decorative `@NotNull` (AWS SDK doc annotation, not a Jakarta constraint) | `car-repair-shop-backend/repair-request-submitted-consumer/src/main/java/car/repair/shop/SubmitRepairRequestDto.java:6` |
| `timeSlots().stream()` without null guard → NPE → 502 | `.../repair-request-submitted-consumer/.../RepairRequestItemConverter.java:19-21` (shop null-guards the same input at `shop/.../repair/request/RepairRequest.java:90`) |
| Full-payload PII logged twice | `.../RepairRequestSubmittedHandler.java:43` (`"Received event: " + input`) and `:55` (`"Storing repair request: " + request` — full `PutItemRequest` incl. name/email/phone/plate/description) |
| `JsonProcessingException` → 500 instead of 400 | `.../RepairRequestSubmittedHandler.java:59-61` |
| Dead double `withHeaders` (first map overwritten) | `.../RepairRequestSubmittedHandler.java:90` overwritten by `:92-97` |
| Hardcoded table name / CORS origin | `.../RepairRequestSubmittedHandler.java:52` (`"repair_request"`), `:94` (`https://renocar-zgloszenie.pl`) |
| JWT logged on every authenticated request | `car-repair-shop-backend/shop/src/main/java/car/repair/shop/auth/JwtAuthFilter.java:38` (`log.info("found token: {}", token)`) |
| Hardcoded SNS topic ARN + AWS account ID `009160054371` | `car-repair-shop-backend/new-repair-request-notification-lambda/src/main/java/car/repair/shop/notification/NewRepairRequestSubmittedSnsNotifier.java:15` |
| Scraper `.gitignore` misses session-cookie dirs | `car-parts-scraper/.gitignore` has `.browser-data/` but not `.browser-data-apcat/`, `.browser-data-auto-partner/`, `.browser-data-inter-cars/` (all three exist, untracked, in the working tree) |
| Broken `cache-dependency-path` (shell `if` inside a YAML string → caching no-op) | `.github/workflows/deploy-frontend.yml:30-35`; Node 20 pinned at `:28`; long-lived IAM keys at `:56-57`; no tests before `s3 sync` |
| `production: false` + raw execute-api URL in the file used for prod builds | `submission-portal/src/environments/environment.ts` and `repair-requests-portal/src/environments/environment.ts` (both: `production: false`, `https://5jq3oglx45.execute-api.eu-north-1.amazonaws.com/v1/api`) |
| CORS: trailing-slash origins + localhost origins **in prod** + execute-api self-origin, with `allowCredentials(true)` | `car-repair-shop-backend/shop/src/main/java/car/repair/shop/config/SecurityConfig.java:73` |
| Committed local admin password + JWT secret | `car-repair-shop-backend/shop/src/main/resources/application-local.properties:8-10` (`renocar` / `12345` / 32-hex key) |
| ai-chat: default password, SYSDBA default DSN, unenforced SQL timeout | `car-repair-shop-ai-chat/app/config.py:8` (`APP_PASSWORD = "workshop2024"`), `:5` (`SYSDBA:masterkey`), `:11` (`SQL_TIMEOUT_SECONDS` defined); `app/database.py:72-91` (`run_query` sets no timeout); plaintext `==` compare at `ui/streamlit_app.py:54` |
| Credentials in shipped bundle / patch / local branch | `renocar-win-package/dist/server.js:184-201` (real fallbacks for all three vendors — values deliberately not reproduced here), same in untracked `car-parts-scraper/dist/server.js`; `unnamed.patch` at repo root (exists, 1.5 KB); local branch `car-parts-scrapper-improvements` (exists; **not** on origin — verified against `git branch -r`). Tracked `car-parts-scraper/src/server.ts:76-77,132-133,188-189` correctly falls back to `''` |
| Un-versioned software | `git ls-files` empty for: `car-repair-shop-ai-chat/` (whole module), `renocar-win-package/`, `car-parts-scraper/src/browserSessionManager.ts`; also untracked: root `CLAUDE.md`, all 7 module `CLAUDE.md`s, `docs/`, `.claude/`, `features-development-spec.md`, `features-implementation-plan.md`, root `package-lock.json` |
| `javax.validation` silent no-op under Boot 3 | `car-repair-shop-backend/shop/src/main/java/car/repair/shop/config/properties/AwsConfigurationProperties.java:8` (`javax.validation.constraints.NotBlank`); enabler dependency `shop/pom.xml:35-36` (`validation-api:2.0.1.Final`) |
| Lambda-inert `@Scheduled` cleaner (never fires; `unavailable_day` grows forever) | `car-repair-shop-backend/shop/src/main/java/car/repair/shop/availability/PastUnavailableDaysCleaner.java:17` |
| Generic `Exception` → `e.getMessage()` leaked with the 500 | `car-repair-shop-backend/shop/src/main/java/car/repair/shop/config/GlobalExceptionHandler.java:23-26` |
| Vestigial event system | `shop/.../repair/request/SubmitNewRepairRequestHandler.java:21` publishes `NewRepairRequestEvent`; no listener anywhere in `src/main` (grep-verified); `AppointmentMadeEvent`/`RepairRequestHandledEvent` never published |
| `infrastructure/` empty; CDK branch has no CDK | `car-repair-shop-backend/infrastructure/` — empty dirs, no `pom.xml`, no sources |

**Discrepancies / findings beyond the review** (items below spec against reality):

1. **Additional live 5xx bug the review missed:** `RepairRequestItemConverter.java:29` writes `plate_number` **unconditionally**, unlike `vin` which is null-guarded (`:26-28`). A null plate produces an `AttributeValue` with no member set, which real DynamoDB rejects (`ValidationException`) — uncaught (the handler catches only `JsonProcessingException` and `ConstraintViolationException`) → Lambda error → API Gateway 502. The existing test even pins the broken behavior against a mock (`RepairRequestSubmittedHandlerTest.java:88` asserts `item.get("plate_number").s()` is null). Covered by E1.
2. **Fix nuance the review's Q3 would get wrong:** mechanically switching the import to `jakarta.validation.constraints.NotNull` would make the `@NotNull` on `plateNumber` (`SubmitRepairRequestDto.java:29`) *enforced*, rejecting VIN-only submissions that the shop deliberately accepts (shop's DTO at `shop/.../controller/dto/SubmitRepairRequestDto.java:15` has **no** `@NotNull` on `plateNumber`; vin-or-plate is a manual rule on both sides). The fix must **drop** `@NotNull` from `plateNumber` while making the others real — see E1.
3. **Mitigating context:** the live form marks `plateNumber` as `Validators.required` (`submission-portal/src/app/repair-request-submission/repair-request-submission.component.ts:61`) and always sends a `timeSlots` array, so browser traffic doesn't hit the null paths today. The bugs are reachable by any direct POST to the public endpoint — still production bugs (and spec/02 G2 notes bots will find them), just lower observed impact.
4. **Trailing-slash CORS origins are functional, not dead:** Spring Framework's `CorsConfiguration.checkOrigin` trims trailing slashes on both sides (since 5.3), so `https://renocar-zgloszenie.pl/` at `SecurityConfig.java:73` does match browser `Origin` headers. E6's cleanup is hygiene; the **localhost origins in prod** are the real exposure.
5. **`features-development-spec.md` conflicts with the owner-confirmed status semantics.** Its §B1 (marked DONE) records the *opposite* label mapping of what is live and confirmed correct (`repair-requests-portal/src/app/commons/status-mapper.ts`: `HANDLED`→"Umówiono", `APPOINTMENT_MADE`→"Zakończono"), and its §0.5 states the flow as `NEW → APPOINTMENT_MADE → HANDLED` whereas the code implements `NEW → HANDLED → APPOINTMENT_MADE` (`NewRepairRequest.java:16-19`, `HandledRepairRequest.java:17`) — coherent under the confirmed semantics (booked → done). Consequence: Feature 2's appointment capture/email as planned is keyed to the wrong enum value. **The full correction layer is owned by spec/02 Part A (C1–C8)** — this spec only enforces its sequencing (see §0.2 and E16) and does not restate it.
6. Minor line drifts vs. the review (content confirmed): SNS ARN at line 15 (review said 16); table name at line 52 (not 53); `GlobalExceptionHandler` generic handler at 23-26 (not 27-30); ai-chat password at `config.py:8` / compare at `streamlit_app.py:54`; win-package credentials at `dist/server.js:184-201` (not 184-202).

### 0.2 Coordination map — feature plan and spec/02 (read before sequencing)

| This spec | Overlaps with | Rule |
|---|---|---|
| E1 (consumer validation fix) | spec/02 **C10** lists the same fix as a prerequisite for **G2** (anti-spam) and F1, deferring the details | **E1 is the authoritative fix spec.** Ship E1 before or together with G2; G2's `captchaToken` DTO field later joins the E10 contract fixtures. |
| Anti-spam / localStorage lockout removal | spec/02 **G2** | Owned entirely by G2 — not specified here, despite being review §8.6-adjacent. |
| E5 (env-var extraction) | Feature 1 Step 1.4.3 (`SNS_TOPIC_ARN`) and spec/02 G2 (`TURNSTILE_SECRET_KEY`) | **Do each once.** Whichever lands first implements the var; others rebase. Canonical names: `SNS_TOPIC_ARN`, `REPAIR_REQUEST_TABLE_NAME`, `ALLOWED_ORIGIN`, and (reserved for F1/12/G2) `SES_REGION`, `SES_FROM`, `SES_REPLY_TO`, `STATUS_BASE_URL`, `TURNSTILE_SECRET_KEY`. |
| E2 (PII logging) | Feature 1 Step 1.4.4 (notification-Lambda log verbosity) | E2 covers consumer + shop now; the notification Lambda's name-bearing log line (`NewRepairRequestSubmittedSnsNotifier.java:34`) is cleaned when F1 touches that file. |
| E9 (alarms + DLQ) | Feature plan Step 1.6.4 ("optional DLQ") + §D.4; SES bounce/complaint topic is F1 Step 1.1.5 | E9 makes the DLQ **mandatory** and adds alarms **before** F1/F2 make the Lambda customer-facing. SES-specific monitoring stays with F1. |
| E10 (contract tests) | F1/F2/F3/F12 + G1/G2 all add fields to the duplicated DTOs/converters (`tracking_token`, `attachments`, `appointment_*`, `completed_at` (C4), `marketing_consent` (G1), `captchaToken` (G2)) | **E10 must land before any of those fields.** Rule: every new persisted field starts as a fixture + item-shape change (see E10 step 5). |
| E11 (DynamoDB TTL) | Feature 2 Step 2.6 (stream view type `NEW_AND_OLD_IMAGES`, maintenance window); spec/02 C4 (`completed_at` as future retention clock) | Do the TTL enablement in the **same maintenance window** as the stream switch. TTL `REMOVE` stream events must be excluded by C5's MODIFY guards (flagged there via "anything else → no email" — verify explicitly). |
| E14 (IaC) | Feature-plan decision **D1** ("manual runbook, no SAM/CDK") conflicts with review M1 | Keep D1 for the feature rollout; create `car-repair-shop-backend/infrastructure/RUNBOOK.md` now (plan Step 1.1.6 requires it anyway); E14 codifies the runbook afterwards. |
| E16 (monolith cleanup) | spec/02 **C1–C9** own the Feature-2 state-machine/label corrections; C3 already renames the `maskAs…` typo; C9 owns the enum-semantics documentation | E16 keeps only what spec/02 doesn't cover: delete the duplicate submit path + vestigial events + Lambda-hostile leftovers. E16 item ordering defers to C1–C8 landing with Feature 2. |
| E7 (`environment.ts` + workflow) | Feature 12 Step 12.6.2 reuses `environment.apiUrl`; spec/02 G3 adds analytics to the portal | Land E7 first so both build on the corrected environment file. |

---

# Tier A — Critical hotfixes (do this week)

## E1 — Fix the production submit Lambda: enforceable validation, null-safety, correct status codes

**Effort:** S (~half a day incl. tests) · **Closes:** review Risk #4 (High), review Q3 · **Cross-ref:** spec/02 C10 (prerequisite for G2/F1)

### Problem (verified)

Production `/submit` is the consumer Lambda (owner-confirmed). In `car-repair-shop-backend/repair-request-submitted-consumer/src/main/java/car/repair/shop/`:

1. `SubmitRepairRequestDto.java:6` imports `software.amazon.awssdk.annotations.NotNull` — a documentation annotation Hibernate Validator ignores. `@Email`/`@Pattern`/`@Size` all pass on `null`, so a POST with null `firstName`/`lastName`/`email`/`phoneNumber`/`issueDescription` **passes validation**. Only the manual rodo / vin-or-plate checks (`RepairRequestSubmittedHandler.java:80-84`) are real.
2. `RepairRequestItemConverter.java:19-21` — `timeSlots().stream()` with no null guard → NPE → uncaught → **502** for a payload shape the shop DTO treats as legal (shop null-guards at `RepairRequest.java:90`).
3. **(New finding, §0.1-1)** `RepairRequestItemConverter.java:29` writes `plate_number` unconditionally → empty `AttributeValue` on null plate → DynamoDB `ValidationException` → uncaught → **502**.
4. `RepairRequestSubmittedHandler.java:59-61` maps `JsonProcessingException` (malformed *client* JSON) to **500**.
5. `RepairRequestSubmittedHandler.java:88-97` — dead first `.withHeaders(...)` call (`:90`), overwritten at `:92`.
6. No catch-all: any `SdkException` (DynamoDB throttle/outage) escapes → API Gateway 502 **without CORS headers** — the browser can't even read the error.

### Fix specification

All in the consumer module (per the `backend-lambda-work` skill: mirror shop; **never** add a shop dependency).

1. `SubmitRepairRequestDto.java`:
   - Replace the import with `jakarta.validation.constraints.NotNull`.
   - Keep `@NotNull` on `issueDescription`, `firstName`, `lastName`, `email`, `phoneNumber`, and on `TimeSlotDto.date` — field-for-field identical to shop's DTO.
   - **Remove `@NotNull` from `plateNumber`** (shop has none; VIN-only must stay valid — the vin-or-plate rule at `RepairRequestSubmittedHandler.java:82` is the guard). Resolves review §2.2 item 3's divergence in shop's favor.
   - Delete the stale class Javadoc line "validation annotations are not applied here" (it documents the bug).
2. `RepairRequestItemConverter.java`:
   - Null-guard `timeSlots` exactly like shop: `dto.timeSlots() == null ? List.of() : dto.timeSlots().stream().map(PreferredVisitWindow::from).toList()`.
   - Wrap `plate_number` in the same conditional as `vin` (`if (dto.plateNumber() != null) …`). Attribute names must not change (notification Lambda + shop entity read them).
3. `RepairRequestSubmittedHandler.java`:
   - `JsonProcessingException` → `BAD_REQUEST_STATUS` with a **generic** body (`"Malformed request body"` — never echo `e.getMessage()`, which can reflect attacker input).
   - Add a final `catch (Exception e)` → 500 with generic `"Internal error"` body (log exception class + `context.getAwsRequestId()` only — see E2), so infrastructure failures return a CORS-bearing 500 instead of a bare 502.
   - Remove the dead first `.withHeaders(...)` in `createResponse`.
   - Optional while here: return **201** on success (the portal's subscribe handler accepts any 2xx — verify before changing; otherwise keep 200).
4. Update `repair-request-submitted-consumer/CLAUDE.md`'s "Known drift" paragraph (it documents the pre-fix state) and tick the sync table.

### Test plan — tests that would have caught each bug (add to `RepairRequestSubmittedHandlerTest`, reusing its `SubmitRepairRequestDtoBuilder`)

1. `givenNullRequiredField_shouldReturn400` — parameterized over `firstName`, `lastName`, `email`, `phoneNumber`, `issueDescription`: valid request minus the field → 400, body names the field, `putItem` never called. *(Catches bug 1 — today these return 200.)*
2. `givenNullTimeSlots_shouldReturn200AndStoreEmptyVisitWindows` — builder without `withTimeSlots` (null) → 200; captured item `preferred_visit_windows == "[]"`. *(Catches bug 2 — today NPEs.)*
3. `givenVinOnlyRequest_shouldOmitPlateNumberAttribute` — null plate + valid VIN → 200; `assertThat(item).doesNotContainKey("plate_number")`. Also update the existing assertion at `RepairRequestSubmittedHandlerTest.java:88` (`assertNull(item.get("plate_number").s())`) to the same form. *(Catches bug 3.)*
4. `givenMalformedJson_shouldReturn400` — replaces the existing `givenInvalidJsonInBody_shouldReturn500AndLogError` expectation: 400, generic message, no `putItem`. *(Catches bug 4.)*
5. `givenDynamoDbThrows_shouldReturn500WithCorsHeaders` — mock `putItem` to throw `SdkException` → 500 and headers contain `Access-Control-Allow-Origin`. *(Catches bug 6.)*
6. `responseHeaders_containAllCorsHeaders` — single headers map has all four expected keys. *(Guards the double-`withHeaders` removal.)*
7. Regression: full suite green; plate-only and vin-only accepted; rodo=false still 400.

Gate: `cd car-repair-shop-backend/repair-request-submitted-consumer && mvn test && mvn package` (no Docker). Deploy the shaded jar; live smoke: valid payload → 2xx + appears in admin portal; null-email payload → 400; VIN-only payload → 2xx.

### Dependencies / sequencing
None — ship first, alone. Prerequisite for spec/02 G2 (per C10) and for F1 (emails would otherwise be sent to `null`). Deliberately not blocked on E10.

### Risk if not done
Garbage rows (null name/email/phone) pollute the portal and break F1/F2 customer emails; legal payload shapes 502; every direct-API 502 is a lost customer; G2's bot traffic would hammer the NPE path.

### Acceptance criteria
All new tests pass; consumer DTO annotations diff-identical to shop's (packages/imports aside); live endpoint behaves per the smoke matrix above.

---

## E2 — Stop logging JWTs and PII; set CloudWatch log retention

**Effort:** S · **Closes:** review Risk #5 (High), review Q4; GDPR/RODO exposure

### Problem (verified)

- `shop/.../auth/JwtAuthFilter.java:38` — `log.info("found token: {}", token)` writes every valid bearer token (valid 24 h — `JwtHelper` `DAYS = 1`) to CloudWatch on **every authenticated request**. Log read access = receptionist impersonation.
- Consumer logs the full submission twice: `RepairRequestSubmittedHandler.java:43` (raw event incl. body) and `:55` (full `PutItemRequest`).
- No log retention configured anywhere (no IaC; console state unverifiable from repo — OQ-2) → default *never expire*: PII persists indefinitely.

### Fix specification

1. `JwtAuthFilter.java`: **delete line 38** (no masking — the token has zero support value). Downgrade `:40` (`extracted username`) and `:54` (`authenticated user`) to `log.debug`.
2. `RepairRequestSubmittedHandler.java`:
   - `:43` → `"Received submit request, requestId=" + context.getAwsRequestId()`.
   - `:55` → log only the generated item `id` (read it from the item map before `putItem`).
   - Keep the violation logging at `:75-76` — it logs property paths + messages, not values (verified: current messages embed no user input).
3. Notification Lambda `:34` (message contains the customer's name): acceptable short-term; removed by F1 Step 1.4.4 (§0.2).
4. **Runbook** (create `car-repair-shop-backend/infrastructure/RUNBOOK.md`; function names from OQ-2):
   ```
   aws logs put-retention-policy --log-group-name /aws/lambda/<fn> --retention-in-days 90
   ```
   for all three Lambdas (90 days default; owner may choose 30 — RODO minimisation vs. debugging).
5. Because tokens were logged historically: **rotate the production JWT secret** (shop Lambda env) once retention is set — invalidates anything harvested from old logs. One-time receptionist logout; coordinate. (Joined by an admin-password change if OQ-3 answers "reused".)

### Test plan
- `JwtAuthFilterTest` (existing suite, 10 tests): add a Logback `ListAppender` test asserting **no log event contains the token substring** for an authenticated request.
- Consumer: `verify(mockLogger, never()).log(contains("test@test.com"))` on the happy path; adjust the pinned call-count at `RepairRequestSubmittedHandlerTest.java:102` (`times(3)`).
- Manual post-deploy: submit once, log in once; grep both log streams for the email and `found token` — zero hits; `aws logs describe-log-groups` shows `retentionInDays: 90`.

### Dependencies / sequencing
Independent. Deploy the consumer changes in the same jar release as E1.

### Risk if not done
Session hijack via log access; indefinite PII retention contradicts the RODO consent the form collects; F1 multiplies the leaked surface (customer emails in the same logs).

### Acceptance criteria
No token/full-payload lines in fresh streams; 90-day retention on all three groups; JWT secret rotated; tests green.

---

## E3 — Vendor credential rotation runbook + clean Windows bundle

**Effort:** S (calendar-spread by vendor round-trips) · **Closes:** review Risk #1, review Q1 · **Owner context:** zip never left the shop PC → urgency low, rotation still required

### Problem (verified)

Real Inter Cars / APCAT / Auto-Partner credentials exist as code fallbacks in `renocar-win-package/dist/server.js:184-201`, in untracked build output `car-parts-scraper/dist/server.js`, in `unnamed.patch` (repo root), and in commits on local branch `car-parts-scrapper-improvements` (not pushed — verified). Tracked `car-parts-scraper/src/server.ts` correctly falls back to `''`. `start.bat` sets no env vars, so a clean rebuild today produces a bundle that **cannot log in** — this is the `refresh-win-package` skill's **SECURITY GATE**, which explicitly requires an owner decision on the credential mechanism before the next refresh.

### Fix specification (ordered runbook)

1. **Owner decision (blocking — the skill's gate, OQ-4):** credential mechanism on the shop PC. Recommended: a git-ignored `credentials.bat` beside `start.bat` (`set INTERCARS_EMAIL=…` etc., created manually on the PC); `start.bat` gains `if exist credentials.bat call credentials.bat`. Canonical env-var names per `car-parts-scraper/CLAUDE.md`: `INTERCARS_EMAIL`, `INTERCARS_PASSWORD`, `APCAT_USERNAME`, `APCAT_PASSWORD`, `AUTO_PARTNER_USERNAME`, `AUTO_PARTNER_PASSWORD`.
2. **Rotate at all three vendors.** Record the date (not values) in the runbook.
3. **Purge local copies:** delete `unnamed.patch`; delete `car-parts-scraper/dist/` (rebuilt on demand). Branch `car-parts-scrapper-improvements`: if E4 confirms its work is already in the working tree, `git branch -D`; otherwise cherry-pick onto a fresh branch amending the credential commit to the env-fallback version, then delete the old branch. **Never push it unscrubbed.** Delete `.browser-data-*` dirs after rotation (cookies of the old logins; recreated on next login).
4. **Rebuild the bundle** via the `refresh-win-package` skill procedure (build scraper → replace `renocar-win-package/dist/` → sync manifest → re-zip), with the `start.bat` change from step 1. Before zipping, grep the whole bundle for the *old* credential strings — must be zero hits.
5. **Ship** the zip to the shop PC; create `credentials.bat` there with the **new** credentials; run `start.bat`; verify one search per vendor tab (the skill's verify step — no automated test exists for the bundle).
6. Confirm the **old** credentials no longer log in at each vendor (positive rotation proof).

### Test plan
Step 4's grep + step 5's on-PC smoke + step 6's negative login check. (Parser CI tests arrive with E12.)

### Dependencies / sequencing
Step 1 blocks 4–5; steps 2–3 start immediately. **Blocks E4's win-package commit** (committing `renocar-win-package/` pre-rebuild would put live credentials into git history permanently). E12's `127.0.0.1` bind change should ride the same rebuild/PC visit.

### Risk if not done
Standing plaintext credentials with ordering capability at three suppliers; any future `git add -A && git push` or zip re-share converts a local exposure into a real leak.

### Acceptance criteria
Old credentials rejected by all three vendors; no credential strings in the working tree, bundle, or any branch; scraper works on the shop PC via `credentials.bat`; runbook section written.

---

## E4 — Version-control hygiene: commit the un-versioned software, fix the `.gitignore`s

**Effort:** S · **Closes:** review Risk #2 (Critical), review Q2

### Problem (verified)

Untracked: the entire `car-repair-shop-ai-chat/` module, `renocar-win-package/`, `car-parts-scraper/src/browserSessionManager.ts` (the shipped bundle depends on it — no reproducible link between the shipped zip and any commit), root `CLAUDE.md` + all 7 module `CLAUDE.md`s, `docs/` (all consultancy deliverables), `.claude/` (skills), both root planning docs, root `package-lock.json`. Root `.gitignore` is a Java template (no `.DS_Store`/`.idea/`/`.venv/`/`target/`/`build/` coverage) → `git status` is permanently noisy, which is exactly how `unnamed.patch` survived. `car-parts-scraper/.gitignore` misses the three live session-cookie dirs. Local branches `car-parts-scrapper-improvements` and `ai-workshop-chat` are unpushed.

### Fix specification

1. **Replace root `.gitignore`:**
   ```gitignore
   # OS / IDE
   .DS_Store
   .idea/
   *.iml

   # Python
   .venv/
   __pycache__/

   # Node
   node_modules/

   # Build output
   target/
   build/
   .gradle/
   dependency-reduced-pom.xml
   *.class
   *.log
   hs_err_pid*
   replay_pid*

   # Packaged artifacts (rebuilt from source; the win zip may contain credentials)
   *.zip
   *.jar
   *.war
   !**/gradle-wrapper.jar

   # Scraper browser sessions (live logged-in cookies — never commit)
   .browser-data*/
   ```
   (`!**/gradle-wrapper.jar` protects the tracked notification-Lambda wrapper jar — verified tracked.)
2. **`car-parts-scraper/.gitignore`** — add `.browser-data-*/` (covers `-apcat`, `-auto-partner`, `-inter-cars`; keep existing entries).
3. **Commit, in two waves:**
   - **3a (immediately):** `browserSessionManager.ts`; root + module `CLAUDE.md`s; `docs/`; `.claude/`; `features-development-spec.md`; `features-implementation-plan.md`; root `package-lock.json`; `car-repair-shop-ai-chat/` — first add `car-repair-shop-ai-chat/.gitignore` (`__pycache__/`, `.env`, `*.fdb`) and confirm no `.env` exists in it (verified: none). Note: `config.py`'s default password is committed with it — E13 removes it; acceptable interim since it's the module's already-documented default.
   - **3b (gated by E3 step 4):** `renocar-win-package/` — track `start.bat`, `package.json`, docs; add `renocar-win-package/.gitignore` (`node/`, `node_modules/`, `dist/`). This satisfies "commit the win package minus credentials" without repo bloat: reproducibility comes from tracked sources + the `refresh-win-package` skill, not from committing build output or the portable Node runtime. The zip stays ignored.
4. **Branches:** push `ai-workshop-chat` (verify with `git show --stat` it holds only the plan commit, no secrets); handle `car-parts-scrapper-improvements` per E3 step 3, then push or fold into main.
5. Delete junk: stray `.DS_Store` files, `httpdocs/images/home-slider/backup/` (untracked slider backups — delete; originals exist).
6. Push all; verify `git status --porcelain` is empty on a fresh checkout.

### Test plan
- Clean `git clone` + the `build-and-test-platform` skill procedure: every module builds from the clone alone — in particular `cd car-parts-scraper && npm install && npm run build` must compile `browserSessionManager.ts`, and `pip install -r requirements.txt && pytest` must pass in ai-chat.
- `git log --all -p -- '*server.ts'` contains no credential strings on any pushed branch.

### Dependencies / sequencing
Steps 1–2 **before** E3's scrub (so session dirs can't be staged mid-work); 3b after E3. Everything else immediate.

### Risk if not done
One disk failure permanently loses the AI-chat module, the session manager, and all planning/consultancy work; the noisy `git status` keeps hiding the next `unnamed.patch`.

### Acceptance criteria
Clean status; clean clone builds all modules; branches pushed or deliberately deleted; no credentials in any pushed history.

---

# Tier B — Hardening (this month)

## E5 — Externalize hardcoded config + fix the silent `javax` validation trap

**Effort:** S–M · **Review items:** Q5 (part), §4.5 inventory

### Problem (verified)
- `NewRepairRequestSubmittedSnsNotifier.java:15` hardcodes the topic ARN incl. AWS account id `009160054371` (account-id leak; blocks env re-creation).
- `RepairRequestSubmittedHandler.java:52` hardcodes table `"repair_request"`; `:94` hardcodes the CORS origin.
- `AwsConfigurationProperties.java:8` imports `javax.validation.constraints.NotBlank` under Boot 3 / Hibernate Validator 8 → guards silently never enforced; enabled by `javax.validation:validation-api:2.0.1.Final` (`shop/pom.xml:35-36`). Verified: this is the **only** `javax.validation` import in `shop/src/main`.

### Fix specification
1. **Notification Lambda:** `TOPIC_ARN` → env `SNS_TOPIC_ARN` (constructor-injectable for tests — the dual-constructor pattern already exists); fail fast with an actionable message if unset. **This *is* Feature 1 Step 1.4.3 — implement once** (§0.2). Set the env var on the Lambda (runbook).
2. **Consumer:** table → env `REPAIR_REQUEST_TABLE_NAME` (default `"repair_request"`); CORS origin → env `ALLOWED_ORIGIN` (default current value). Defaults keep existing deployments working with zero console changes. (`TURNSTILE_SECRET_KEY` arrives with G2 — same pattern, don't pre-build.)
3. **Shop:** switch `AwsConfigurationProperties.java:8` to `jakarta.validation.constraints.NotBlank`; remove the `javax.validation:validation-api` dependency from `shop/pom.xml`; fix any compile fallout.
4. Record the reserved env-var names (§0.2 list) in the runbook so F1/F12/G2 don't invent variants.
5. Update `new-repair-request-notification-lambda/CLAUDE.md` and the `backend-lambda-work` skill (both currently document the hardcoded ARN as fact).

### Test plan
- Notifier test: explicit-ARN constructor → `PublishRequest.topicArn()` matches; missing ARN → constructor throws with clear message.
- Consumer test: table-name override respected in `PutItemRequest.tableName()`.
- Shop: context test proving a blank `car.repair.shop.aws.region` now **fails startup** (proves `@NotBlank` is live); full `mvn test` (Docker/LocalStack).

### Dependencies / sequencing
Item 1 coordinates with F1 (§0.2); items 2–3 independent, safe now.

### Risk if not done
Account-id leak; unreproducible env; config typos boot silently in prod instead of failing fast; F1 duplicates the env-var work.

### Acceptance criteria
No literal ARN/account-id in source; env vars live on the deployed Lambdas; shop fails fast on blank required properties; tests green.

---

## E6 — CORS cleanup + generic error messages (shop)

**Effort:** S · **Review items:** Q5 (rest), risk #9 (part)

### Problem (verified)
`SecurityConfig.java:73` allows, with `allowCredentials(true)`: `http://localhost:4201`, `http://localhost:4200` (**in production**), trailing-slash variants of both prod domains, and the API's own execute-api host (meaningless as a browser origin). **Discrepancy vs review (§0.1-4):** the trailing-slash entries are functional (Spring trims trailing slashes) — hygiene, not outage; localhost-in-prod is the real exposure. `GlobalExceptionHandler.java:23-26` returns `e.getMessage()` of **any** `Exception` with the 500 — internal-detail leakage.

### Fix specification
1. Origins → property `car.repair.shop.cors.allowed-origins` (comma-separated) read into the `corsConfigurer` bean. Prod Lambda env: exactly `https://renocar-zgloszenie.pl,https://portal.renocar-zgloszenie.pl` (no slashes). `application-local.properties`: the two localhost origins. Delete the execute-api entry everywhere.
2. `handleGenericException` → constant `"Internal server error"` body + `log.error("Unhandled exception", e)`. Keep the specific handlers' messages (intentional user-facing validation text).
3. 10-minute production check (review §4.5): after deploy, verify preflight + requests from the deployed admin portal still succeed (API Gateway may add its own CORS layer invisible in the repo).

### Test plan
- MockMvc CORS test (the controller-layer test the review notes is missing): preflight with `Origin: https://portal.renocar-zgloszenie.pl` → allowed; `Origin: http://localhost:4200` under the prod property → no CORS headers.
- Handler unit test: `RuntimeException("table repair_request not reachable")` → body exactly `"Internal server error"`.

### Dependencies / sequencing
Independent; any shop release; verify item 3 immediately after deploy.

### Risk if not done
A stolen admin token is usable from any local dev page (credentialed CORS); 500 bodies teach attackers the stack.

### Acceptance criteria
Prod list = the two prod origins; localhost works locally only; generic 500 body; tests green.

---

## E7 — Honest prod frontend config + a deploy workflow that works

**Effort:** S–M · **Review item:** Q6

### Problem (verified)
Both portals' prod `environment.ts`: `production: false` and the raw execute-api URL — an API Gateway re-creation breaks both deployed frontends until rebuild. `deploy-frontend.yml:30-35`: shell `if` inside the `cache-dependency-path` YAML string → setup-node treats it as literal globs → caching silently no-op; `:28` Node 20 (EOL 2026-04); no tests before `s3 sync`; long-lived IAM keys (`:56-57` — OIDC swap in E8).

### Fix specification
1. Both `environment.ts`: `production: true`; `apiUrl` behind a custom API domain — runbook: API Gateway custom domain `api.renocar-zgloszenie.pl` (ACM cert in the API region, Route53 alias, base-path mapping to stage `v1`) → `apiUrl: 'https://api.renocar-zgloszenie.pl/api'`. If the owner defers the domain (OQ-7): minimum change now = `production: true` + extract the URL to one exported constant per app.
2. `deploy-frontend.yml`:
   - Fix caching with static multi-path globs:
     ```yaml
     cache-dependency-path: |
       submission-portal/package-lock.json
       repair-requests-portal/package-lock.json
     ```
   - `node-version: 22`.
   - Add a pre-build test step for the selected project: `ng test --watch=false --browsers=ChromeHeadless`.
3. Post-deploy verification: submit a test request; log into the admin portal.

### Test plan
Run `workflow_dispatch` per project: second run shows a cache hit in the setup-node log; a branch with a deliberately failing spec blocks deploy (then revert).

### Dependencies / sequencing
Before Feature 12's status page and spec/02 G3's portal analytics (both build on `environment.ts`). Domain entry feeds E14's import list.

### Risk if not done
Prod ships dev flags; an API Gateway re-creation is a same-day two-frontend outage; CI deploys untested code while pretending to cache.

### Acceptance criteria
`production: true` in shipped bundles; portals function (on the custom domain if OQ-7 approves); cache hit visible; failing test blocks deploy.

---

## E8 — CI for every module + dependency scanning + OIDC

**Effort:** M · **Review item:** M2 · **Closes:** part of risks #6/#10 (unwatched modules)

### Problem (verified)
`.github/workflows/maven.yml` builds **only** `shop` (push/PR to main). Consumer, notification Lambda, both portals, scraper, ai-chat: no CI. No Dependabot/Renovate/`npm audit` anywhere (`.github/` holds just the two workflows). Deploy uses long-lived AWS keys.

### Fix specification
1. New `ci.yml`, path-filtered jobs on PR + push to main:
   - `shop`: `mvn -B test` (Testcontainers/LocalStack runs on ubuntu runners — Docker available).
   - `submit-consumer`: `mvn -B test`; `notification-lambda`: `./gradlew test` (wrapper tracked).
   - both portals: `npm ci && ng test --watch=false --browsers=ChromeHeadless && npm run build:prod`.
   - `scraper`: `npm ci && npm run build` (+ `npm test` once E12 lands).
   - `ai-chat`: `pip install -r requirements.txt && pytest` (safety tests need no DB/LLM — verified).
2. `dependabot.yml`: ecosystems `maven` (shop, consumer), `gradle`, `npm` (portals, scraper, root), `pip`, `github-actions`; weekly; grouped minor/patch.
3. `npm audit --audit-level=high` as a non-blocking report step (blocking after E15 burns the backlog).
4. **OIDC:** IAM role trusting GitHub's OIDC provider, scoped to this repo/workflow; `role-to-assume` in `deploy-frontend.yml`; delete the IAM user keys after cutover. Runbook: role ARN + trust policy.

### Test plan
PR touching each module triggers exactly its job; a deliberately broken consumer test fails its job; first Dependabot PRs arrive; deploy succeeds via OIDC with the old secrets removed from the repo settings.

### Dependencies / sequencing
After E4 (ai-chat must exist in git). E7's test step folds in. Do early — it protects all later work (E10–E17, features).

### Risk if not done
The modules where all upcoming feature work happens stay outside any safety net — E1/E10's tests run only when someone remembers.

### Acceptance criteria
Seven green module jobs from a clean clone; Dependabot active; deploys via OIDC; long-lived keys deleted.

---

## E9 — Alarms + DLQ: make silent failure loud

**Effort:** M · **Review items:** M3, risk #7

### Problem (verified)
`NewRepairRequestSubmittedSnsNotifier.java:39-41` swallows per-record publish errors (right for batch survival, but the failure is invisible). No DLQ, no alarms exist anywhere. A dead SNS topic or stuck stream = the shop silently stops hearing about new customers; post-F1, customers silently stop getting confirmations.

### Fix specification (console/CLI runbook now; codified by E14)
1. **DLQ:** SQS `notification-lambda-dlq`; on the DynamoDB event-source mapping set `--maximum-retry-attempts 3 --destination-config OnFailure=<dlq-arn>`.
2. **Alarms** (actions → new SNS topic `ops-alerts`, email per OQ-8):
   - `Errors > 0` on each of the three Lambdas (5-min period).
   - `IteratorAge > 10 min` on the notification mapping.
   - DLQ `ApproximateNumberOfMessagesVisible > 0`.
   - `NumberOfNotificationsFailed > 0` on the existing notification topic.
3. **Minimal code change:** keep per-record swallowing, but give the catch log line a stable prefix (`"ERROR publishing SNS message"`) + CloudWatch **metric filter** → custom metric → alarm. Zero new SDK dependencies.
4. While in the console: verify the shop's SNS email subscription is still confirmed (review open question #8).
5. SES bounce/complaint monitoring is **not** here — it ships with F1 Step 1.1.5 (§0.2).

### Test plan
- Unit: throwing `SnsClient` on record 1 of 2 still publishes record 2 (pin existing behavior).
- Live drill: invoke with `SNS_TOPIC_ARN` (post-E5) pointed at a nonexistent topic → alarm fires within one period → email received; revert.

### Dependencies / sequencing
After E5 (env ARN makes the drill safe). **Before F1/F2 go-live** — plan §D.4 assumes this exists; plan Step 1.6.4's "optional DLQ" becomes mandatory here.

### Risk if not done
Lost submissions/notifications discovered "by absence of business"; F1's customer emails fail just as silently.

### Acceptance criteria
Drill produces an alert email; DLQ wired; every ARN in the runbook; alarms steady in `OK`.

---

## E10 — Contract tests for the duplicated submit contract (before any new fields)

**Effort:** M · **Review items:** M4, risk #8

### Problem (verified)
The submit contract lives in 4+ hand-synced copies (shop DTO, consumer DTO, two Angular model/validator sets, plus the item shape in shop `@DynamoDBAttribute`s vs. consumer `RepairRequestItemConverter`) and **has already diverged** (E1's `plateNumber`; the decorative `@NotNull`; the historic plate 6–7 vs 6–8). F1/F2/F3/F12 + spec/02 G1/G2 add `tracking_token`, `appointment_*`, `completed_at`, `attachments`, `marketing_consent`, `captchaToken` to the same copies — drift risk multiplies per field.

### Fix specification
Review M4 offers "shared module or contract tests". **Chosen: contract tests via shared JSON fixtures.** A shared `repair-request-contract` Maven module is rejected: `backend-lambda-work` forbids the Lambdas depending on shop code (cold-start isolation), and a third release-coupled artifact is heavy for a two-implementation contract.

1. New `car-repair-shop-backend/submit-contract-fixtures/`:
   - `valid/*.json` — payloads both validators must **accept**: full payload; vin-only; plate-only; null `timeSlots`; empty `timeSlots`; asap; 8-char plate.
   - `invalid/*.json` — payloads both must **reject**, each with an `expectedViolation` key: null email / bad email / bad phone / 16-char vin / 5-char plate / 501-char description / `rodo=false` / no vin + no plate / null firstName….
   - `item-shape.json` — canonical attribute-name list: `id`, `dummyPartitionKey`, `vin?`, `plate_number?`, `issue_description`, `submitter_first_name`, `submitter_last_name`, `email`, `phone_number`, `asap`, `rodo`, `submittedAt`, `status_value`, `preferred_visit_windows`.
2. **Consumer** `SubmitContractTest`: each fixture through Bean Validation + the manual rules + (valid ones) `RepairRequestItemConverter.toItem`; assert verdicts match and produced keys ⊆ `item-shape.json`. Fixtures loaded via `${project.basedir}/../submit-contract-fixtures` (plain relative path; modules stay build-independent).
3. **Shop** `SubmitContractTest`: same fixtures through the shop `Validator` + `RepairRequest.from(...)`; assert identical verdicts; reflectively assert the entity's `@DynamoDBAttribute` names ⊆ `item-shape.json`.
4. **Notification Lambda** test: the attribute names it reads (`submitter_first_name`, `submitter_last_name`; later `email`, `tracking_token`) exist in `item-shape.json` (guards the contract's third consumer).
5. **Process rule** (add to the `backend-lambda-work` skill): *every new persisted field starts as a fixture + item-shape change*; the failing contract tests in both modules then drive the implementations. Binding for F1/F2/F3/F12 and spec/02 G1/G2 field additions (incl. non-persisted `captchaToken`: fixture `valid/` cases gain the token key; item-shape must **not** — asserting it never leaks into the item).

### Test plan
The item is tests. Meta-verification: temporarily set the consumer plate max to 7 → consumer contract suite fails while shop's passes (drift demonstrably caught). Wire both suites into E8 CI.

### Dependencies / sequencing
After E1 (fix the divergence, then pin it). **Hard prerequisite for Feature 12 Step 12.1 and Feature 3 Step 3.3** (first planned field additions) and for G1/G2's DTO changes. Enforced by E8.

### Risk if not done
Every feature field lands in one copy and silently not the other; the next `d4079e4`-class bug ships to customers.

### Acceptance criteria
Both suites consume the same fixtures and pass; the mutation check fails as designed; skill doc carries the fixture-first rule.

---

## E11 — Data retention: DynamoDB TTL + retire the Lambda-inert scheduled cleaner

**Effort:** M · **Review items:** M7; §6 GDPR thread

### Problem (verified)
No TTL exists in code or in the table notes (`shop/src/main/resources/dynamodb/*.txt`) despite the README's promised storage "for a given period of time". `PastUnavailableDaysCleaner.java:17` uses `@Scheduled(cron = "0 0 0 * * SUN")` — never fires in Lambda (no long-lived JVM) → `unavailable_day` grows forever and is `findAll`-scanned on **every public form load**.

### Fix specification
1. **Owner input first (OQ-1):** retention period for repair requests. Working placeholder: 24 months.
2. `repair_request`: numeric `expires_at` (epoch seconds = submission + retention) written at submit on **both** write paths — consumer `RepairRequestItemConverter` + shop `RepairRequest` entity — via the E10 fixture-first process. Enable TTL: `aws dynamodb update-time-to-live --table-name repair_request --time-to-live-specification "Enabled=true, AttributeName=expires_at"`. Existing rows lack the attribute → never expire; optional one-off backfill (runbook decision). Note spec/02 C4's `completed_at` is the intended future retention *clock* (expiry after completion); until C4 ships, submission-based expiry is the honest interim.
3. `unavailable_day`: `expires_at` = blocked date + 7 days; enable TTL; then **delete** `PastUnavailableDaysCleaner.java` and remove `@EnableScheduling` from `ShopApplication` (verify nothing else needs it). TTL's up-to-48 h lag is harmless (past days are already filtered by date logic).
4. RODO: record the retention period in the privacy policy (policy-text work is carried by the feature spec §8.5 / spec/02 G1's RODO thread).
5. **Coordination (§0.2):** run both `update-time-to-live` calls in the **same maintenance window** as Feature 2 Step 2.6's stream-view-type switch — one table-touching window, one verification pass. TTL deletions surface as `REMOVE` stream events: today's INSERT-only filter ignores them; post-F2, C5's MODIFY guards must too (verify explicitly — flagged to spec/02).
6. Doc fix while here: the feature plan's `./mvnw` references are wrong — no Maven wrapper exists; use system `mvn` (module CLAUDE.md-verified).

### Test plan
- Both modules: converter/entity tests assert `expires_at` = submission + configured period (via E10 fixtures).
- Shop LocalStack integration: entity round-trip preserves `expires_at`.
- Manual: test item with `expires_at = now + 60 s` in a scratch table → deleted; notification Lambda logs show the REMOVE ignored.

### Dependencies / sequencing
OQ-1 → E10 → same window as F2 §2.6.

### Risk if not done
Standing RODO gap vs. the consent text; `unavailable_day` scan latency slowly degrades the public form's date picker.

### Acceptance criteria
TTL enabled on both tables; both write paths write `expires_at`; cleaner class and `@EnableScheduling` gone; fixtures updated.

---

## E12 — Scraper hardening: loopback bind + parser regression tests

**Effort:** M · **Review items:** M5, risk #10 (technical half)

### Problem (verified)
`car-parts-scraper/src/server.ts:256` — `app.listen(PORT, ...)` binds all interfaces with **no authentication**: anyone on the shop LAN can drive the logged-in vendor accounts. Zero automated tests (`package.json` has no test script) while the parsers' input (vendor DOM) is the repo's highest-churn dependency; offline fixtures already exist (`src/inter-parts/test.html`, `src/apcat/apcat-test.html`, `src/auto-partner/auto-partner-test.html`).

### Fix specification
1. `src/server.ts:256` → `app.listen(PORT, process.env.HOST || '127.0.0.1', ...)`. Safe: the UI is used on the PC itself (the `refresh-win-package` verify step opens `http://localhost:3000`); `HOST` is the escape hatch if OQ-6 says otherwise.
2. Test runner: `vitest` devDependency + `"test": "vitest run"` (tsx/ESM-friendly, zero config).
3. Per-vendor `src/<vendor>/*Parser.test.ts`: load the checked-in fixture HTML, run the parser, assert result count > 0 and the first result's shape (name non-empty, price parses numeric, availability present). Pins today's known-good parse → vendor redesigns break loudly in CI instead of silently returning `[]`. Add a fixture-refresh note to the `scraper-work` skill (re-save the vendor page over the fixture when a parser legitimately changes).
4. Wire `npm test` into E8's scraper job.
5. Rebuild + reship the bundle (the bind change must reach the shop PC) — **combine with E3's rebuild/PC visit**.

### Test plan
Parser tests are the deliverable; meta-check: corrupt a fixture's result-row markup → test fails. On the shop PC: `localhost:3000` works; `curl http://<pc-ip>:3000` from another device is refused.

### Dependencies / sequencing
Bundle trip shared with E3; CI wiring after E8.

### Risk if not done
Any LAN neighbor can act under the shop's vendor accounts; a vendor DOM change silently returns empty prices and erodes trust in the tool.

### Acceptance criteria
Loopback bind verified from a second device; three green parser suites in CI; updated bundle on the shop PC.

---

## E13 — AI-chat hardening: least-privilege DB user, enforced timeout, no default password

**Effort:** M · **Review items:** M6

### Problem (verified)
- `app/config.py:5` — default DSN connects as `SYSDBA:masterkey`; read-only-ness rests entirely on the regex blocklist in `app/safety.py` (one gap = write access to the production workshop DB).
- `app/config.py:11` defines `SQL_TIMEOUT_SECONDS = 10` but `app/database.py:72-91` never applies it — a pathological join hangs the UI against production Firebird.
- `app/config.py:8` — default `APP_PASSWORD = "workshop2024"` in source; `ui/streamlit_app.py:54` compares with `==`; Streamlit reruns make LAN brute-force trivial (no lockout).
- Tests cover only `safety.py` (9 cases); `query_engine`/`database` untested despite the 1,250-line seeder.

### Fix specification
1. **Read-only Firebird user (runbook):** create `AICHAT_RO` on the workshop DB server; `GRANT SELECT` on exactly the tables enumerated in `app/schema_context.py`; point `DATABASE_URL` at it. Syntax varies by Firebird version (OQ-5). The regex wall becomes defense-in-depth instead of the only wall.
2. **Enforce the timeout** in `database.run_query`: execute the cursor work in a `concurrent.futures.ThreadPoolExecutor`, `future.result(timeout=settings.SQL_TIMEOUT_SECONDS)`; on `TimeoutError` close the connection (unblocks server-side) and raise `RuntimeError("Query timed out")`. If Firebird ≥ 4: additionally issue `SET STATEMENT TIMEOUT <n>` per session (server-side kill); the thread timeout works regardless of version.
3. **Password:** remove the default (`APP_PASSWORD: str` with no default → pydantic-settings fails fast if unset); compare via `hmac.compare_digest`; add a session-state failure counter with a 30 s delay after 5 failures. Real value in the on-PC `.env` (gitignored per E4).
4. **Engine tests** (no DB needed): `_inject_first` (plain / DISTINCT / already-FIRST), `_quote_tables` (quoting, already-quoted, case-insensitive) — pure functions; `query_engine` retry-on-DB-error path with mocked LLM + mocked `run_query`. Optional `db`-marked integration tests via the seeder — which requires fixing the missing `dev/docker-compose.yml` the seeder references (module CLAUDE.md TODO): commit the compose file or correct the seeder docs.
5. `pytest` wired into E8's CI (unit tests run without DB/LLM).

### Test plan
Item 4, plus manual: 5 wrong passwords → lockout; a deliberately slow query on the dev seed aborts at ~10 s with the friendly error; a manual `INSERT` over the `AICHAT_RO` connection → permission error (proves the grant).

### Dependencies / sequencing
After E4 (module in git). Item 1 needs DB-server access — bundle with the E3/E12 shop visit.

### Risk if not done
One blocklist gap away from writing to the production workshop DB as SYSDBA; a hung query takes the tool down; the default password becomes public the moment E4 pushes the module.

### Acceptance criteria
App refuses to start without `APP_PASSWORD`; connection user is `AICHAT_RO` with SELECT-only grants; timeout demonstrably fires; new tests green in CI.

---

# Tier C — Strategic (quarter+)

## E14 — Infrastructure as code for the existing stack

**Effort:** L · **Review items:** M1, risk #3

### Problem (verified)
`car-repair-shop-backend/infrastructure/` contains only empty directories (no `pom.xml`, no sources); the `refactor-to-lambda-with-cdk` remote branch contains no CDK (review-verified; OQ-10 confirms nothing exists elsewhere). Everything in AWS — API Gateway `5jq3oglx45`, the Lambdas and wiring, tables + stream (+ E11 TTL), SNS, S3, CloudFront, Route53, (E9) alarms/DLQ, (E7) custom domain — is console-only: unreviewable, unreproducible, unrestorable.

### Fix specification
1. **Tool recommendation: AWS CDK in Java.** Rationale: the owner is a Java developer (the whole backend is Java 21; the empty `infrastructure/` scaffold is already a Java skeleton); CDK gives type-checked constructs in the language he reviews best; infra unit tests run in JUnit next to the existing suites; CloudFormation manages state (no Terraform state-file operations for a solo maintainer); `cdk import` adopts existing resources. Terraform's strengths (multi-cloud, ecosystem breadth) don't apply to a single-account, single-region stack; accept CloudFormation's slower deploys as the cheaper trade. Decision recorded here — flip only with an owner reason.
2. **Phasing:**
   - Phase 0: finish `infrastructure/RUNBOOK.md` (seeded by E2/E5/E7/E9 entries + feature-plan Step 1.1.6) — the runbook *is* the import checklist.
   - Phase 1 (stateful, max DR value): DynamoDB tables (+GSIs, stream config, TTL, **enable PITR** — review open question #3), SNS topics, DLQ, log groups + retention. `cdk import`.
   - Phase 2: Lambdas (config/env/roles), event-source mapping, API Gateway routes + custom domain, alarms.
   - Phase 3: S3/CloudFront/Route53; then Lambda deploys from CI on tag — closes the review's "release provenance unknowable".
3. **Feature-plan conflict, resolved (§0.2):** decision D1 (manual runbook) stands for Features 1–12's new resources — features aren't blocked on IaC; every manual runbook step they add becomes Phase-1/2 import backlog. Don't start Phase 1 mid-rollout; start after F2's stream switch settles.

### Test plan
CDK assertions tests (table has TTL + PITR; Lambda env contains `SNS_TOPIC_ARN`; alarm count ≥ 6); `cdk diff` empty against the live account after import (= definitions match reality); game-day synth into a scratch account + the submit→notify E2E smoke (proves rebuildability).

### Dependencies / sequencing
After E5/E7/E9/E11 define the target state; around feature deployments per §0.2.

### Risk if not done
An account/region incident is unrecoverable-by-rebuild; every infra change stays unreviewable click-ops; review Risk #3 stays open indefinitely.

### Acceptance criteria
`cdk diff` clean vs. prod; PITR on; documented scratch-account rebuild succeeds; convention established: console changes go through CDK first.

---

## E15 — Dependency modernization program

**Effort:** L · **Review items:** S1, risk #6, §4.4

### Problem (verified)
`shop/pom.xml`: Spring Boot parent 3.3.1 (`:8`, past OSS support), `aws-java-sdk-dynamodb:1.12.750` (`:74-75` — **AWS SDK v1 end-of-support 2025-12-31, no more security patches on the data-access path**), `io.github.boostchicken:spring-data-dynamodb:5.2.5` (`:79-80` — unmaintained fork built for Spring Data 2.x; the keystone upgrade blocker). Lambda version drift: notification pins SDK 2.31.26 / core 1.2.3 / events 3.15.0 (`build.gradle.kts:6-8`) vs consumer 2.33.9 / 1.4.0 / 3.16.1 (`pom.xml:19-32`). Portals: Angular 18 (LTS ended 2025-11) + dead SSR scaffolding shipped in builds deployed as static S3 files.

### Fix specification (strict order — the fork blocks everything)
1. **Replace `spring-data-dynamodb` + SDK v1 with the AWS SDK v2 Enhanced DynamoDB Client** in `shop/`: rewrite `RepairRequestRepository`/`UnavailableDayRepository` as thin classes over `DynamoDbEnhancedClient`; `@DynamoDbBean` replaces `@DynamoDBAttribute`/`@DynamoDBTypeConverted`; custom `AttributeConverter`s replace `LocalDateTimeConverter`/`PreferredVisitWindowConverter`. **Attribute names byte-identical** — E10's item-shape test is the guard; keep the `dummyPartitionKey`/`SubmittedAtIndex` pagination pattern. LocalStack integration tests must pass unchanged.
2. **Then** Boot 3.3.1 → current supported line (3.5.x; 4.x when the ecosystem settles) — unblocked once the fork is gone. This also retires the `backend-lambda-work` skill note "SDK versions differ on purpose" (update the skill).
3. **Lambda alignment:** one documented pinned set of SDK/core/events versions across consumer + notification; Dependabot (E8) keeps it moving.
4. **Angular:** upgrade both portals **together**, one major at a time via `ng update`, to the current LTS; step 0 = delete the unused SSR scaffolding (`server.ts`, `@angular/ssr`, express dep) to shrink the surface; bump `@types/node`.
5. Marketing-site jQuery 1.11/Bootstrap 3 is **not** here — E18.

### Test plan
Step 1 gate: full `mvn test` (LocalStack) + E10 contract suites + manual data-compat check (read rows written by the old code from a table snapshot). Portals: `ng test` + prod build + click-through of both apps against the dev backend.

### Dependencies / sequencing
E10 before step 1. Do not overlap step 1 with Feature 2's entity changes — recommended order: F2 first (customer-facing), then migrate, rebasing as needed; state the choice in the opening PR.

### Risk if not done
Unpatched data-access stack handling customer PII; every deferred quarter makes the Boot/Angular jumps bigger and riskier.

### Acceptance criteria
No `com.amazonaws` SDK v1 artifacts in any dependency tree; Boot on a supported line; both portals on supported Angular with SSR scaffolding gone; integration + contract suites green throughout.

---

## E16 — Monolith cleanup: single writer, no vestigial architecture

**Effort:** M · **Review items:** S2 (adjusted per owner answer), §4.2 · **Cross-ref:** spec/02 C1–C9 own the Feature-2 state-machine corrections and enum documentation

### Problem (verified)
- **Duplicate submit path:** shop still exposes `POST /api/repair-request/submit` (`SecurityConfig.java:59`, `JwtAuthFilter.java:70` permit-all) while production submissions go through the consumer Lambda (owner-confirmed) — two live implementations of one business operation.
- **Vestigial events:** `SubmitNewRepairRequestHandler.java:21` publishes `NewRepairRequestEvent` with no listener anywhere; `AppointmentMadeEvent` / `RepairRequestHandledEvent` (in `repair/request/events/`) are never published. Real notification is the DynamoDB stream — this is dead architecture that misleads readers.
- **Lambda-hostile leftovers:** no-op `@Transactional` on `UnavailableDayFacade.clearUnavailableDays` (`@EnableScheduling` removal is E11's).
- Enum-name documentation (**owner: document, don't rename** — replaces review S2's rename) and the `maskAsAppointmentMade` typo (`RepairRequest.java:104`): **owned by spec/02 C9 and C3 respectively** (C3 fixes the typo while rebuilding the transitions for F2). E16 does not duplicate them; if F2 slips a quarter, execute C9's Javadoc block standalone as part of this item.

### Fix specification
1. **Delete the shop submit path** (single writer = consumer Lambda): remove `RepairRequestSubmitController`, `SubmitNewRepairRequestHandler`, the permit-all entries at `SecurityConfig.java:59` and `JwtAuthFilter.java:70`, and their tests. **Precondition (runbook check):** confirm at API Gateway that no route maps `/api/repair-request/submit` to the shop Lambda. Consequence for the feature plan: Step 12.1.2 (token generation in the monolith's `RepairRequest.from`) becomes obsolete — the consumer is the only token writer; record this in the plan when executing (spec/02's C-layer is the right vehicle). E10's shop-side suite then shrinks to entity/attribute-shape assertions.
2. **Delete the event system:** the `events/` package, the `publishEvent` call, and `commons.DomainEvent` if then unused. If F2 later wants real externalized events, reintroduce deliberately via Spring Modulith — don't keep dead code as a placeholder.
3. Remove the no-op `@Transactional` (`UnavailableDayFacade.java:44`; keep the explanatory deleteById comment at `:48`).
4. Add a Spring Modulith `ApplicationModules.verify()` test — the review notes Modulith sits unused on the classpath (`pom.xml:36-38`); this is the cheap moment to make module boundaries enforced.

### Test plan
Shop suite green minus deleted tests; new Modulith verification test green; manual: admin portal fully functional; the public form unaffected (it never hit the monolith path).

### Dependencies / sequencing
After E1 (don't delete the "reference implementation" until the live one is fixed and pinned by E10). Item 1's API Gateway check feeds the runbook. Sequence around F2: land either before F2 starts or after it ships — not mid-feature.

### Risk if not done
The next engineer implements against the dead submit path or wires a listener to an event that production never uses — the exact class of confusion that already produced commit `d4079e4 "Fix status mapping"`.

### Acceptance criteria
No `/api/repair-request/submit` in shop; no unpublished/unconsumed domain events; Modulith test green; runbook records the API Gateway route check; feature plan's 12.1.2 marked obsolete.

---

## E17 — OpenAPI contract + generated TypeScript clients

**Effort:** M · **Review items:** S3

### Problem (verified)
The portals hand-copy models and validation: third copy of the phone regex at `submission-portal/src/app/repair-request-submission/repair-request-submission.component.ts:68-70`; near-identical `RepairRequest`/`UnavailableDay` models in both `src/app/models/` trees. Nothing keeps them honest against the backend DTOs.

### Fix specification
1. Author `api/openapi.yaml` (new top-level dir) covering: public submit (the **consumer Lambda's** contract — the live one; reuse E10 fixtures as request examples), public unavailable-days, internal auth/search/get/mark-as-* endpoints. Hand-written spec as source of truth (springdoc generation from the monolith would miss the consumer, which is the public contract).
2. Generate with `openapi-generator-cli` (`typescript-angular`) into each portal (`src/app/generated/`); migrate hand-written models/services incrementally. Validation constants (regex, lengths) exported from one generated/constants module — ends the regex's third copy.
3. CI drift guard (E8): regenerate + `git diff --exit-code`.
4. Extend E10's rule to "spec-first": new endpoints (F12 status, F3 upload-urls) land in `openapi.yaml` before implementation.

### Test plan
Both portals compile against generated models; `ng test` green; a deliberate spec field rename breaks the portal build in CI (drift-guard proof).

### Dependencies / sequencing
After E10 (fixtures feed examples); after E15's Angular upgrade if timing collides (generator output targets the newer Angular); ideally after F12 so its endpoint is in the spec from day one.

### Risk if not done
Every form change stays a 4-file synchronized edit across two repos' worth of Angular code; the phone regex lives on in three dialects.

### Acceptance criteria
Portals consume generated models; drift check active in CI; regex/length constants exist in exactly one TS location.

---

## E18 — Marketing site (`renocar-webpage/`) — deferred cross-reference

**Effort:** — (tracked elsewhere) · **Review items:** S4

The jQuery 1.11.2 CVEs / Bootstrap 3 EOL swap, broken `tel:+585201914` links (consultancy critical item 5), legal-entity corrections ("Renocar Zbigniew Marek" per owner), robots/sitemap/GA4 (spec/02 G3 owns analytics), the contact-form second intake channel (spec/02 G8), and deploy automation are **out of scope here**. They are already audited and prioritized in `renocar-webpage/ANALYSIS.md` + `renocar-webpage/PLAN.md` and `docs/renocar-digital-presence-audit.md`; per the module's CLAUDE.md, work from PLAN.md's ordering. The only overlap retained in this spec: E4 removes the module's untracked junk (`.DS_Store`, `httpdocs/images/home-slider/backup/`).

---

## Sequencing overview

```
Week 1 (Tier A):   E1 ──deploy consumer jar together with E2's consumer changes
                   E2 (shop log fix + retention runbook + JWT secret rotation)
                   E3 (rotation; OQ-4 owner decision gates rebuild) ──┐
                   E4a (commits + .gitignore fixes)                   └→ E4b (win-package commit)
Weeks 2–4 (B):     E5, E6, E7 (small, parallelizable)
                   E8 (CI) — early; protects everything after
                   E10 (contract fixtures) — BEFORE any F1/F2/F3/F12/G1/G2 field addition
                   E9 (alarms/DLQ) — BEFORE Feature 1 go-live
                   E12 + E13 — shop-PC visit shared with E3
                   E11 (TTL) — needs OQ-1; same maintenance window as F2 Step 2.6
Quarter (C):       E16 (after E1/E10; around F2, not mid-feature)
                   E14 (after E5/E7/E9/E11 define the target state)
                   E15 (after E10; sequenced around F2)
                   E17 (after E10; ideally after F12)
Features 1→2→12→3 proceed per features-implementation-plan.md **as corrected by
spec/02 Part A (C1–C10)**, gated as above; product items G1–G9 per spec/02.
```

---

## Open questions for the owner

(Cross-check spec/02's Q1–Q10 — deduplicated; only engineering-remediation questions here.)

1. **(OQ-1, blocks E11)** Retention period for repair requests ("given period of time" in the README)? Proposal: 24 months for requests, 7 days past-date for unavailable days. Backfill existing rows with an expiry, or grandfather them?
2. **(OQ-2, blocks E2/E9/E14)** Production Lambda **function names**, current CloudWatch log retention, and DynamoDB PITR state in the console? (Not derivable from the repo; needed for the retention CLI calls, alarm wiring, and the IaC import list.)
3. **(OQ-3, affects E2 step 5)** Were the committed local values in `application-local.properties:8-10` (user `renocar`, password `12345`, the 32-hex JWT key) **ever reused in the production Lambda env**? If yes, the planned JWT-secret rotation must be joined by an admin-password change.
4. **(OQ-4, blocks E3 steps 4–5)** Credential mechanism for the shop PC: git-ignored `credentials.bat` called from `start.bat` (recommended), a `.env` file, or manual env vars? (The `refresh-win-package` skill gate explicitly defers this to you.)
5. **(OQ-5, affects E13)** Firebird server version of the workshop DB (determines `SET STATEMENT TIMEOUT` support), and does the workshop-software vendor permit a third-party read-only DB user? (Related to spec/02 Q2 on reachability/schema.)
6. **(OQ-6, affects E12)** Is the scraper UI ever opened from a machine other than the shop PC itself? If yes, the `127.0.0.1` bind needs the `HOST` override plus at least basic auth.
7. **(OQ-7, affects E7/E14)** OK to create API Gateway custom domain `api.renocar-zgloszenie.pl` (ACM cert + Route53 changes)? Is the DNS zone fully under your control?
8. **(OQ-8, affects E9)** Which inbox receives ops alarms — the shop's notification inbox or your personal address? And is the existing SNS email subscription still confirmed?
9. **(OQ-9, decision = review S5)** Scraper ToS posture: accept the vendor-ToS risk of authenticated stealth scraping, or investigate per-vendor API/reseller programs before further scraper investment?
10. **(OQ-10, affects E14 scoping)** Confirm: the `refactor-to-lambda-with-cdk` branch name was aspirational and no CDK/CloudFormation/SAM artifacts exist outside this repo?

---

## Answers received (2026-07-12)

- **OQ-1 → answered:** **24 months, backfill existing rows** (unavailable days: +7 days stands). E11 fully specified; privacy policy states "24 miesiące".
- **OQ-2 → parked:** owner will not gather function names / log retention / PITR state now — keep `[TODO(owner)]` placeholders in the RUNBOOK; E2's retention CLI and E9's alarm wiring fill them in at execution time (or read them via AWS CLI then).
- **OQ-3 → answered: No** — prod values differ from the committed local ones. E2 step 5 stays JWT-secret-only; the admin password is not rotated.
- **OQ-4 → answered:** **`credentials.bat` next to `start.bat`** (git-ignored; `start.bat` calls it if present). E3 steps 4–5 and E4b unblocked.
- **OQ-5 → deferred:** whole Firebird topic parked by the owner (see spec 02 Addendum Q2). E13 items 2–5 (timeout, password, tests, CI) proceed; item 1 (read-only user) waits.
- **OQ-6 → answered: No** — the UI is used only on the shop PC. E12 binds `127.0.0.1`, no auth needed.
- **OQ-7 → answered: Yes** — create `api.renocar-zgloszenie.pl` (ACM + Route53). E7 ships its full form.
- **OQ-8 → answered:** ops alarms to **both** the owner's personal inbox and `info@renocar.pl`. Notification-subscription health was *not* separately confirmed — E9 step 4 (test submission → verify the e-mail arrives) becomes the first action of E9.
- **OQ-9 → answered:** **risk accepted, continue as-is** — recorded as the conscious owner decision; review S5 closed. Revisit only if a vendor pushes back.
- **OQ-10 → answered:** **no IaC exists anywhere** — E14 starts fresh (CDK Java, import live resources); delete the stale `refactor-to-lambda-with-cdk` branch during E4.

Other decisions relevant to this spec (full list in spec 02 Addendum + spec 03 answers table): NIP = 5833538950 (site legal blocks unblocked); Facebook dropped from the site (spec 03 W-A15/W-D3); site deploys via FTP/SFTP with owner-held credentials (`DEPLOYMENT.md` input); GA4-behind-Klaro confirmed; completion e-mail per-close checkbox → `suppress_completion_email` attribute (spec 02 Addendum Q7 delta — E10's item-shape fixture gains this optional attribute when F2 lands).
