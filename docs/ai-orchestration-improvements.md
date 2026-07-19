# AI orchestration improvements — 2026-07-04

What was added to make future Claude Code (and other AI agent) sessions in this repository
start with correct, verified context instead of re-deriving it every time.

## What was created / changed

### Per-module `CLAUDE.md` guides (new, except scraper which was improved)

| File | Covers |
|------|--------|
| `car-repair-shop-backend/shop/CLAUDE.md` | Build/test (system `mvn`, Docker/LocalStack for integration tests), local run with DynamoDB Local, modulith boundaries + facade rule, State-pattern status transitions, DynamoDB table/GSI design, the shop⟷consumer sync contract, config property names. |
| `car-repair-shop-backend/repair-request-submitted-consumer/CLAUDE.md` | Handler anatomy, the full kept-in-sync duplication table (DTO, phone regex, business rules, DynamoDB attribute names), the known `@NotNull` drift (AWS-SDK annotation, not enforced), sample Lambda test events. |
| `car-repair-shop-backend/new-repair-request-notification-lambda/CLAUDE.md` | Gradle build, stream-event handler, which DynamoDB attributes it reads (rename hazard). |
| `submission-portal/CLAUDE.md` | Dev/build/test, environment wiring, form-validator ⟷ backend-validation mirroring. |
| `repair-requests-portal/CLAUDE.md` | Auth guard/interceptor, admin API contract, status-mapper coupling to the backend enum. |
| `car-parts-scraper/CLAUDE.md` (improved) | ESM gotchas, scraper/parser pair pattern, browser session manager, offline fixture-based parser debugging, env var names. |
| `car-repair-shop-ai-chat/CLAUDE.md` | Local-Ollama-only design, safety guard (`validate_sql`) as an inviolable, Firebird dialect gotchas, Polish schema abbreviations, env var names. |
| `renocar-webpage/CLAUDE.md` | No-build static site + PHP contact form, header/footer duplicated per page (no templating), pointer to existing `ANALYSIS.md`/`PLAN.md`, Search Console file warning. |

Design rules used: every command verified against the actual build files before being
documented; env var/property **names only**, never values; unknowns marked `TODO(owner):`
instead of invented (deployment procedures are the recurring unknown — see below).

### Repo-level skills (`.claude/skills/`)

| Skill | Purpose |
|-------|---------|
| `build-and-test-platform` | Builds/tests all modules in order with the right tools; knows what needs Docker/Chrome, what is safe without AWS credentials, and what is broken (`npm run scrape`) or skippable (`infrastructure/`). |
| `backend-lambda-work` | Enforces the shop⟷consumer⟷notification-lambda sync contract on any submission/domain change; packaging per Lambda; shop conventions (facades, State pattern, GSI design). |
| `angular-portals` | Both portals' commands, environment/API wiring, where the domain lives in each app, SSR/standalone pitfalls. |
| `scraper-work` | Env vars, vendor scraper/parser architecture, session manager rules, offline parser debugging workflow. |
| `refresh-win-package` | Rebuild procedure for the shop-PC Windows bundle, with a security gate: the current bundle has hardcoded vendor credentials that must not be reproduced (see engineering review, critical risk #1). |

### Root `CLAUDE.md`

Added a "Module guides, skills & docs" section; fixed stale facts (`./mvnw` → system `mvn`,
`npm run scrape` marked broken, `infrastructure/` marked as an empty placeholder).

## Open TODO(owner) items surfaced by this work

1. Deployment procedures are documented nowhere in the repo: how `lambda-shaded.jar` and the
   consumer/notification jars get uploaded (function names, API Gateway schema-validation
   config), and how `renocar-webpage/httpdocs/` reaches the Plesk host. One short
   `DEPLOYMENT.md` per module (or one at root) would close the biggest remaining context gap.
2. Credential mechanism for the Windows bundle (see `refresh-win-package` skill).
3. `car-repair-shop-ai-chat/tests/seed_dev_db.py` references a `dev/docker-compose.yml` that
   does not exist in the repo — commit it or fix the docs.

## Proposed future improvements (not implemented — proposals only)

- **Hooks** (in `.claude/settings.json`): a PostToolUse hook that warns when
  `SubmitRepairRequestDto`, `PhoneNumberPattern`, or `RepairRequestItemConverter` is edited in
  only one of the duplicated modules; a PreToolUse guard blocking edits under `target/`,
  `build/`, `dist/`, `dependency-reduced-pom.xml`, and `renocar-win-package/`.
- **Commit the untracked modules first** (`car-repair-shop-ai-chat/`, `renocar-win-package/`,
  `browserSessionManager.ts`, root docs) — orchestration guides for un-versioned code have
  limited value; this is also engineering-review critical risk #2.
- **Permission allowlist**: run `/fewer-permission-prompts` once to whitelist the frequent
  read-only commands (mvn/gradle/npm test invocations) and cut prompt fatigue.
- **A `deploy-backend` skill** once the owner documents the real deployment steps (do not
  create it from guesses).
- **Contract test instead of prose**: the sync contract enforced by `backend-lambda-work`
  would be better as a small test module asserting DTO/attribute-name parity between shop and
  the consumer Lambda; the skill is the stopgap.
- **MCP**: a read-only AWS MCP server (DynamoDB/CloudWatch describe-only) would let agents
  verify the deployed state that the repo cannot show; needs owner-scoped IAM credentials.
