# Zespół i Urlopy — implementation specification

> Step-by-step guide for implementing `spec/05-team-and-leave-plan.md` (**the plan**). The plan
> holds the *why* and the contracts (data model §2.1, rules §3, API §4, UI §5, palette §5.1,
> seed scenario §6.0). This file holds the *how*: ordered steps, files, tests and local checks.
> When the two disagree, fix the disagreement first; don't silently pick one.
>
> Branch: `worker-leave-planning` (starts at `645a6fc`, includes `local-env/`).
> Status: nothing implemented. Written 2026-10-18.

---

## How to use this spec

- Do the phases **in order**. Within a phase, do the steps in order. Each step names the files
  it touches and what "done" means.
- Write each step's unit tests **with** the step, not at the end of the phase.
- A phase is finished only when its **Exit criteria** pass. That is the stop point for the
  owner to review and commit. Don't start the next phase until then.
- Don't paste code from the design mockup. Port its *behaviour* (lane layout, range picking).
- From phase 2 on, **every local check starts from a fresh `npm run local:up` +
  backend with the fixed date + `npm run local:seed-team`**, so the expected numbers of plan
  §6.0 hold. Earlier checks mutate data.

### Commands

| What | Command (repo root unless noted) |
|---|---|
| Backend tests, all | `cd car-repair-shop-backend/shop && mvn test` (Docker must be running) |
| Backend tests, one class | `mvn test -Dtest=WorkingDaysTest` |
| Portal tests | `cd repair-requests-portal && npm test -- --watch=false --browsers=ChromeHeadless` |
| Portal build | `npm run build:admin-portal` |
| Local env | `npm run local:up` / `npm run local:down` |
| Backend, fixed date | `CAR_REPAIR_SHOP_CLOCK_FIXEDDATE=2026-11-02 npm run local:shop` |
| Portal | `npm run local:admin-portal` → http://localhost:4201 (renocar / 12345) |
| Seed (from phase 2) | `npm run local:seed-team` |

### Codebase facts that shape the steps

| Fact | Consequence |
|---|---|
| Hibernate Validator 8 is on the classpath (transitively), but a failed `@Valid` raises `MethodArgumentNotValidException`, which the catch-all handler turns into a **500** | Validate **by hand in `TeamFacade`** with coded `TeamException`s; no Bean Validation annotations on team DTOs |
| `RepairRequestIntegrationTest` is package-private in `repair.request` | `team` gets its own integration base in package `car.repair.shop.team` |
| Integration tests use MockMvc with `.with(user("test"))`; no user → 401 | Same style for every team endpoint test, including a 401 case |
| `GlobalExceptionHandler` has a catch-all `Exception` → 500 with the message | Team errors need their own `@ExceptionHandler`, or they surface as 500 |
| `JacksonConfig` writes `LocalDate` as ISO strings | DTO dates are plain `LocalDate`, giving `"2026-11-02"` on the wire |
| The portal uses standalone components, `service/` dir, `commons/` for helpers, Polish copy | Follow it; see `repair-requests-portal/CLAUDE.md` |
| The portal is SSR-scaffolded | No unguarded `window`/`document`; switch narrow layouts with CSS, not JS; guard `window.print()` with `isPlatformBrowser` |
| Component CSS is encapsulated, but the sidebar lives in `app.component` | Print rules go in global `src/styles.css` |
| `new Date('2026-11-02')` parses as **UTC** midnight | All FE date math uses `commons/iso-date.ts` (phase 3) on `YYYY-MM-DD` strings |
| Portal initial bundle is **931.77 kB**; `angular.json` fails the build at **1 MB** (~117 kB headroom, measured 2026-10-18) | New routes are **lazy** (`loadComponent`), so Material table/select/dialog/snackbar land in lazy chunks. Check the initial total after each portal phase |

---

## Phase 0 — Preflight (no code)

1. `git branch --show-current` → `worker-leave-planning`; working tree clean apart from
   untracked noise.
2. Run the backend tests and the portal tests once. **Write down any test that already fails**,
   so later phases aren't blamed for it.
3. `npm run local:up`, then `npm run local:shop`, then `npm run local:admin-portal`. Log in at
   :4201 to confirm the environment works before touching it. Then `npm run local:down`.

Exit: baseline results recorded; local env starts.

**✅ Done 2026-10-18. Baseline:**

| Check | Result |
|---|---|
| Shop `mvn clean test` | **49 tests, 0 failures**, BUILD SUCCESS (the first integration class takes ~47 s while LocalStack starts) |
| Portal `npm test` (ChromeHeadless) | **29 / 29** pass |
| Portal build | OK; initial **931.77 kB**, with a pre-existing budget *warning* (> 500 kB); the error limit is 1 MB |
| Local env | `local:up` OK after the two fixes below; shop starts in 1.5 s; browser login at :4201 → Zgłoszenia; API without token → 401 |

Pre-existing local-env bugs found and fixed in phase 0. Both are uncommitted and unrelated to the
feature, but they were needed for every local check:
1. `local-env/up.sh`: the readiness check `docker logs … | grep -q` under `pipefail` fails
   on long logs (grep exits early → SIGPIPE). Now it reads the whole log, and
   `--force-recreate` gives every `local:up` a fresh container (so stale log lines can't
   match, and tables really start empty).
2. `new-repair-request-confirmation-email-lambda/gradle/wrapper/gradle-wrapper.jar` was never
   committed (old `.gitignore` ignored `*.jar`), so `./gradlew` failed. Restored from the
   notification Lambda's identical Gradle 8.12 wrapper. It shows as untracked and needs
   committing; the owner's pending `.gitignore` already un-ignores wrapper jars.

---

## Phase 1 — Backend: employees, pools, balance

Goal: plan §4.1 works end to end with correct balances. Leave rows exist only as storage, with
no endpoints yet.

### Steps

1. **Clock** — `config/ClockConfig.java`
   - Bean under profile `local`: `Clock`, fixed to `car.repair.shop.clock.fixed-date` at
     Europe/Warsaw start of day when that property is set; otherwise the system clock in
     Europe/Warsaw.
   - Bean under profile `!local`: always the system clock in Europe/Warsaw. The property is
     ignored even if present.
   - Every "today" in `team` is `LocalDate.now(clock)`. Never call `LocalDate.now()` without
     the clock.
2. **Entities** — `team/Employee.java`, `team/Leave.java`
   - Attributes and names exactly as plan §2.1. Use the Lombok getter/setter style of
     `availability/UnavailableDay`, `@DynamoDBAutoGeneratedKey` ids, `LocalDateConverter` and
     `LocalDateTimeConverter` from `commons/dynamodb/converter`.
   - `annual_days_by_year` as `Map<String, Integer>` (key = 4-digit year).
3. **Repositories** — `team/EmployeeRepository.java`, `team/LeaveRepository.java`:
   package-private, `@EnableScan`, `CrudRepository<…, String>`. Filtering is in memory.
4. **WorkingDays** — `team/WorkingDays.java`, pure and static:
   `count(from, to)`, `countByYear(from, to) → SortedMap<Integer,Integer>`,
   `countByMonth(from, to, year) → int[12]`. Mon–Fri only, inclusive, no holidays.
5. **LeaveBalanceCalculator** — `team/LeaveBalanceCalculator.java`, pure. Input: employee,
   that employee's leaves, year, today. Output: `Balance(year, pool, poolIsDefault, taken,
   planned, remaining)` per plan §3.3. Days before today are taken; today and later are
   planned.
6. **Errors** — `team/exception/TeamException.java` (HTTP status + `code` + message), plus a
   handler in `config/GlobalExceptionHandler` returning `{"code","message"}`. Codes for this
   phase: `EMPLOYEE_NOT_FOUND` 404, `INVALID_NAME` 400, `INVALID_POOL` 400 (outside 0–365),
   `INVALID_YEAR` 400 (outside 2000–2100).
7. **TeamFacade (employee part)** — `team/TeamFacade.java`
   - `list(year)` → `{today, year, availableYears, employees}`. `availableYears` = from
     min(current year, earliest leave start year, earliest typed pool year) through current
     year + 1. Employees are sorted by last name, then first name.
   - `create(first, last, defaultDays)`: trim names, 1–60 chars; default 26 if null; set
     `color_index` to the lowest index 0–14 not used by any employee (wrap modulo 15 if all
     are used); set timestamps (UTC, as elsewhere in the repo).
   - `update(id, first, last, defaultDays)`: if the default changes, **first** write the old
     default into `annual_days_by_year` for every year ≤ current year that has ≥ 1 working
     leave day and no typed value (plan §3.3), then save.
   - `setPool(id, year, days|null)`: `null` removes the key.
   - `delete(id)`: delete every leave of that employee, then the employee (plan §8.7 ordering).
8. **Controller** — `team/controller/EmployeeController.java` + records in
   `team/controller/dto/`, at `/api/internal/team/employees`, per plan §4.1 (201 on create,
   204 on delete). **Don't touch `SecurityConfig`**: `anyRequest().authenticated()` already
   protects it.
9. **Local tables** — `local-env/init/ready.d/10-resources.sh`: two `create-table` blocks after
   `unavailable_day` (hash key `id`, `PAY_PER_REQUEST`), with a one-line comment each.
10. **Test base** — `src/test/java/car/repair/shop/team/TeamIntegrationTest.java`: mirror
    `RepairRequestIntegrationTest` (LocalStack container, `@DynamicPropertySource`, create both
    tables via `generateCreateTableRequest`). Add a `@TestConfiguration` with a `@Primary`
    `Clock` fixed at **2026-11-02 Europe/Warsaw**. Clear both tables `@BeforeEach`.

### Tests

| Class | Kind | Cases |
|---|---|---|
| `WorkingDaysTest` | unit | Mon–Fri week = 5 · Sat–Sun = 0 · single Wednesday = 1 · 9–13 Nov 2026 = 5 · 28 Dec 2026 – 8 Jan 2027 → {2026: 4, 2027: 6} · `countByMonth` puts 20–23 Oct 2026 in index 9 |
| `LeaveBalanceCalculatorTest` | unit, today 2026-11-02 | typed pool beats default (`poolIsDefault=false`) · untyped year → default · 28 Oct – 6 Nov → taken 3 / planned 5 · leave starting today counts as planned · cross-year leave charges each year separately · remaining negative is allowed · leaves of other years are ignored |
| `TeamFacadeTest` | unit, mocked repos (style of `UnavailableDayFacadeTest`) | first free colour index, including after a gap · default-change snapshot writes only years ≤ current with leave and no typed value · name trimming and limits · pool 0 and 365 accepted, −1 and 366 rejected |
| `EmployeeIntegrationTest` | MockMvc, extends `TeamIntegrationTest` | no user → 401 · POST → 201 with balance 26/0/0/26 · GET `?year=2026` returns `today=2026-11-02`, `availableYears=[2026,2027]` · PUT names · PUT pool 9 then `null` → back to default · invalid pool → 400 `{"code":"INVALID_POOL"}` · unknown id → 404 `EMPLOYEE_NOT_FOUND` · DELETE removes the employee **and** leave rows inserted through `LeaveRepository` |

### Local check

1. `npm run local:up`, then start the backend with the fixed date.
2. Get a token: `curl -s -X POST localhost:8080/api/internal/login -H 'Content-Type: application/json' -d '{"username":"renocar","password":"12345"}'`
   → `{"token":"…"}`. Export it as `T`.
3. `POST /api/internal/team/employees` `{"firstName":"Test","lastName":"Worker"}` → 201,
   `defaultAnnualDays: 26`, `colorIndex: 0`.
4. `GET /api/internal/team/employees?year=2026` → `today: "2026-11-02"`,
   `availableYears: [2026, 2027]`, balance 26 / 0 / 0 / 26.
5. `PUT …/{id}/pool/2026` `{"days":9}` → `pool: 9, poolIsDefault: false`.
6. `PUT …/{id}/pool/2026` `{"days":400}` → 400 `INVALID_POOL`.
7. The GET from step 4 without the `Authorization` header → 401.
8. `./local-env/aws-local.sh dynamodb scan --table-name employee` shows `annual_days_by_year`
   as a map.

### Exit criteria

All new tests pass, the full shop suite is unchanged against the Phase 0 baseline, and the local
check passes.

---

**✅ Implemented 2026-10-18, awaiting owner review (uncommitted).** 44 new tests
(`WorkingDaysTest` 10, `LeaveBalanceCalculatorTest` 7, `TeamFacadeTest` 11,
`EmployeeIntegrationTest` 16); full suite 93/93, no regressions against the 49 in the baseline.
The local check passed step by step: the env-var clock pin works, the map is stored as
DynamoDB `M`, and no token returns 401.
Deviations from the steps above, deliberate:
- Year parameters (`?year=`, `/pool/{year}`) are taken as strings and parsed in the facade, so
  `abc` → 400 `INVALID_YEAR` instead of the catch-all 500 a type mismatch would produce.
- `defaultAnnualDays: null` on update means "unchanged" (create: 26).
- Employees are sorted with a Polish collator (Ł, Ś, Ż in the right place).
- Under the local fixed date, the clock is offset rather than frozen, so timestamps stay
  distinct.

---

## Phase 2 — Backend: leave, warnings, report, seed

Goal: the rest of plan §4 (4.2, 4.3) works; the seed reproduces plan §6.0 exactly.

### Steps

1. **LeavePolicy** — `team/LeavePolicy.java`, pure. Input: candidate range, the employee's
   other leaves (for PUT: excluding the one being edited), today. Hard rules, in this order,
   plan §3.4:
   - `INVALID_RANGE` 400: null dates, end before start, or more than 60 calendar days
     inclusive.
   - `NO_WORKING_DAYS` 422: 0 Mon–Fri days.
   - `TOO_FAR_AHEAD` 422: end year > today's year + 1.
   - `LEAVE_OVERLAP` 409: `a.start ≤ b.end && a.end ≥ b.start`. Adjacent ranges are allowed.
2. **Warnings** — after a successful save, compute the balance for every year touched. For a
   PUT, that means the years of the old **and** new range. Emit `POOL_EXCEEDED {year,
   remaining}` for each year of the **new** range whose remaining is below 0.
3. **TeamFacade (leave part)** + `team/controller/LeaveController.java` at
   `/api/internal/team/leaves`:
   - `GET ?from&to`: leave overlapping the range, any employee.
   - `GET ?employeeId&year`: that employee's leave with ≥ 1 working day in the year, sorted by
     start.
   - Any other parameter combination → 400 `INVALID_QUERY`.
   - `POST` → 201, `PUT /{id}` → 200, both returning `{leave, balance[], warnings[]}`.
     `DELETE /{id}` → 204. Unknown leave → 404 `LEAVE_NOT_FOUND`; unknown employee → 404
     `EMPLOYEE_NOT_FOUND`.
   - `LeaveView` = id, employeeId, startDate, endDate, workingDays, workingDaysByYear
     (plan §4.2).
4. **Report** — `GET /api/internal/team/employees/{id}/report?year=` per plan §4.3:
   - totals come from `LeaveBalanceCalculator`;
   - `months` comes from `WorkingDays.countByMonth`;
   - the leave list is leave with `daysInYear > 0`;
   - status: `TAKEN` if end < today, `PLANNED` if start ≥ today, otherwise `IN_PROGRESS`;
   - `generatedOn` = today.
5. **Seed** — `local-env/seed-team.mjs` (Node ≥ 18, built-in `fetch`, no dependencies) and root
   `package.json` script `"local:seed-team": "node local-env/seed-team.mjs"`.
   - Logs in, creates the 8 workers of plan §6.0, **then** their typed pools, **then** their
     leave.
   - Prints one line per leave, plus every `warnings` entry.
   - Exits non-zero on any non-2xx response, printing the body.
   - Prints a reminder if the backend's `today` (from the list response) is not 2026-11-02.
6. **Docs for local use** — `local-env/README.md`: add a "Zespół i Urlopy" section with the
   fixed-date start command, the seed command, and a pointer to the expected table in plan
   §6.0.

### Tests

| Class | Kind | Cases |
|---|---|---|
| `LeavePolicyTest` | unit, today 2026-11-02 | each hard rule in order · exactly 60 days OK, 61 rejected · adjacent (ends 18th, next starts 19th) allowed · overlap by one day rejected · end 2027-12-31 OK, 2028-01-03 `TOO_FAR_AHEAD` · edited leave isn't compared with itself |
| `LeaveWarningsTest` | unit | over-pool in 2026 only → one warning for 2026 · cross-year leave overdrawing only 2027 → one warning for 2027 · no warning when remaining is exactly 0 |
| `LeaveIntegrationTest` | MockMvc | no user → 401 · POST → 201 with balance and empty warnings · overdraw → **201** with `POOL_EXCEEDED` · overlap → 409 `LEAVE_OVERLAP` · weekend-only → 422 · PUT moves dates, response balance covers old and new years · DELETE → 204, then the balance recovers · `from/to` returns a leave starting before `from` and ending inside the range, and excludes one ending the day before `from` · missing parameters → 400 `INVALID_QUERY` |
| `YearReportIntegrationTest` | MockMvc | Tomasz data (plan §6.0) → 9/4/4/1, `months[9]=4`, `months[11]=4`, New Year leave `daysInYear=4`, `PLANNED` · Marek data → `IN_PROGRESS` · unknown employee → 404 |

### Local check

1. Fresh `npm run local:up`, backend with the fixed date, then `npm run local:seed-team`. It
   exits 0 and shows **exactly one** `POOL_EXCEEDED`: Joanna, 2026, −2.
2. `GET /team/employees?year=2026` matches plan §6.0's 2026 column for all 8 workers.
3. `GET /team/employees?year=2027` → Tomasz 30 / 0 / 6 / 24.
4. `GET /team/leaves?from=2026-11-16&to=2026-11-20` → 5 leaves (Katarzyna, Joanna, Krzysztof,
   Michał ×2).
5. `GET /team/employees/{Marek}/report?year=2026` → one leave, `IN_PROGRESS`; months October 3,
   November 5.
6. POST Piotr 2026-11-12 → 409 `LEAVE_OVERLAP`. POST Piotr 2026-11-14 – 15 → 422
   `NO_WORKING_DAYS`.
7. PUT Tomasz's New Year leave to end 2026-12-31 → the response balance shows 2027 planned 0.

### Exit criteria

As phase 1, plus the seed runs cleanly twice in a row on fresh `local:up`s.

---

**✅ Implemented 2026-10-18, awaiting owner review (uncommitted; new files staged).** 36 new
tests (`LeavePolicyTest` 10, `LeaveWarningsTest` 4, `LeaveIntegrationTest` 16,
`YearReportIntegrationTest` 6); full suite 129/129. Local check: every step matches. The seed
gives the 2026 column of plan §6.0 for all 8 workers, exactly one `POOL_EXCEEDED`, and runs
cleanly on two fresh `local:up`s (a second run on seeded data refuses).
Deviations and additions, deliberate:
- New code `EMPLOYEE_CHANGE_NOT_ALLOWED` (400): PUT can't move a leave to another employee. The
  body's `employeeId` may be omitted on PUT. Phase 3 must map this code too.
- Save responses compute balances from the in-memory leave list (other leave + the saved one),
  not a re-scan: a DynamoDB scan right after a write is only eventually consistent.
- The report is built by a separate pure `YearReportBuilder`, which reuses `LeaveBalanceCalculator`.
- The seed refuses to run when employees exist and warns when the backend's `today` isn't
  2026-11-02. `SHOP_API` overrides the base URL.
- Fixed a phase 1 flaky test: `WorkingDaysTest` compared a sorted map with `Map.of` in strict
  order, and `Map.of`'s iteration order is random per JVM.

**Known limitation (not fixed, by design of the plan):** checks such as overlap read through a
scan, which on real DynamoDB is eventually consistent. With a single editor, a check could only
miss a leave saved in the same second. Acceptable; noted for phase 6.

---

## Phase 3 — Portal: shared helpers + Zespół panel

Goal: the Zespół screen, year-aware, against the seeded backend.

### Steps

1. **Date helpers** — `src/app/commons/iso-date.ts` (+ spec). Works on `YYYY-MM-DD` strings
   only: parse to a local date, format, add days, weekday, compare. Also `formatPl` →
   `28.12.2026` and Polish month names. No locale registration.
2. **Error messages** — `commons/team-error-messages.ts` (+ spec): map `code` → Polish text
   for every code in phases 1–2, with a generic fallback. Take the copy from plan §5; for
   validation codes, short Polish sentences.
3. **Models** — `models/employee.ts` (`EmployeeView`, `Balance`) and `models/employee-list.ts`
   (`{today, year, availableYears, employees}`), mirroring the phase 1 DTOs.
4. **Service** — `service/team-service.ts`, in the style of `unavailable-days-service.ts`:
   `list(year)`, `create`, `update`, `setPool(id, year, days|null)`, `delete`, and
   `report(id, year)` (used in phase 5).
5. **Confirm dialog** — `components/confirm-dialog/` (standalone, `MatDialog`, title + text +
   Anuluj/Usuń). Reused in phase 4.
6. **TeamComponent** — `components/team/`
   - Table and side editor per plan §5 and the design.
   - Year `mat-select` from `availableYears`, defaulting to today's year.
   - Search filters on the client.
   - "Pozostało" chip turns red below 0.
   - Footer "Liczba pracowników: N".
   - The editor has: Imię, Nazwisko, **Pula na {rok}** (calls `setPool`), **Domyślna pula**
     (part of `update`), stats card, and the go-live hint (plan §3.5).
   - On save, only call `setPool` if the per-year field changed. Reload the list after every
     mutation.
   - Show errors under the form through the error-message map.
7. **Routing and nav** — `app.routes.ts`: `team` with `AuthGuard`, **lazy** via
   `loadComponent: () => import(…).then(m => m.TeamComponent)`. In `app.component.html`,
   add "Zespół" after "Dostępność" (same markup and `closeMenu()` as the siblings).

### Tests

| Spec | Cases |
|---|---|
| `iso-date.spec.ts` | parse/format round trip · `addDays` across month and year end · weekday of 2026-11-02 is Monday · no timezone drift (assert on strings) |
| `team-error-messages.spec.ts` | every known code maps · unknown code → fallback |
| `team-service.spec.ts` (`HttpTestingController`) | URLs and `year` param · POST/PUT bodies · `setPool` with `null` sends `{"days":null}` · DELETE URL |
| `team.component.spec.ts` (light, mocked service) | renders one row per employee · search narrows rows · negative remaining gets the red class · changing year calls `list(newYear)` |

### Local check (seeded backend, :4201)

1. "Zespół" appears in the nav and shows 8 workers matching plan §6.0's 2026 column.
   Joanna's chip is red, −2. The footer shows 8.
2. The year selector offers 2026 and 2027. On 2027, Tomasz shows 30 / 0 / 6 / 24 and
   everyone else their default.
3. Katarzyna: Domyślna pula 26 → 20, save. 2026 stays 26 / 5 / 5 / 16, and 2027 shows 20.
4. Pula na 2026 = 366 → Polish error, value not saved after reload.
5. Add "Jan Testowy" → appears with 26; delete via the dialog → gone after reload.
6. Search "now" → only Tomasz Nowak.
7. Reload the page while on `/team` → still works (SSR and guard sanity).

### Exit criteria

Portal tests pass with no regressions against the baseline, `npm run build:admin-portal`
succeeds with the **initial** total still about 932 kB (the new code is in lazy chunks), and the
local check passes.

---

**✅ Implemented 2026-10-18, awaiting owner review (uncommitted; new files staged).** 25 new
specs (`iso-date` 6, `team-error-messages` 5, `days-label` 2, `team-service` 5, `team.component`
7); portal suite 54/54. Build OK: initial **942.71 kB** (+11 kB: shared Material/CDK code that
esbuild hoists into an initial chunk, plus the global panel styles). The panel itself is the lazy
`team-component` chunk (45.9 kB). Local check: all 7 steps pass in a real browser, with 0 console
errors (the NG0505 hydration warning was already in the baseline).
Deviations and additions, deliberate:
- **Shared panel styles are global** (`styles.css`, "Team panels" block: `.panel-card`,
  `.panel-card__title`, `.panel-chip`, `.panel-error`, `.panel-muted`, `.panel-link`).
  `angular.json` fails the build at **4 kB per component stylesheet**, and the team panel alone
  was at 2.7 kB. **Phase 4 must reuse these classes and keep calendar CSS under 4 kB.**
- `TeamService.report()` moves to phase 5, together with its model.
- `TeamService.list(year?)`: without a year the backend picks its current year, so first load
  never reads the browser clock.
- Search ignores case and Polish diacritics ("wisniewska" finds "Wiśniewska").
- The editor validates names and pools client-side with the *same* codes and messages as the
  backend, and shows "Przywróć domyślną pulę na {rok}" when the selected year has a typed pool.
- New `commons/days-label.ts` for "1 dzień" / "n dni".
- Delete dialog copy: "usunąć pracownika: Jan Testowy", because Polish can't decline arbitrary names.

---

## Phase 4 — Portal: Urlopy calendar

Goal: the calendar from the design, with add, edit, delete, live preview and warnings (plan §5).

### Steps

1. **Palette** — `commons/worker-colors.ts`: the 15 pairs from plan §5.1, plus
   `colorFor(index)` with modulo.
2. **Models + service** — `models/leave.ts` (`LeaveView`, `LeaveSaveResult`, `LeaveWarning`)
   and `service/leave-service.ts`: `inRange(from, to)`, `forEmployee(id, year)`, `create`,
   `update`, `delete`.
3. **Calendar layout** — `commons/calendar-layout.ts` (+ spec), pure:
   - Input: year, month, leaves, today.
   - Output: weeks → 7 day cells (date, in-month, weekend, today), with slots per cell.
   - Lane assignment per week: sort by start then employee id, greedy first free lane.
     `MAX_LANES = 3`, `more` count per cell.
   - A slot carries a label only at bar start or week start, and flags for rounded
     left/right ends.
   - The grid range (first Monday to last Sunday) is exported, because the service call needs
     it.
4. **Preview** — `commons/leave-preview.ts` (+ spec), pure. Input: range, the worker's balances
   for the touched years, and, when editing, the original leave. Output: per-year working days
   and remaining after save, plus an over-pool flag.
   - When editing, add the original leave's per-year days back before subtracting the new
     ones. Otherwise the preview double-counts the edited leave.
5. **LeaveCalendarComponent** — `components/leave-calendar/`
   - Load employees (names, colours, balances) via `TeamService.list(year)` for each year the
     form needs. That's 1 or 2 calls.
   - Load leave via `inRange(gridStart, gridEnd)` on every month change.
   - Month label in Polish; ‹ › and **Dzisiaj** use the backend `today`; the today circle as
     designed.
   - Bars use the worker colours, with weekend parts at 40 %. Legend as designed.
   - Filter "Tylko wybrany pracownik".
6. **Side form**
   - Worker select and "Pozostało X / Y" for the form's year (year of `Od`, else the visible
     month's year).
   - Od / Do inputs, or two clicks in the grid (first click sets both, second sets the end
     and swaps them if earlier).
   - Preview lines.
   - Over-pool: red text "Przekroczono pulę o N dni — urlop zostanie zapisany", **button stays
     enabled**.
   - After saving: a `MatSnackBar` for every `warnings` entry; errors shown inline through the
     message map; reload leave and balances.
   - Add a tooltip on "Dni robocze w zakresie": "Święta nie są pomijane automatycznie"
     (plan §8.1).
7. **Edit and delete** — clicking a bar loads that leave into the form ("Edycja urlopu",
   "Zapisz zmiany", "Usuń", "Anuluj" back to new). "Urlopy pracownika" lists the selected
   worker's leave for the form's year, past ones faded (end < `today`). Delete always goes
   through the confirm dialog.
8. **Narrow screens** — render a per-day list (days in the visible month that have anyone
   off, with names). Show it **instead of** the grid below 1000 px using a CSS media query,
   not JS.
9. **Routing and nav** — `leaves` route with `AuthGuard`, lazy (`loadComponent`); "Urlopy" after "Zespół".

### Tests

| Spec | Cases |
|---|---|
| `calendar-layout.spec.ts` | Nov 2026 → 6 weeks, first cell 2026-10-26, last 2026-12-06 · a leave Thu–Tue spans 2 weeks, labelled at its start and at the next week's Monday · four overlapping leaves → 3 lanes + `more=1` on each covered day · adjacent leaves share one lane · `today` cell flagged |
| `leave-preview.spec.ts` | 9–13 Nov = 5 · Sat–Sun = 0 · 28 Dec – 8 Jan → {2026: 4, 2027: 6} · overdraw sets the flag and the negative remaining · editing a 5-day leave down to 2 days raises remaining by 3, not lowers it by 2 |
| `leave-service.spec.ts` | `inRange` params · POST/PUT bodies · DELETE URL |
| `worker-colors.spec.ts` | 15 distinct backgrounds · index 15 wraps to 0 |
| `leave-calendar.component.spec.ts` (light) | renders the grid for the mocked month · a save with warnings opens one snackbar per warning |

### Local check (seeded backend, November 2026)

1. "Urlopy" opens on the backend's month (Listopad 2026) with 2 Nov circled.
2. Week 16–20 Nov: 3 bars plus "+1 więcej" on each weekday; the colours are clearly different.
3. Piotr's 9–13 Nov bar spans the week; selecting it shows a preview of 5 dni.
4. Agnieszka, click 21 Dec then 31 Dec → preview "9 dni", "Po dodaniu pozostanie 11" → save.
   The bar appears, and Zespół shows 20 / 0 / 9 / 11.
5. Joanna 23–24 Nov → red over-pool text, button enabled → save → a snackbar with the
   warning; Zespół shows −4.
6. Piotr 12 Nov → "Pracownik ma już urlop w tym terminie."
7. Click Tomasz's December bar → the form is in edit mode with the right dates. Set the end to
   31 Dec → the preview shows 2027 back to 30 → save. Zespół 2027 shows 30 / 0 / 0 / 30.
8. Delete Michał's 19–20 Nov leave via the dialog → the bar disappears and his planned days
   drop by 2.
9. "Tylko wybrany pracownik" with Katarzyna → only her bars.
10. Narrow the window below 1000 px → the list replaces the grid; widen it → the grid is back.
11. Navigate to December 2026 and January 2027 → the New Year leave renders across the year
    boundary.

### Exit criteria

As phase 3.

---

**✅ Implemented 2026-10-18, awaiting owner review (uncommitted; new files staged).** 26 new
specs (`calendar-layout` 8, `leave-preview` 6, `leave-service` 4, `worker-colors` 2,
`leave-calendar.component` 6); portal suite 80/80. Build OK with no component-style warnings:
initial 944.96 kB, lazy `leave-calendar-component` chunk 39.7 kB. Local check: all 11 steps
pass in a real browser. The only console error is the browser logging the deliberate 409 from
step 6.
Deviations and additions, deliberate:
- **Two components:** `LeaveCalendarComponent` (page: navigation, loading, form) plus a
  presentational `month-grid/MonthGridComponent` (grid + narrow-screen list). Splitting them
  keeps each stylesheet under the 4 kB per-component budget.
- **One snackbar per save**, listing every warning ("Zapisano urlop. Przekroczono pulę na
  2026 o 4 dni. …"). `MatSnackBar` shows only one message at a time, so one per warning would
  hide all but the last. The spec test checks every year is in the message.
- `MatDialog` / `MatSnackBar` are injected as root services, without importing their modules:
  the modules add a component-level provider, which also bypasses test doubles.
- Long names may run on over the rest of their own bar (`.bar--overflow`) instead of being cut
  at the first cell.
- The preview lists only the years of the *new* range. After shortening Tomasz's New Year leave
  it shows 2026 only, and 2027 returning to 30 is visible in Zespół, not in the form (step 7).
- More global panel classes (`.panel-title`, `.panel-spacer`, `.panel-x-button`), now used by
  both panels. **Fixed a regression this introduced:** body's `.mat-typography h1` outranked a
  bare `.panel-title`, so the title rule is now `.mat-typography .panel-title`.
- Native `<input type="date">` for Od / Do (ISO values, no datepicker bundle). The display
  format follows the browser locale.

---

## Phase 5 — Portal: Raport roczny

Goal: the per-worker yearly report, on screen and printed (plan §4.3, §5).

### Steps

1. **Model** — `models/year-report.ts` mirroring the phase 2 report DTO.
2. **YearReportComponent** — `components/year-report/`, route `team/:id/report` with query
   `year`, `AuthGuard`, lazy (`loadComponent`).
   - Header: worker, year, "Stan na {formatPl(generatedOn)}".
   - Four numbers: Pula, Wykorzystano, Zaplanowano, Pozostało (red below 0).
   - 12-month row with Polish month abbreviations.
   - Leave table: Od, Do, Dni w roku, Status (`TAKEN` → Wykorzystany, `IN_PROGRESS` → W
     trakcie, `PLANNED` → Zaplanowany).
   - The 2026 partial-year note (plan §5).
   - Buttons: **Drukuj**, which calls `window.print()` only in the browser (`isPlatformBrowser`),
     and **Wróć**, which goes to `/team`.
3. **Entry point** — a "Raport" button in the Zespół editor, opening the report for the
   selected worker and the year currently selected.
4. **Print styles** — global `src/styles.css`, `@media print`: hide the sidebar, nav and every
   button; content full width; black text on white; one A4 page for a normal year
   (`@page { size: A4; margin: 15mm }`).

### Tests

| Spec | Cases |
|---|---|
| `year-report.component.spec.ts` (mocked service) | renders the four numbers and 12 month cells · status codes map to Polish labels · the 2026 note appears for 2026 and not for 2027 · Drukuj calls `window.print` (spied) |

### Local check (seeded backend)

1. Zespół → Tomasz → Raport (2026): 9 / 4 / 4 / 1; październik 4, grudzień 4; the row
   28.12.2026 – 08.01.2027 shows **4**, Zaplanowany; the partial-year note is shown.
2. Switch to 2027 in Zespół → Raport: 30 / 0 / 6 / 24; styczeń 6; no note.
3. Marek 2026 → status "W trakcie".
4. Agnieszka 2026 → 20 / 0 / 0 / 20 with an empty-table message.
5. Drukuj → the print preview shows one A4 page with no sidebar or buttons, readable in black
   and white.
6. Open `/team/{id}/report?year=2026` directly in a new tab → it renders (guard plus SSR
   sanity).

### Exit criteria

As phase 3.

---

**✅ Implemented 2026-10-18, awaiting owner review (uncommitted; new files staged).** 6 new
specs (`year-report.component` 5, `team-service` report 1); portal suite 86/86. Build OK: initial
946.71 kB (+1.75 kB of print/button CSS over phase 4), lazy `year-report-component` 6.6 kB.
Local check: all 6 steps pass in a real browser, with 0 console errors. An A4 PDF render of
Tomasz 2026 is exactly 1 page, with no sidebar or buttons, black on white. The Zespół link follows
the year selector.
Deviations and additions, deliberate:
- **No `MatButtonModule` in the report.** Measured: importing it into this lazy chunk grew the
  *initial* bundle by ~18 kB (esbuild re-split shared Material code: 946 → 964.8 kB, back to
  946 without it). The report uses plain buttons with the new global `.panel-button`
  (+`--secondary`) in the Motrio look. **Rule for later lazy screens: measure the initial
  total after adding a Material module.**
- `TeamService.report(id, year?)`: without `?year=` the backend picks its current year (never
  the browser clock).
- The go-live note uses `GO_LIVE_YEAR = 2026` (`year-report.component.ts`). Change it if the
  release slips into 2027.
- The Raport entry point is a link under the stats card in the Zespół editor: "Raport roczny
  {rok} (podgląd i wydruk)".
- The report also shows a months total ("Razem") and a footnote on the working-day rule and
  New Year leave.

---

## Phase 6 — Docs, deploy, go-live

### Steps

1. **Docs**
   - `car-repair-shop-backend/shop/CLAUDE.md`: the `team` module, both tables, the `Clock`
     bean and the local fixed date.
   - `repair-requests-portal/CLAUDE.md`: the three routes, `commons/` helpers, palette, print
     styles.
   - Postman collection: the team endpoints.
   - Plan: mark the phases done.
2. **Final verification** on a fresh checkout state: full backend suite, full portal suite,
   portal build, and the phase 4 local check end to end once more.
3. **Deploy** — follow plan §6.2 in order: tables + PITR → IAM check → API Gateway proxy check
   → jar with the prod `application.properties` (verify with `unzip -p`) → portal.
4. **Production smoke test** (plan §6.2.6), then delete the smoke-test worker.
5. **Go-live** — the owner types each worker's remaining 2026 days (plan §3.5). Then merge to
   `main` per plan §8.8.

### Exit criteria

The smoke test passes in production, and real data has been entered.

---

## Traceability

| Plan item | Phase / step |
|---|---|
| §2.1 schema | 1.2 |
| §3.2 working days | 1.4 |
| §3.3 pool, snapshot | 1.5, 1.7 |
| §3.4 rules + warnings | 2.1, 2.2 |
| §3.5 go-live hint | 3.6, 6.5 |
| §4.1 employees API | 1.7, 1.8 |
| §4.2 leave API | 2.3 |
| §4.3 report | 2.4, 5 |
| §5 Zespół / Urlopy / Raport | 3, 4, 5 |
| §5.1 palette | 4.1 |
| §6.0 seed scenario | 2.5, every local check |
| §6.2 deploy | 6.3 |
| §8.1 holiday tooltip | 4.6 |
