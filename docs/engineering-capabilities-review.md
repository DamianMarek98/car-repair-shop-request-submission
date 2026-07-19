# Renocar Platform — Engineering Capabilities Review

**Reviewer:** Senior engineering review (AI-assisted)
**Date:** 2026-07-04
**Scope:** Full repository at `car-repair-shop-request-submission/` — all modules, working tree + git state
**Related document:** `docs/business-capabilities-review.md` (business view; this document is the engineering counterpart)

---

## TL;DR / Executive Summary

The platform **works in production** and is impressively broad for a solo effort: a live public submission form, an authenticated admin portal, a serverless Java backend on AWS (API Gateway + Lambda + DynamoDB + SNS), a three-vendor parts-price scraper shipped to the shop's Windows PC, and a local NL→SQL assistant over the workshop's Firebird database. The backend shows real architectural discipline (modular monolith, state pattern, facades, LocalStack integration tests). The engineering maturity, however, is uneven: strong domain code sits next to serious operational and security gaps.

**Top strengths**

1. Working end-to-end serverless product with a sensible cost-driven architecture (EC2 → Lambda migration, cold-start-isolated submit Lambda).
2. Genuine DDD/modular-monolith discipline in `shop/` — facades, CQRS-style handlers, state pattern, 33 backend tests including LocalStack integration tests.
3. Pragmatic tooling for the business: scraper with persistent logged-in sessions and a Windows one-click bundle; AI chat with a defensible SQL safety layer.

**Top risks (see full register in §7)**

1. **Plaintext vendor credentials** (Inter Cars, APCAT, Auto-Partner) hardcoded in the shipped Windows package, in `unnamed.patch` at repo root, and **committed to a local git branch** (`car-parts-scrapper-improvements`). Rotation required.
2. **Large parts of the system are not in version control**: the entire `car-repair-shop-ai-chat/` module, `renocar-win-package/`, and `car-parts-scraper/src/browserSessionManager.ts` exist only on this machine. A disk failure loses them.
3. **No infrastructure-as-code**: `car-repair-shop-backend/infrastructure/` is an empty scaffold; every AWS resource (API Gateway, Lambdas, DynamoDB, streams, SNS, CloudFront) is click-ops and unreproducible.
4. **Validation is duplicated and divergent** between the monolith and the submit Lambda — and the Lambda's `@NotNull` constraints are decorative (wrong import), so requests with null names/email/phone pass validation.
5. **PII (GDPR/RODO) leaks into CloudWatch logs** and there is no data-retention (TTL) implementation despite the README promising storage "for a given period of time".

**Top recommendations (see §8):** rotate the three vendor credentials and purge them from history (S); commit the untracked modules (S); add IaC for the existing stack (M); extract or contract-test the shared submit validation (M); stop logging tokens/PII (S); upgrade the EOL dependency chain — AWS SDK v1, Spring Boot 3.3.1, unmaintained `spring-data-dynamodb` fork, Angular 18, jQuery 1.11 (L).

---

## 1. Method

Every claim below was verified against source code, build files, git metadata, or CI configuration — not README claims. Evidence is cited as `path:line`. Counts (tests, files) were produced by direct enumeration. No code was modified; this document is the only artifact produced.

---

## 2. Module-by-Module Review

### 2.1 `car-repair-shop-backend/shop/` — Spring Boot modular monolith

**What works today**

- JWT login for a single in-memory user (`auth/LoginController.java`, `config/SecurityConfig.java:39-47`), token valid 1 day (`auth/JwtHelper.java:23`, `DAYS = 1`).
- Repair-request management: paged/sorted search via a GSI (`repair/request/SearchRepairRequestHandler.java`), get-by-id, and status transitions `NEW → HANDLED → APPOINTMENT_MADE` enforced by a state pattern (`RepairRequestStateFactory.java`, `NewRepairRequest.java`, `HandledRepairRequest.java`, `AppointmentMadeRepairRequest.java`) with proper guard exceptions.
- Availability management: add/remove/clear "unavailable days" with past-date and duplicate guards (`availability/UnavailableDayFacade.java`); the duplicate check correctly relies on date-only equality (`UnavailableDateDto.java:8-13`).
- Public endpoints: `/api/repair-request/submit` and `/api/internal/unavailable-day/all` (`config/SecurityConfig.java:60-62`); everything else requires a Bearer token.
- Runs as a Lambda through `StreamLambdaHandler.java` using `aws-serverless-java-container-springboot3:2.1.4` (`pom.xml:117-121`).
- Persistence via `spring-data-dynamodb` repositories on tables `repair_request` and `unavailable_day`; pagination implemented with a constant `dummyPartitionKey = "DUMMY"` + `submittedAt` range key GSI (`RepairRequest.java:23-28`, `src/main/resources/dynamodb/repair-request.txt`).

**Architecture assessment**

- *Strengths:* clear module boundaries (`auth`, `availability`, `repair/request`, `commons`, `config`); cross-module access goes through `UnavailableDayFacade`; command/query handlers keep controllers thin; Spring Modulith is on the classpath (`pom.xml:36-38`) giving the option of module-boundary verification tests (not currently written).
- *The dummy-partition-key GSI* is a known DynamoDB anti-pattern (single hot partition), but at this traffic volume it is a perfectly reasonable trade-off. Document it; don't fix it.
- *Lambda-hostile leftovers from the EC2 era:*
  - `PastUnavailableDaysCleaner.java:19` uses `@Scheduled(cron = "0 0 0 * * SUN")` and `ShopApplication.java` has `@EnableScheduling` — **cron schedules do not run in Lambda** (no long-lived JVM). Past unavailable days are effectively never cleaned in production.
  - `UnavailableDayFacade.clearUnavailableDays()` is annotated `@Transactional` (`UnavailableDayFacade.java:44`) — a no-op over DynamoDB; the comment on line 48 ("Use deleteById to ensure proper deletion in lambda environment") shows this was discovered empirically.
- *Vestigial event system:* `SubmitNewRepairRequestHandler.java:21` publishes `NewRepairRequestEvent`, but **no listener exists anywhere** (verified by grep across `src/main`); `AppointmentMadeEvent` and `RepairRequestHandledEvent` are never even published. Real notification happens via DynamoDB Streams. This is dead architecture that misleads readers.
- *Duplicate submit path:* the monolith still exposes `/api/repair-request/submit` while production submissions go through the dedicated consumer Lambda. Two live implementations of the same business operation (see §4.1).

**Code quality**

- 58 main-source Java files, 14 test files, **33 `@Test` methods**. Integration tests spin up LocalStack DynamoDB via Testcontainers (`RepairRequestIntegrationTest.java:26-32`) and cover submit, get, mark-as-handled, mark-as-appointment-made. `JwtAuthFilterTest` has 10 tests. This is genuinely decent coverage for the core flows.
- `AwsConfigurationProperties.java` imports `javax.validation.constraints.NotBlank` (line 8) while the app runs on Spring Boot 3 / Hibernate Validator 8, which only processes `jakarta.validation` — **these `@NotBlank` guards are silently never enforced**. The obsolete `javax.validation:validation-api:2.0.1.Final` dependency (`pom.xml:40-43`) enables this trap.
- `GlobalExceptionHandler.java:27-30` returns `e.getMessage()` of any `Exception` to the client with HTTP 500 — internal detail leakage.
- Typo API: `RepairRequest.maskAsAppointmentMade()` (`RepairRequest.java:117`).
- Status-name mismatch with the UI: backend `HANDLED` renders as "Umówiono" (appointment made) and `APPOINTMENT_MADE` as "Zakończono" (completed) in the admin portal (`repair-requests-portal/src/app/commons/status-mapper.ts:5-14`). It works, but the enum names no longer mean what they say — this already caused a bug (commit `d4079e4 "Fix status mapping"`).

**Dependencies (verified in `pom.xml`)**

| Dependency | Version | Status (mid-2026) |
|---|---|---|
| Spring Boot | 3.3.1 (Jun 2024) | Out of OSS support; current line 3.5.x/4.x |
| `com.amazonaws:aws-java-sdk-dynamodb` | 1.12.750 | **AWS SDK v1 reached end-of-support Dec 31, 2025** |
| `io.github.boostchicken:spring-data-dynamodb` | 5.2.5 | Community fork, unmaintained since ~2020; built for Spring Data 2.x — the biggest upgrade blocker |
| `javax.validation:validation-api` | 2.0.1.Final | Wrong namespace for Boot 3; causes the silent-validation bug above |
| jjwt | 0.12.6 | Current — fine |
| Testcontainers | 1.19.8 | Old but functional |

### 2.2 `repair-request-submitted-consumer/` — submit Lambda

**What works:** parses the API Gateway proxy event body, runs Bean Validation + manual business rules (RODO consent, vin-or-plate), writes to DynamoDB `repair_request` with `dummyPartitionKey`, `status_value=NEW`, `submittedAt` — item shape matches the monolith's converters, so submissions correctly appear in the admin portal (`RepairRequestItemConverter.java:23-40`). 9 tests (7 handler + 2 parameterized phone-pattern) with a mocked `DynamoDbClient`.

**Defects found (all in `src/main/java/car/repair/shop/`)**

1. **Decorative `@NotNull`:** `SubmitRepairRequestDto.java:6` imports `software.amazon.awssdk.annotations.NotNull` — an AWS SDK *documentation* annotation, not a Jakarta constraint. Hibernate Validator ignores it, and `@Email`/`@Pattern`/`@Size` all pass on `null`. **A request with null firstName/lastName/email/phoneNumber/issueDescription passes validation in production**, whereas the monolith (`shop/.../SubmitRepairRequestDto.java`) uses real `jakarta.validation.constraints.NotNull`. Only the RODO and vin/plate manual checks (`RepairRequestSubmittedHandler.java:80-84`) are reliable.
2. **NPE on null `timeSlots`:** `RepairRequestItemConverter.java:19-22` calls `submitRepairRequestDto.timeSlots().stream()` without a null check. The DTO permits null; the monolith handles it (`shop/.../RepairRequest.java:96`). Result: unhandled `NullPointerException` → Lambda error → API Gateway 502 for a legal payload shape.
3. **Contract divergence:** the consumer's DTO also annotates `plateNumber` `@NotNull` (decorative) while the shop treats vin-only submissions as valid — two "sources of truth" for the same form, already drifting.
4. **Wrong status code mapping:** `JsonProcessingException` (malformed client JSON) returns **500** instead of 400 (`RepairRequestSubmittedHandler.java:59-61`); success returns 200 for a resource creation (minor).
5. **Dead code:** `createResponse` calls `.withHeaders(...)` twice; the first map is overwritten (`RepairRequestSubmittedHandler.java:88-97`).
6. **Hardcoded values:** table name `"repair_request"` (line 53), CORS origin `https://renocar-zgloszenie.pl` (line 94).
7. **PII logging:** the full submission (name, email, phone, plate, description) is logged twice — `"Received event"` (line 43) and `"Storing repair request"` (line 55) — into CloudWatch. See §6.

The module purpose (cold-start isolation) is sound and validated by the migration; keep it separate, but the duplication needs a strategy (§8).

### 2.3 `new-repair-request-notification-lambda/` — DynamoDB stream → SNS

**What works:** listens to stream records, filters `INSERT`, builds a Polish notification message from the new image, publishes to SNS (`NewRepairRequestSubmittedSnsNotifier.java:27-46`). Per-record exception swallowing prevents one bad record from failing the batch. 3 tests with mocked `SnsClient`. Gradle Kotlin DSL builds a shadow jar.

**Issues**

- Topic ARN **hardcoded including the AWS account ID** `009160054371` (`NewRepairRequestSubmittedSnsNotifier.java:16`) — should be an environment variable; also leaks the account ID into the repo.
- Swallowed publish errors mean a lost notification is silent — no DLQ/alarm exists in code or IaC (none exists at all), so a failing SNS topic would go unnoticed until the receptionist notices missing emails.
- Old pinned libs: `aws-lambda-java-core:1.2.3`, events `3.15.0`, SDK `2.31.26` (`build.gradle.kts:6-8`) — functional, but unmanaged drift across the three backend projects (the consumer uses core `1.4.0`, events `3.16.1`, SDK `2.33.9`).

### 2.4 `infrastructure/` — IaC scaffold

**Empty.** Directory tree contains only empty `src/main/java/car/repair/shop`, `src/main/resources`, `src/test/java` and an empty `.mvn` — **no `pom.xml`, no source files**. The remote branch `origin/refactor-to-lambda-with-cdk` was checked (`git ls-tree -r`): despite its name it contains **no CDK code** either. The only infrastructure "documentation" is two `aws dynamodb create-table` CLI strings in `shop/src/main/resources/dynamodb/*.txt` (localhost endpoints) and a Postman collection. Everything in AWS — API Gateway `5jq3oglx45`, both Lambdas' wiring, the stream trigger, SNS subscriptions, S3 buckets, CloudFront distros, Route53 — exists only in the console.

### 2.5 `submission-portal/` — public Angular form

**What works:** Angular 18 standalone-component app with Material; reactive form with mirror validations of the backend (vin length 17, plate 6–8, description ≤500, email, the same triple phone regex, RODO `requiredTrue`), a custom `atLeastOneFieldNotNull(['vin','plateNumber'])` group validator, up to 5 preferred time slots, ASAP toggle, weekend + unavailable-day date filtering fetched from the public endpoint, one-submission-per-day guard via `localStorage` (`repair-request-submission.component.ts:59-105`). Deployed as static files to S3 `renocar-zgloszenie.pl` + CloudFront (workflow, §5).

**Issues**

- `src/environments/environment.ts` sets `production: false` in the file used for prod builds and points at the **raw API Gateway execute-api URL** rather than a custom domain — a future API Gateway re-creation breaks the deployed frontend until rebuild.
- Validation rules are hand-copied from the backend (third copy of the phone regex in the system — see §4.1).
- SSR scaffolding (`server.ts`, `@angular/ssr`, express dependency) is carried in the build but the deployment is plain static S3 — dead weight and dependency surface.
- Tests: 2 spec files, **4 `it(` blocks total**, essentially scaffold specs. The form logic (slot management, date filter, submit flow) is untested.
- Angular 18 / zone.js 0.14 / TS 5.4: past LTS (v18 LTS ended Nov 2025).

### 2.6 `repair-requests-portal/` — admin Angular portal

**What works:** login form → JWT stored in `localStorage`; functional `authInterceptor` attaches the Bearer header and force-logs-out on 401 (`auth-interceptor.interceptor.ts`); `AuthGuard` protects routes; server-side-paginated request table with Polish paginator labels, status chips and row tinting; request summary view with mark-as-handled / mark-as-appointment-made actions; unavailable-days management UI. Recently restyled (commits `827c0ee`, `7652dc9`).

**Issues**

- **Model/domain duplication with `submission-portal`** (`models/repair-request.ts`, `models/unavailable-day.ts` exist in both apps with near-identical shapes) — accepted cost of the two-app split, but there is no shared lib or generated client to keep them honest.
- `AuthGuard` checks only token *presence*, not expiry (`auth-guard.ts:13`); acceptable because the interceptor handles 401, but an expired token gives a flash of broken UI.
- Same `environment.ts` problems as the sister app (`production: false`, raw execute-api URL).
- Tests: 6 spec files, **22 `it(` blocks**; `status-mapper.spec.ts` is a genuinely good unit suite, the component specs are mostly scaffolds. No tests for interceptor/guard.

### 2.7 `car-parts-scraper/` + `renocar-win-package/` — parts price aggregator

**What works:** Express server (`src/server.ts`, 288 lines) with three POST scrape endpoints and a static UI (`src/public/`); per-vendor scraper + cheerio parser pairs for Inter Cars, APCAT and Auto-Partner (~1,570 lines total); `browserSessionManager.ts` keeps one logged-in persistent Playwright context per vendor with a busy-queue so requests serialize per vendor and sessions start lazily on demand; `playwright-extra` + stealth plugin to survive bot detection. The Windows bundle (`renocar-win-package/`) ships a portable `node.exe`, prebuilt `dist/`, `node_modules`, and a `start.bat` that installs Chromium on first run — a genuinely user-friendly distribution for the shop PC.

**Issues (several severe)**

- **Hardcoded live vendor credentials.** Tracked `main` code correctly falls back to `''` (`src/server.ts:76-77,132-133,188-189`), but:
  - `renocar-win-package/dist/server.js:184-202` ships **real usernames and passwords for all three vendors** as fallback defaults (redacted here; verified on disk);
  - the same credentials exist in built `car-parts-scraper/dist/server.js:184-201`;
  - `unnamed.patch` (repo root) contains them in plaintext diff form;
  - they are **committed to the local branch `car-parts-scrapper-improvements`** (verified via `git show <branch>:car-parts-scraper/src/server.ts`). That branch is *not* pushed to origin (verified against `git branch -r`), which is the only reason this isn't a remote leak. Rotation is still warranted — the zip has been distributed to the shop PC.
- **`browserSessionManager.ts` is untracked** on the current branch even though the shipped Windows build depends on it; the deployed artifact was built from an unpushed branch. There is no reproducible link between the shipped `renocar-scraper-win.zip` and any commit.
- `.gitignore` covers `.browser-data/` but **not** `.browser-data-apcat/`, `.browser-data-auto-partner/`, `.browser-data-inter-cars/` (`car-parts-scraper/.gitignore`) — these hold live logged-in session cookies and are one careless `git add -A` away from being committed.
- The Express server has **no authentication** and binds the default port; on the shop PC anyone on the LAN can drive the vendor accounts. Acceptable only if the machine/network is trusted — should at least bind to `127.0.0.1`.
- **Zero automated tests**; parsers depend on vendor DOM structure and will break silently on redesigns (there are saved HTML fixtures — `src/*/test.html`, `apcat-test.html` — that would make parser regression tests cheap to write).
- Legal/ToS: automated scraping of authenticated vendor catalogs with a stealth plugin very likely violates the vendors' terms; the business owner should consciously accept this risk (see §9).

### 2.8 `car-repair-shop-ai-chat/` — NL→SQL Firebird assistant

**What works:** Streamlit chat UI with a password gate; question → LLM (local Ollama via the OpenAI client, `app/llm_client.py`) generates Firebird SQL with a well-crafted domain prompt (`app/query_engine.py:9-40` encodes real schema abbreviations like ZLEC/FAK/USUNIETY); a defensible safety layer — `SELECT`-only, keyword and pattern blocklist (`app/safety.py`), `SELECT FIRST n` row-limit injection and automatic table-name quoting (`app/database.py:_inject_first`, `_quote_tables`); one automatic retry that feeds the DB error back to the model; price statistics computed in Python rather than trusted to the model (`query_engine.py:62-77,125-131`). 9 pytest tests for the safety module. A 1,250-line dev-DB seeder exists (`tests/seed_dev_db.py`).

**Issues**

- **The entire module is untracked** — it is not on `main`, not on any remote branch (an `ai-workshop-chat` local branch holds only an early plan commit). One `rm -rf` or disk failure destroys it.
- Default password `"workshop2024"` hardcoded in `app/config.py:9`; the password compare is plaintext (`ui/streamlit_app.py:53`); no rate limiting (Streamlit reruns make brute-force trivial on a LAN).
- `SQL_TIMEOUT_SECONDS` is configured (`config.py:11`) but **never enforced** — `run_query()` (`database.py:71-93`) sets no query/connection timeout, so one pathological join can hang the UI against the production Firebird DB.
- Read-only access is enforced only by the regex blocklist, not by the DB grant. Connecting as `SYSDBA` (default `DATABASE_URL`, `config.py:6`) means one blocklist gap = write access. A dedicated read-only Firebird user would make the safety layer defense-in-depth instead of the single wall.
- No tests for `query_engine`/`database` (the seeder suggests they were planned).
- `requirements.txt` names `openai>=1.0.0` but the runtime is Ollama-only; fine, just worth knowing there is no cloud dependency.

### 2.9 `renocar-webpage/` — marketing site

Static Bootstrap 3 site (`httpdocs/`) with bxSlider hero, Polish content pages, an iframe embed of the submission portal at `httpdocs/umow-sie/index.htm:109`, cookie-info page, and Google site verification. Two solid self-audit docs exist (`ANALYSIS.md`, `PLAN.md`).

- **jQuery 1.11.2 (2015)** — `httpdocs/js/jquery.min.js` — carries known XSS CVEs (CVE-2015-9251, CVE-2019-11358, CVE-2020-11022/11023); Bootstrap 3 is EOL since 2019. For a mostly static brochure the practical risk is moderate, but it's free to fix.
- No build pipeline or deployment automation; hosting/deploy method is not discoverable from the repo (Plesk-style `httpdocs` naming suggests classic shared hosting).
- Junk in tree: `httpdocs/images/home-slider/backup/`, `.DS_Store` files.

---

## 3. Architecture Assessment (cross-cutting)

**Strengths**

- The **monolith + carved-out submit Lambda** is the right shape for this scale: the latency-sensitive public write path is cold-start-cheap (plain Java, no Spring), while the rarely used admin API tolerates the Spring-in-Lambda bridge's slow cold start. The reasoning is even documented in code (`RepairRequestSubmittedHandler.java:17-20`).
- Event-driven notification via **DynamoDB Streams** decouples intake from notification cleanly and survived the EC2→Lambda migration unchanged.
- Frontends are properly split by audience (public vs. authenticated) with independent deploy targets.
- The scraper's session manager (lazy per-vendor persistent contexts + request queueing) is a thoughtful design for flaky vendor logins.

**Weaknesses**

1. **Contract duplication without enforcement (§4.1)** — the shared "repair request submission" domain exists in four hand-maintained copies (shop DTO, consumer DTO, two Angular apps) plus the DynamoDB item shape in two converters. Nothing (schema, shared lib, contract tests) keeps them aligned, and they have *already* diverged (plate-number nullability, decorative `@NotNull`).
2. **The monolith still believes it is a server**: `@EnableScheduling`, `@Transactional`, in-app domain events, `server.port=8080` — abstractions that silently do nothing (or never run) under Lambda. This is the most likely source of future "works locally, fails in prod" bugs.
3. **Infrastructure exists only in the AWS console** — architecture cannot be reviewed, reproduced, or restored (§5).
4. **Two backends can write the same table** with different validation strength; DynamoDB item shape compatibility rests on two hand-synced converters (`shop/.../RepairRequest.java` annotations vs. consumer `RepairRequestItemConverter.java`).
5. The AI chat and scraper are **standalone islands** with no shared operational story (no service management, no update channel for the Windows package beyond re-zipping).

---

## 4. Code Quality & Tech Debt

### 4.1 Duplication map (verified)

| Concept | Copies | Files |
|---|---|---|
| Submit DTO + validation | 2 | `shop/.../controller/dto/SubmitRepairRequestDto.java`, `repair-request-submitted-consumer/.../SubmitRepairRequestDto.java` (already divergent — §2.2) |
| Phone regex | 3 | `shop/.../commons/patterns/PhoneNumberPattern.java`, consumer `PhoneNumberPattern.java`, `submission-portal/.../repair-request-submission.component.ts:68-70` |
| `PreferredVisitWindow` | 2 | shop and consumer versions |
| DynamoDB item shape | 2 | shop `@DynamoDBAttribute` annotations vs. consumer `RepairRequestItemConverter` |
| Angular models (`RepairRequest`, `UnavailableDay`) | 2 | `submission-portal/src/app/models/`, `repair-requests-portal/src/app/models/` |
| Submit endpoint implementation | 2 | monolith controller + consumer Lambda |

### 4.2 Dead / vestigial code

- Domain events with no listeners: `NewRepairRequestEvent` (published, unconsumed), `AppointmentMadeEvent`, `RepairRequestHandledEvent` (never published) — `shop/.../repair/request/events/`.
- `PastUnavailableDaysCleaner` — schedule never fires in Lambda.
- Consumer `createResponse` first `withHeaders` call overwritten (§2.2).
- SSR express servers in both Angular apps (deployed statically).
- `car-parts-scraper/src/index.ts` is a single re-export line; `car-parts-integrator.html` is an orphaned prototype.
- `unnamed.patch` at repo root — a leftover IDE patch that (dangerously) preserves the removed credentials.

### 4.3 Test coverage reality (counted, not estimated)

| Module | Test files | Test cases | Quality |
|---|---|---|---|
| shop | 14 | 33 `@Test` | Good: unit + LocalStack integration on core flows; no controller-layer/security integration for CORS, no Modulith boundary test |
| consumer Lambda | 2 | 9 | Good handler coverage; misses the null-`timeSlots` NPE and the decorative-`@NotNull` gap (tests never send nulls for those fields) |
| notification Lambda | 1 | 3 | Adequate for its size |
| submission-portal | 2 | 4 `it(` | Scaffold-level; core form logic untested |
| repair-requests-portal | 6 | 22 `it(` | status-mapper well tested; components scaffold-level |
| car-parts-scraper | 0 | 0 | None — highest-churn code (vendor DOM) has zero regression protection |
| ai-chat | 1 | 9 | Only `safety.py`; engine/database untested |

### 4.4 Outdated / risky dependencies

Backend: see table in §2.1 (AWS SDK v1 past end-of-support; `spring-data-dynamodb` fork unmaintained; Boot 3.3.1 past OSS support; `javax.validation` namespace bug). Frontends: Angular 18 past LTS; `@types/node` 18 (EOL runtime); CI pins Node 20 (EOL April 2026) — `.github/workflows/deploy-frontend.yml:24`. Scraper: express `^4.18.2` (CVE-2024-29041 fixed in 4.19), `cheerio` 1.0.0-rc, Playwright 1.50. Webpage: jQuery 1.11.2 / Bootstrap 3 (EOL). No `npm audit`/Dependabot/Renovate anywhere (`.github/` contains only the two workflows).

### 4.5 Hardcoded values inventory

- SNS topic ARN + AWS account ID — `NewRepairRequestSubmittedSnsNotifier.java:16`.
- DynamoDB table names — consumer handler line 53, shop `@DynamoDBTable` annotations (annotations are fine; the string in the handler should be env-driven).
- API Gateway id `5jq3oglx45` — both portals' `environment.ts` and `shop/.../SecurityConfig.java:73`.
- CORS origins — `SecurityConfig.java:73` (note: `https://renocar-zgloszenie.pl/` and `https://portal.renocar-zgloszenie.pl/` include a **trailing slash**, which does not match the browser `Origin` header — either these entries are dead and CORS is actually satisfied at the API Gateway layer, or admin-portal CORS works by accident; worth a 10-minute production check).
- Admin credentials + JWT secret for local profile — `application-local.properties:8-10` (`renocar` / weak password / 32-char hex JWT key) — local-only, but committed; if the same JWT secret was ever reused in prod, rotate it.
- Vendor credentials — §2.7 (the critical one).
- Working-hours slots (`times[]`) and slot limit — `repair-request-submission.component.ts:55-56`.

---

## 5. Operational Maturity

**CI/CD (verified in `.github/workflows/`)**

- `maven.yml`: build+test of **shop only**, on push/PR to main. The consumer Lambda, notification Lambda, scraper, portals and ai-chat have **no CI at all** — their tests only run when someone remembers to run them locally.
- `deploy-frontend.yml`: manual `workflow_dispatch` → npm build → `aws s3 sync` → CloudFront invalidation. Reasonable, but: (a) no tests run before deploy; (b) the `cache-dependency-path` block (lines 27-32) embeds a shell `if` inside a YAML string — `setup-node` treats it as literal glob lines, so dependency caching is broken/no-op; (c) IAM user keys in repo secrets rather than OIDC role assumption.
- **No deployment automation for any Lambda.** Shaded/shadow jars are built locally and (presumably) uploaded by hand — release provenance is unknowable.

**Infrastructure:** none as code (§2.4). No environments (a single prod; "local" via LocalStack for tests only).

**Observability:** raw `System.out`/Lambda-logger/SLF4J logging only; no structured logs, no correlation IDs, no metrics, no alarms-as-code, no DLQs referenced anywhere. A stuck DynamoDB stream or failing SNS publish is silent (§2.3). Nothing monitors the scraper or AI chat on the shop PC.

**Backup/DR:** no PITR/backup configuration visible (would live in the missing IaC); the DynamoDB tables' `create-table` notes (`shop/src/main/resources/dynamodb/*.txt`) do not include TTL or backup settings. The Firebird workshop DB backup story is entirely outside this repo. **Version control itself is the biggest DR gap**: ai-chat, win-package, browserSessionManager and both root planning docs (`features-development-spec.md`, `features-implementation-plan.md`, `CLAUDE.md`) are untracked; two feature branches with real work are unpushed.

**Repo hygiene:** root `.gitignore` is a Java-template leftover (ignores `*.zip`, `*.class`) with no coverage for `.DS_Store`, `.idea/`, `.venv/`, `node_modules` outside the per-app ignores; `dependency-reduced-pom.xml`, `target/`, `build/` litter `git status`, which trains the owner to ignore the untracked-file list — exactly how the credential-bearing `unnamed.patch` survives at root.

---

## 6. Security Posture

**Auth (backend):** single in-memory user with BCrypt-encoded password from env (`SecurityConfig.java:33-47`); stateless JWT (HS256 via `Keys.hmacShaKeyFor`, 1-day expiry); CSRF disabled (defensible for a pure token API). Weaknesses:

- `JwtAuthFilter.java:38` — **`log.info("found token: {}", token)` logs every valid bearer token to CloudWatch**; anyone with log read access can impersonate the receptionist for up to 24 h.
- `JwtHelper.getTokenBody` catches only `SignatureException | ExpiredJwtException` (`JwtHelper.java:56`); a malformed token throws `MalformedJwtException`, escaping to the filter's generic catch — works, but by accident.
- No account lockout/rate limit on `/api/internal/login`; a single low-entropy credential guards all customer PII. API Gateway throttling may exist (unverifiable — no IaC).
- Frontend stores the JWT in `localStorage` (XSS-readable) — standard trade-off, acceptable here.

**Input validation:** strong and tested in the monolith; **partially fake in the production submit path** (§2.2, decorative `@NotNull`). No length cap beyond 500 chars on description; no sanitization is needed server-side (DynamoDB), but the admin portal renders submitted text — Angular's default interpolation escaping is the only XSS defense (adequate as long as no `[innerHTML]` is introduced).

**CORS:** monolith allows credentials with explicit origins but two of them carry trailing slashes (§4.5); consumer Lambda pins a single origin. Localhost origins (`http://localhost:4200/4201`) are enabled **in production** (`SecurityConfig.java:73`) — a stolen token can be used from any local dev page; minor but unnecessary.

**Secrets:**

- Vendor credentials: the headline finding (§2.7) — present in the shipped Windows artifact, in `unnamed.patch`, in built `dist/` outputs, and in local git history; not on the remote.
- `application-local.properties` commits a local admin password and JWT secret (low risk if truly local-only; still poor hygiene).
- AI chat default app password in source (`config.py:9`).
- Scraper session cookies (`.browser-data-*`) not gitignored.
- CI uses long-lived AWS access keys in GitHub secrets.

**GDPR/RODO:** the system records consent (`rodo` flag) but (a) logs full PII payloads to CloudWatch (`RepairRequestSubmittedHandler.java:43,55`) with default (indefinite) retention, (b) implements **no data retention/erasure** despite the README's stated intent ("store submission for given period of time" — no DynamoDB TTL attribute exists in code or table definitions), and (c) the AI chat reads the production customer DB and sends row data to a local model (Ollama — stays on-prem, which is good; document it).

**Dependency vulnerabilities:** jQuery 1.11.2 CVEs (webpage), express <4.19 (scraper), AWS SDK v1 EOS (no future patches), Angular 18 out of support window. No automated scanning.

---

## 7. Risk Register (Top 10, ranked)

| # | Sev. | Risk | Evidence | Impact / note |
|---|---|---|---|---|
| 1 | **Critical** | Plaintext vendor credentials in shipped artifact, patch file and local git history | `renocar-win-package/dist/server.js:184-202`; `unnamed.patch` (root); branch `car-parts-scrapper-improvements` → `car-parts-scraper/src/server.ts` | Account takeover at three suppliers; financial exposure (ordering capability). Not on remote git — rotation still required |
| 2 | **Critical** | Un-versioned production code (ai-chat module, win-package, `browserSessionManager.ts`, planning docs; 2 unpushed branches) | `git ls-files` vs. working tree; `git branch -r` | Single-disk failure permanently loses working software |
| 3 | **High** | Zero infrastructure-as-code; `infrastructure/` module empty | `car-repair-shop-backend/infrastructure/` (no pom, no sources); no CDK on `origin/refactor-to-lambda-with-cdk` | Cannot rebuild prod after account/region incident; architecture unreviewable |
| 4 | **High** | Production submit validation partially non-functional (decorative `@NotNull`), null-`timeSlots` NPE → 502 | consumer `SubmitRepairRequestDto.java:6`; `RepairRequestItemConverter.java:19` | Garbage/incomplete submissions accepted; legitimate payload shape crashes |
| 5 | **High** | JWT tokens and full customer PII written to CloudWatch logs | `JwtAuthFilter.java:38`; `RepairRequestSubmittedHandler.java:43,55` | Session hijack via log access; GDPR exposure with indefinite log retention |
| 6 | **High** | EOL dependency chain: AWS SDK v1 (support ended 12/2025), unmaintained `spring-data-dynamodb` fork, Boot 3.3.1 | `shop/pom.xml:79-88`, parent version 3.3.1 | No security patches on the data-access path; fork blocks Spring upgrades |
| 7 | **Medium** | No monitoring/alerting/DLQ — silent failure of notifications and stream processing | `NewRepairRequestSubmittedSnsNotifier.java:41-43` (swallowed errors); no alarm config anywhere | Lost customer requests noticed only by absence of business |
| 8 | **Medium** | Duplicated request contract across 4+ code locations with no conformance check | §4.1 table | Each future field (per `features-development-spec.md`) multiplies drift risk; drift has already happened |
| 9 | **Medium** | Single weak-credential admin account, no login rate-limit, localhost origins allowed in prod CORS | `SecurityConfig.java:33-47,60-66,73` | Brute-forceable gateway to all customer PII |
| 10 | **Medium** | Scraper: no tests + vendor-ToS exposure + unauthenticated LAN service + session cookies not gitignored | `car-parts-scraper/` (0 tests); `.gitignore`; `src/server.ts` (no auth) | Breaks silently on vendor redesign; possible vendor account suspension |

Honourable mentions: Lambda-inert `@Scheduled` cleaner (unbounded growth of `unavailable_day` table — slow, but real since `findAll` scans it on every public form load); `GlobalExceptionHandler` message leakage; broken `cache-dependency-path` in deploy workflow; `production: false` in prod Angular environments.

---

## 8. Recommendations (prioritized)

### Quick wins (days)

| # | Action | Effort | Rationale |
|---|---|---|---|
| Q1 | **Rotate all three vendor passwords**; delete `unnamed.patch`; rebuild the win package from clean source with env-file loading (e.g. `start.bat` reads a local `config.env` next to it); delete or rebase the credential-bearing local branch | S | Closes Risk #1. Rotation is the only reliable remedy once credentials touched an artifact that left the machine |
| Q2 | **Commit and push everything that is real work**: `car-repair-shop-ai-chat/`, `browserSessionManager.ts`, planning docs, `CLAUDE.md`; push `car-parts-scrapper-improvements` (after Q1 scrub) and `ai-workshop-chat`; fix root `.gitignore` (`.DS_Store`, `.idea/`, `.venv/`, `target/`, `build/`, `.browser-data-*`, `dependency-reduced-pom.xml`) | S | Closes Risk #2; makes `git status` signal again |
| Q3 | Fix the consumer Lambda: replace `software.amazon.awssdk.annotations.NotNull` with `jakarta.validation.constraints.NotNull`, null-guard `timeSlots`, map `JsonProcessingException`→400; add tests for exactly these cases | S | Closes Risk #4 with ~20 lines |
| Q4 | Remove `log.info("found token…")` and the two full-payload log lines; log request IDs/fields needed for support only; set CloudWatch log retention (e.g. 30–90 days) on all three log groups | S | Closes Risk #5 |
| Q5 | Move the SNS topic ARN and table names to Lambda env vars; drop localhost origins from prod CORS; fix trailing-slash origins; return generic message from the `Exception` handler | S | Cheap hardening, removes account-ID leak |
| Q6 | Fix `production: true` + point `apiUrl` at a custom API domain (or at least extract to one constant per app); fix or delete the broken `cache-dependency-path` block in `deploy-frontend.yml` | S | Correctness of prod builds; honest CI |

### Medium (weeks)

| # | Action | Effort | Rationale |
|---|---|---|---|
| M1 | **Write IaC for the existing stack** (CDK Java fits the team profile, or Terraform): DynamoDB (+PITR, +TTL attribute), both Lambdas, API Gateway routes, stream trigger + DLQ, SNS, S3/CloudFront. Import existing resources; deploy Lambdas from CI on tag | M | Closes Risks #3 and #7's infrastructure half; unlocks reviewable change management |
| M2 | Extend CI: build+test consumer and notification Lambdas and both portals on PR; add `npm audit`/Dependabot; run portal unit tests in the deploy workflow before `s3 sync`; switch AWS auth to GitHub OIDC | M | Every module currently outside the safety net gets one |
| M3 | Add CloudWatch alarms (Lambda errors, stream iterator age, SNS delivery failures) + a DLQ on the notification Lambda; alert to the shop email | M | Detects silently lost submissions/notifications |
| M4 | Kill the contract drift: extract a `repair-request-contract` Maven module (DTO + validation + item converter) shared by shop and consumer; or, minimally, add a contract test that round-trips the same JSON fixtures through both validators and asserts identical accept/reject | M | Closes Risk #8 before the planned features (spec Features 1–3, 12) multiply the surface |
| M5 | Scraper hardening: parser regression tests against the existing HTML fixtures; bind Express to `127.0.0.1`; add the missing `.browser-data-*` gitignore entries (done as part of Q2); document the rebuild-and-ship procedure for the win package | M | Closes Risk #10's technical half |
| M6 | AI chat: create a read-only Firebird user and use it in `DATABASE_URL`; enforce `SQL_TIMEOUT_SECONDS` (firebirdsql supports per-connection/statement timeouts); replace the default password; add engine tests using the existing seeder | M | Turns a regex wall into defense-in-depth before pointing it at the production DB |
| M7 | Implement data retention: DynamoDB TTL attribute on `repair_request` (fulfils the stated storage-period intent) and replace `PastUnavailableDaysCleaner` with either TTL on `unavailable_day` or an EventBridge-scheduled Lambda invocation | M | GDPR + removes the Lambda-inert scheduler trap |

### Strategic (months / decisions)

| # | Action | Effort | Rationale |
|---|---|---|---|
| S1 | Dependency modernization program: replace `spring-data-dynamodb` + AWS SDK v1 with the AWS SDK v2 Enhanced DynamoDB client (touches repositories, converters, config, tests), then move to a supported Spring Boot line; upgrade Angular to the current LTS on both portals together | L | The fork is the keystone blocking everything else; SDK v1 gets no more security fixes |
| S2 | Decide the fate of the monolith's duplicate submit endpoint and vestigial event system: either delete the events + submit path from `shop/` (single writer: the consumer Lambda) or make the events real (Modulith externalization). Also rename statuses (or the mapper) so `HANDLED`/`APPOINTMENT_MADE` mean what the UI says | M–L | Removes the most misleading architecture in the repo; prevents the next "status mapping" class of bug |
| S3 | Consolidate the shared form domain for the frontends: an OpenAPI spec for the submit + internal API with generated TS clients/models for both portals | M | Ends the third copy of the phone regex; makes planned form changes one-place edits |
| S4 | Webpage refresh per its own `PLAN.md`: drop jQuery 1.11/Bootstrap 3 (or at minimum swap in patched jQuery 3.x), automate deploy | M | Cheap CVE removal; the analysis work is already done |
| S5 | Get an explicit owner decision on scraping ToS risk (per-vendor API/reseller programs where available vs. accepted risk) | S (decision) | Business continuity of parts sourcing shouldn't hinge on undetected automation |

---

## 9. Open Questions for the Owner

1. **Which backend actually serves `/api/repair-request/submit` in production** — the consumer Lambda, the Spring monolith Lambda, or both behind different API Gateway routes? (Both implement it; the answer determines how urgent Q3 is and whether S2 can delete the monolith path.)
2. Is the **`refactor-to-lambda-with-cdk` branch name aspirational** — was CDK work done elsewhere and lost, or never started? Any CloudFormation/SAM artifacts outside this repo?
3. Are **DynamoDB PITR/backups enabled** in the console? What is the current CloudWatch log retention?
4. Has the **`renocar-scraper-win.zip` been shared** with anyone beyond the shop PC (email, drive, USB)? This determines whether credential rotation is merely prudent or urgent.
5. What is the **intended retention period** for repair requests ("given period of time" in README) — needed to configure TTL and to honor RODO commitments? Is there a privacy notice on the form matching actual processing (CloudWatch logs, SNS emails)?
6. Is the **AI chat pointed at the production Firebird DB** today, and does the workshop management software vendor permit third-party DB access?
7. Does the shop PC run the scraper **on a trusted network**, and who else can reach `http://<pc>:3000`?
8. Are the **SNS email subscriptions** confirmed and monitored — has anyone verified notifications still arrive post-migration? (No alarm would fire if they stopped.)
9. Which **JWT secret and admin password** are configured in the production Lambda env — and were the committed local values (`application-local.properties:8-10`) ever reused there?
10. What is the deployment mechanism and hosting for **`renocar-webpage/`** (the `httpdocs/` layout suggests Plesk/shared hosting) — is it in scope for automation?

---

*This review is document-only; no code, configuration, or infrastructure was modified. All file references are relative to the repository root unless prefixed with a module path. Credential values discovered during the review are deliberately not reproduced here.*
