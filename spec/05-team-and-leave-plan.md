# Zespół i Urlopy — implementation plan (team & annual-leave panels)

> **Status: plan only, nothing implemented.** Written 2026-10-14, revised the same day after
> two rounds of owner answers (§0). All blocking questions are answered; §7 lists the
> remaining assumed defaults.
>
> **Scope.** Two new admin-portal panels, **Zespół** (employee CRUD + yearly leave pool) and
> **Urlopy** (month calendar of who is off + leave entry). Backend lives in the `shop`
> monolith (`car-repair-shop-backend/shop/`) as a new modulith module. Frontend lives in
> `repair-requests-portal/`. No new Lambda.
>
> **Design source.** Claude Design project `c70047d6-59c3-4bd3-aeed-e1c4f450c248`, file
> `Panel Zespół i Urlopy.dc.html` (read with `DesignSync` → `get_file`). `support.js` there is
> the design-canvas runtime (generated, no business logic, nothing to port).

---

## 0. Owner decisions (2026-10-14)

**Givens:** one person edits this data at a time; 10–15 workers, this number will not grow; no
pagination; leave is counted **per calendar year** and can be **planned in advance**.

| # | Decision | Consequence in this plan |
|---|---|---|
| D1 | **Planning aid only**, not the official leave record (*ewidencja* / *akta osobowe*) | No audit trail, no retention rules, no legal proration logic |
| D2 | **The pool is typed by hand per year**, with no carry-over logic and no 20/26 validation. It can be bigger (e.g. 30 = 26 + days left over, added by hand) | One integer per employee per year, range check `0–365` only (§3.3) |
| D3 | **Only annual leave**, split into taken (past) and planned (future) | No `type` field, no L4/occasional leave, no health data |
| D4 | **Exceeding the pool only warns** | Save always succeeds; the API returns a warning and the portal shows it (§3.4) |
| D5 | **No weekend work. The system knows no holidays.** Working day = Monday–Friday. The editor shortens or splits a leave by hand around 11 Nov, Christmas etc. Nothing about holidays is stored | No holiday calendar, no holidays endpoint. Edit-in-calendar is required (§5) |
| D6 | **Go-live: the editor decides.** Most likely they type each person's **days still left** as the go-live year's pool and manage from the release date on | No opening-balance feature, no backfill required (§3.5) |
| D7 | **Deleting a worker hard-deletes them and their leave** (as designed) | `DELETE` cascades; no archive flag |
| D8 | **Whole days only** | Integers everywhere |
| D9 | **Desktop only** | Month grid as designed; on narrow screens a plain per-day list is enough |
| D10 | **A year nobody has typed uses the worker's default pool, prefilled as 26** | `default_annual_days` defaults to 26 on create; editable per worker |
| D12 | **Yearly report per worker: screen + print**, year summary only, no CSV (2026-10-15) | §4.3 endpoint, §5 "Raport roczny" screen, phase 5 |
| D11 | Accepted every §7 default (planning horizon, no staffing warning, no export, no roles) | §7 is closed |

---

## 1. What the design does

### 1.1 Zespół (team)

| Element | Behaviour in the mockup |
|---|---|
| Table | Imię · Nazwisko · Pula urlopu · Wykorzystano · Pozostało (chip, red when < 0) · `›` |
| Search | Client-side filter on "first last" |
| "+ Dodaj pracownika" | Opens the right-hand editor empty, default pool 26 |
| Editor | Imię, Nazwisko, "Liczba dni urlopu w roku" (int 0–365); for an existing worker a read-only stats card: "Pozostało X z Y", progress bar, "Wykorzystano N. Wartość wyliczana z zapisanych urlopów, bez możliwości edycji." |
| Usuń | Confirmation modal: "Zapisane urlopy tego pracownika również zostaną usunięte." (hard cascade delete, kept per D7) |
| Footer | "Liczba pracowników: N" |

### 1.2 Urlopy (leave calendar)

| Element | Behaviour in the mockup |
|---|---|
| Month grid | Mon–Sun, "Dzisiaj", ‹ › month navigation, today shown as a red circle |
| Leave bars | One coloured bar per leave, laid out in lanes per week (max 3 lanes, then "+N więcej"); label "T. Nowak" at the start of the bar and at the start of each week; weekend parts at 40 % opacity |
| Legend | "Dzień roboczy, odliczany od puli" / "Weekend, nie jest odliczany" |
| Filter | "Tylko wybrany pracownik" (filters by the worker chosen in the form) |
| Side form "Nowy urlop" | Pracownik (select) → "Pozostało dni urlopu X / Y" → Od / Do (date inputs, **or** click two days in the calendar) → "Dni robocze w zakresie" + "Po dodaniu pozostanie" → **Dodaj urlop** |
| Validation (blocks the button) | end < start; range is weekend only; overlaps the same worker's leave; working days > remaining (**becomes a warning, D4**) |
| "Urlopy pracownika" | Selected worker's leaves sorted by start, past ones faded, `×` deletes with no confirmation |
| Clicking a bar | Selects that worker in the form |

The design's working-day rule (Mon–Fri, no holidays) already matches D5.

### 1.3 Gaps in the design that the implementation must fix

1. **"Wykorzystano" adds up every leave ever saved, across all years.** `used()` has no year
   filter, so from January the pool looks permanently spent. Every balance must be
   **per year**, and both panels need a **year selector**.
2. **Leave spanning New Year** (e.g. 28 Dec – 8 Jan) is charged entirely to one pool. Each
   working day must be charged to **its own calendar year**.
3. **"Used" and "planned" are merged.** Per D3, show **Wykorzystano** (taken, past) and
   **Zaplanowano** (planned, future) separately. "Pozostało" subtracts both.
4. **The pool is one number for all years.** Per D2 it is typed by hand **per year**, so the
   editor has to show which year the number applies to.
5. **Exceeding the pool disables the button.** Per D4 it must only warn.
6. **No way to edit a leave**, only delete and re-add. With no holiday knowledge (D5), the
   editor will often reshape leave around holidays, so edit is in scope (§5).
7. **Colours are `HUES[id % 10]`.** There are 10 hues for up to 15 people, so two workers can
   share a colour. Store a stable `colorIndex` per employee from a 15-colour palette.

---

## 2. Storage options

The current stack is DynamoDB (`aws-java-sdk-dynamodb` 1.12 mapper +
`spring-data-dynamodb`, `@EnableScan` repositories). Volume: about 15 employees and about
15 × 10 = 150 leave rows per year, roughly 15 KB per year.

| # | Option | Pros | Cons | Verdict |
|---|---|---|---|---|
| **A** | **Two DynamoDB tables: `employee` + `employee_leave`** (hash key `id`, full scans) | Same pattern as `unavailable_day`; works with `CrudRepository` + `@EnableScan` and the LocalStack test base unchanged; on-demand cost about zero; each entity is independent | No cross-table transaction (irrelevant with one editor); cascade delete is N calls (≤ ~50 rows, fine); scan returns everything (irrelevant at this size) | ✅ **Recommended** |
| B | One DynamoDB item per team (`team_state`, id `"TEAM"`) holding employees + leaves as nested lists, with `@DynamoDBVersionAttribute` | Atomic writes, trivial optimistic locking, one `GetItem` for the whole screen | 400 KB item limit (about 20+ years here, then needs pruning); whole-document rewrite on every change; unlike anything else in the codebase | Viable, but not worth being the odd one out |
| C | Single-table design (`PK=EMP#id`, `SK=LEAVE#date`) | Idiomatic DynamoDB; one `Query` per employee | Needs the low-level mapper/`Query` rather than `CrudRepository`; more ceremony than 150 rows/year justify | Over-engineered here |
| D | S3 JSON file | Very cheap, simple | New client + IAM, no conditional writes in current SDK usage, no LocalStack test base | ❌ |
| E | RDS / Aurora Serverless (Postgres) | Relational fits (FK, constraints) | Minimum monthly cost; the platform moved to serverless **specifically to cut cost**; new driver, migrations, VPC | ❌ |
| F | The shop's Firebird DB (used by `car-repair-shop-ai-chat`) | Data already "at the shop" | On-prem, not reachable from Lambda; the Firebird topic is parked | ❌ |
| G | Google Calendar as the store | Workers could subscribe | OAuth, no pool logic, external dependency for core data | ❌ (export only, later) |

### 2.1 Recommended schema (option A)

**Table `employee`** (hash key `id`, on-demand)

| Attribute | Type | Notes |
|---|---|---|
| `id` | S | `@DynamoDBAutoGeneratedKey` (UUID), as in `UnavailableDay` |
| `first_name`, `last_name` | S | trimmed, 1–60 chars |
| `default_annual_days` | N | pool used for a year with no hand-typed value, `0–365` (D2: no 20/26 rule) |
| `annual_days_by_year` | M | `{"2026": 9, "2027": 30}`, the hand-typed pool per year (D2). `Map<String,Integer>`, natively supported by the v1 mapper |
| `color_index` | N | 0–14, first free index at creation |
| `created_at`, `updated_at` | S | UTC `LocalDateTime` (repo convention; reuse `LocalDateTimeConverter`) |

**Table `employee_leave`** (hash key `id`, on-demand)

| Attribute | Type | Notes |
|---|---|---|
| `id` | S | UUID |
| `employee_id` | S | FK by convention |
| `start_date`, `end_date` | S | ISO `LocalDate` (reuse `LocalDateConverter`), inclusive |
| `created_at`, `updated_at` | S | UTC |

No `type` (D3) and nothing about holidays (D5). No GSI: every read scans both tables and
filters in memory. If that ever matters, add GSI `EmployeeIdIndex` on
`employee_leave.employee_id`.

**Working days are computed on read** (count of Mon–Fri in the range), never stored. The rule
is fixed, so the numbers can never drift.

---

## 3. Domain rules

### 3.1 Module layout (`shop`)

New modulith module `car.repair.shop.team`. Public API: only `TeamFacade` (plus DTOs),
following the `UnavailableDayFacade` convention.

```
team/
  TeamFacade.java                 // public: employee + leave commands/queries
  Employee.java                   // @DynamoDBTable("employee")
  Leave.java                      // @DynamoDBTable("employee_leave")
  EmployeeRepository.java, LeaveRepository.java   // package-private, @EnableScan
  WorkingDays.java                // pure: count(from,to), countByYear(from,to) — Mon–Fri only
  LeaveBalanceCalculator.java     // pure, unit-tested
  LeavePolicy.java                // hard rules + warnings on create/update
  controller/EmployeeController.java, LeaveController.java, dto/…
  exception/TeamValidationException.java (code + message)
```

`WorkingDays` stays inside `team`, since nothing else needs it.

### 3.2 Working days (D5)

`isWorkingDay(d)` = Monday–Friday. Nothing else: holidays, shop closures and bridge days are
**not modelled**. The editor shortens or splits a leave in the calendar instead (e.g. a
9–13 Nov 2026 leave counts 5 days; to not charge 11 Nov, the editor saves it as 9–10 Nov +
12–13 Nov, or just accepts the 5).

> ⚠️ Don't derive anything from `unavailable_day`. That table means "no customer
> appointments", and `PastUnavailableDaysCleaner` deletes past rows weekly.

### 3.3 Yearly pool (D2)

```
pool(Y)      = annual_days_by_year[Y] ?? default_annual_days
taken(Y)     = Σ Mon–Fri days d of e's leaves with year(d)=Y and d <  today(Europe/Warsaw)
planned(Y)   = Σ Mon–Fri days d of e's leaves with year(d)=Y and d >= today
remaining(Y) = pool(Y) − taken(Y) − planned(Y)          // may go negative (D4)
```

- **No carry-over logic.** Leftover days are added to next year's number by hand (D2).
- **Planning into next year** charges next year's pool, which falls back to
  `default_annual_days` until someone types a value for that year. The design's single
  "Liczba dni urlopu w roku" field becomes two fields: **"Pula na {rok}"** (writes
  `annual_days_by_year[rok]`) and **"Domyślna pula"** (writes `default_annual_days`, used for
  years nobody has typed yet).
- **Keep past years stable when the default changes.** A year with no typed pool reads the
  *current* default, so changing the default from 26 to 20 would silently rewrite every
  untyped past year. Fix: when `default_annual_days` changes, first copy the **old** default
  into `annual_days_by_year` for every year up to the current one that has leave but no typed
  value. That's a few map entries, written in the same `save`.
- Everything is computed on read, so no yearly roll-over job is needed. (A `@Scheduled` job
  would not run reliably in Lambda anyway.)
- "Today" is `LocalDate.now(ZoneId.of("Europe/Warsaw"))`. Leave dates are plain
  `LocalDate`s, so the repo's UTC rule for `*_at` timestamps does not apply to them.

### 3.4 Validation on create / update leave

**Hard rules** (request rejected):

| Rule | HTTP | Code |
|---|---|---|
| employee exists | 404 | `EMPLOYEE_NOT_FOUND` |
| `start ≤ end`, range ≤ 60 calendar days (sanity) | 400 | `INVALID_RANGE` |
| ≥ 1 Mon–Fri day in range | 422 | `NO_WORKING_DAYS` |
| no overlap with the same employee's other leave | 409 | `LEAVE_OVERLAP` |
| year of `end` ≤ current year + 1 | 422 | `TOO_FAR_AHEAD` (assumed default, §7) |

**Warnings** (saved anyway, D4). The response carries `warnings`:

| Condition | Warning code |
|---|---|
| for any year touched, `remaining(Y) < 0` after this leave | `POOL_EXCEEDED` (with `year` and `remaining`) |

The portal shows the same warning **before** saving (live preview, §5), so the editor sees it
coming. There is no `force` flag, because the save always goes through.

Past dates are **allowed**, so the editor can still record a leave after the fact.

Concurrency: one editor, so last write wins. No locking.

### 3.5 Go-live (D6)

The release date is "day zero". The editor types each worker's **days still left in 2026**
as the 2026 pool and enters only leave **from the release date on**.

> ⚠️ **Double-counting trap.** If the 2026 pool already equals "days left" and the editor
> *also* enters a leave from before release, that leave is deducted twice. Mitigation: a
> one-line hint under "Pula na 2026" ("Wpisz dni pozostałe na dzień startu; nie dodawaj
> wcześniejszych urlopów"), plus showing past leave faded so it's obvious. No code rule, since
> the editor decides (D6).

---

## 4. API design

All endpoints live under `/api/internal/**` and are covered by the existing
`anyRequest().authenticated()` (JWT). **Do not** add them to the `permitAll` list in
`SecurityConfig`: this is employee personal data. CORS already allows GET/POST/PUT/DELETE.
Error bodies are JSON `{"code": "...", "message": "..."}` so the portal can map `code` to
Polish copy. This needs one new `@ExceptionHandler` for `TeamValidationException` in
`GlobalExceptionHandler`.

### 4.1 Employees (Zespół)

| Method & path | Body | Response |
|---|---|---|
| `GET /api/internal/team/employees?year=2026` | | `200 {today, year, availableYears, employees: [EmployeeView]}`, balances for `year` (default: current year). `availableYears` runs from the earliest year with any leave or typed pool (never later than the current year) through current year + 1, the planning limit; it drives the year selector. `today` is the backend's date: the portal uses it for "Dzisiaj" and for fading past leave, and never reads the browser clock |
| `POST /api/internal/team/employees` | `{firstName, lastName, defaultAnnualDays}` | `201 EmployeeView` |
| `PUT /api/internal/team/employees/{id}` | `{firstName, lastName, defaultAnnualDays}` | `200 EmployeeView` |
| `PUT /api/internal/team/employees/{id}/pool/{year}` | `{days: 30}` (`null` = back to default) | `200 EmployeeView` |
| `DELETE /api/internal/team/employees/{id}` | | `204`, deletes that employee's leave first, then the employee (D7) |

```json
// EmployeeView (GET ?year=2026)
{
  "id": "6f1c…", "firstName": "Tomasz", "lastName": "Nowak", "colorIndex": 0,
  "defaultAnnualDays": 26,
  "balance": { "year": 2026, "pool": 9, "poolIsDefault": false,
               "taken": 2, "planned": 5, "remaining": 2 }
}
```

### 4.2 Leaves (Urlopy)

| Method & path | Body | Response |
|---|---|---|
| `GET /api/internal/team/leaves?from=2026-09-28&to=2026-11-08` | | `200 [LeaveView]` overlapping the range (the visible 5–6-week grid, which crosses month/year edges) |
| `GET /api/internal/team/leaves?employeeId=…&year=2026` | | `200 [LeaveView]` for the "Urlopy pracownika" list |
| `POST /api/internal/team/leaves` | `{employeeId, startDate, endDate}` | `201 {leave: LeaveView, balance, warnings: []}` |
| `PUT /api/internal/team/leaves/{id}` | same as POST | `200` same shape (overlap check excludes itself) |
| `DELETE /api/internal/team/leaves/{id}` | | `204` |

```json
// POST response: leave over New Year that overdraws 2026
// (worker already had 2 taken + 5 planned in 2026, pool 9)
{
  "leave": { "id": "a91…", "employeeId": "6f1c…", "startDate": "2026-12-28",
             "endDate": "2027-01-08", "workingDays": 10,
             "workingDaysByYear": { "2026": 4, "2027": 6 } },
  "balance": [ { "year": 2026, "pool": 9,  "taken": 2, "planned": 9, "remaining": -2 },
               { "year": 2027, "pool": 26, "taken": 0, "planned": 6, "remaining": 20 } ],
  "warnings": [ { "code": "POOL_EXCEEDED", "year": 2026, "remaining": -2 } ]
}
```

2026 counts Mon 28 – Thu 31 Dec (4). 2027 counts Fri 1 Jan and Mon 4 – Fri 8 Jan (6). 1 Jan
and 6 Jan **are** counted, because the system knows no holidays (D5). The editor would split
the leave if those days shouldn't be charged.

No calendar/holidays endpoint is needed: Mon–Fri is trivial, so the portal computes the live
preview itself and the backend recomputes on save as the authority.

### 4.3 Yearly report (D12)

| Method & path | Response |
|---|---|
| `GET /api/internal/team/employees/{id}/report?year=2026` | `200 YearReport` |

```json
{
  "employee": { "id": "6f1c…", "firstName": "Tomasz", "lastName": "Nowak" },
  "year": 2026, "generatedOn": "2026-11-02",
  "pool": 9, "poolIsDefault": false, "taken": 4, "planned": 4, "remaining": 1,
  "months": [0,0,0,0,0,0,0,0,0,4,0,4],          // working days per month, Jan..Dec
  "leaves": [
    { "startDate": "2026-10-20", "endDate": "2026-10-23", "daysInYear": 4, "status": "TAKEN" },
    { "startDate": "2026-12-28", "endDate": "2027-01-08", "daysInYear": 4, "status": "PLANNED" }
  ]
}
```

- A dedicated endpoint keeps all counting in Java (one authority). The FE only lays it out.
- `daysInYear` counts only the part inside `year`. A leave over New Year shows its full dates
  but only this year's days.
- `status`: `TAKEN` (ended before today), `PLANNED` (starts today or later), `IN_PROGRESS`
  (spans today).
- It reuses `LeaveBalanceCalculator`, so the numbers can't differ from the Zespół table.

---

## 5. Frontend (`repair-requests-portal/`, Angular 18 + Material)

- Routes `team` → `TeamComponent`, `leaves` → `LeaveCalendarComponent`, both
  `canActivate: [AuthGuard]`. Add nav items **Zespół** and **Urlopy** after **Dostępność** in
  `app.component.html`.
- Services `team-service.ts` and `leave-service.ts`, plus models next to the existing ones,
  using the same `environment.apiUrl` + interceptor pattern as `unavailable-days-service.ts`.
- **Zespół:** Material table (no paginator), search, year selector (current year and the
  next one), side editor with **Pula na {rok}** + **Domyślna pula** + go-live hint (§3.5),
  confirm dialog for delete (design copy). Columns: Imię, Nazwisko, Pula ({rok}),
  Wykorzystano, Zaplanowano, Pozostało.
- **Urlopy:** a hand-built month grid, not a calendar library. Port the design's lane-layout
  algorithm (sort by start, greedy lane per week, `MAXL=3`, "+N więcej") as a pure,
  unit-tested TS function. Legend as designed.
  - Add: as designed (click two days or use the date inputs).
  - **Edit:** clicking a bar selects the worker **and loads that leave into the form**
    (title becomes "Edycja urlopu", button "Zapisz zmiany", plus "Usuń"). This is the main
    way to reshape leave around holidays (D5).
  - **Over-pool (D4):** the button stays enabled. "Po dodaniu pozostanie" turns red with
    "Przekroczono pulę o N dni — urlop zostanie zapisany". After saving, the API's `warnings`
    drive a snackbar.
  - **Narrow screens (D9):** below ~1000 px, replace the grid with a plain list of days
    showing who is off. No responsive grid work.
- Error mapping, `code` → Polish: `LEAVE_OVERLAP` "Pracownik ma już urlop w tym terminie.",
  `NO_WORKING_DAYS` "Wybrany zakres obejmuje tylko weekend.", `TOO_FAR_AHEAD` "Urlop można
  planować najdalej do końca przyszłego roku."
- Delete leave: add a light confirmation (the design deletes on one `×` click).
- **Raport roczny (D12):** route `team/:id/report?year=2026`, opened by a "Raport" button in
  the Zespół editor (year taken from the year selector). Layout: header (worker, year,
  "Stan na {data}"), four numbers (Pula, Wykorzystano, Zaplanowano, Pozostało), a 12-month row
  of day counts, and the leave table (Od, Do, Dni w roku, Status). **"Drukuj"** calls
  `window.print()`. A `@media print` stylesheet hides the sidebar and buttons, keeps it to one
  A4 page and prints in black and white. For 2026 it adds the note "Rok rozpoczęty w trakcie:
  pula = dni pozostałe na dzień startu" (§3.5). No PDF library, no CSV.

### 5.1 Worker colour palette

Fifteen pastel bar colours with dark text, ordered so that **neighbouring indices are far
apart in hue**. Workers get the first free index, so a small team still gets very different
colours. All text/background pairs are well above WCAG AA contrast. Brand red (`#e2001a`) is
left out on purpose, since the portal uses it for "today" and errors. The weekend part of a
bar keeps the design's 40 % opacity.

| `color_index` | Name | Bar background | Bar text |
|---|---|---|---|
| 0 | blue | `#bfdbfe` | `#1e40af` |
| 1 | orange | `#fed7aa` | `#9a3412` |
| 2 | green | `#bbf7d0` | `#166534` |
| 3 | fuchsia | `#f5d0fe` | `#86198f` |
| 4 | yellow | `#fef08a` | `#854d0e` |
| 5 | teal | `#99f6e4` | `#115e59` |
| 6 | rose | `#fecdd3` | `#9f1239` |
| 7 | violet | `#ddd6fe` | `#5b21b6` |
| 8 | lime | `#d9f99d` | `#3f6212` |
| 9 | cyan | `#a5f3fc` | `#155e75` |
| 10 | amber | `#fde68a` | `#92400e` |
| 11 | pink | `#fbcfe8` | `#9d174d` |
| 12 | emerald | `#a7f3d0` | `#065f46` |
| 13 | indigo | `#c7d2fe` | `#3730a3` |
| 14 | stone | `#d6d3d1` | `#292524` |

The palette lives only in the portal (`commons/worker-colors.ts`); the backend stores just the
index. With more than 15 workers (not expected), indices wrap around.

---

## 6. Implementation phases

> **Step-by-step guide:** `spec/05-team-and-leave-implementation-spec.md` turns these phases
> into ordered steps with files, tests and local checks. Implement from that file; keep this
> section as the summary.

Six phases, each a natural stopping and commit point on branch `worker-leave-planning`.
Phases 1–2 are backend only and verifiable with tests and `curl` before any UI exists.
Phases 3–5 are portal only. Phase 6 ships.

**Every phase is done when:**
- every task box is ticked;
- its tests pass: `mvn test` in `car-repair-shop-backend/shop/` (Docker running) for backend
  phases, `npm test` in `repair-requests-portal/` (Chrome) for portal phases;
- `npm run build:admin-portal` succeeds (portal phases);
- the phase's **local check** passes with the expected values below;
- no existing test was broken. The whole shop suite and portal suite run each time, not just
  the new tests.

### 6.0 Local test scenario (used by every local check)

To make expected numbers deterministic, the shop backend can run with a **fixed "today"**,
locally only:

- Phase 1 adds a `Clock` bean (zone Europe/Warsaw). Under the `local` profile only, it honours
  the optional property `car.repair.shop.clock.fixed-date`. In every other profile, and
  whenever the property is unset, it is the system clock. Production can't be affected.
- Start the backend with
  `CAR_REPAIR_SHOP_CLOCK_FIXEDDATE=2026-11-02 npm run local:shop` (Spring relaxed binding of
  that property; 2026-11-02 is a Monday).
- `npm run local:seed-team` (added in phase 2: `local-env/seed-team.mjs`, Node, no extra
  dependencies) logs in as `renocar`/`12345`, then creates the workers and leave below through
  the shop API, typed pools **before** leave (or Joanna's warning won't fire). It prints each
  response's `warnings`. It is safe to run only once per
  `local:up`; LocalStack starts empty every time.

**Seed data and expected balances on 2026-11-02:**

| # | Worker | Default | Typed pools | Leave | 2026: Pula / Wykorzystano / Zaplanowano / Pozostało | Exercises |
|---|---|---|---|---|---|---|
| 1 | Tomasz Nowak | 26 | 2026 = 9, 2027 = 30 | 20–23 Oct 2026; 28 Dec 2026 – 8 Jan 2027 | **9 / 4 / 4 / 1** (2027: 30 / 0 / 6 / 24) | typed pool, go-live style pool, New Year split |
| 2 | Katarzyna Wiśniewska | 26 | — | 19–23 Oct; 16–20 Nov | **26 / 5 / 5 / 16** | default pool, taken + planned |
| 3 | Marek Zieliński | 20 | — | 28 Oct – 6 Nov | **20 / 3 / 5 / 12** | leave in progress (report status `IN_PROGRESS`) |
| 4 | Joanna Lewandowska | 26 | 2026 = 3 | 16–20 Nov | **3 / 0 / 5 / −2** | overdraw → `POOL_EXCEEDED` printed by the seed |
| 5 | Piotr Kamiński | 26 | — | 9–13 Nov | **26 / 0 / 5 / 21** | 11 Nov is charged (no holidays, D5) |
| 6 | Agnieszka Dąbrowska | 20 | — | none | **20 / 0 / 0 / 20** | empty worker |
| 7 | Krzysztof Wójcik | 26 | — | 16–20 Nov | **26 / 0 / 5 / 21** | calendar crowding |
| 8 | Michał Szymański | 26 | — | 16–18 Nov; 19–20 Nov | **26 / 0 / 5 / 21** | adjacent leaves (allowed, share a lane) |

In the week of 16–20 Nov four people are off (2, 4, 7, 8), so the calendar shows 3 bars plus
**"+1 więcej"** on each weekday.

### Phase 1 — Backend: employees, pools, balance

Goal: the `team` module exists, and employees with yearly pools can be managed over the API
with correct balances.

Tasks:
- [ ] `team` package per §3.1; `Employee` and `Leave` entities with the attributes in §2.1;
      package-private repositories (`@EnableScan`). `Leave` is needed now for balances and
      cascade delete; its endpoints come in phase 2.
- [ ] `WorkingDays`: `count(from, to)` and `countByYear(from, to)`, Mon–Fri only.
- [ ] `LeaveBalanceCalculator`: pool fallback, taken/planned split around today, negative
      remaining (§3.3).
- [ ] `Clock` bean with the local-only fixed date (§6.0); all "today" logic reads it.
- [ ] `TeamFacade` employee operations: list with balances for a year, create (default 26,
      first free `color_index`), update (with the **default-change snapshot**, §3.3), set or
      clear one year's pool, delete with cascade (leave first, then employee).
- [ ] `EmployeeController` + record DTOs per §4.1, including the
      `{today, year, availableYears, employees}` wrapper.
- [ ] `TeamValidationException` → JSON `{code, message}` in `GlobalExceptionHandler`.
      Validation: names 1–60 chars trimmed, pools 0–365, year 2000–2100.
- [ ] `local-env/init/ready.d/10-resources.sh`: create `employee` and `employee_leave`.
- [ ] `TeamIntegrationTest` base creating both tables (mirrors `RepairRequestIntegrationTest`).

Tests:
- `WorkingDaysTest`: Mon–Fri week = 5; Sat–Sun = 0; single weekday = 1; 9–13 Nov 2026 = 5
  (11 Nov counted); 28 Dec 2026 – 8 Jan 2027 = `{2026: 4, 2027: 6}`.
- `LeaveBalanceCalculatorTest` (fixed clock 2026-11-02): typed pool beats default; untyped
  year uses default; 28 Oct – 6 Nov splits into taken 3 / planned 5; cross-year leave charges
  each year; remaining can go negative.
- `EmployeeIntegrationTest`: create → list shows 26/0/0/26; update names; set pool 2026 = 9
  then clear back to default; pool 366 and −1 → 400 with code; empty name → 400; **default
  change 26 → 20 keeps 2026 at 26 when 2026 has leave and no typed pool, and 2027 shows 20**;
  delete removes the employee and their leave rows (insert rows via the repository);
  `color_index` reuses a freed index; requests without a JWT are rejected (follow how existing
  tests handle security, `SecurityTestConfig`).

Local check (no UI yet):
1. `npm run local:up`, then `CAR_REPAIR_SHOP_CLOCK_FIXEDDATE=2026-11-02 npm run local:shop`.
2. Log in with `curl` (`POST /api/internal/login`), keep the token.
3. `POST /api/internal/team/employees` `{"firstName":"Test","lastName":"Worker","defaultAnnualDays":26}`
   → 201.
4. `GET /api/internal/team/employees?year=2026` → `today: "2026-11-02"`,
   `availableYears: [2026, 2027]` and the worker with 26 / 0 / 0 / 26.
5. `PUT …/pool/2026 {"days":9}` → GET shows pool 9, `poolIsDefault: false`.
6. The same GET without the token → 401/403.

### Phase 2 — Backend: leave, warnings, report, seed

Goal: the full API of §4 works, and the local seed scenario reproduces §6.0.

Tasks:
- [ ] `LeavePolicy`: hard rules and `POOL_EXCEEDED` warning per §3.4 (overlap check ignores
      the leave being edited).
- [ ] `TeamFacade` leave operations + `LeaveController`: GET by range, GET by employee and
      year, POST, PUT, DELETE (§4.2), responses with `balance` and `warnings`.
- [ ] Report: `GET …/employees/{id}/report?year=` (§4.3) with month counts, `daysInYear`,
      status `TAKEN` / `IN_PROGRESS` / `PLANNED`, built on `LeaveBalanceCalculator`.
- [ ] `local-env/seed-team.mjs` + root `package.json` script `local:seed-team`; seed data
      exactly as §6.0.
- [ ] `local-env/README.md`: a short "Zespół i Urlopy" section (fixed date, seed command,
      expected table pointer).

Tests:
- `LeavePolicyTest`: each hard rule (end before start; > 60 days; weekend-only; overlap;
  adjacent is **not** overlap; end in 2028 rejected and 31 Dec 2027 allowed with today in
  2026); `POOL_EXCEEDED` for the right year only, including a cross-year leave that overdraws
  just one of the two years.
- `LeaveIntegrationTest`: POST → 201 with balance; overlap → 409 `LEAVE_OVERLAP`; overdraw →
  **201** with a warning; PUT changes dates and doesn't clash with itself; DELETE → 204 and the
  balance recovers; range GET returns only overlapping leave, including one that starts before
  the range and ends inside it; unknown employee → 404.
- `YearReportIntegrationTest`: Tomasz-like data gives pool 9 / taken 4 / planned 4 /
  remaining 1, `months[9] = 4`, `months[11] = 4`, and the New Year leave has
  `daysInYear = 4`; a leave spanning today is `IN_PROGRESS`.

Local check:
1. Fresh `npm run local:up`, backend with the fixed date, then `npm run local:seed-team`. The
   seed output shows **exactly one** `POOL_EXCEEDED` (Joanna, 2026, −2).
2. `GET …/employees?year=2026` matches the 2026 column of §6.0 for all 8 workers.
3. `GET …/employees?year=2027` shows Tomasz 30 / 0 / 6 / 24.
4. `GET …/employees/{Marek}/report?year=2026` → one leave with status `IN_PROGRESS`.
5. POST a second leave for Piotr on 12 Nov → 409 `LEAVE_OVERLAP`; POST Sat 14 – Sun 15 Nov →
   422 `NO_WORKING_DAYS`.

### Phase 3 — Portal: Zespół panel

Goal: the team screen from the design, with year-aware numbers.

Tasks:
- [ ] Models (`employee.ts`, `employee-list.ts`) and `team-service.ts` following
      `unavailable-days-service.ts`.
- [ ] `commons/team-error-messages.ts`: API `code` → Polish message (§5).
- [ ] Route `team` + nav item **Zespół** after **Dostępność**.
- [ ] `TeamComponent`: table (Imię, Nazwisko, Pula ({rok}), Wykorzystano, Zaplanowano,
      Pozostało with red chip below 0), search, year selector filled from `availableYears`,
      footer count.
- [ ] Side editor: Imię, Nazwisko, **Pula na {rok}**, **Domyślna pula**, the go-live hint
      (§3.5), stats card, Zapisz / Anuluj / Usuń, delete confirm dialog with the design copy.
      A **Raport** button is added in phase 5.

Tests:
- `team-service.spec.ts` (`HttpTestingController`): URLs, `year` param, request bodies,
  `PUT …/pool/{year}` with `null` to clear.
- `team-error-messages.spec.ts`: each known code maps to its message; unknown → generic.
- `team.component.spec.ts` (light): renders one row per employee from a mocked service; the
  search filter narrows rows.

Local check (seeded backend, http://localhost:4201, renocar / 12345):
1. Zespół lists 8 workers with the 2026 column of §6.0. Joanna's "Pozostało" chip is red, −2.
2. Switch year to 2027: Tomasz 30 / 0 / 6 / 24, everyone else at their default.
3. Katarzyna: change Domyślna pula 26 → 20, save. 2026 stays 26 / 5 / 5 / 16; 2027 shows 20.
4. Type 366 as a pool → Polish validation message, nothing saved.
5. Add "Jan Testowy", then delete him via the confirm dialog → gone after reload.

### Phase 4 — Portal: Urlopy calendar

Goal: the calendar from the design, with add, edit and delete, live preview and warnings.

Tasks:
- [ ] `commons/worker-colors.ts` (§5.1).
- [ ] `leave-service.ts` + models.
- [ ] Pure functions, each in its own file: `calendar-layout.ts` (month → weeks → day cells,
      lane assignment, max 3 lanes, "+N więcej") and `leave-preview.ts` (Mon–Fri count, split by
      year, remaining after save, over-pool flag).
- [ ] Route `leaves` + nav item **Urlopy**.
- [ ] `LeaveCalendarComponent`: month navigation and "Dzisiaj" from the backend's `today`,
      bars with worker colours, weekend parts at 40 %, filter "Tylko wybrany pracownik".
- [ ] Side form: worker select, remaining X / Y, Od / Do or two clicks in the grid, preview
      lines, **red over-pool text with the button still enabled** (D4), snackbar from API
      `warnings`, error messages from the code map.
- [ ] Edit: clicking a bar loads that leave into the form ("Edycja urlopu", "Zapisz zmiany",
      "Usuń"). "Urlopy pracownika" list with delete confirmation.
- [ ] Below ~1000 px: a plain per-day list of who is off instead of the grid (D9).

Tests:
- `calendar-layout.spec.ts`: November 2026 has 6 week rows, Mon 26 Oct – Sun 6 Dec (1 Nov is a Sunday); a leave over
  a weekend continues in the next row with its label repeated; four overlapping leaves give 3
  lanes + "+1"; adjacent leaves share a lane.
- `leave-preview.spec.ts`: 9–13 Nov = 5; Sat–Sun = 0; 28 Dec – 8 Jan = 4 + 6; remaining after
  goes negative and sets the over-pool flag.
- `leave-service.spec.ts`: range params, POST/PUT bodies, DELETE URL.

Local check (seeded backend, November 2026):
1. Week 16–20 Nov shows 3 bars plus "+1 więcej" on each weekday; colours are clearly
   different.
2. Piotr's 9–13 Nov bar spans the full week, and the form preview for it says 5 dni.
3. New leave for Agnieszka 21–31 Dec (pick by clicking two days): preview "9 dni", "Po
   dodaniu pozostanie 11". Save → appears in the grid; Zespół shows 20 / 0 / 9 / 11.
4. New leave for Joanna 23–24 Nov: preview turns red but the button works; after saving, a
   snackbar shows the over-pool warning and Zespół shows −4.
5. New leave for Piotr 12 Nov → "Pracownik ma już urlop w tym terminie."
6. Click Tomasz's December bar, change the end to 31 Dec, save. 2027 in Zespół goes from
   30 / 0 / 6 / 24 back to 30 / 0 / 0 / 30.
7. Narrow the window below 1000 px → the per-day list replaces the grid.

### Phase 5 — Portal: Raport roczny

Goal: the yearly report screen and its printout (§4.3, §5).

Tasks:
- [ ] Report model + service method.
- [ ] Route `team/:id/report` with query `year`; **Raport** button in the Zespół editor.
- [ ] `YearReportComponent`: header (worker, year, "Stan na {today}"), four numbers, a
      12-month row, leave table (Od, Do, Dni w roku, Status: Wykorzystany / W trakcie /
      Zaplanowany), 2026 partial-year note, **Drukuj** (`window.print()`), Wróć.
- [ ] `@media print` styles: no sidebar or buttons, one A4 page, black and white.

Tests:
- `year-report.component.spec.ts`: renders the four numbers and 12 month cells from a mocked
  response; status codes map to the Polish labels; the 2026 note shows only for 2026.

Local check (seeded backend):
1. Tomasz, 2026: 9 / 4 / 4 / 1; październik 4, grudzień 4; the New Year leave row shows
   28.12.2026 – 08.01.2027 with **4** days.
2. Tomasz, 2027: 30 / 0 / 6 / 24; styczeń 6.
3. Marek, 2026: status "W trakcie".
4. Cmd+P → print preview fits one A4 page, no sidebar, readable in black and white.

### Phase 6 — Docs and deploy

Goal: production runs the feature; docs describe it.

Tasks:
- [ ] Docs: `shop/CLAUDE.md` (module `team`, both tables, `Clock` + local fixed date),
      `repair-requests-portal/CLAUDE.md` (routes, palette, print view), Postman collection
      (team endpoints).
- [ ] Deploy checklist §6.2, in order.
- [ ] Go-live data entry (D6).

Done when: the prod smoke test in §6.2 passes and the owner has entered the real team.

### 6.1 Local testing

Branch `worker-leave-planning` starts at `645a6fc`, so `local-env/` is present (LocalStack +
mail sink; see `local-env/README.md`). The admin portal's dev environment already points at
`http://localhost:8080/api`.

| Layer | How | Change needed |
|---|---|---|
| Backend unit tests | `mvn test`: `WorkingDays`, `LeaveBalanceCalculator`, `LeavePolicy` are pure | Inject a `java.time.Clock` bean (Europe/Warsaw) so "today" is fixed in tests; it decides taken vs planned |
| Backend integration tests | `mvn test` with Docker: Testcontainers LocalStack, independent of `local-env` | `TeamIntegrationTest` base creates both tables |
| Manual end to end | `npm run local:up` → `npm run local:shop` → `npm run local:admin-portal` → http://localhost:4201 (renocar / 12345) | Add `employee` + `employee_leave` to `local-env/init/ready.d/10-resources.sh` |
| Seed data | LocalStack keeps no state, so every `local:up` starts empty | New `local-env/seed-team.sh` + `npm run local:seed-team`: posts the design's 8 workers and their leave through the shop API (login → JWT → POST), including one leave over New Year and one that overdraws a pool |
| Inspect | `./local-env/aws-local.sh dynamodb scan --table-name employee` | Optional `local:scan-team` script |

`local:up` also builds and deploys the three Lambdas (~30 s). They aren't needed for this
feature, but they're harmless.

Note: the root `CLAUDE.md` on this branch doesn't list the `local:*` commands (they were added
to it on `status-page`). `local-env/README.md` is the reference until the branches merge.

### 6.2 Deploy checklist (manual, there is no IaC)

1. **Local env:** add both `create-table` calls to `local-env/init/ready.d/10-resources.sh`.
2. **AWS console (eu-north-1):** create `employee` and `employee_leave`, hash key `id` (S),
   on-demand. Consider enabling PITR (pennies), since this is the only copy of the data.
3. **IAM: already covered (owner-confirmed 2026-10-22).** Role `CarRepairShopBe` allows
   `DeleteItem`, `GetItem`, `PutItem`, `Scan`, `UpdateItem`, `Query` on
   `arn:aws:dynamodb:eu-north-1:009160054371:table/*`, which includes `employee` and
   `employee_leave`. No change needed.
4. **API Gateway:** confirm the stage proxies `/api/internal/{proxy+}` (new paths are not
   explicit routes).
5. **Build:** paste the prod `application.properties`, run `mvn package`, check
   `unzip -p target/lambda-shaded.jar application.properties`, upload `lambda-shaded.jar`
   (see `shop/CLAUDE.md`).
6. Deploy the portal. Smoke test: add a worker, add leave 9–13 Nov 2026 (expect 5 days), edit
   it to 9–10 Nov (expect 2), delete the worker (leave gone too).
7. **Go-live data entry (D6):** the editor types each worker's remaining 2026 days.
8. **Docs:** update `shop/CLAUDE.md` (module + tables), `repair-requests-portal/CLAUDE.md`
   (routes), and the Postman collection.

---

## 7. Open questions

**Closed.** Accepted defaults (D10, D11): plan up to the end of next year; untyped years use the
worker's default pool (26 unless changed); no staffing warning or Dostępność link in v1; no
export, admin login only; no roles.

**Last two, assumed unless the owner objects:**

| # | Topic | Assumed default |
|---|---|---|
| Q-K | Everyone who logs into the portal (shared login, e.g. reception) sees and can edit Zespół/Urlopy | Yes. Splitting access would need real user accounts, which don't exist today |
| Q-L | Past years (e.g. 2026 viewed in 2027): pool and leave stay editable | Yes, no lock. The year selector offers every year that has data (`availableYears`, §4.1) |

**Answered:** planning tool (D1), hand-typed pool with no carry-over (D2), annual leave only
(D3), warn on overdraw (D4), Mon–Fri with no holidays (D5), go-live by editor (D6), hard delete
(D7), whole days (D8), desktop only (D9), default pool 26 (D10), edit in calendar (D5 → §5).

---

## 8. Concerns and risks

1. **Holidays are charged unless the editor splits the leave** (D5). A Christmas week
   (21–31 Dec 2026) counts 9 days, including 24, 25 Dec. This is by design, but it's the
   most likely "the numbers are wrong" moment. A tooltip on "Dni robocze w zakresie"
   ("święta nie są pomijane automatycznie") is cheap insurance.
2. **Go-live double-counting** (§3.5). The UI hint matters.
3. **Personal data (RODO).** Names plus absence dates are still employee personal data, even
   in a planning tool. Keep the endpoints authenticated and store nothing beyond names and
   dates. There is one shared admin login, so there is no record of who changed what;
   acceptable with a single editor.
4. **No IaC, no backups.** Tables are created by hand, and delete is hard (D7). Enable PITR
   and note both tables in `shop/CLAUDE.md`.
5. ~~IAM scope of `CarRepairShopBe` unknown~~: **resolved 2026-10-22.** The policy grants the
   needed DynamoDB actions on `table/*` (§6.2.3).
6. **Spring Modulith boundaries.** `team` must not import `availability` or `repair.request`
   internals.
7. **Cascade delete isn't atomic.** Leave rows are deleted first, then the employee. If the
   Lambda fails midway, the worker still exists with part of their leave gone, and repeating
   the delete finishes the job. That ordering never leaves orphaned leave rows. Acceptable
   for a planning tool.
8. **Deploying separately from `status-page`.** The shop Lambda jar and the admin portal are
   each **one artifact**, so the last upload replaces everything. Whichever feature ships
   second must contain the first. Sequence:
   1. Branch `worker-leave-planning` (created) from **`645a6fc`** (the local-env commit, first commit on
      `status-page`). It brings `local-env/` without any status-page code. It also brings a
      `SesConfig` change that only matters when `ses-endpoint` is set, so it is inert in prod.
   2. Deploy the team feature: 2 tables + shop jar + admin portal. It only adds things, with no
      contract changes.
   3. Merge `worker-leave-planning` → `main`.
   4. Before the status-page deploy, merge `main` into `status-page`. Expected conflicts are
      small: `GlobalExceptionHandler`, the module `CLAUDE.md`s, possibly `10-resources.sh`.
   5. From then on, never upload a shop jar or portal build from a branch that lacks the team
      code, or the panels 404. The data stays in DynamoDB, so nothing is lost, but the screens
      disappear until a correct build is uploaded.
