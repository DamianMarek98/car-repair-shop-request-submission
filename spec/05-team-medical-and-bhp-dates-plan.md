# Zespół: Badania lekarskie i Szkolenie BHP (employee expiry dates) - implementation plan

> **Status: implemented 2026-10-24 on `employee-expiry-dates`, as one phase (A+B), uncommitted
> and awaiting owner review.** Backend: 140 tests (11 new). Portal: 101 specs (15 new). The
> local browser check of §6.0 passed, including the expired states. What's left is Phase C
> (deploy). Decisions E1–E6 are in §0, with no open questions. An extension of the Zespół panel
> from `spec/05-team-and-leave-plan.md` (05 is implemented, merged to `main` and deployed).
>
> **Scope.** Two optional dates per employee, *Badania lekarskie ważne do* and *Szkolenie BHP
> ważne do*. They are set in the worker editor, must lie in the future when typed, and show as
> two new columns in the Zespół table with a yellow / red expiry indicator. Nothing else
> changes: no new table, no new endpoint, no new Lambda, no AWS change.
>
> **Design source.** Claude Design project `c70047d6-59c3-4bd3-aeed-e1c4f450c248`, file
> `Panel Zespół i Urlopy.dc.html`. The two columns, the editor date fields and the hint under
> each field come from there. **Left out on purpose (owner, 2026-10-24):** the footer selector
> *"Wyróżniaj terminy upływające w ciągu [1/2/3/6/12] miesięcy"*. The thresholds are fixed.

---

## 0. Owner givens (2026-10-24)

| # | Given |
|---|---|
| G1 | Two dates per worker: **Badania lekarskie** and **Szkolenie BHP**, edited in the worker editor. |
| G2 | A date must be **in the future** when it is set. |
| G3 | Two new columns in the Zespół table. **Yellow** when less than 3 months are left, **red** when less than 1 month is left. |
| G4 | No configurable warning window: the design's footer selector is dropped. |

**Owner decisions (2026-10-24):**

| # | Decision |
|---|---|
| E1 | A worker **without a date** shows a neutral grey "—": no colour and no note. |
| E2 | The four leave columns merge into **one "Urlop ({rok})" column**, as in the design. |
| E3 | **Today is not a valid date to type:** tomorrow at the earliest. |
| E4 | 05 is already live. This ships **separately**, as a later manual deploy of the jar + portal by the owner. |
| E5 | The **yearly report doesn't show** the two dates. |
| E6 | **No history:** only the current "valid until" date per worker. |

## 1. What the design does, and what this plan changes

- **Table:** the column `Badania lekarskie` (128 px) and the column `Szkolenie BHP` (116 px).
  Each cell has a date chip (`dd.mm.yyyy`) with a short note under it ("za 12 dni",
  "wygasło 3 dni temu", "uzupełnij datę").
- **Editor:** two native date inputs side by side, under the pool fields. Under each there is a
  one-line hint ("Ważne", "Wygasa za 12 dni", "Wygasło …", "Brak daty") whose colour, and the
  input's border colour, follow the same status.
- **Design rules this plan changes:**
  - the design's warning window is configurable (default 3 months) and it has **only one
    warning colour**: red means expired or missing. G3 needs two levels, and fixes the window;
  - the design accepts any date. G2 only accepts future dates;
  - the design paints a missing date red ("Brak / uzupełnij datę"). Here it is a **neutral
    grey "—"** (E1), otherwise every worker is red on day one;
  - the design's single "Urlop" column is adopted (E2). The current table has four leave
    columns.

## 2. Storage

Two new attributes on the existing `employee` item (DynamoDB is schemaless, so there is no
migration, and existing rows read back as `null`):

| Attribute | Java field | Type | Converter |
|---|---|---|---|
| `medical_exam_valid_until` | `medicalExamValidUntil` | `LocalDate`, nullable | `LocalDateConverter` (ISO string, as `Leave.start_date`) |
| `bhp_training_valid_until` | `bhpTrainingValidUntil` | `LocalDate`, nullable | `LocalDateConverter` |

**"Valid until" is inclusive:** the date is the last day the exam or training still counts. It
expires the day after.

Storing a status (green / yellow / red) is ruled out, because the status changes every night
with no write. It is always derived from `today`.

Only the current date is kept per worker. When an exam is renewed, the editor overwrites the
date. There is no history (E6).

## 3. Rules

### 3.1 Validation (backend `TeamFacade`, mirrored in the portal)

- Both dates are **optional**. `null` means "no date", and clearing a field removes the date.
- When a date is **set or changed**, it must be **after today** (tomorrow at the earliest, E3)
  and **at most today + 10 years**. The upper limit is a sanity check that catches typos
  such as `2206-05-01`.
- **An unchanged date is not re-validated.** Without this, a worker whose exam has expired
  could not be saved at all, not even to fix a typo in their name, until someone typed a new
  exam date. On update, the rule applies only when the value differs from the stored one. On
  create, every date given is new, so the rule applies to all of them.
- The error codes are `INVALID_MEDICAL_EXAM_DATE` and `INVALID_BHP_TRAINING_DATE` (400). There
  is one code per field, so the portal can say which field is wrong.

### 3.2 Expiry status (portal only)

The status is computed in the portal, by a pure helper, from the backend's `today` (already in
`EmployeeListView.today`, never the browser clock). It is not sent by the backend, because the
editor hint has to update live while a date is being typed, so the portal needs the rule
anyway. Computing it in the backend too would mean two copies of the same rule.

`today+N months` is calendar months, clamped to the end of the month: `2026-01-31` + 1 month
= `2026-02-28`.

| Status | When (`d` = valid-until, `t` = today) | Chip | Note under the chip / editor hint |
|---|---|---|---|
| `MISSING` | no date | grey "—" | — / "Brak daty" |
| `EXPIRED` | `d < t` | **red** | "wygasło N dni temu" / "Wygasło N dni temu" |
| `URGENT` | `t ≤ d < t+1 month` | **red** | "wygasa dziś" or "za N dni" |
| `SOON` | `t+1 month ≤ d < t+3 months` | **yellow** | "za N dni" |
| `OK` | `d ≥ t+3 months` | plain | — / "Ważne" |

- `N` is `daysBetween(t, d)`. The noun goes through the existing `daysLabel()` helper:
  "za 1 dzień", "za 12 dni".
- Boundaries with `t = 2026-11-02`: `2026-12-01` is red, `2026-12-02` (exactly one month) is
  yellow, `2027-02-01` is yellow, and `2027-02-02` (exactly three months) is OK.
- `EXPIRED` can only appear with time, since a past date can't be typed. It still needs a
  state, because last year's valid date is this year's expired one.
- In the editor, a date typed in the past or more than 10 years ahead shows the validation
  message as its hint, in red, before saving.

### 3.3 What the dates don't touch

They don't affect the leave calendar, balances, warnings, the yearly report (E5: no change to
`YearReport` or its screen), the employee order or the search. Deleting an employee removes the dates with the item, as now.

## 4. API changes

`EmployeeCommand` and `EmployeeView` both get the two fields. ISO dates, `null` = none.

```json
// PUT /api/internal/team/employees/{id}   (POST is the same)
{ "firstName": "Tomasz", "lastName": "Nowak", "defaultAnnualDays": 26,
  "medicalExamValidUntil": "2027-08-15", "bhpTrainingValidUntil": null }

// EmployeeView gains the same two fields
{ "id": "6f1c…", "firstName": "Tomasz", …, "medicalExamValidUntil": "2027-08-15",
  "bhpTrainingValidUntil": null, "balance": { … } }
```

- **Semantics: full replacement.** On `PUT`, a missing or `null` date **clears** it. This is
  unlike `defaultAnnualDays`, where `null` means "unchanged". The difference is deliberate: the
  editor always sends both dates, and the date fields need a way to say "no date". The DTO's
  Javadoc must say so.
- Consequence: any client that sends a `PUT` without the dates wipes them. Today the only
  clients are the portal, `local-env/seed-team.mjs` (create only) and the Postman collection.
  **Deploy order matters (§6, Phase C):** upload the jar and the portal in one sitting. While
  only the new jar is live, saving a worker from the old portal clears that worker's dates. No
  dates exist before this feature, so a short gap loses nothing, as long as nobody types dates
  until the new portal is up.
- A malformed date string, such as `"2026-13-45"`, fails during JSON parsing. Like a bad leave
  date today, it ends in the generic 500 handler. The portal only sends values from a native
  date input, so this is accepted as is (§8 R4).

## 5. Frontend (`repair-requests-portal/`)

- **`commons/expiry-status.ts`** (+ spec): `addMonths(date, n)` with end-of-month clamping
  (in `iso-date.ts`), and `expiryStatus(validUntil, today) → {status, note, hint}` following
  the §3.2 table. Also `expiryDateError(value, stored, today) → error code | null`, implementing
  §3.1 and used by the form.
- **Models:** `Employee` and `EmployeeCommand` get `medicalExamValidUntil: IsoDate | null` and
  `bhpTrainingValidUntil: IsoDate | null`.
- **Table:** two columns, `medical` ("Badania lekarskie") and `bhp` ("Szkolenie BHP"), placed
  before the chevron. Each cell is a chip with the date, plus a note line when the status isn't
  `OK` or `MISSING`.
- **Table width (E2):** `Pula / Wykorzystano / Zaplanowano / Pozostało` merge into one
  **"Urlop ({rok})"** column: the existing remaining chip (red when negative) plus "z {pula}"
  (`16 dni z 26`). Taken and planned stay visible in the editor's stats box. The columns become
  `firstName, lastName, leave, medical, bhp, open`. A grey "—" is shown for a missing date
  (E1).
- **Editor:** two `matInput type="date"` fields, "Badania lekarskie ważne do" and "Szkolenie
  BHP ważne do", on one row under the pool fields, with the hint line under each. Use native
  inputs, as in Urlopy's Od/Do fields: no `MatDatepickerModule`, so no bundle risk (see the
  `MatButtonModule` gotcha in the 05 spec). A blank input sends `null`.
- **Save:** the form adds both dates to the `EmployeeCommand`. Client-side validation returns the
  same error code as the backend, so the message is identical (the existing `validate()`
  pattern).
- **Copy** (`team-error-messages.ts`):
  - `INVALID_MEDICAL_EXAM_DATE`: "Data ważności badań lekarskich musi być w przyszłości
    (najpóźniej za 10 lat)."
  - `INVALID_BHP_TRAINING_DATE`: "Data ważności szkolenia BHP musi być w przyszłości
    (najpóźniej za 10 lat)."
- **Styles:** `team.component.css` is at 2.4 kB, which is over the 2 kB warning and against a
  4 kB hard limit. So the new chip colours go **global** in `styles.css`, as modifiers of the
  existing `.panel-chip`: `--warning` (yellow) and `--danger` (red, the same colours as
  `--negative`). The input border colour uses the same two modifiers.
  - Yellow: background `#fdf3d7`, text `#8a5a00`, border `#f0d48a`.
  - Red: the existing `#fbe9ec` / `#b4152b` / `#e7a3ad`.

## 6. Phases

The work is small, so there are two code phases and one wrap-up, each committed by the owner
after review. Branch: `employee-expiry-dates`, from `main` (05 is merged there as PR #6/#7).
`status-page` has its own deploy order: merge `main` into it after this ships, as for 05.

### 6.0 Local test scenario

Extend `local-env/seed-team.mjs`: the create calls get the two dates. Expected states with
`CAR_REPAIR_SHOP_CLOCK_FIXEDDATE=2026-11-02` (+1 month = `2026-12-02`, +3 months = `2027-02-02`):

| Worker | Badania lekarskie | Expected | Szkolenie BHP | Expected |
|---|---|---|---|---|
| Tomasz Nowak | 2027-08-15 | OK | 2026-12-03 | yellow, "za 31 dni" |
| Katarzyna Wiśniewska | 2026-11-10 | red, "za 8 dni" | 2028-03-01 | OK |
| Marek Zieliński | 2026-12-02 | yellow, "za 30 dni" (1-month boundary) | 2027-02-01 | yellow, "za 91 dni" |
| Joanna Lewandowska | 2027-02-02 | OK (3-month boundary) | 2026-11-03 | red, "za 1 dzień" |
| Piotr Kamiński | — | grey "—" | — | grey "—" |
| Agnieszka Dąbrowska | 2026-12-01 | red, "za 29 dni" | 2027-06-01 | OK |
| Krzysztof Wójcik | 2027-03-18 | OK | 2028-06-01 | OK |
| Michał Szymański | — | grey "—" | 2027-10-10 | OK |

The seed can't create an expired date, since the API refuses past dates. To see the expired
and "today" states, restart only the backend with a later fixed date (the data stays in
LocalStack):
- `…FIXEDDATE=2026-11-10`: Katarzyna's exam shows red "wygasa dziś";
- `…FIXEDDATE=2027-01-04`: Katarzyna's exam shows "wygasło 55 dni temu" and Joanna's BHP
  "wygasło 62 dni temu", and saving Katarzyna's name still works (unchanged-date rule).

### Phase A - Backend

1. `Employee`: two `LocalDate` attributes (§2).
2. `EmployeeCommand` and `EmployeeView`: two fields each. Javadoc covers the full-replacement
   semantics (§4).
3. `TeamFacade`:
   - `validExpiryDate(newValue, storedValue, code)` per §3.1;
   - `createEmployee` calls it with `storedValue = null`;
   - `updateEmployee` passes the stored values;
   - `view()` copies the dates.
4. `TeamErrorCode`: `INVALID_MEDICAL_EXAM_DATE`, `INVALID_BHP_TRAINING_DATE` (400).
5. Tests:
   - **`TeamFacadeTest`** (unit, fixed clock 2026-11-02):
     - create with tomorrow is accepted;
     - create with today is refused, with the field's code;
     - create with yesterday is refused;
     - create with today + 10 years is accepted, and + 10 years + 1 day is refused;
     - create with `null` is accepted;
     - update keeps an unchanged **past** date (stored 2026-10-01, sent 2026-10-01);
     - update refuses a changed past date;
     - update with `null` clears the date;
     - the medical and BHP dates are validated independently (wrong field → its own code).
   - **`EmployeeIntegrationTest`** (LocalStack):
     - `POST` then `GET` round-trips both dates as ISO strings;
     - `PUT` without the dates clears them;
     - `400 {code: INVALID_MEDICAL_EXAM_DATE}` for a past date;
     - an employee row written without the attributes (as from before this change) reads back
       with `null` dates.
6. `seed-team.mjs`: the dates from §6.0.

**Exit:** `mvn clean test` green (129 + new). Seed runs. A `GET` shows the dates.

### Phase B - Portal

1. `iso-date.ts`: `addMonths` (+ spec: 31 Jan + 1 → 28 Feb, 29 Feb 2028 + 12 → 28 Feb 2029,
   31 Mar + 1 → 30 Apr).
2. `commons/expiry-status.ts` (+ spec): every row of the §3.2 table, plus the four boundaries
   from §3.2, plus "wygasa dziś", "za 1 dzień" and "wygasło 1 dzień temu".
   `expiryDateError`: today, tomorrow, +10 years, +10 years + 1 day, and the unchanged past
   value.
3. Models: `employee.ts` (both interfaces).
4. `TeamComponent`:
   - form controls `medicalExamValidUntil` and `bhpTrainingValidUntil`, filled in by
     `select()` and cleared by `startNew()`;
   - `save()` adds them to the command (blank → `null`);
   - `validate()` calls `expiryDateError` with the selected employee's stored values.
5. Template:
   - the merged "Urlop ({rok})" column (E2);
   - the two date columns (§5);
   - the editor fields with live hints.
6. `styles.css`: `.panel-chip--warning`, `.panel-chip--danger`, and the input-border variants.
7. `team-error-messages.ts`: the two codes (+ spec line).
8. Tests:
   - **`TeamComponent` spec:**
     - the row renders a yellow chip for a SOON date, a red chip for an URGENT one, and a
       grey "—" for no date;
     - the Urlop column shows "16 dni z 26", and its chip is red when the balance is negative;
     - `save()` sends both dates, and `null` for a blank field;
     - a past date blocks save and shows the code's message, with no service call;
     - an unchanged expired date doesn't block save.
   - **`TeamService` spec:** the body carries the dates.
9. Check the bundle: `npm run build:prod`. The initial bundle stays at about 947 kB, and no
   component stylesheet goes over 4 kB.

**Exit:**
- `npm test` green (86 + new) and `npm run build:prod` passes;
- local browser check of every row of §6.0 at `2026-11-02`;
- the two restarts (`2026-11-10`, `2027-01-04`) look as described;
- in the editor, typing a past date shows the red hint and saving is refused.

### Phase C - Docs and deploy

- Update the module notes (`shop/CLAUDE.md`, `repair-requests-portal/CLAUDE.md`) and the
  Postman collection (the two fields).
- Mark this plan done.
- **Deploy (E4): manual, by the owner, jar + portal only.** Reuse
  `spec/05-team-and-leave-deployment-checklist.md`:
  - step 0: tests, prod properties, and **a fresh Lambda backup** (the current zip is the 05
    release);
  - steps 3–4: build and upload the jar;
  - step 6: build and upload the portal (the manual `repair-requests-portal/` steps);
  - **skip** step 1 (tables), step 2 (API Gateway) and step 8 (go-live data).
- Upload the jar and the portal **back to back** (§4: an old portal against the new jar
  clears dates on save).
- Smoke test after the upload:
  - `GET /team/employees` returns `"medicalExamValidUntil": null` and
    `"bhpTrainingValidUntil": null` for the existing workers;
  - Zespół shows the "Urlop" column and grey "—" in both new columns;
  - typing today's date is refused;
  - a date about two months ahead shows yellow, and clearing it again works;
  - Raport roczny is unchanged.
- **Afterwards:** the owner types the real dates per worker in Zespół, then merges `main` into
  `status-page`.

### 6.1 Implementation notes (deviations from the text above)

- **Styles:** the date chips use global `.panel-expiry` / `.panel-expiry--{none|warning|danger}`
  (plus `__date` / `__note`), and the editor hints use `.panel-hint--{level}`, instead of new
  `.panel-chip` modifiers. The colours are as planned.
- **Editor:** the two date fields are **stacked**, one per row (global `.panel-dates`). Side by
  side, the native date inputs overflowed the 380 px card and the labels were cut off.
- **Status helper:** `commons/expiry-status.ts` exports `expiryOf()` and
  `isExpiryDateAllowed()` (this plan's `expiryStatus` / `expiryDateError`). The form maps a
  refusal to the field's error code inside the existing `validate()`.
- **API:** `EmployeeCommand` keeps a 3-argument constructor (dates = null) for existing callers
  and tests. Jackson uses the canonical constructor.
- **Postman / module CLAUDE.md:** not updated. Neither describes the team module yet (the open
  05 Phase 6 docs step); add these two fields when that step is done.
- **Date picker (owner request, 2026-10-25):** the two fields use Material's `mat-datepicker`
  instead of native date inputs. Clicking the field opens the calendar, and there is a calendar
  toggle button too.
  - The calendar is Polish (`MAT_DATE_LOCALE` `pl-PL`), weeks start on Monday, and the input
    shows `dd.mm.rrrr`. This is done by `commons/pl-date-adapter.ts`. The stock
    `NativeDateAdapter` would read a typed "10.11.2026" US-style, as 11 Oct.
  - The form holds local-midnight `Date`s, converted with `toLocalDate` / `fromLocalDate` in
    `iso-date.ts`.
  - Typed text that isn't a date blocks save, with the hint "Nieprawidłowa data". It never
    silently clears the date.
  - The calendar greys out days before tomorrow and after +10 years. An unchanged expired date
    moves the lower bound back to it, so it isn't flagged.
  - Cost: **+14.8 kB on the initial bundle**, to 962.44 kB, about 37 kB under the 1 MB error
    budget. The Zespół chunk is now 21 kB.

## 7. Questions

All closed. See §0, E1–E6.

## 8. Risks and notes

- **R1: full-replacement `PUT`.** A client that omits the dates wipes them (§4). Covered by an
  integration test, shipping backend and portal together, and the Postman update.
- **R2: the date is typed by hand.** The system doesn't know the legal periods (badania
  okresowe: typically 1–5 years by the doctor's decision; BHP okresowe: 1–6 years by job), so
  it doesn't suggest or check them. The editor types what's on the certificate. That is
  consistent with D1 ("planning tool only").
- **R3: no reminders.** Colours show only when someone opens Zespół. E-mail reminders (for
  example, a daily Lambda plus SES "expires in 30 days") are a possible later feature, not part
  of this plan.
- **R4: malformed date JSON gives a 500,** as for leave today. Not reachable from the portal.
  A shared `HttpMessageNotReadableException` → 400 handler is a separate clean-up.
- **R5: time zone.** "Today" is the backend's Europe/Warsaw date, as for leave, so the colours
  flip at local midnight, not UTC midnight.
