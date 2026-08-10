# Post-visit review-request email + review-email consent

> Author perspective: Senior Software Architect
> Date: 2026-07-31
> Status: **LIVE in production since 2026-08-02.** Code, tests, infrastructure, deployment and
> manual E2E all complete and confirmed. Remaining before the feature is fully "closed":
> **O2** (privacy policy) and **O3** (receptionist briefing — a compliance blocker, see C2/D5).
> Scope: one new consent checkbox on the public form, its storage on both write paths, and a
> consent-gated "thank you / rate us" e-mail sent when the workshop closes a request.
> Language: spec in English; **all customer-facing copy in Polish**.
>
> Verified against the codebase on 2026-07-31 (branch
> `after-motrio-2026-adjustments-confirmation-email`). Every file path and line reference
> below was read, not assumed.

## Implementation status (verified 2026-08-02, branch `after-motrio-2026-adjustments-confirmation-email`)

Re-verified file by file against committed code — not against commit messages.

| Section | Status | Commit |
|---|---|---|
| §4 Data model (both write paths) | ✅ done | `d1018f7`, `cdf712f` |
| §5 Submission portal checkbox | ✅ done | `f579cf8` |
| §6 Backend — `shop` monolith (SES, facade, gate, API) | ✅ done | `d71ef7d`, `9faa543` |
| §7 Admin portal close UI | ✅ done | `1a09af3` |
| §9 Test plan | ✅ written **and executed 2026-08-02 — all green** (see §9.1) | as above |
| §8 Manual infrastructure (IAM) | ✅ done 2026-08-02 (owner, console) | — |
| §8.1 Deployment (4 steps) | ✅ done 2026-08-02 (one incident — see §8.2) | — |
| §9 Manual E2E | ✅ done & confirmed 2026-08-02 | — |
| §10 Open items | O1 ✅ · O4 ✅ decided · **O2 + O3 ⬜ outstanding** | — |
| §11/C1 `FAIL_ON_UNKNOWN_PROPERTIES=false` (recommended) | ✅ done | `d1018f7` |

**Copy amended by the owner (2026-08-02):** the §7.2 helper text under the admin checkbox
deliberately drops the trailing clause *"— nie w zależności od spodziewanej oceny."* This is an
owner decision (**D5**), not an implementation gap. Consequence: the C2 review-gating mitigation
now rests entirely on the O3 staff briefing — see §7.2.

**Copy added (2026-08-02):** the post-submission thank-you screen now tells the customer that a
confirmation e-mail has been sent, with a spam-folder hint — see §5.3.

---

## 1. Context & goal

The platform sends exactly **one** customer e-mail today: the submission confirmation, live
since 2026-07-31, delivered by `new-repair-request-confirmation-email-lambda` off the
DynamoDB stream on `INSERT`. It is **transactional** — sent to everyone, no consent needed,
documented in that module's `SPEC.md`.

This feature adds a **second, categorically different e-mail**: a post-visit
"dziękujemy za wizytę — oceń nas" message asking for a Google review. Because it is
promotional-adjacent rather than transactional, it is **double-gated**:

1. the customer opted in at submission time via a **new consent, separate from the existing
   `rodo` processing consent**, and
2. the receptionist explicitly decides, at close time, that this particular client should
   receive it.

Both gates must pass. Neither alone is sufficient.

### 1.1 Why the close action is the right trigger

Verified state machine (`RepairRequestStateFactory` + the three state classes):

| From | Action | To | Notes |
|---|---|---|---|
| `NEW` | `mark-as-handled` | `HANDLED` | sets `handled_at` |
| `NEW` | `mark-as-appointment-made` | `APPOINTMENT_MADE` | **also** calls `markAsHandled()` (`NewRepairRequest.java:16–19`) — direct close |
| `HANDLED` | `mark-as-appointment-made` | `APPOINTMENT_MADE` | normal close |
| `HANDLED` | `mark-as-handled` | — | throws `RepairRequestStateException` |
| `APPOINTMENT_MADE` | anything | — | throws — **terminal** |

Per the owner-confirmed semantics (documented in `shop/CLAUDE.md`), `APPOINTMENT_MADE` =
"Zakończono" = visit done, car fixed. That is the close, and it is terminal — which the
design leans on in §6.3.

---

## 2. Decisions locked (owner, 2026-07-31)

| # | Question | Decision |
|---|---|---|
| **D1** | How is the e-mail sent? | **Synchronous SES call from the `shop` monolith** at close time. Not stream-driven. See §3.1 for the rationale and §11/C8 for the cost. |
| **D2** | Consent wording scope | **Narrow — post-visit review request only.** Not reminders, not promotions. See §11/C5 for the strategic cost. |
| **D3** | Close-UI behaviour | Consent absent → checkbox **hidden**, short explanatory note instead. Consent present → checkbox **shown and pre-checked**, receptionist may uncheck. |
| **D4** | Google review link | **Already available** — enters the code as a constant. |
| **D5** (2026-08-02) | Admin helper-text wording | Owner shortened the §7.2 hint to *"Odznacz tylko, jeśli wizyta nie doszła do skutku (np. nie udało się naprawić auta, brak kontaktu z klientem)."*, dropping *"— nie w zależności od spodziewanej oceny."* Deliberate; C2 mitigation moves to the O3 briefing. |

### 2.1 Deliberate deviations from `spec/02-product-and-growth-spec.md`

`spec/02` (G1, G4, and the Q7 addendum) sketched an earlier version of this feature. That
document predates the confirmation-email Lambda actually existing. **This spec supersedes it**
on three points — noted here so nobody implements the older design by accident:

| `spec/02` said | This spec says | Why |
|---|---|---|
| G1: broad `marketing_consent` covering reminders + promotions, e-mail + SMS | Narrow, review-only consent (`review_email_consent`) | Owner decision D2 |
| G4/C5: completion e-mail fires from the **DynamoDB stream** on a `MODIFY` event, in the notification Lambda | Synchronous SES send from the **shop monolith** | Owner decision D1; avoids rotating the stream ARN and re-pointing two live event-source mappings |
| Q7 addendum: receptionist's choice persisted as a `suppress_completion_email` attribute | Choice travels as a **request parameter**, not persisted | With a synchronous send there is no stream consumer that needs to read UI intent out of the database |
| G4 Q5: review ask goes to **all** customers as transactional (variant a) | Consent-gated | Owner chose the stricter posture |

---

## 3. Architecture

```
Customer submits (renocar-zgloszenie.pl)
   │  POST /submit  { …, reviewEmailConsent: true|false }
   ▼
repair-request-submitted-consumer Lambda ──► DynamoDB repair_request
                                              (review_email_consent: 0|1)
                                                    │
                                                    │ stream INSERT (unchanged)
                                                    ├──► notification Lambda  → SNS → shop inbox
                                                    └──► confirmation Lambda  → SES → customer
                                                         (transactional, no consent gate)

Receptionist closes the request (portal.renocar-zgloszenie.pl)
   │  POST /api/internal/repair-request/{id}/mark-as-appointment-made
   │       { sendReviewEmail: true|false }
   ▼
shop monolith Lambda ──► status = APPOINTMENT_MADE  (DynamoDB)
                    └──► SES SendEmail  →  customer   ◄── NEW, this spec
                         (only if consent AND flag AND e-mail present)
```

### 3.1 Why synchronous, not stream-driven (D1)

The receptionist's "should this client get the e-mail?" decision is **synchronous user
intent**. A stream consumer sees item data, never intent — so the stream approach would force
persisting a UI checkbox as a domain attribute purely so a Lambda could read it back
(`spec/02` §Q7.2 acknowledged this awkwardness explicitly).

Beyond the modelling smell, the stream route carries real operational cost on a live system:

- The event-source filter on the confirmation Lambda is currently `{"eventName": ["INSERT"]}`
  and would need widening to `MODIFY`.
- Detecting a *transition* (rather than any edit) requires the stream view type to be
  `NEW_AND_OLD_IMAGES`. Changing view type **rotates the stream ARN**, which means
  re-pointing **both** live event-source mappings (notification + confirmation) during a
  maintenance window.
- The `repair_request` stream is already at AWS's default limit of **2 Lambda subscribers**,
  so a dedicated third Lambda is not available without a limit-increase request.

The synchronous path needs **no stream changes, no new Lambda, and no new DynamoDB
attribute for intent**. The trade-off is accepted and re-examined in §11/C8.

---

## 4. Data model — ✅ DONE

Two new attributes on the existing `repair_request` table. DynamoDB is schemaless — no
migration; rows written before this ships simply lack them.

| Attribute | Type | Written by | Meaning |
|---|---|---|---|
| `review_email_consent` | `N` (`0`/`1`) | **both** submit paths | Customer opted in to the post-visit review e-mail. Absent ⇒ **false**. |
| `review_email_sent_at` | `S` (ISO datetime) | **shop monolith only** | Set when the review e-mail is successfully sent. Absent ⇒ never sent. |

`review_email_consent` mirrors how the existing `rodo` flag is stored — `numberAttribute(boolean)`
producing `N` `0`/`1` (`RepairRequestItemConverter.java:47–49`). Follow that exactly; do not
introduce a `BOOL` attribute for this one field.

### 4.1 Naming rationale (do not "improve" this later) — ✅ followed

The attribute is **`review_email_consent`**, deliberately *not* `marketing_consent` as
`spec/02` G1 proposed. Under D2 the consent text mentions **only** the review e-mail, so a
broad name would invite a future developer to reuse the flag for service reminders or
promotions the customer never agreed to — a RODO violation dressed up as code reuse. The
name must keep matching the consent text. If the wording is ever broadened, rename in the
same change.

### 4.2 Why `review_email_sent_at` is not optional — ✅ implemented

It looks like a nice-to-have; it is load-bearing for three separate reasons:

1. **RODO accountability** — evidence of what was sent to whom and when.
2. **Persistent UI feedback** — the summary view can show "wysłano {data}" after a reload,
   removing any need for a toast/snackbar (§7.3).
3. **Real double-send protection** — today the only thing preventing a second send is that
   `APPOINTMENT_MADE` is terminal. That is *accidental* protection (§11/C6).

### 4.3 Dual-write-path obligation — ✅ all 5 files updated

The submission DTO and DynamoDB attribute names are duplicated across modules by design —
see the "Kept-in-sync duplication (critical)" sections in `shop/CLAUDE.md` and
`repair-request-submitted-consumer/CLAUDE.md`. `review_email_consent` must land in **all** of:

- `repair-request-submitted-consumer/src/main/java/car/repair/shop/SubmitRepairRequestDto.java`
- `repair-request-submitted-consumer/src/main/java/car/repair/shop/RepairRequestItemConverter.java`
- `shop/src/main/java/car/repair/shop/repair/request/controller/dto/SubmitRepairRequestDto.java`
- `shop/src/main/java/car/repair/shop/repair/request/RepairRequest.java` (`@DynamoDBAttribute`)
- `shop/src/main/java/car/repair/shop/repair/request/controller/dto/RepairRequestDto.java`

`review_email_sent_at` goes **only** on the shop entity + `RepairRequestDto` — the consumer
never writes it. Document that asymmetry in the converter with a one-line comment, as the
existing sync contract expects.

**Use a primitive `boolean`, not `Boolean`, in both `SubmitRepairRequestDto` records.** An
absent JSON field then deserializes to `false`, which keeps an old cached frontend working.

---

## 5. Submission portal — the optional checkbox — ✅ DONE

Files:
`submission-portal/src/app/repair-request-submission/repair-request-submission.component.ts`
+ `.html` + `.spec.ts`, and `submission-portal/src/app/models/repair-request.ts`.

### 5.1 Form — ✅ done (`component.ts:72`, payload `:142`)

Add to the `FormGroup` (`component.ts:59–72`), alongside the existing `rodo` control:

```ts
reviewEmailConsent: new FormControl(false),   // optional — NO validator
```

Note the contrast: `rodo` is `new FormControl(false, Validators.requiredTrue)`. The new
control must have **no validator at all** — it is genuinely optional, and adding one would
block submission.

Include it in the `RepairRequest` payload object built in `onSubmit()` (`component.ts:130–141`)
and in the `RepairRequest` interface in `models/repair-request.ts`.

### 5.2 Markup & copy — ✅ done (`component.html:140-144`, incl. withdrawal sentence)

Render **below** the existing RODO block (`component.html:132–138`), in its own container,
styled so it does not read as a second mandatory gate — the RODO checkbox has a red
`mat-error` beneath it; this one must have nothing of the sort.

```html
<div style="flex: 0 0 20%; padding-right: 2%; padding-bottom: 2%; text-align: left;">
  <mat-checkbox formControlName="reviewEmailConsent">
    Chcę otrzymać e-mail z prośbą o opinię po zakończonej wizycie. Zgoda jest dobrowolna
    i mogę ją wycofać w każdej chwili, kontaktując się z warsztatem.
  </mat-checkbox>
</div>
```

The withdrawal sentence is **required**, not decorative — see §11/C3.

`MatCheckboxModule` is already imported by this component; no new imports needed.

### 5.3 Post-submission screen — ✅ done (2026-08-02)

The thank-you screen shown after a successful submit (`component.html`, `#submittedComponent`)
now sets the expectation that an e-mail is on its way — the confirmation e-mail has been live
since 2026-07-31 but nothing in the UI mentioned it, so a customer had no reason to look for it:

> Przyjęliśmy Twoje zgłoszenie, przyjrzymy się mu i skontaktujemy się w celu ustalenia
> szczegółów wizyty. Potwierdzenie zgłoszenia wysłaliśmy na podany adres e-mail — jeśli go nie
> widzisz, sprawdź folder ze spamem. *W razie wątpliwości odezwij się.*

Note this refers to the **confirmation** e-mail (transactional, everyone gets it), **not** the
review e-mail of this spec — do not mention the review e-mail here, since at this point it is
merely consented to, and whether it is ever sent depends on the close-time decision (§7.2).

---

## 6. Backend — `shop` monolith — ✅ DONE

### 6.1 API change — ✅ done (`required = false` honoured, returns `CloseRepairRequestResult`)

`RepairRequestInternalController.java:47–51` currently:

```java
@PostMapping("/{id}/mark-as-appointment-made")
@ResponseStatus(code = HttpStatus.OK)
public void markRepairRequestAsAppointmentMade(@PathVariable String id) { … }
```

Becomes:

```java
public record CloseRepairRequestCommand(boolean sendReviewEmail) {}

public record CloseRepairRequestResult(RepairRequestStatus status, boolean reviewEmailSent) {}

@PostMapping("/{id}/mark-as-appointment-made")
@ResponseStatus(code = HttpStatus.OK)
public CloseRepairRequestResult markRepairRequestAsAppointmentMade(
        @PathVariable String id,
        @RequestBody(required = false) CloseRepairRequestCommand command) {
    return markAsAppointmentMadeCommandHandler.handle(id, command);
}
```

- **`required = false` is deliberate.** The currently-deployed admin portal posts `{}` with no
  meaningful body; a null command must be treated as `sendReviewEmail = false` so an
  un-redeployed portal degrades to today's behaviour instead of 400-ing.
- The return type changes from `void`, letting the UI report a failed send (§7.3). This is
  additive for existing clients, which ignore the body.

### 6.2 Handler logic — ✅ done (all four gate conditions server-side, failure isolated in `NotificationFacade`)

`MarkAsAppointmentMadeCommandHandler` — after the existing transition and save:

```java
public CloseRepairRequestResult handle(String id, CloseRepairRequestCommand command) {
    var state = repairRequestRepository.findById(id)
            .map(RepairRequestStateFactory::from)
            .orElseThrow(EntityNotFoundException::new);

    state.markAsAppointmentMade();                       // may throw — terminal state guard
    var repairRequest = state.repairRequest;
    repairRequestRepository.save(repairRequest);         // close succeeds independently of e-mail

    boolean sent = sendReviewEmailIfAllowed(repairRequest, command);
    if (sent) {
        repairRequest.markReviewEmailSent();             // sets review_email_sent_at
        repairRequestRepository.save(repairRequest);
    }
    return new CloseRepairRequestResult(repairRequest.getStatus(), sent);
}
```

**The gate — all four conditions, evaluated server-side:**

```java
command != null && command.sendReviewEmail()            // receptionist asked for it
    && repairRequest.isReviewEmailConsent()             // customer consented  ← NEVER trust the client for this
    && repairRequest.getReviewEmailSentAt() == null     // not already sent
    && StringUtils.hasText(repairRequest.getEmail())    // there is an address
```

The consent check reads from the **persisted entity**, never from the request body. The admin
portal hides the checkbox when consent is absent (§7.2), but that is a UX affordance, not a
security control — a hand-crafted request must still be rejected. This deserves an explicit
test (§9).

**Failure isolation:** wrap the send in `try/catch`, log, and return `reviewEmailSent=false`.
A SES outage must never fail the close — the receptionist's primary action is changing the
request status, and the e-mail is secondary. Mirror the pattern already used in both stream
Lambdas.

### 6.3 State-machine note — no changes required — ✅ respected (untouched)

`AppointmentMadeRepairRequest` throws on both transitions, so a request cannot be closed
twice and the e-mail cannot fire twice through the normal path. **Do not rely on this alone**
— the `review_email_sent_at` check above is the intentional guard (§11/C6).

`NewRepairRequest.markAsAppointmentMade()` calls `markAsHandled()` as well as
`maskAsAppointmentMade()` (`NewRepairRequest.java:16–19`), i.e. a direct `NEW` → close sets
`handled_at` too. That pre-existing conflation is **out of scope here** — do not "fix" it in
this change; it would alter historical-data semantics and belongs to the separate Feature 2
rework. The review e-mail is offered on both close paths identically.

### 6.4 Where the SES code lives — ✅ done (`notification` module: public facade + package-private sender/config)

New spring-modulith module **`car.repair.shop.notification`**:

- `NotificationFacade` (public) — `boolean sendReviewRequestEmail(String toEmail, String firstName)`
- SES sender + config, **package-private**

This follows the documented convention in `shop/CLAUDE.md` — "cross-module access only
through facades/events, never internals", the same shape as `availability.UnavailableDayFacade`
— and keeps AWS e-mail plumbing out of the `repair/request` domain package. spring-modulith
1.1.3 is already a dependency and auto-detects direct sub-packages of `car.repair.shop` as
modules, so no extra wiring is needed.

**Do not build this on the existing domain events.** `repair/request/events/AppointmentMadeEvent`
and `RepairRequestHandledEvent` are **dead code** — verified: declared, never published,
and there is not a single `@EventListener` in the module. Only `NewRepairRequestEvent` is
ever published (`SubmitNewRepairRequestHandler.java:21`), and nothing consumes it. Wiring a
customer-visible e-mail onto that unused machinery would add indirection with no payoff.

### 6.5 SDK choice and cold start — ✅ done (sesv2 + url-connection-client, HTTP clients excluded). C9 measurement **waived by owner**

`shop/pom.xml` currently carries **only AWS SDK v1** (`com.amazonaws:aws-java-sdk-dynamodb:1.12.750`).
Add SES as **SDK v2**:

```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>sesv2</artifactId>
    <version>2.31.26</version>          <!-- same version as the confirmation Lambda -->
    <exclusions>
        <exclusion>
            <groupId>software.amazon.awssdk</groupId>
            <artifactId>netty-nio-client</artifactId>
        </exclusion>
        <exclusion>
            <groupId>software.amazon.awssdk</groupId>
            <artifactId>apache-client</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>url-connection-client</artifactId>
    <version>2.31.26</version>
</dependency>
```

Rationale: SDK v1 is past end-of-support, and v2 lets the e-mail-building code mirror the
already-written, already-tested sender in the confirmation Lambda. The HTTP-client exclusions
plus `url-connection-client` keep the shaded-jar growth down — the shop Lambda's cold start
is precisely why the other Lambdas were split out in the first place. **Measure cold start
before and after** rather than assuming the mitigation is sufficient (§11/C9).

Build the client explicitly against `url-connection-client`:

```java
SesV2Client.builder()
    .region(Region.EU_NORTH_1)
    .httpClientBuilder(UrlConnectionHttpClient.builder())
    .build();
```

### 6.6 Configuration constants — ✅ done, incl. the sync note in both module `CLAUDE.md` files. ⚠️ Google URL pasted in but **unverified by owner** (O1)

Match the confirmation Lambda's approach — hardcoded constants, redeploy to change:

| Constant | Value |
|---|---|
| SES region | `eu-north-1` |
| From | `info@renocar-zgloszenie.pl` |
| Reply-To | `info@renocar.pl` |
| Shop phone | `58 520 19 14 lub 690 182 354` |
| Google review URL | *(owner has it — paste in; D4)* |

These now exist in **two** Java modules. Add them to the "kept-in-sync duplication" section of
both module `CLAUDE.md` files (§11/C7).

### 6.7 E-mail copy (Polish) — ✅ done (UTF-8 charset on subject + body, withdrawal footer present)

> **Temat:** Dziękujemy za wizytę w RENO CAR
>
> Dzień dobry {imię},
>
> dziękujemy za skorzystanie z usług naszego warsztatu. Twoje zgłoszenie zostało zakończone.
>
> Będziemy wdzięczni za podzielenie się opinią — zajmie to mniej niż minutę:
> {GOOGLE_REVIEW_URL}
>
> W razie pytań prosimy o kontakt: tel. 58 520 19 14 lub 690 182 354.
>
> Pozdrawiamy,
> Zespół RENO CAR
>
> ---
> Otrzymujesz tę wiadomość, ponieważ przy składaniu zgłoszenia wyraziłeś/aś zgodę na
> prośbę o opinię. Aby wycofać zgodę, odpowiedz na tę wiadomość lub zadzwoń do warsztatu.

Requirements:

- **UTF-8 charset set explicitly on both subject and body** — Polish diacritics render as
  mojibake otherwise. The confirmation Lambda's sender shows the pattern.
- Keep it **non-promotional**: no offers, no discounts, no upsell. The narrow consent covers a
  review request and nothing else.
- The withdrawal footer is mandatory (§11/C3).

---

## 7. Admin portal — the per-close checkbox — ✅ DONE (one copy deviation, see §7.2)

Files: `repair-requests-portal/src/app/components/repair-request-summary/*`,
`service/repair-request-service.ts`, `models/repair-request.ts`.

### 7.1 Model & service — ✅ done

```ts
// models/repair-request.ts — add
reviewEmailConsent: boolean;
reviewEmailSentAt: string | null;
```

```ts
// service/repair-request-service.ts — was markRepairRequestAsAppointmentMade(id)
markRepairRequestAsAppointmentMade(id: string, sendReviewEmail: boolean): Observable<CloseResult> {
    return this.http.post<CloseResult>(
        this.apiUrl + '/' + id + '/mark-as-appointment-made', { sendReviewEmail });
}
```

### 7.2 Close UI (D3) — ✅ done (helper text per D5)

In the existing "Akcje" card (`repair-request-summary.component.html:110–122`), directly above
the **"Wizyta odbyta"** button:

- **Consent present** → a `mat-checkbox`, **pre-checked**, bound to a component field:
  *"Wyślij e-mail z podziękowaniem i prośbą o opinię"*.
- **Consent absent** → no checkbox at all; a short muted note instead:
  *"Klient nie wyraził zgody na e-mail z prośbą o opinię."*

Add `MatCheckboxModule` to the component's `imports` array. Note the portal currently uses
**no** `MatDialog`, `MatSnackBar`, or `MatCheckbox` anywhere — this checkbox is the single
minimal addition; deliberately no dialog is introduced.

Also add to the contact card: **"Zgoda na e-mail z prośbą o opinię: Tak / Nie"**, and — when
`reviewEmailSentAt` is set — **"E-mail z prośbą o opinię: wysłano {data}"** using the existing
`toBrowserTimeZone()` helper (`component.ts:58–65`).

**Helper text under the checkbox** (§11/C2). As shipped
(`repair-request-summary.component.html:135-138`), per owner decision D5:

> Odznacz tylko, jeśli wizyta nie doszła do skutku (np. nie udało się naprawić auta,
> brak kontaktu z klientem).

The originally specified sentence ended *"— nie w zależności od spodziewanej oceny."* The owner
removed that clause on 2026-08-02. The shipped text still frames unticking around
*"the visit did not happen as intended"*, but it no longer states the prohibition explicitly.
**Consequence to carry forward:** the O3 staff briefing is now the only place where the
"never filter by expected rating" rule is stated. Treat O3 as required before go-live, not
optional — see §11/C2.

### 7.3 Feedback — ✅ done (`reviewEmailFailed` inline warning, persistent "wysłano {data}" line)

The component already reloads the request after the action
(`markRepairRequestAsAppointmentMade()` → `loadRepairRequest()`), so the persistent
"wysłano {data}" line is the primary confirmation — no toast needed. Show an inline warning
**only** when the response reports `reviewEmailSent: false` while the checkbox was ticked:

> Zgłoszenie zamknięto, ale nie udało się wysłać e-maila z prośbą o opinię.

This matters because the close is terminal and cannot be retried (§11/C4).

---

## 8. Manual infrastructure — ✅ DONE (owner, console, 2026-08-02)

SES is already fully provisioned — identity `renocar-zgloszenie.pl` verified in `eu-north-1`,
DKIM/SPF/DMARC live, production access granted (50 000 e-mails/24 h, 14/sec). **No SES setup
work.** Only one IAM change:

**Resolved targets (owner-confirmed 2026-08-02, previously undocumented):**

| Thing | Value |
|---|---|
| Shop Lambda | `arn:aws:lambda:eu-north-1:009160054371:function:CarRepairShopBeTest` |
| Execution role | `arn:aws:iam::009160054371:role/service-role/CarRepairShopBe` |

The `Test` suffix on the function name is historical — it is the live target. Now recorded in
`shop/CLAUDE.md`, which previously carried this as an open TODO.

Added to the **shop Lambda's execution role** as inline policy `SesSendReviewEmail`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "SesSendReviewEmail",
    "Effect": "Allow",
    "Action": "ses:SendEmail",
    "Resource": "arn:aws:ses:eu-north-1:009160054371:identity/renocar-zgloszenie.pl"
  }]
}
```

**C9 waived (owner, 2026-08-02):** the pre-deploy cold-start baseline was deliberately not
captured — owner's call that cold start does not matter for this application. The §11/C9
fallback (drop to AWS SDK v1 SES) is therefore not being kept open; if cold start ever does
become a concern, there is no before-measurement to compare against.

### 8.1 Deployment order — MANDATORY — ✅ DONE 2026-08-02

> **Deploying the submission portal before the consumer Lambda takes the public form
> completely offline.** See §11/C1. This ordering is not a preference.

1. **`repair-request-submitted-consumer` Lambda** — `mvn package`, upload the shaded jar.
   Accepts the new field; still works with the old portal (field absent → `false`).
2. **`shop` Lambda** — `mvn package`, upload `target/lambda-shaded.jar`. Add the IAM policy
   above **before** or with this step. Still works with the old admin portal (null body →
   no e-mail).
3. **Admin portal** — `npm run build:admin-portal`, publish `dist/`.
4. **Submission portal** — `npm run build:submission-portal`, publish `dist/`. **Last.**

Every step is backward-compatible with the one before it, so the sequence can pause safely at
any point.

### 8.2 Deploy incident 2026-08-02 — missing `application.properties` (resolved)

**Not caused by this feature.** Recorded because it will recur on every future `shop` deploy
unless the runbook below is followed.

**Symptom:** after step 2, the admin portal returned **502 on every request including login**.
The public form was unaffected — it runs on the separate consumer Lambda.

**Cause:** the shop Lambda's Spring context failed to refresh:

```
IllegalArgumentException: Could not resolve placeholder 'car.repair.shop.aws.username'
  → securityConfig → jwtAuthFilter → "Unable to start web server"
  → StreamLambdaHandler.<clinit> → Runtime.BadFunctionCode
```

`src/main/resources/application.properties` was deleted from the repo in `71e6bf2` (2024-06-28),
so runtime config had to come from Lambda environment variables — and they were not set on
`CarRepairShopBeTest`. Init reached 4.5 s and 198 MB / 512 MB, so this was **not** cold start,
memory, or jar size: the SDK v2 addition (§6.5) was not implicated at any point.

**Ruled out during diagnosis** (worth not re-testing next time): the shaded jar's
`META-INF/services/software.amazon.awssdk.http.SdkHttpService` correctly resolves to
`UrlConnectionSdkHttpService`; Spring's `spring.factories` / `AutoConfiguration.imports`
survived shading; a real `SesV2Client` builds from the deployed jar; and `ShopApplicationTests`
loads the **real** `SesConfig` and passes.

**Fix:** owner added `src/main/resources/application.properties` with production values, rebuilt,
redeployed. Verified working.

**Standing consequence — do not lose this:** that file is **not in the repo** (now
`.gitignore`d) and lives **only in the owner's private Obsidian note**. A clean checkout
therefore cannot produce a deployable jar. Full key list, the `eu-north-1` requirement, and the
"never ship `application-local.properties` as `application.properties`" warning are in
`shop/CLAUDE.md`.

Pre-upload check that would have caught this in one command:

```bash
unzip -p target/lambda-shaded.jar application.properties   # empty output ⇒ the deploy will 502
```

---

## 9. Test plan — ✅ DONE — written and executed 2026-08-02, all green

**Consumer Lambda** (`mvn test`, no Docker):
- converter emits `review_email_consent` = `1` when true, `0` when false;
- JSON payload **without** the field deserializes and stores `0` (old-frontend compatibility).

**Shop** (`mvn test` — **requires Docker**, LocalStack via Testcontainers). Extend
`MarkAsAppointmentMadeIntegrationTest`; mock the `NotificationFacade`/SES sender:
- consent `true` + `sendReviewEmail` `true` → e-mail sent once, `review_email_sent_at` set,
  response `reviewEmailSent=true`;
- **consent `false` + `sendReviewEmail` `true` → NOT sent** (the anti-spoofing guard — this is
  the single most important test in the change);
- consent `true` + `sendReviewEmail` `false` → not sent, status still changes;
- **no request body at all** → not sent, status still changes (old-portal compatibility);
- blank/missing e-mail address → not sent, no exception;
- SES sender throws → close still succeeds, status persisted, `reviewEmailSent=false`;
- closing an already-`APPOINTMENT_MADE` request → still throws `RepairRequestStateException`,
  no second e-mail.

**Submission portal** (`npm test`, needs Chrome):
- checkbox is optional — form valid with it unchecked;
- payload carries `reviewEmailConsent` in both states.

**Admin portal** (`npm test`, needs Chrome):
- consent `true` → checkbox rendered and pre-checked;
- consent `false` → checkbox absent, note shown;
- service called with the checkbox value.

**Manual E2E:** submit with the box ticked → close from admin with the checkbox on → review
e-mail arrives with correct Polish diacritics and a working review link; submit unticked →
admin shows the "brak zgody" note and offers no checkbox.
✅ **Executed and confirmed by the owner on 2026-08-02** against production, including the
Google review link (O1).

### 9.1 Execution record — 2026-08-02

| Suite | Result |
|---|---|
| `shop` (`mvn test`, Docker/LocalStack) | **49/49 pass** — incl. `MarkAsAppointmentMadeIntegrationTest` 10, `ReviewRequestEmailSenderTest` 4, `NotificationFacadeTest` 2 |
| `repair-request-submitted-consumer` (`mvn test`) | **22/22 pass** |
| `submission-portal` (`ng test --watch=false --browsers=ChromeHeadless`) | **6/6 pass** |
| `repair-requests-portal` (same) | **23/23 pass** |

**Scaffold specs deleted in the same pass.** Five `ng generate` stubs were failing and had never
passed: both portals' `app.component.spec.ts` (asserting `<h1>Hello, {project}</h1>` against
templates that only contain `<router-outlet>`), plus `login`, `unavailable-days` and
`repair-request-table` `should create` stubs in the admin portal, which threw
`NullInjectorError: No provider for HttpClient!` because no stub wired
`provideHttpClient`. None contained a human-written assertion about this application. Deleting
them is unrelated to this feature but was blocking a clean signal before deployment.

Known non-fatal noise: Karma prints `Some of your tests did a full page reload!` in both portals
(pre-existing; the form-submit spec navigates the test page). Exit code is 0.

---

## 10. Open items before go-live

| # | Item |
|---|---|
| O1 | ✅ **Done 2026-08-02.** `GOOGLE_REVIEW_URL` in `ReviewRequestEmailSender` verified to open the review dialog for the correct business profile. |
| O2 | ⬜ **Outstanding.** Update the privacy policy to describe the review e-mail, the separate consent, and the withdrawal route. The e-mail is already sending, so this is now overdue rather than pending. |
| O3 | **Required, not optional (raised in priority by D5).** Brief the receptionist: what the checkbox means, and the review-gating rule in §11/C2 — the UI helper text no longer states it. |
| O4 | ✅ **Decided 2026-08-02: accept the limitation.** No resend endpoint. Rationale and the conditions that should reopen it are in §11/C4. |

---

## 11. Critical review of this specification

### C1 — Deploy order is a verified production hazard, not a theoretical one

`RepairRequestSubmittedHandler.java:31` constructs a bare `new ObjectMapper()`, so
`FAIL_ON_UNKNOWN_PROPERTIES` sits at its `true` default. A payload carrying
`reviewEmailConsent` against the un-redeployed Lambda throws `UnrecognizedPropertyException`,
which is caught as `JsonProcessingException` and returned as **HTTP 500**
(`RepairRequestSubmittedHandler.java:59–61`). That is not a degraded experience — it is
**100 % failure of every submission**, on the only public revenue path, until the Lambda is
redeployed.

§8.1 orders the deploys to avoid it. Beyond that, **strongly recommend disabling the flag**
(`objectMapper.configure(FAIL_ON_UNKNOWN_PROPERTIES, false)`) in the same change, so this
entire class of coupling disappears for every future field. It is a two-line edit that
permanently removes a foot-gun the project will otherwise re-encounter with photos (F3),
tracking tokens (F12), and captcha tokens (G2).

### C2 — Google's review-gating policy is the sharpest risk, and the feature itself creates it

Letting the receptionist choose **per client** who receives a review request is, if exercised
on the basis of expected sentiment, precisely the "review gating" Google's policies prohibit —
soliciting reviews only from customers believed to be satisfied. Consequences range from
review removal to profile penalties, and the shop's Google profile is described in the
business review as its highest-ROI marketing asset.

The mitigation is **procedural and cannot be enforced in code**: the checkbox exists for
*"the visit did not happen as intended"* cases — car could not be repaired, client
unreachable, duplicate request — and **never** for filtering by anticipated rating. This spec
therefore requires the helper text in §7.2 and the staff briefing in O3. Without those, the
implementation is complete but the practice is non-compliant.

**Updated 2026-08-02 (D5):** the shipped helper text no longer carries the explicit
"not by expected rating" prohibition. The briefing in O3 is therefore the sole remaining
control — it is now a go-live blocker rather than a nicety.

The consent gate itself is not gating in Google's sense — the customer self-selects, the shop
does not screen by sentiment.

### C3 — Consent has no genuine withdrawal path; this is an RODO gap

Art. 7(3) requires withdrawing consent to be as easy as giving it. As specified, consent is
captured once at submission and consumed weeks later, with **no admin toggle and no
one-click unsubscribe**. The mandatory withdrawal sentences in the checkbox copy (§5.2) and
the e-mail footer (§6.7) are the minimum viable answer — "reply or call us" is a defensible
mechanism at this scale, but it is manual and depends on someone acting on the reply.

Cheap improvement worth doing now rather than later: expose `review_email_consent` as an
editable toggle in the admin summary so the receptionist can record a withdrawal without a
developer running `aws dynamodb update-item`.

Also note the model is **per-request, not per-person**: a customer who submits twice with
different checkbox states ends up with two contradictory consent records, and the one that
governs is whichever request happens to be closed. At ~15 submissions/month this is tolerable,
but it is a real modelling limitation to record, not an oversight to discover later.

### C4 — A failed e-mail is unrecoverable once the request is closed

`APPOINTMENT_MADE` is terminal — `AppointmentMadeRepairRequest` throws on both transitions.
If SES fails at close time, the status has already been persisted and there is **no UI path to
retry**; the request cannot be re-closed. The design correctly refuses to fail the close over
an e-mail, but that choice creates this dead end.

Two honest options, and the spec should commit to one (O4):
- **Accept it** — ~15 closes/month, SES failure is rare, and §7.3's inline warning at least
  makes it visible so the receptionist can phone the customer.
- **Add `POST /{id}/resend-review-email`** — guarded by the same four-condition gate plus
  `review_email_sent_at == null`. Perhaps an hour of work including tests.

**DECIDED 2026-08-02 (owner): accept the limitation.** No resend endpoint is built.

What this means operationally: when the portal shows *"Zgłoszenie zamknięto, ale nie udało się
wysłać e-maila z prośbą o opinię"* (§7.3), that customer will **never** receive the review
e-mail through the application — the close is terminal and there is no retry path. The only
recovery is a human one: phone the customer, or ask for the review in person. This makes the
§7.3 warning load-bearing rather than cosmetic; it must not be removed or softened, and O3's
briefing should tell the receptionist what to do when they see it.

**Reopen this decision if** any of the following change: close volume grows materially beyond
~15/month, the warning is observed firing more than rarely, or a bulk/re-open action is added
(which would also break the C6 invariant). The `review_email_sent_at == null` guard is already
in place, so adding the endpoint later remains a contained change.

### C5 — The narrow consent (D2) carries a strategic cost worth restating plainly

`docs/business-capabilities-review.md` calls seasonal service reminders **the single largest
untapped revenue lever** for this workshop, and `spec/02` G5/G6 both assume a consent base
exists. A review-only consent **cannot lawfully be reused** for reminders or promotions —
those would need a second checkbox and a fresh collection period measured in months, because
consent cannot be retrofitted onto past submissions.

This was the owner's explicit, informed decision, made with the trade-off on the table. It is
recorded here so the reasoning survives and the choice is re-opened deliberately rather than
rediscovered as a surprise when G5 is picked up. If the wording is ever broadened, remember
§4.1 — the attribute name must change with it.

### C6 — Double-send protection would be accidental without `review_email_sent_at`

Nothing in the close path checks whether an e-mail already went out; it is prevented purely by
the terminal state. That holds today, but the moment anyone adds request re-opening, a bulk
action, or a retry endpoint (C4!), duplicates appear silently. This is the main reason
§4.2 treats `review_email_sent_at` as required rather than optional — it converts an emergent
property of the state machine into an explicit, testable invariant.

### C7 — New cross-module configuration duplication

`SES_FROM`, `SES_REPLY_TO` and the shop phone number are currently hardcoded constants in
`new-repair-request-confirmation-email-lambda`; this change duplicates them into `shop`. Small,
but it is exactly the drift pattern the project already fights with `SubmitRepairRequestDto`
and the DynamoDB attribute names. It must be written into the "kept-in-sync duplication"
sections of both module `CLAUDE.md` files, or the two e-mails will eventually disagree about
the shop's phone number.

### C8 — Synchronous sending trades architectural consistency for operational simplicity

Every other customer e-mail on this platform is stream-driven and fully decoupled; this one is
not. The decision is well-founded (§3.1) — it avoids a risky stream-ARN rotation on a live
system, sidesteps the 2-subscriber limit, and keeps UI intent out of the domain model — but
the honest cost is that e-mail concerns now live in **two** places with two different
delivery models, and a SES problem now shows up inside a user-facing admin request rather than
in a background retry.

The line to hold: **if a third customer e-mail trigger ever appears, revisit the stream-based
approach rather than accreting a third synchronous send.** Two is a reasonable pragmatic split;
three would be drift.

### C9 — Cold start is asserted to be fine, not demonstrated

Adding SDK v2 to a Spring Boot monolith that currently ships only SDK v1 grows the shaded jar
and the classpath scan. The `url-connection-client` mitigation in §6.5 is the standard remedy,
but "should be fine" is not evidence — and cold start on this Lambda is a known, previously
acted-upon concern (it is the stated reason the submission path was split out at all).
**Record CloudWatch cold-start duration before and after the deploy**; if it regresses
materially, the fallback is v1 `aws-java-sdk-ses`, which reuses the v1 core already present at
the cost of depending on an out-of-support SDK.

### C10 — What this spec deliberately does not do

- **No `handled_at` / state-machine cleanup.** `NewRepairRequest.markAsAppointmentMade()`
  conflating both transitions stays as-is (§6.3). Fixing it belongs to Feature 2 and would
  change historical-row semantics; bundling it here would make this change untestable in
  isolation.
- **No change to the confirmation e-mail.** It remains transactional and consent-free —
  correctly so. The two e-mails have different legal bases and must not be merged.
- **No unsubscribe-link infrastructure** (tokenised opt-out endpoint). Overkill at ~15
  e-mails/month; revisit if the consent base is ever used for real campaigns (which, under
  D2, it cannot be — see C5).

---

## 12. Cross-references

- Confirmation e-mail (live) — `car-repair-shop-backend/new-repair-request-confirmation-email-lambda/SPEC.md`
- Superseded earlier design of this feature — `spec/02-product-and-growth-spec.md` §G1, §G4, §C5, Q7 addendum (see §2.1)
- Status-semantics ground truth — `spec/02-product-and-growth-spec.md` §"Confirmed ground truth", mirrored in `shop/CLAUDE.md`
- Module sync contracts — `shop/CLAUDE.md` and `repair-request-submitted-consumer/CLAUDE.md`, "Kept-in-sync duplication (critical)"
