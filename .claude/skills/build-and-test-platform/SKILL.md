---
name: build-and-test-platform
description: Use when asked to build, test, or verify the whole car-repair-shop platform (or "run all tests") — runs every module's build/test in the right order with the right tools, and knows what needs Docker/Chrome and what is safe without AWS credentials.
---

# Build & test the whole platform

Repo root contains a space — always quote paths. Run each module from its own directory.
Nothing below needs AWS credentials; integration tests use LocalStack via Docker.

## Order and commands (all verified against build files)

1. **shop monolith** — `car-repair-shop-backend/shop/`
   ```bash
   mvn test        # REQUIRES Docker running (Testcontainers -> localstack/localstack:3.2)
   mvn package     # -> target/lambda-shaded.jar
   ```
   No `mvnw` wrapper exists — use system `mvn` with JDK 21. If Docker is unavailable, expect
   the `*IntegrationTest` classes to fail; unit tests (`*Test`) still pass — report this
   distinction instead of calling the build broken.

2. **submission consumer Lambda** — `car-repair-shop-backend/repair-request-submitted-consumer/`
   ```bash
   mvn test && mvn package   # pure unit tests; no Docker/AWS needed
   ```

3. **notification Lambda** — `car-repair-shop-backend/new-repair-request-notification-lambda/`
   ```bash
   ./gradlew build           # tests included; fat jar via ./gradlew shadowJar
   ```
   This is the only Gradle module; it has a wrapper — use it.

4. **Angular portals** — `submission-portal/` and `repair-requests-portal/`
   ```bash
   npm ci
   npm run build:prod        # prod build
   npm test                  # Karma/Jasmine — needs Chrome; use `npm test -- --watch=false --browsers=ChromeHeadless` in CI-like runs
   ```
   Or from repo root: `npm run install:submission-portal && npm run build:submission-portal`
   (and `...:admin-portal` for the other).

5. **car-parts-scraper** — `car-parts-scraper/`
   ```bash
   npm install && npm run build   # tsc + copy of src/public into dist/
   ```
   No test suite. Do NOT use `npm run scrape` (root or module) — it references a missing
   `src/scraper.ts`. Parsers can be smoke-checked offline: `npm run parse-interparts`,
   `npm run parse-apcat`.

6. **car-repair-shop-ai-chat** — `car-repair-shop-ai-chat/`
   ```bash
   pip install -r requirements.txt
   pytest                    # tests/test_safety.py only; no DB/LLM needed
   ```

7. **renocar-webpage** — nothing to build or test (static HTML + a PHP contact form).

## Not buildable / skip

- `car-repair-shop-backend/infrastructure/` — empty scaffold (only an empty `src/`).
- `renocar-win-package/` — build artifact; regenerate via the `refresh-win-package` skill,
  never edit by hand.

## Reporting

Summarize per module: command run, pass/fail, and whether failures are environmental
(no Docker, no Chrome, missing Python deps) vs. real. Never edit `target/`, `build/`,
`dist/`, or `dependency-reduced-pom.xml` to make something pass.
