# Submission Portal – Code Analysis
> Angular 18 · Car Repair Appointment Booking · RENO CAR Gdańsk
> Reviewed: 2026-05-09

---

## Summary

| Category | Findings |
|---|---|
| Critical bugs | 4 |
| SEO issues | 7 |
| Styling / UX | 10 |
| Accessibility | 5 |
| Code quality | 6 |

---

## 1. Critical Bugs

### 1.1 Date FormControl initial value is the validator function itself
**File:** `repair-request-submission.component.ts:110`  
**Severity: High — crashes on submit when date is not selected**

```ts
// BUG: Validators.required is passed as the initial VALUE, not as a validator
const timeSlotGroup = this.fb.group({
  date: [Validators.required],   // ← FormBuilder shorthand: [initialValue, validators]
  from: [null],
  to: [null]
});

// Fix:
date: [null, Validators.required],
```

`FormBuilder.group` shorthand treats array elements as `[initialValue, syncValidators, asyncValidators]`.
As written: the date control's initial value is the `Validators.required` **function object** and there is **no actual required validator** attached. Consequences:
- The date field is never marked invalid (no validator → always valid) so the `<mat-error>` block never shows.
- If the user submits without picking a date, `mapTimeSlots()` calls `formElement.date.getFullYear()` on a function object → **`TypeError` at runtime**, crashing the submit flow silently.
- If the user does open the datepicker and pick a date, Angular Material writes a real `Date` over the function, so the happy path accidentally works.

### 1.2 Email error message shown for wrong reason
**File:** `repair-request-submission.component.html:69`  
**Severity: Medium — misleading user-facing message**

```html
<!-- Single message for two different validators -->
<mat-error *ngIf="repairForm.get('email')?.hasError && repairForm.get('email')?.invalid">
  <span>To pole jest wymagane.</span>
</mat-error>
```

`email` has both `Validators.required` and `Validators.email`. When a user types `notanemail`, the `email` validator fails and this error shows **"To pole jest wymagane."** ("This field is required") — even though the field is filled. Two distinct errors need two distinct messages:

```html
<mat-error *ngIf="repairForm.get('email')?.hasError('required')">To pole jest wymagane.</mat-error>
<mat-error *ngIf="repairForm.get('email')?.hasError('email')">Nieprawidłowy adres e-mail.</mat-error>
```

### 1.3 Silent submission failure – no user feedback on API error
**File:** `repair-request-submission.component.ts:148-152`  
**Severity: High — user has no idea whether to retry**

```ts
error: () => {
  this.isLoading = false;
  this.cdr.detectChanges();
  // no snackbar, no alert, no error message bound to template
}
```

When the backend returns an error (network failure, 5xx, validation rejection), the spinner disappears and the form goes back to its default state. The user cannot distinguish a successful submission from a failed one.

### 1.4 Typos visible to users in the success screen
**File:** `repair-request-submission.component.html:160`  
**Severity: Medium — damages brand credibility**

| Text in code | Correct Polish |
|---|---|
| `Przyjeliśmy` | `Przyjęliśmy` |
| `ustelnia` | `ustalenia` |
| `wątpliowości` | `wątpliwości` |

---

## 2. Data / Functional Issues

### 2.1 `UnavailableDay.date` type mismatch may break the datepicker filter
**File:** `repair-request-submission.component.ts:97`, `app/models/unavailable-day.ts`  
**Severity: Medium — API-dependent; datepicker filter may always pass**

```ts
// Model declares Date, but HTTP response is always a plain string:
interface UnavailableDay { id: string; date: Date; }  // ← wrong type

// In the filter:
unavailableDay.date.toString()
// On a JS Date object → "Mon Jun 10 2024 02:00:00 GMT+0200" (never matches normalizeDate)
// On a raw string "2024-06-10" → "2024-06-10" (matches normalizeDate correctly)
```

Angular's `HttpClient` does **not** hydrate JSON date strings into `Date` objects. The type annotation is wrong. Runtime behaviour depends on the backend's response format:
- If the API returns `"2024-06-10"` → `.toString()` on a string is a no-op, comparison works.
- If the API returns `"2024-06-10T00:00:00.000Z"` → comparison fails, **no days are ever blocked**.

Fix: change model to `date: string`, remove the misleading `.toString()` call, and verify the API response format.

### 2.2 No error recovery – form cannot be resubmitted after failure
Related to 1.3: when the API call fails, the form is still in its last-filled state and the button re-enables. This is actually the correct UX recovery (user can fix and retry), but without an error message users do not know recovery is needed.

---

## 3. SEO Issues

### 3.1 `index.html` title is "SubmissionPortal" during initial load
**File:** `index.html:5`

```html
<title>SubmissionPortal</title>
```

`AppComponent` correctly overrides this to `"RENO CAR - Umów się"` via Angular's `Title` service, so the tab shows the right title after Angular boots. However, the raw HTML served to crawlers (before JavaScript executes) and the momentary browser tab title on slow connections both show `"SubmissionPortal"`. Update the static title to match the runtime value.

### 3.2 Missing meta description
No `<meta name="description">` tag. This is the most reliable way to control the SERP snippet. A booking page should describe the action:
```html
<meta name="description" content="Umów wizytę w RENO CAR – Pogwarancyjnym Serwisie Renault w Gdańsku. Formularz online, szybka rejestracja.">
```

### 3.3 Missing Open Graph tags
No `og:title`, `og:description`, `og:image`, `og:url`, `og:type`. Sharing the URL on Facebook or messaging apps produces an empty, unstyled preview card.

### 3.4 No canonical URL
The same component is served at both `/` and `/submission`. Without a canonical link, search engines may treat these as duplicate pages:
```html
<link rel="canonical" href="https://umow.renocar.pl/">
```

### 3.5 Typo and inconsistency in JSON-LD structured data
**File:** `index.html:16,24`

- `"name": "...RENOC CAR"` → should be `"RENO CAR"`.
- `streetAddress`: JSON-LD says `"ul. Andrzeja Struga 8"` but the visible footer says `"ul. Andrzeja Struga 8/10A"`. Inconsistent NAP (Name-Address-Phone) data is penalised by Google's local search algorithm.

### 3.6 Missing `preconnect` hints for third-party origins
Three external origins are hit on first load with no preconnect hints. This adds one extra DNS + TCP + TLS round trip to the critical path:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```
The AWS API Gateway origin (`5jq3oglx45.execute-api.eu-north-1.amazonaws.com`) is not on the critical render path so preconnect there is optional.

### 3.7 `priceRange: "$"` in JSON-LD is US-centric
`"$"` has no meaning in a Polish automotive repair context and may confuse aggregators. Remove it or replace with a descriptive string like `"Wycena indywidualna"`.

---

## 4. Styling & UX Issues

### 4.1 Excessive inline styles scattered across the template
**File:** `repair-request-submission.component.html` (13+ occurrences)

```html
style="text-align: center;"
style="padding: 2%;"
style="height: 20vh; color: black;"
style="flex: 0 0 80%"
style="flex: 0 0 20%; padding-right: 2%;"
style="display: flex; width: 100%;"
style="margin: 0 auto;"
```

Inline styles cannot be overridden in a stylesheet, cannot be made responsive, and scatter layout logic away from the component's CSS file.

### 4.2 Repeated `::ng-deep` blocks for the same selector
**File:** `repair-request-submission.component.css:62-78`

The selector `:host ::ng-deep .mat-mdc-text-field-wrapper` appears **four times** as separate blocks. This should be one merged block, otherwise specificity interactions are hard to reason about.

### 4.3 Sticky footer clips form content on narrow screens
```css
.page-container { padding-bottom: 13vh; }
```
The `13vh` magic number assumes the footer fits in one line. On mobile the footer text can wrap to two or three lines, making the footer taller than `13vh` – the bottom form fields end up hidden behind the footer. Use `min-height` + dynamic padding, or a proper flex-column layout pushing the footer to the bottom.

### 4.4 Textarea height with viewport units
```html
<textarea style="height: 20vh; ...">
```
`20vh` is ~150px on a 768px screen but ~216px on a 1080p display — making the form unnecessarily long on desktop. On landscape mobile it can be cramped. Move this to CSS and use `min-height: 120px; resize: vertical;`.

### 4.5 Date hint displays US locale format for Polish users
**File:** `repair-request-submission.component.html:91`
```html
<mat-hint>MM/DD/YYYY</mat-hint>
```
Angular Material uses `en-US` by default. Polish users expect `DD.MM.YYYY`. Either provide `MAT_DATE_LOCALE: 'pl-PL'` in the app providers or remove the hint entirely to avoid the mismatch.

### 4.6 Logo image has no `width`/`height` attributes
```html
<img src="/logo-motrio-new.png" alt="...">
```
Without explicit dimensions the browser cannot reserve space before the image loads, causing **Cumulative Layout Shift (CLS)**. CLS is a Core Web Vitals metric that affects Google search ranking.

### 4.7 No character counter for the 500-character textarea
Users have no indication how close they are to the limit. Angular Material natively supports this:
```html
<mat-hint align="end">{{ repairForm.get('issueDescription')?.value?.length || 0 }}/500</mat-hint>
```

### 4.8 No validation that "to" time is after "from" time
A user can pick `from: 16:00, to: 08:00` without any error. A cross-field validator on each time slot group should enforce `from < to`.

### 4.9 Dead CSS rules
**File:** `repair-request-submission.component.css`
```css
mat-card { ... }        /* not used in template */
mat-card-title { ... }  /* not used in template */
```

### 4.10 No `<noscript>` fallback
If JavaScript is disabled, the page renders an empty shell (`<app-root></app-root>`). A minimal `<noscript>` message inside `index.html` would prevent a blank screen.

---

## 5. Accessibility Issues

### 5.1 Icon-only buttons have no accessible name
**File:** `repair-request-submission.component.html:115`
```html
<button mat-icon-button type="button" (click)="removeTimeSlot(i)">
  <mat-icon>delete</mat-icon>   <!-- screen reader announces: "button" -->
</button>
```
Add `aria-label="Usuń preferowaną datę"`. The add button on line 122 has a `title` attribute but no `aria-label`; `title` is not reliably announced on all screen readers.

### 5.2 Incorrect error condition check pattern on three fields
**File:** `repair-request-submission.component.html:42, 51, 69`
```html
*ngIf="repairForm.get('firstName')?.hasError && repairForm.get('firstName')?.invalid"
```
`hasError` is a **method reference** (always truthy). The condition reduces to `?.invalid` — the "required" error message appears for any validation failure on these fields, not specifically `required`. For the firstName/lastName fields this accidentally works since `Validators.required` is the only validator. For email it causes the bug described in section 1.2. Correct pattern:
```html
*ngIf="repairForm.get('firstName')?.hasError('required') && repairForm.get('firstName')?.touched"
```
The `touched` guard prevents errors from flashing before the user has interacted with the field.

### 5.3 No `autocomplete` attributes on personal data fields
`autocomplete` is a **WCAG 1.3.5** requirement (Identify Input Purpose) and significantly improves UX for mobile users:
```html
<input matInput formControlName="firstName" autocomplete="given-name">
<input matInput formControlName="lastName" autocomplete="family-name">
<input matInput formControlName="email" autocomplete="email">
<input matInput formControlName="phoneNumber" autocomplete="tel">
```

### 5.4 No focus management after successful form submission
When the form is replaced by the success template, keyboard/screen-reader focus is left on the now-removed DOM node. The browser's focus falls back to `<body>`. Move focus programmatically to the success heading so screen-reader users know the submission succeeded.

### 5.5 RODO consent checkbox has no link to the privacy policy
```html
<mat-checkbox formControlName="rodo">Wyrażam zgodę na przetwarzanie...</mat-checkbox>
```
Under GDPR, consent must be informed. The checkbox text describes the purpose but does not link to the full privacy policy document where data subject rights, retention periods, and contact details are listed. Providing a link is both a legal best practice and improves trust.

---

## 6. Code Quality Issues

### 6.1 `var` declarations in `ngOnInit`
**File:** `repair-request-submission.component.ts:75,77`
```ts
var submittedDate = ...
var submittedEndDateTime = ...
```
The rest of the codebase uses `const`/`let`. These two are the only `var` usages and should use `const`.

### 6.2 Model types use `String` (object wrapper) instead of `string` (primitive)
**File:** `app/models/repair-request.ts`
```ts
vin: String | null,        // ← JS wrapper object
plateNumber: String,       // ← should be lowercase `string`
```
`String` (capital) is the JavaScript string object wrapper. Using it as a type annotation is technically valid TypeScript but allows `new String('foo')` as a valid value – a common source of bugs (`new String('a') === new String('a')` is `false`). Always use lowercase `string`.

### 6.3 `isAsap()` method is called in a template loop but should be a getter
```ts
isAsap(): boolean { return this.repairForm.get('asap')?.value }
```
Called multiple times in the template as `isAsap()`. With `ChangeDetectionStrategy.OnPush` this is fine in practice, but a `get isAsap()` getter reads more naturally in templates and avoids the method call syntax `isAsap()` vs property `isAsap`.

### 6.4 `atLeastOneFieldNotNull(['vin', 'plateNumber'])` validator is redundant
`plateNumber` already has `Validators.required`, meaning the form can only be submitted when plateNumber is filled. The cross-field validator checking "at least one of vin/plateNumber is filled" is therefore always satisfied before the form becomes valid. The validator either needs to be the **sole** mechanism (remove `Validators.required` from `plateNumber` if VIN alone should be acceptable), or it should be removed.

### 6.5 Mixed Angular control flow syntax
The template uses both the new block syntax (`@for` on lines 99–101, 107–109) and legacy structural directives (`*ngIf`, `*ngFor`). Pick one and be consistent. Angular 18 recommends the new control flow syntax throughout.

### 6.6 Material theme imported via relative `node_modules` path
**File:** `styles.css:2`
```css
@import '../node_modules/@angular/material/prebuilt-themes/cyan-orange.css';
```
The `../node_modules/` prefix is fragile. Angular's build pipeline resolves bare module imports automatically:
```css
@import '@angular/material/prebuilt-themes/cyan-orange.css';
```

---

## 7. Minor / Nice-to-Have

- **Form header `<h5>`** is the first visible heading but is a level-5 element. For correct document outline semantics the primary heading should be `<h1>`.
- **`<h5>` heading on success screen** ("Przyjęliśmy Twoje zgłoszenie...") should be `<p>` — it is a paragraph, not a structural heading.
- **Success screen link** opens `renocar.pl/kontakt/` in a new tab (`target="_blank"`). At this point the booking task is complete; redirecting in the same tab is more natural.
- **`app.routes.ts`** maps both `''` and `'submission'` to the same component with no explanation. Either document the intent or add a redirect from `/submission` → `/`.
- **Phone regex** is built by concatenating three string literals with `+`. A named constant array joined with `|` would be far more maintainable.
- **`fetchpriority="high"`** on the logo `<img>` would improve LCP since the logo is the largest above-the-fold image.
