# Submission Portal – Implementation Plan
> Based on ANALYSIS.md · Sections 1–5 · Skips sections 6 & 7
> Reviewed and adjusted: 2026-05-09

---

## Files Changed

| File | Phases |
|---|---|
| `src/index.html` | 3.1–3.7 |
| `src/app/app.config.ts` | 4.5 |
| `src/app/models/unavailable-day.ts` | 2.1 |
| `src/app/repair-request-submission/repair-request-submission.component.ts` | 1.1, 1.3, 2.1, 4.8, 5.4 |
| `src/app/repair-request-submission/repair-request-submission.component.html` | 1.2, 1.3, 1.4, 4.1, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5 |
| `src/app/repair-request-submission/repair-request-submission.component.css` | 1.3, 4.1, 4.2, 4.3, 4.9 |

---

## Execution Order

> **Follow this order.** Later phases reference changes from earlier ones.

1. Phase 1.1 — fix date FormControl (crash risk)
2. Phase 1.2 — fix email error messages
3. Phase 1.3 — add submission failure feedback
4. Phase 1.4 — fix success screen typos
5. Phase 2.1 — fix UnavailableDay type
6. Phase 4.9 — remove dead CSS (housekeeping before CSS edits)
7. Phase 4.2 — merge `::ng-deep` blocks
8. Phase 4.3 — fix sticky footer padding
9. Phase 4.1 — move inline styles to CSS classes *(touches HTML + CSS simultaneously)*
10. Phase 4.5 — date picker locale + hint fix
11. Phase 4.6 — add logo dimensions
12. Phase 4.7 — add textarea character counter
13. Phase 4.8 — add from/to time range validation
14. Phase 3 — all SEO changes (all in `index.html`, do as one block)
15. Phase 5 — accessibility (after all functional changes are stable)

---

## Phase 1 – Critical Bug Fixes

### Phase 1.1 – Fix Date FormControl Initial Value
**File:** `src/app/repair-request-submission/repair-request-submission.component.ts`

**Problem:** `date: [Validators.required]` passes the validator function as the FormControl's initial value. There is no actual required validator on the field. Submitting without picking a date calls `formElement.date.getFullYear()` on a function object → **TypeError crash**.

**Change in `addTimeSlot()` method (~line 110):**
```ts
// BEFORE:
const timeSlotGroup = this.fb.group({
  date: [Validators.required],
  from: [null],
  to: [null]
});

// AFTER:
const timeSlotGroup = this.fb.group({
  date: [null, Validators.required],
  from: [null],
  to: [null]
});
```

**Verify:** Submit the form without picking a date → the date field must be marked invalid and the submit button must stay disabled. Picking a date then submitting must succeed as before.

---

### Phase 1.2 – Fix Email Validation Error Messages
**File:** `src/app/repair-request-submission/repair-request-submission.component.html`

**Problem:** One generic "required" message covers both `required` and `email` validator failures. Typing an invalid email address shows "To pole jest wymagane." — the wrong message.

**Replace the entire email `mat-form-field` block (~line 65–72):**
```html
<mat-form-field class="form-field" appearance="outline">
  <mat-label>Email</mat-label>
  <input matInput formControlName="email" required autocomplete="email">
  <mat-error *ngIf="repairForm.get('email')?.hasError('required')">
    <span>To pole jest wymagane.</span>
  </mat-error>
  <mat-error *ngIf="repairForm.get('email')?.hasError('email')">
    <span>Nieprawidłowy adres e-mail.</span>
  </mat-error>
</mat-form-field>
```

**Verify:** Leaving email empty → "To pole jest wymagane." Typing `notanemail` → "Nieprawidłowy adres e-mail."

---

### Phase 1.3 – Add User Feedback on Submission Failure
**Files:**
- `src/app/repair-request-submission/repair-request-submission.component.ts`
- `src/app/repair-request-submission/repair-request-submission.component.html`
- `src/app/repair-request-submission/repair-request-submission.component.css`

**Problem:** API errors silently vanish — the spinner stops and nothing tells the user to retry.

**Step 1 — Add error flag to component class** (alongside `submitted` and `isLoading`):
```ts
submissionError: boolean = false;
```

**Step 2 — Clear the flag when a new submit starts, and set it on failure:**
```ts
onSubmit() {
  if (this.repairForm.valid) {
    this.isLoading = true;
    this.submissionError = false;   // ← clear previous error
    ...
    this.repairRequestService.submitRepairRequest(repairRequest).subscribe({
      next: () => {
        ...
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.submissionError = true;  // ← set error flag
        this.cdr.detectChanges();
      }
    });
  }
}
```

**Step 3 — Show the error message in the template** (add directly before the submit button `<div>`, inside the `<form>` tag):
```html
<div *ngIf="submissionError" class="submission-error">
  Wystąpił błąd podczas wysyłania zgłoszenia. Spróbuj ponownie lub skontaktuj się telefonicznie.
</div>
```

**Step 4 — Add CSS for the error box** in `repair-request-submission.component.css`:
```css
.submission-error {
  color: #b80006;
  font-size: 14px;
  margin-top: 8px;
  margin-bottom: 4px;
  padding: 8px 12px;
  border: 1px solid #e00008;
  border-radius: 4px;
  background-color: #fff5f5;
  text-align: left;
}
```

**Verify:** Point `environment.ts` `apiUrl` at an invalid endpoint, submit a valid form → the error box must appear. Restore the URL and re-submit → error box must disappear and submission succeeds.

---

### Phase 1.4 – Fix Typos in Success Screen
**File:** `src/app/repair-request-submission/repair-request-submission.component.html`

**Problem:** Three Polish spelling errors are visible to users on the post-submission screen.

**Replace the `<h5>` inside `<ng-template #submittedComponent>` (~line 160):**
```html
<!-- BEFORE: -->
<h5>Przyjeliśmy Twoje zgłoszenie, przyjrzymy się mu i skontaktujemy się w celu ustelnia
  szczegółów wizyty. <a href="https://renocar.pl/kontakt/" target="_blank"
  rel="noopener noreferrer">W razie wątpliowości odezwij się</a>.</h5>

<!-- AFTER: -->
<h5>Przyjęliśmy Twoje zgłoszenie, przyjrzymy się mu i skontaktujemy się w celu ustalenia
  szczegółów wizyty. <a href="https://renocar.pl/kontakt/"
  rel="noopener noreferrer">W razie wątpliwości odezwij się</a>.</h5>
```

Note: `target="_blank"` removed on the contact link — booking is complete, same-tab navigation is more natural here.

---

## Phase 2 – Data / Functional Issues

### Phase 2.1 – Fix UnavailableDay Type Mismatch
**Files:**
- `src/app/models/unavailable-day.ts`
- `src/app/repair-request-submission/repair-request-submission.component.ts`

**Problem:** The model declares `date: Date` but `HttpClient` never deserialises JSON strings to `Date` objects — the field is a plain string at runtime. If the backend returns a full ISO timestamp (`"2024-06-10T00:00:00.000Z"`), `.toString()` on a real `Date` would produce a locale string that never matches `normalizeDate()`, silently breaking the datepicker filter.

**Step 1 — Fix the model** (`src/app/models/unavailable-day.ts`):
```ts
// BEFORE:
export interface UnavailableDay {
  "id": string;
  "date": Date;
}

// AFTER:
export interface UnavailableDay {
  id: string;
  date: string;   // API returns an ISO date string, e.g. "2024-06-10"
}
```

**Step 2 — Remove the now-redundant `.toString()` call** in the dateFilter (~line 97):
```ts
// BEFORE:
return days.findIndex(unavailableDay =>
  this.normalizeDate(date) === unavailableDay.date.toString()
) === -1;

// AFTER:
return days.findIndex(unavailableDay =>
  this.normalizeDate(date) === unavailableDay.date
) === -1;
```

**Verify:** After the change, temporarily hardcode a known upcoming weekday in the list returned by the service and confirm the datepicker blocks that date.

---

## Phase 3 – SEO Improvements

**All changes in this phase are in `src/index.html`.** Apply them as one cohesive block.

### Phase 3.1 – Fix Page Title
```html
<!-- BEFORE: -->
<title>SubmissionPortal</title>

<!-- AFTER: -->
<title>RENO CAR – Umów się | Pogwarancyjny Serwis Renault Gdańsk</title>
```

---

### Phase 3.2 – Add Meta Description
**Add immediately after `<meta name="viewport">`:**
```html
<meta name="description" content="Umów wizytę w RENO CAR – Pogwarancyjnym Serwisie Renault w Gdańsku. Wypełnij formularz online i wybierz preferowany termin. Tel. (58) 520-19-14.">
```

---

### Phase 3.3 – Add Open Graph Tags
**Add after the meta description:**
```html
<meta property="og:type" content="website">
<meta property="og:title" content="RENO CAR – Umów się | Pogwarancyjny Serwis Renault Gdańsk">
<meta property="og:description" content="Umów wizytę w RENO CAR – Pogwarancyjnym Serwisie Renault w Gdańsku. Wypełnij formularz online i wybierz preferowany termin.">
<meta property="og:image" content="https://renocar.pl/images/logo.png">
<meta property="og:url" content="https://umow.renocar.pl/">
<meta property="og:locale" content="pl_PL">
```

**Important:** Replace `https://umow.renocar.pl/` with the actual deployed domain if it differs.

---

### Phase 3.4 – Add Canonical URL
**Add after the Open Graph tags:**
```html
<link rel="canonical" href="https://umow.renocar.pl/">
```

**Important:** Use the actual deployed URL — must match the `og:url` value set in Phase 3.3.

---

### Phase 3.5 – Fix JSON-LD Structured Data
**Replace the entire `<script type="application/ld+json">` block:**
```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "name": "Pogwarancyjny Warsztat Samochodowy RENO CAR",
    "image": "https://renocar.pl/images/logo.png",
    "url": "https://renocar.pl",
    "telephone": "+48690182354",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ul. Andrzeja Struga 8/10A",
      "addressLocality": "Gdańsk",
      "postalCode": "80-116",
      "addressCountry": "PL"
    },
    "openingHours": "Mo-Fr 08:00-16:00"
  }
</script>
```

Changes made:
- `RENOC CAR` → `RENO CAR` (typo fix)
- `streetAddress` changed from `"ul. Andrzeja Struga 8"` to `"ul. Andrzeja Struga 8/10A"` (matches footer)
- `priceRange: "$"` removed (US-centric, meaningless for a Polish workshop)

---

### Phase 3.6 – Add `preconnect` Hints
**Add before the existing `<link>` tags for Google Fonts:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

---

### Phase 3.7 – Add `<noscript>` Fallback
**Add inside `<body>` as the first child, before `<app-root>`:**
```html
<noscript>
  <p style="padding:20px;font-family:Arial,sans-serif;text-align:center;">
    Ta strona wymaga włączonej obsługi JavaScript.
    Aby umówić wizytę, zadzwoń: <a href="tel:+48585201914">(58) 520-19-14</a>.
  </p>
</noscript>
```

---

## Phase 4 – Styling & UX

### Phase 4.1 – Move Inline Styles to CSS Classes
**Files:**
- `src/app/repair-request-submission/repair-request-submission.component.html`
- `src/app/repair-request-submission/repair-request-submission.component.css`

**Step 1 — Add these new CSS rules** to `repair-request-submission.component.css`:
```css
/* Phase 4.1 additions */
.form-container {
  text-align: center;
}

.form-body {
  padding: 2%;
}

.description-textarea {
  min-height: 120px;
  resize: vertical;
  color: #272626;
}

.time-slot-row {
  width: 100%;
}

.time-slot-fields {
  flex: 0 0 80%;
}

.time-slot-delete {
  flex: 0 0 20%;
  padding-right: 2%;
}

.time-slot-add-row {
  display: flex;
  width: 100%;
}

.time-slot-add-inner {
  display: flex;
  align-items: center;
}

.time-slot-add-label {
  padding-top: 0;
  margin-left: 4px;
  font-size: 14px;
}

.submit-row {
  margin-top: 10px;
}

.submit-spinner {
  margin: 0 auto;
}

.asap-checkbox,
.rodo-checkbox {
  flex: 0 0 20%;
  padding-right: 2%;
  padding-bottom: 2%;
  text-align: left;
}
```

**Step 2 — Replace inline styles in the template** with the class names above:

| Element | Remove `style="..."` | Add `class="..."` |
|---|---|---|
| `<div class="form-container" style="text-align: center;">` | remove inline style | `class="form-container"` (already set, just remove `style`) |
| `<form ... style="padding: 2%;">` | remove | add `class="form-body"` |
| `<textarea ... style="height: 20vh; color: black;">` | remove | add `class="description-textarea"` |
| `<div *ngFor="..." style="width: 100%;">` | remove | add `class="time-slot-row"` |
| `<div style="flex: 0 0 80%">` | remove | add `class="time-slot-fields"` |
| `<div style="flex: 0 0 20%; padding-right: 2%;" *ngIf="...">` | remove | add `class="time-slot-delete"` |
| `<div style="display: flex; width: 100%;" *ngIf="...">` | remove | add `class="time-slot-add-row"` |
| `<div style="display: flex; align-items: center;">` | remove | add `class="time-slot-add-inner"` |
| `<div style="padding-top: 0; margin-left: 4px; font-size: 14px">` | remove | add `class="time-slot-add-label"` |
| `<div style="margin-top: 10px;">` (submit) | remove | add `class="submit-row"` |
| `<mat-spinner ... style="margin: 0 auto;">` | remove | add `class="submit-spinner"` |
| `<div style="flex: 0 0 20%; ...">` (ASAP checkbox wrapper) | remove | add `class="asap-checkbox"` |
| `<div style="flex: 0 0 20%; ...">` (RODO checkbox wrapper) | remove | add `class="rodo-checkbox"` |

**Verify:** Visual appearance must be identical before and after this change. Test on desktop and mobile widths.

---

### Phase 4.2 – Merge Duplicate `::ng-deep` Blocks
**File:** `src/app/repair-request-submission/repair-request-submission.component.css`

**The four separate `:host ::ng-deep .mat-mdc-text-field-wrapper` blocks (~lines 62–78) must be merged into one:**
```css
:host ::ng-deep .mat-mdc-text-field-wrapper {
  --mdc-outlined-text-field-label-text-color: #272626;
  --mdc-outlined-text-field-outline-color: #d0d0d0;
  --mdc-outlined-text-field-focus-outline-color: #e00008;
  --mdc-outlined-text-field-focus-label-text-color: #e00008;
  --mdc-outlined-text-field-input-text-color: #272626;
  --mdc-outlined-text-field-caret-color: #e00008;
}
```

Delete the three redundant blocks entirely. Keep all other `::ng-deep` rules (`.mat-mdc-checkbox`, `.mat-mdc-raised-button`, `.mat-mdc-progress-spinner`) — they target different selectors and must remain.

---

### Phase 4.3 – Fix Sticky Footer Clipping Form Content
**File:** `src/app/repair-request-submission/repair-request-submission.component.css`

**Problem:** `padding-bottom: 13vh` is a magic number that breaks when the footer wraps on narrow screens. Also, `vh` units on padding in the footer are unconventional.

**Replace `.page-container` and update `.sticky-bottom` padding:**
```css
/* BEFORE: */
.page-container {
  padding-bottom: 13vh;
}

/* AFTER: */
.page-container {
  padding-bottom: 80px;
}

@media (max-width: 480px) {
  .page-container {
    padding-bottom: 110px;
  }
}
```

```css
/* BEFORE (inside .sticky-bottom): */
padding-top: 1vh;
padding-bottom: 0.5vh;

/* AFTER: */
padding-top: 8px;
padding-bottom: 6px;
```

---

### Phase 4.4 – (Merged into Phase 4.1)
The textarea `height: 20vh` inline style is handled in Phase 4.1 — replaced by the `.description-textarea` class with `min-height: 120px; resize: vertical;`. No separate action needed.

---

### Phase 4.5 – Fix Date Picker Locale and Hint
**Files:**
- `src/app/app.config.ts`
- `src/app/repair-request-submission/repair-request-submission.component.html`

**Step 1 — Update `app.config.ts`:**

Add these imports at the top of the file:
```ts
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import localePl from '@angular/common/locales/pl';
```

Call `registerLocaleData` as a **module-level side effect** (outside and before the `appConfig` object):
```ts
registerLocaleData(localePl);
```

Add the locale providers inside the `providers` array:
```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideAnimations(),
    provideHttpClient(withFetch()),
    { provide: LOCALE_ID, useValue: 'pl-PL' },
    { provide: MAT_DATE_LOCALE, useValue: 'pl-PL' },
  ]
};
```

**`LOCALE_ID` must be imported from `@angular/core`** (add to the existing import line).
**`MAT_DATE_LOCALE` must be imported from `@angular/material/core`.**

**Step 2 — Update the date hint in the template (~line 91):**
```html
<!-- BEFORE: -->
<mat-hint>MM/DD/YYYY</mat-hint>

<!-- AFTER: -->
<mat-hint>DD.MM.YYYY</mat-hint>
```

**Verify:** After the change the datepicker calendar should display month names and day-of-week headers in Polish. The selected date in the input should show in `DD.MM.YYYY` format.

---

### Phase 4.6 – Add Logo Dimensions to Prevent Layout Shift
**File:** `src/app/repair-request-submission/repair-request-submission.component.html`

**Actual logo dimensions: `700 × 171 px`** (measured from `public/logo-motrio-new.png`).

Add `width`, `height`, and `fetchpriority` to **both** logo image occurrences:

```html
<!-- Form header logo (line ~5 of the main form block): -->
<img src="/logo-motrio-new.png"
     alt="RENO CAR - Pogwarancyjny Serwis Renault | Motrio"
     width="700"
     height="171"
     fetchpriority="high">

<!-- Success screen logo (~line 158): -->
<img src="/logo-motrio-new.png"
     alt="RENO CAR - Pogwarancyjny Serwis Renault | Motrio"
     width="700"
     height="171">
```

Note: `width`/`height` here represent the **intrinsic** image dimensions. The `max-width: 500px` CSS rule on `.form-header img` continues to control the display size — these attributes only let the browser reserve the correct aspect-ratio space before the image loads.

---

### Phase 4.7 – Add Character Counter for Textarea
**File:** `src/app/repair-request-submission/repair-request-submission.component.html`

**Add a `<mat-hint>` inside the `issueDescription` mat-form-field**, after the existing `<mat-error>` blocks:
```html
<mat-form-field appearance="outline">
  <mat-label>Opis zgłoszenia</mat-label>
  <textarea matInput class="description-textarea" formControlName="issueDescription" required></textarea>
  <mat-error *ngIf="repairForm.get('issueDescription')?.hasError('required')">
    <span>To pole jest wymagane!</span>
  </mat-error>
  <mat-error *ngIf="repairForm.get('issueDescription')?.hasError('maxlength')">
    <span>Max 500 znaków!</span>
  </mat-error>
  <mat-hint align="end">{{ repairForm.get('issueDescription')?.value?.length || 0 }}/500</mat-hint>
</mat-form-field>
```

---

### Phase 4.8 – Add From/To Time Range Validation
**Files:**
- `src/app/repair-request-submission/repair-request-submission.component.ts`
- `src/app/repair-request-submission/repair-request-submission.component.html`
- `src/app/repair-request-submission/repair-request-submission.component.css`

**Step 1 — Add `ValidationErrors` to imports** in the component TypeScript file (add to the existing `@angular/forms` import line):
```ts
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup,
  ReactiveFormsModule, ValidatorFn, ValidationErrors, Validators } from '@angular/forms';
```

**Step 2 — Add the cross-field validator function** near the top of the file, alongside `atLeastOneFieldNotNull`:
```ts
function timeRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('from')?.value;
  const to = group.get('to')?.value;
  if (from && to && from >= to) {
    return { invalidTimeRange: true };
  }
  return null;
}
```

**Step 3 — Apply it in `addTimeSlot()`** (this builds on Phase 1.1's fix):
```ts
const timeSlotGroup = this.fb.group({
  date: [null, Validators.required],
  from: [null],
  to: [null]
}, { validators: timeRangeValidator });
```

**Step 4 — Show the error in the template.** **Important:** `mat-error` must be inside a `mat-form-field`. A group-level error has no parent form field, so use a plain styled `<div>` instead. Add it after the "to" `mat-form-field`, inside the time slot loop:
```html
<div class="time-range-error"
     *ngIf="timeSlot.hasError('invalidTimeRange') && (timeSlot.get('from')?.value || timeSlot.get('to')?.value)">
  Godzina „do" musi być późniejsza niż godzina „od".
</div>
```

**Step 5 — Add CSS** for the styled error div:
```css
.time-range-error {
  color: #b80006;
  font-size: 12px;
  margin-top: -6px;
  margin-bottom: 8px;
  text-align: left;
}
```

**Verify:** Select `from: 16:00` and `to: 08:00` → the error message must appear. Select `from: 09:00` and `to: 11:00` → no error.

---

### Phase 4.9 – Remove Dead CSS Rules
**File:** `src/app/repair-request-submission/repair-request-submission.component.css`

**Delete** these two rule blocks — `mat-card` and `mat-card-title` are not used anywhere in the template:
```css
/* DELETE THESE: */
mat-card {
  margin: auto;
  padding: 16px;
  background-color: #f4f5f7;
}

mat-card-title {
  margin-bottom: 16px;
}
```

---

## Phase 5 – Accessibility

### Phase 5.1 – Add `aria-label` to Icon-Only Buttons
**File:** `src/app/repair-request-submission/repair-request-submission.component.html`

**Delete button (~line 115):**
```html
<!-- BEFORE: -->
<button mat-icon-button type="button" (click)="removeTimeSlot(i)">

<!-- AFTER: -->
<button mat-icon-button type="button" (click)="removeTimeSlot(i)"
        aria-label="Usuń preferowaną datę">
```

**Add button (~line 122):**
```html
<!-- BEFORE: -->
<button title="Dodaj kolejną datę, maksymalnie 5 dat!" mat-icon-button type="button"
        (click)="addTimeSlot()" [disabled]="isAsap() === true">

<!-- AFTER: -->
<button mat-icon-button type="button" (click)="addTimeSlot()"
        [disabled]="isAsap() === true"
        aria-label="Dodaj kolejną preferowaną datę (maksymalnie 5)">
```

---

### Phase 5.2 – Fix Incorrect `hasError` Usage and RODO Error Visibility
**File:** `src/app/repair-request-submission/repair-request-submission.component.html`

**Problem A:** `?hasError` is a method reference (always truthy), not a call. Three inputs and the date field use this wrong pattern. Errors fire for any invalid state, not specifically the targeted validator.

**Problem B:** The RODO `<mat-error>` element is outside any `<mat-form-field>`. In Angular Material 18 MDC, `mat-error` outside a form field has no visibility management — the element may never display. Replace it with a plain styled `<div>`.

**Fix firstName (~line 42):**
```html
<!-- BEFORE: -->
<mat-error *ngIf="repairForm.get('firstName')?.hasError && repairForm.get('firstName')?.invalid">

<!-- AFTER: -->
<mat-error *ngIf="repairForm.get('firstName')?.hasError('required') && repairForm.get('firstName')?.touched">
```

**Fix lastName (~line 51):**
```html
<!-- BEFORE: -->
<mat-error *ngIf="repairForm.get('lastName')?.hasError && repairForm.get('lastName')?.invalid">

<!-- AFTER: -->
<mat-error *ngIf="repairForm.get('lastName')?.hasError('required') && repairForm.get('lastName')?.touched">
```

**Fix date time slot error (~line 88):**
```html
<!-- BEFORE: -->
<mat-error *ngIf="timeSlot.get('date')?.hasError && timeSlot.get('date')?.invalid">

<!-- AFTER: -->
<mat-error *ngIf="timeSlot.get('date')?.hasError('required') && timeSlot.get('date')?.touched">
```

**Fix RODO error — replace `<mat-error>` with a `<div>` (~line 133):**
```html
<!-- BEFORE: -->
<mat-error *ngIf="repairForm.get('rodo')?.hasError && repairForm.get('rodo')?.invalid">
  <span>Zgoda na przetwarzanie danych jest wymagana!</span>
</mat-error>

<!-- AFTER: -->
<div class="rodo-error" *ngIf="repairForm.get('rodo')?.hasError('required') && repairForm.submitted">
  <span>Zgoda na przetwarzanie danych jest wymagana!</span>
</div>
```

**Add CSS for the RODO error:**
```css
.rodo-error {
  color: #b80006;
  font-size: 12px;
  margin-top: 4px;
  text-align: left;
}
```

**Important:** `repairForm.submitted` is `true` only after the user has attempted to submit. This prevents the RODO error from flashing immediately on page load.

---

### Phase 5.3 – Add `autocomplete` Attributes to Personal Data Fields
**File:** `src/app/repair-request-submission/repair-request-submission.component.html`

Add `autocomplete` to each personal data input (email is already handled in Phase 1.2):
```html
<input matInput formControlName="firstName"  required autocomplete="given-name">
<input matInput formControlName="lastName"   required autocomplete="family-name">
<input matInput formControlName="phoneNumber" required autocomplete="tel">
```

Add `autocomplete="off"` to VIN and plate number fields — these are vehicle-specific and must not be autofilled from browser history:
```html
<input matInput formControlName="vin" autocomplete="off">
<input matInput formControlName="plateNumber" required autocomplete="off">
```

---

### Phase 5.4 – Add Focus Management After Successful Submission
**Files:**
- `src/app/repair-request-submission/repair-request-submission.component.ts`
- `src/app/repair-request-submission/repair-request-submission.component.html`

**Problem:** After `submitted = true` the success template replaces the form. Keyboard/screen-reader focus is left on a removed DOM node and falls back to `<body>`. Screen-reader users receive no notification that the submission succeeded.

**Step 1 — Add `ViewChild` and `ElementRef` imports** (add to existing `@angular/core` import):
```ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component,
  ElementRef, OnInit, ViewChild } from '@angular/core';
```

**Step 2 — Add the `ViewChild` property** to the component class:
```ts
@ViewChild('successHeading') successHeading!: ElementRef;
```

**Step 3 — Move focus in the `next` callback,** after `detectChanges()` has rendered the success template:
```ts
next: () => {
  const submittedDate = new Date();
  localStorage.setItem("submitted-date", submittedDate.toDateString());
  this.submitted = true;
  this.isLoading = false;
  this.cdr.detectChanges();
  // Allow Angular to render the success template before focusing
  setTimeout(() => this.successHeading?.nativeElement?.focus(), 0);
},
```

**Step 4 — Add the template reference and `tabindex` to the success heading:**
```html
<ng-template #submittedComponent>
  <div class="center-container">
    <a href="https://renocar.pl/" rel="noopener noreferrer">
      <div><img src="/logo-motrio-new.png"
                alt="RENO CAR - Pogwarancyjny Serwis Renault | Motrio"
                width="700" height="171"></div>
    </a>
    <h5 #successHeading tabindex="-1">Przyjęliśmy Twoje zgłoszenie, przyjrzymy się mu
      i skontaktujemy się w celu ustalenia szczegółów wizyty.
      <a href="https://renocar.pl/kontakt/" rel="noopener noreferrer">
        W razie wątpliwości odezwij się
      </a>.</h5>
  </div>
</ng-template>
```

`tabindex="-1"` makes the heading programmatically focusable without adding it to the tab order.

**Note:** `@ViewChild('successHeading')` resolves only after `cdr.detectChanges()` renders the success template. The `setTimeout(..., 0)` defers the focus call to the next event loop tick, by which point the element is in the DOM. The `?.` optional chaining handles the transitional state safely.

---

### Phase 5.5 – Add Privacy Policy Link to RODO Checkbox
**File:** `src/app/repair-request-submission/repair-request-submission.component.html`

**Problem:** The RODO consent checkbox describes the purpose but does not link to the full privacy policy. Under GDPR, consent must be informed — this is a legal best practice issue.

**⚠️ Prerequisite:** A privacy policy page must exist on the main website **before** this change is deployed. Confirm the URL with the website owner. If the page does not yet exist, defer this phase.

**Change:**
```html
<!-- BEFORE: -->
<mat-checkbox formControlName="rodo">Wyrażam zgodę na przetwarzanie moich danych osobowych
  przez RENO CAR w celu rejestracji, naprawy pojazdu oraz komunikacji ze zgłaszającym.</mat-checkbox>

<!-- AFTER: -->
<mat-checkbox formControlName="rodo">
  Wyrażam zgodę na przetwarzanie moich danych osobowych przez RENO CAR
  w celu rejestracji, naprawy pojazdu oraz komunikacji ze zgłaszającym
  (<a href="https://renocar.pl/polityka-prywatnosci/"
      target="_blank"
      rel="noopener noreferrer"
      (click)="$event.stopPropagation()">Polityka prywatności</a>).
</mat-checkbox>
```

**`(click)="$event.stopPropagation()"` is required.** Without it, clicking the link propagates to the `mat-checkbox` host and toggles the checkbox state — the user is navigated to the privacy policy but their consent choice is also flipped. `stopPropagation()` prevents this.

Replace `https://renocar.pl/polityka-prywatnosci/` with the real URL once confirmed.
