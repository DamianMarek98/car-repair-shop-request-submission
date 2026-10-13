# Status zgłoszenia — implementation plan (Feature 12, v1)

> **Scope note.** This file lives in `submission-portal/` because the page ships here, but
> the feature spans `car-repair-shop-backend/` (`shop`, the submission consumer, the
> confirmation-email lambda), `repair-requests-portal/` and AWS console config.
>
> **Nothing has been implemented.** This is a plan only.
>
> **Revision 2026-09-28** — simplified to a minimal first iteration (owner decisions D-E…D-L
> below). The previous revision proposed a separate status Lambda, withdraw, expiry
> attributes and contract tests; those are dropped.

---

## 1. Context

Today a customer submits a repair request at renocar-zgloszenie.pl, receives one
confirmation e-mail, and then — in the words of `docs/business-capabilities-review.md`
§2 — **"Then — silence"**. There is no way to check progress, change a date, or cancel.

`spec/` anticipates the fix as **Feature 12 — customer self-service status link**
(`spec/features-development-spec.md` §12, `spec/features-implementation-plan.md` Steps
12.1–12.7, Tier 2 #19 of `spec/00-master-plan.md`). It is **not built**.

Mockups live in the Claude Design project *"Repair request tracking portal"*
(`1e8198db-4ced-4e53-82c1-d3dcdd8fc32e`, read with `DesignSync`):

| Design file | Role |
|---|---|
| `Status zgłoszenia - desktop.dc.html` | desktop, two-column (1.7fr / 320px sticky sidebar), max-width 1120px |
| `Status zgłoszenia.dc.html` | mobile, single column, bottom sheets |
| `Formularz zgłoszenia (obecny).dc.html` | the *existing* form, reference only |
| `support.js` | design-canvas runtime only — nothing to port |

**Frontend styling follows the Claude Design files.** Pull them with `DesignSync` when
implementing each screen.

**Intended outcome:** the customer opens a link from their e-mail, sees where their
request stands, can propose a different date or cancel; the workshop always sets the
actual visit date/time.

### 1.1 Decisions

| # | Decision (date) | Consequence |
|---|---|---|
| D-A | Show the design's detail card, mask VIN (`***…23456`, last 5), phone (`••• ••• 567`, last 3), e-mail (`a••••@example.com`). (2026-09-20) | Explicit public DTO + leak test. |
| D-B | Customer actions: read + cancel + reschedule. (2026-09-20, narrowed by D-G) | Public write endpoints are in scope. |
| D-C | Feature 2's `appointment_at` is folded into this plan. (2026-09-20) | Phase 1. |
| D-D | `CANCELLED` and `RESCHEDULE_REQUESTED` become enum values; `appointment_at` is **left untouched** while in `RESCHEDULE_REQUESTED`. (2026-09-20) | Enum 3 → 5. |
| **D-E** | **Public endpoints live in the `shop` monolith**, not a new Lambda. (2026-09-28) | One state machine, no condition-expression sync point, reuses SES wiring. Cost: Spring cold start on first page open — split out later only if it hurts. |
| **D-F** | **Visit time is always set by the workshop** on every transition that needs it: booking (NEW→HANDLED), changing a date (HANDLED), confirming a reschedule (RESCHEDULE_REQUESTED→HANDLED). Customer windows are hints only. (2026-09-28) | One `POST /{id}/appointment` command with a required `appointmentAt`. |
| **D-G** | Reschedule can be proposed **only from `HANDLED`**; **no withdraw** in v1. (2026-09-28) | NEW and RESCHEDULE_REQUESTED only offer cancel. |
| **D-H** | Admin may pick **any hour and minute between 08:00 and 16:00** (inclusive, Warsaw local time). (2026-09-28) | No slot step. Server validates the same range. |
| **D-I** | **All `*_at` timestamps are stored as UTC** `LocalDateTime` (no suffix, `LocalDateTimeConverter`), exactly like `submittedAt`; frontends append `Z` and convert to the browser time zone. (2026-09-28) | See §3.3. |
| **D-J** | **Skip contract testing (E10)** for this feature. (2026-09-28) | Waives master-plan Tier 1 #10's hard gate for these fields. Record in `spec/00-master-plan.md`. |
| **D-K** | No token-expiry attribute; no backfill of existing requests. (2026-09-28) | §3.2. |
| **D-M** | Phase 2 as built (2026-10-13): no "aktualizacja …" line and no request number (no data); the sidebar holds a "Kontakt z warsztatem" card until Phase 3 adds actions; the completed banner replaces the mockup's "Fakturę … otrzymasz e-mailem" with "Szczegóły naprawy przekazujemy telefonicznie oraz przy odbiorze samochodu. Masz pytanie do naprawy? Zadzwoń pod (58) 520-19-14 lub zajrzyj na stronę kontaktową." — phone first, most customers prefer to call (owner: there is no invoice by e-mail — details are given by phone before or after the work and when the car is returned); status links in e-mails come from `car.repair.shop.status-page-base-url` (shop) / `STATUS_PAGE_BASE_URL` (confirmation Lambda), both defaulting to production and overridden only by `local-env`; the app's global locale is unchanged (the page formats Polish dates itself). (2026-10-13) | §2, §3.6. |
| **D-L** | Out of v1: withdraw, description edit, consent toggle, messages, `RC-…` display number, "work performed" line, HTML e-mail parts, customer ack for their own cancel. (2026-09-28) | §5. |

---

## 2. What the designs specify

### 2.1 View states

| Design view | Chip label | Chip bg / fg / border | Maps to |
|---|---|---|---|
| `new` | Nowe | `#fff8e6` / `#8a6d00` / `#d9b84a` | `NEW` |
| `booked` | Umówiono | `#eef8f1` / `#1e7e34` / `#8ecb9f` | `HANDLED` |
| `reschedule` | Prośba o zmianę terminu | `#fff8e6` / `#8a6d00` / `#d9b84a` | `RESCHEDULE_REQUESTED` |
| `cancelled` | Odwołane | `#fdecea` / `#8c1d18` / `#e2a8a2` | `CANCELLED` |
| `completed` | Zakończono | `#f4f6f8` / `#546e7a` / `#aeb9c1` | `APPOINTMENT_MADE` |
| `expired` | — | — | unknown / expired token → generic 404 view |

Do **not** touch `repair-requests-portal/src/app/commons/status-mapper.ts`'s existing three
labels (owner-confirmed; `HANDLED`="Umówiono", `APPOINTMENT_MADE`="Zakończono") — only add
the two new values.

### 2.2 Three-step timeline

**Zgłoszenie przyjęte → Termin ustalony → Wizyta zakończona** (design labels; amend spec C7).

```
stepState = [ 2,
              booked||reschedule||completed ? 2 : (cancelled ? 0 : 1),
              completed ? 2 : (cancelled ? 0 : 1) ]
// 2 = done (red #e00008 dot + white check), 1 = pending (white dot, #d0d0d0 border),
// 0 = void (cancelled). Connector is red only when both ends are done.
```

### 2.3 Headline / subline per state

| State | Headline | Subline |
|---|---|---|
| `new` | Czekasz na kontakt z warsztatem | Przyjęliśmy zgłoszenie. Odezwiemy się z propozycją terminu, zwykle w ciągu jednego dnia roboczego. |
| `booked` | *appointment datetime, e.g. "środa, 23 września 2026, 09:00"* | Prosimy o przyjazd 10 minut wcześniej. Przyjęcie od strony ul. Struga. |
| `reschedule` | Czekamy na potwierdzenie nowego terminu | Dotychczasowy termin (…) obowiązuje, dopóki nie potwierdzimy zmiany. |
| `cancelled` | Zgłoszenie odwołane | Termin został zwolniony. Dziękujemy za informację. |
| `completed` | Wizyta zakończona | *v1: just the completion date — no work summary (D-L)* |

### 2.4 Customer actions (v1)

| Action | Available in | v1 |
|---|---|---|
| Propose new date — sheet/modal: `asap` checkbox **or** 1–5 windows `{date, from, to}`; weekends, past and unavailable days blocked; hours 08:00–16:00. Validation copy: *"Wybierz co najmniej jedną datę lub zaznacz „Najszybciej jak się da"."* | `booked` only (D-G) | ✅ |
| Cancel — sheet, optional reason (≤500). Reword the design's *"link do tej strony przestanie działać"* — the link keeps working (§3.2). | `new`, `booked`, `reschedule` | ✅ |
| Withdraw reschedule request | — | ❌ (D-G) |
| Edit description / review-consent toggle / messages | — | ❌ later |

### 2.5 Design-canvas artefacts — do not build
- The "Podgląd stanów" pill bar (state preview control).
- Mobile's 480px phone frame; the real page is full-bleed on `#f4f5f7`.
- Fixtures: `TODAY`, `UNAVAILABLE`, `RC-2026-0412`, "Anna Kowalska", the message thread.
- Logo path in the app is `/logo-motrio-new.png`.

### 2.6 Design tokens

Add `:root` custom properties to `submission-portal/src/styles.css`, copying the naming in
`repair-requests-portal/src/styles.css` (copy, don't import):

```
--motrio-navy #282b3e   --motrio-navy-dark #1f2230   --motrio-red #e00008
--motrio-red-hover #b80006   --motrio-surface #f4f5f7   --motrio-card #ffffff
--motrio-text #272626   --motrio-text-muted #5c6270   --motrio-border #d0d0d0
--motrio-divider #edeef1   --motrio-radius 8px
--motrio-shadow 0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08)
--st-warn-bg #fff8e6  --st-warn-fg #8a6d00  --st-warn-border #d9b84a
--st-ok-bg   #eef8f1  --st-ok-fg   #1e7e34  --st-ok-border   #8ecb9f
--st-err-bg  #fdecea  --st-err-fg  #8c1d18  --st-err-border  #e2a8a2
--st-done-bg #f4f6f8  --st-done-fg #546e7a  --st-done-border #aeb9c1
```

Poppins 400/600/700 and Material Icons are already loaded in `src/index.html`.

Date/time controls inside the sheets use **Angular Material restyled with these tokens**
(the form already has the blocked-day `dateFilter` logic). Everything else — chrome, chip,
timeline, cards, banners, buttons, sheets — follows the design.

---

## 3. Target backend state

### 3.1 Status model

```java
/**
 * Names are historical and misleading — NEVER rename (spec C9):
 * HANDLED = appointment booked ("Umówiono"), APPOINTMENT_MADE = visit done ("Zakończono").
 */
public enum RepairRequestStatus {
    NEW, APPOINTMENT_MADE, HANDLED, RESCHEDULE_REQUESTED, CANCELLED
}
```

Transitions — all through `RepairRequestStateFactory` → state classes, never a direct write:

```
                 setAppointment(t)*          setAppointment(t)* (change date)
NEW ─────────────────────────────► HANDLED ◄──────┐
 │                                   │  │ ▲        │
 │                                   │  │ └────────┘
 │               requestReschedule() │  │ setAppointment(t)* (confirm new date)
 │               (customer)          ▼  │ keepAppointment()  (keep old date)
 │                         RESCHEDULE_REQUESTED
 │                                   │
 └──── cancel(by, reason) ───────────┴────────► CANCELLED        (terminal)

NEW / HANDLED ── markAsAppointmentMade ──► APPOINTMENT_MADE      (terminal; NEW shortcut kept)
* t is REQUIRED (D-F)
```

| State | setAppointment | requestReschedule | keepAppointment | cancel | markAsAppointmentMade |
|---|---|---|---|---|---|
| NEW | → HANDLED | ✗ | ✗ | ✓ | ✓ (existing shortcut) |
| HANDLED | stays, date changed | → RESCHEDULE_REQUESTED | ✗ | ✓ | ✓ |
| RESCHEDULE_REQUESTED | → HANDLED, clears proposal | ✗ | → HANDLED, clears proposal | ✓ | ✗ |
| APPOINTMENT_MADE / CANCELLED | ✗ | ✗ | ✗ | ✗ | ✗ |

✗ = `RepairRequestStateException` (403 on internal API, **409** on public API).

**`appointmentAt` validation (server, `shop`):** required; convert UTC → `Europe/Warsaw`,
then: in the future, not Sat/Sun, not an `unavailable_day` (via `UnavailableDayFacade`),
local time between **08:00 and 16:00 inclusive** (D-H). Any minute is allowed.

### 3.2 New persisted attributes

| Java field | DynamoDB attribute | Written by | Phase |
|---|---|---|---|
| `trackingToken` | `tracking_token` | consumer at INSERT **and** `RepairRequest.from` (duplicate submit path) | 1 |
| `appointmentAt` | `appointment_at` | shop, `setAppointment` | 1 |
| `completedAt` | `completed_at` | shop, `markAsAppointmentMade` | 1 |
| `cancelledAt` | `cancelled_at` | shop | 3 |
| `cancelledBy` | `cancelled_by` | shop — `CUSTOMER` \| `SHOP` | 3 |
| `cancellationReason` | `cancellation_reason` | shop — optional, ≤500 | 3 |
| `rescheduleRequestedAt` | `reschedule_requested_at` | shop | 3 |
| `rescheduleAsap` | `reschedule_asap` | shop — N `1`/`0` like `asap` | 3 |
| `rescheduleWindows` | `reschedule_windows` | shop — JSON via `PreferredVisitWindowConverter` | 3 |

- **Token:** 32 bytes `SecureRandom` → base64url (no padding). Only this one attribute
  crosses the consumer ↔ shop contract; update the table in
  `.claude/skills/backend-lambda-work/SKILL.md` in the same PR.
- **Expiry (D-K), computed, no attribute:** the token is invalid when the request is
  `APPOINTMENT_MADE`/`CANCELLED` and `completed_at`/`cancelled_at` (fallback `handled_at`,
  then `submittedAt`, for legacy rows) is more than **90 days** ago. Open requests never expire.
- **No backfill:** requests submitted before Phase 1 have no token; e-mails omit the link.

### 3.3 Time handling (D-I) — keep in sync everywhere

| Data | Stored as | Rendered by |
|---|---|---|
| `submittedAt`, `handled_at`, `appointment_at`, `completed_at`, `cancelled_at`, `reschedule_requested_at`, `review_email_sent_at` | UTC `LocalDateTime`, no suffix (`2026-09-23T07:00:00`) | FE: append `Z`, format in browser time zone (existing `toBrowserTimeZone` pattern) |
| same, inside **e-mails** | — | backend converts UTC → `Europe/Warsaw`, Polish format (`środa, 23 września 2026, 09:00`) |
| `preferred_visit_windows`, `reschedule_windows` | local wall-clock `{date, from, to}` — **not** UTC | shown as-is |
| `unavailable_day` | local `LocalDate` | as-is |

- Admin portal **sends** `appointmentAt` as UTC without suffix: local picker value → `Date`
  → `toISOString()` minus `Z`/millis. Pre-filling "Zmień termin" converts back.
- Backend business rules (weekend / unavailable day / 08–16) are **local-time** rules —
  always convert to `Europe/Warsaw` before checking.
- Unit-test e-mail formatting and validation with one **summer (CEST)** and one **winter
  (CET)** date.
- Record this table in the `backend-lambda-work` and `angular-portals` skills.

### 3.4 GSI

`TrackingTokenIndex` on `repair_request`: hash key `tracking_token` (S), projection **ALL**
(small table, avoids maintaining an INCLUDE list), same capacity mode as the table. Add the
`@DynamoDBIndexHashKey` on `trackingToken` and create the index in the LocalStack test setup.

### 3.5 API

**Public (`shop`, no auth)** — `/api/public/repair-request/status/{token}`

| Method | Path | Body | Phase |
|---|---|---|---|
| `GET` | `/{token}` | — | 2 |
| `POST` | `/{token}/reschedule-request` | `{ asap, windows:[{date,from,to}] }` (≤5, same rules as the form) | 3 |
| `POST` | `/{token}/cancel` | `{ reason? }` | 3 |

- Unknown, malformed, expired token → identical `404 {"message":"Not found"}`.
- `Cache-Control: no-store` on everything (changed 2026-10-13 from the spec's `max-age=60`: a
  cached GET showed the old status for a minute after the workshop booked a visit, and in
  Phase 3 would hide the customer's own cancel/reschedule; load is negligible).
- Invalid transition → `409`.
- Response is a dedicated `PublicRepairRequestStatusDto`: `status`, `submitterFirstName`,
  `plateNumber`, masked `vin`/`phone`/`email`, `issueDescription`, `asap`,
  `preferredVisitWindows`, `submittedAt`, `appointmentAt`, `completedAt`, `cancelledAt`,
  `rescheduleAsap`, `rescheduleWindows`. **Never** the id, last name, `cancelled_by`/reason
  internals or raw contact data.
- `SecurityConfig`: `permitAll("/api/public/**")`; `JwtAuthFilter.shouldNotFilter` must
  also skip `/api/public/`; fix CORS origins (`https://renocar-zgloszenie.pl` and
  `https://portal.renocar-zgloszenie.pl` — **no trailing slash**).

**Internal (`shop`, JWT)** — `/api/internal/repair-request`

| Method | Path | Body | Phase | Notes |
|---|---|---|---|---|
| `POST` | `/{id}/appointment` | `{ appointmentAt }` **required** | 1 | **replaces** `/mark-as-handled`; also confirms a reschedule in Phase 3 |
| `POST` | `/{id}/reschedule/keep` | — | 3 | keep the old date |
| `POST` | `/{id}/cancel` | `{ reason? }` | 3 | shop-side cancel |
| `POST` | `/{id}/mark-as-appointment-made` | unchanged | — | now stamps `completed_at` |

### 3.6 E-mails (all plain text)

| E-mail | Sent from | Trigger | Phase |
|---|---|---|---|
| Confirmation (exists) | confirmation-email Lambda | INSERT — **add status link** from NEW_IMAGE `tracking_token` | 2 |
| "Termin wizyty" → customer | `shop`, sync via `NotificationFacade` | `setAppointment` (book / change / confirm reschedule) | 1 (link added in 2) |
| "Termin bez zmian" → customer | `shop` (same template, variant line) | `keepAppointment` | 3 |
| "Zgłoszenie odwołane" → customer | `shop` | **shop-side** cancel only | 3 |
| "Klient odwołał / prosi o zmianę terminu" → **workshop** (info@renocar.pl) | `shop` via SES | customer cancel / reschedule request; skip when `submitter_first_name == "test"` | 3 |

Rules: a failed e-mail never fails the action (same as `sendReviewRequestEmail`); skip when
the address is blank; status link = `https://renocar-zgloszenie.pl/status/{token}` only when
a token exists; times in `Europe/Warsaw`.

---

## 4. Phases

Each phase can be shipped on its own. Build/test commands are in §6.

### Phase 1 — the workshop sets appointment times *(customer sees only the new e-mail)*

**Backend — `shop`**
- [x] `RepairRequest`: `trackingToken`, `appointmentAt`, `completedAt`; token generated in `from(...)`.
- [x] `setAppointment(LocalDateTime)` on state classes (NEW→HANDLED, HANDLED→HANDLED); validation per §3.1 (UTC → Warsaw).
- [x] `markAsAppointmentMade` stamps `completed_at`.
- [x] `POST /{id}/appointment` replaces `/mark-as-handled` (+ handler, DTO).
- [x] `appointmentAt` on `RepairRequestDto` and `RepairRequestListItem`.
- [x] `NotificationFacade.sendAppointmentEmail(...)` + sender, Warsaw-time Polish formatting.
- [x] Tests: transitions; validation (past, weekend, unavailable day, 07:59 / 16:01 rejected, 08:00 / 16:00 accepted, missing → 400); CEST/CET formatting.

**Backend — `repair-request-submitted-consumer`**
- [x] `RepairRequestItemConverter.toItem` writes `tracking_token`; unit test.
- [x] Update the `backend-lambda-work` skill sync table.

**Admin portal**
- [x] "Umów wizytę": inline `app-appointment-form` in the "Akcje" card (no dialog) — `mat-datepicker` (weekends + unavailable days disabled via `unavailable-days-service`) + native `<input type="time" min="08:00" max="16:00">`, both required.
- [x] Same form behind a "Zmień termin" button on `HANDLED` (pre-filled, UTC → local).
- [x] Local → UTC helper for sending; move `toBrowserTimeZone` into `commons/` (currently duplicated in table + summary).
- [x] Appointment column in the table, "Termin wizyty" row in the summary.
- [x] `repair-request-service`: `setAppointment(id, appointmentAt)`; remove `markRepairRequestAsHandled`; models updated.
- [x] `ng test`.

**🚀 Deploy — Phase 1** (in this order, off-hours)
1. `shop`: paste the prod `application.properties` (owner's Obsidian note) into `src/main/resources/`, `mvn package`, check `unzip -p target/lambda-shaded.jar application.properties` prints it, **delete it again**, upload `target/lambda-shaded.jar` to the **shop Lambda** (`CarRepairShopBeTest`). See `shop/CLAUDE.md` — a jar without it 502s every request. The existing `SesSendReviewEmail` policy already covers the new e-mail (same identity).
2. `repair-requests-portal`: `npm run build:prod` → upload to its S3 bucket → CloudFront invalidation `/*`. Do this **immediately** after step 1 — the old portal calls the removed `/mark-as-handled`.
3. `repair-request-submitted-consumer`: `mvn package` → upload to the **submission consumer Lambda**.
4. Verify: shop Lambda role has `ses:SendEmail` (it does for the review e-mail — confirm); book a test request (first name "test") and check the e-mail time is Warsaw local.

### Phase 2 — read-only status page + links in e-mails

> **Implemented 2026-10-13, not deployed, not committed.** As built: see D-M. Verified locally end to end (`local-env/README.md` → "Status page").

**Backend — `shop`**
- [x] `@DynamoDBIndexHashKey` for `TrackingTokenIndex`; repository query by token.
- [x] Public `GET` endpoint + `PublicRepairRequestStatusDto` with masking + computed expiry.
- [x] `SecurityConfig` / `JwtAuthFilter` / CORS changes (§3.5).
- [x] "Termin wizyty" e-mail gets the status link.
- [x] LocalStack test setup creates the GSI.
- [x] **Leak test**: no full VIN, phone, e-mail, last name or id in the response.
- [x] Tests: unknown / malformed / expired token → identical 404; masking edge cases (null VIN, short values).

**Backend — confirmation-email Lambda**
- [x] `buildBody(...)` adds the status link (from NEW_IMAGE `tracking_token`; omitted if absent); unit test asserts the URL.

**Submission portal**
- [x] `:root` tokens in `styles.css` (§2.6).
- [x] `{ path: 'status/:token', component: StatusComponent }` in `app.routes.ts`, `withComponentInputBinding` (pattern from `repair-requests-portal`).
- [x] `services/status-service.ts` (`environment.apiUrl + '/public/repair-request/status/'`), `models/repair-request-status.ts` (`string`, not `String`).
- [x] `StatusComponent` per design: header, chip, timeline, headline/subline, detail card, sidebar cards, 404 view; responsive (≤900px → single column); loading state (cold start).
- [x] `toBrowserTimeZone`-style UTC → browser formatting (own copy, apps share no code).
- [x] Own page title; `robots noindex,nofollow` for this route; not in sitemap.
- [x] Polish dates via `Intl.DateTimeFormat('pl-PL')` inside the page; global `LOCALE_ID` deliberately unchanged so the form behaves as before.
- [x] Tests: each state renders the right chip/headline/timeline/actions-hidden; 404 view.

**🚀 Deploy — Phase 2** (in this order)
1. **DynamoDB console**: create GSI `TrackingTokenIndex` on `repair_request` (hash `tracking_token` String, projection ALL, same capacity mode). **Wait for Active.**
2. `shop` jar → **shop Lambda**.
3. **API Gateway** (`5jq3oglx45`): if routes are not a `{proxy+}` catch-all, add `/api/public/{proxy+}` → shop Lambda (incl. OPTIONS). Check stage throttling. **Deploy the stage `v1`.**
4. **CloudFront** (renocar-zgloszenie.pl): custom error responses 403 and 404 → `/index.html`, code 200 (check whether they already exist).
5. `submission-portal`: run the **"Deploy Angular Frontend"** GitHub workflow (`.github/workflows/deploy-frontend.yml`, project `submission-portal`) — it builds, syncs to S3 and invalidates CloudFront. Hard-refresh `https://renocar-zgloszenie.pl/status/abc` → the "Link wygasł lub jest nieprawidłowy" view, not an S3 error. The build is CSR-only (`prerender: false`), so falling back to `index.html` is safe.
6. **Last:** confirmation-email Lambda `./gradlew shadowJar` → upload `build/libs/*-all.jar`. Do **not** set `STATUS_PAGE_BASE_URL` in AWS (local-env only). (Last so no e-mail links to a page that isn't live.) Note the shop's "Termin wizyty" e-mail starts linking as soon as step 2 is deployed — do steps 2–5 in one sitting.
7. Verify end-to-end: submit a "test" request → e-mail link opens the page → book it in the admin portal → page shows the date.

### Phase 3 — customer cancel & reschedule, workshop response

**Backend — `shop`**
- [ ] Enum +`RESCHEDULE_REQUESTED`, +`CANCELLED` with the Javadoc (§3.1); `RescheduleRequestedRepairRequest`, `CancelledRepairRequest`; exhaustive factory switch.
- [ ] Attributes from §3.2 (Phase 3 rows).
- [ ] Public `POST reschedule-request` (HANDLED only, `appointment_at` untouched) and `POST cancel`; 409 on invalid transition.
- [ ] `/{id}/appointment` accepts RESCHEDULE_REQUESTED (confirms, clears proposal); `/{id}/reschedule/keep`; `/{id}/cancel`.
- [ ] DTOs expose the new fields to the admin portal.
- [ ] E-mails: workshop notification, "Termin bez zmian", "Zgłoszenie odwołane" (§3.6).
- [ ] Tests: full transition table incl. 409s; **reschedule request leaves `appointment_at` intact**; cancel on `APPOINTMENT_MADE` → 409; "test" skip rule.

**Admin portal**
- [ ] `status-mapper.ts` (+ spec): `RESCHEDULE_REQUESTED` → "Prośba o zmianę terminu", `CANCELLED` → "Odwołane"; chip classes + row colours.
- [ ] Summary: reschedule panel (proposed windows / asap, current date) with "Potwierdź nowy termin" (Phase 1 dialog, time required) and "Zachowaj dotychczasowy termin".
- [ ] "Odwołaj" button (confirm dialog, optional reason); show cancelled-by / reason / date.
- [ ] `ng test`.

**Submission portal**
- [ ] Reschedule sheet (modal on desktop, bottom sheet on mobile): asap or 1–5 windows; blocked weekends/past/unavailable days (`GET /api/internal/unavailable-day/all`, already public); 08:00–16:00.
- [ ] Cancel sheet with optional reason (≤500, counter).
- [ ] Pending-change banner in `reschedule` state; toasts; buttons per §2.4.
- [ ] Tests: which actions show in which state; validation copy; 409 → reload + message.

**🚀 Deploy — Phase 3** (in this order)
1. `shop` jar → **shop Lambda**. ⚠️ **No rollback below this version** once any `CANCELLED` / `RESCHEDULE_REQUESTED` item exists — older code can't unmarshal the enum and the admin list breaks.
2. `repair-requests-portal` → S3 → invalidation (right after step 1).
3. `submission-portal` → S3 → invalidation (customer actions go live).
4. SES: confirm `info@renocar-zgloszenie.pl` → `info@renocar.pl` delivers. Run a "test" request through cancel and reschedule; the workshop e-mail must be **skipped** for "test" — then repeat once with a real name to confirm it arrives.

---

## 5. Later (not planned)

Withdraw reschedule request · description edit (≤500) · review-consent toggle (RODO — see
`submission-portal/CLAUDE.md`) · customer ack e-mail on own cancel · per-token rate
limiting · split the public API into its own Lambda if cold start hurts · `RC-…` display
number · "work performed" summary · HTML e-mails · messaging (greenfield) · audit trail.

---

## 6. Verification

```bash
# backend (quote paths — the repo root contains a space)
cd "car-repair-shop-backend/shop"                                   && mvn test && mvn package   # needs Docker (LocalStack)
cd "car-repair-shop-backend/repair-request-submitted-consumer"      && mvn test && mvn package
cd "car-repair-shop-backend/new-repair-request-confirmation-email-lambda" && ./gradlew build

# portals
cd submission-portal      && npm test -- --watch=false --browsers=ChromeHeadless && npm run build:prod
cd repair-requests-portal && npm test -- --watch=false --browsers=ChromeHeadless && npm run build:prod
```

Local end-to-end: `npm run local:up` + `npm run local:shop` (see `local-env/README.md` — add
`TrackingTokenIndex` to `local-env/init/ready.d/10-resources.sh` in Phase 2), `submission-portal` :4200,
`repair-requests-portal` :4201. Submit → read `tracking_token` → open
`http://localhost:4200/status/{token}` → walk every state from the admin portal.

**Must-pass**
1. Public GET never returns full VIN, unmasked phone/e-mail, last name or id.
2. Unknown, malformed and expired tokens return an identical 404.
3. Cancel on `APPOINTMENT_MADE` → 409.
4. A reschedule request leaves `appointment_at` intact.
5. Every status change that needs a time rejects a missing / out-of-range `appointmentAt`.
6. The same appointment shows the same wall-clock time in the admin portal, the status page (Polish browser) and the e-mail.
7. Confirmation e-mail contains a working status URL.
8. `/status/{token}` survives a hard refresh in production.

---

## 7. Doc updates (same PRs)

- `spec/02-product-and-growth-spec.md`: add D-A…D-L as corrections; amend C7 timeline labels.
- `spec/00-master-plan.md`: Tier 2 #19 now includes F2's `appointment_at`; E10 waived for this feature (D-J).
- `.claude/skills/backend-lambda-work/SKILL.md`: `tracking_token`, new attributes, the §3.3 time rules.
- `.claude/skills/angular-portals/SKILL.md` + `repair-requests-portal/CLAUDE.md`: new chips, `/appointment` replacing `/mark-as-handled`, time rules.
- `new-repair-request-confirmation-email-lambda/SPEC.md` + `CLAUDE.md`: status-link placeholder closed.
