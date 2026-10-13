# submission-portal — public repair-request form (renocar-zgloszenie.pl)

Angular 18 (standalone components) + Angular Material + SSR scaffolding (`@angular/ssr`,
`server.ts`). The public site where clients submit a repair request. Independent from
`repair-requests-portal/` — no shared code, only a shared domain.

## Commands (verified from package.json / angular.json)

```bash
npm ci                # or: npm run install:prod
npm start             # ng serve, dev config, http://localhost:4200
npm run build         # ng build (development is NOT default for build; see angular.json)
npm run build:prod    # ng build --configuration production  (what root `npm run build:submission-portal` calls)
npm test              # ng test — Karma + Jasmine (needs Chrome)
npm run watch         # ng build --watch --configuration development
```

## API wiring

- `src/environments/environment.development.ts` → `http://localhost:8080/api` (run the
  `shop` backend locally, or nothing works). Dev build/serve file-replaces `environment.ts`
  with this (see `angular.json` `fileReplacements`).
- `src/environments/environment.ts` (used by prod build) → the API Gateway execute-api URL.
- `proxy.conf.json` / `proxy-prod.conf.json` exist but are **not referenced in angular.json**;
  the app calls `environment.apiUrl` directly. Treat the proxy files as legacy unless you wire
  them in with `ng serve --proxy-config`.
- In production the submit endpoint is served by the `repair-request-submitted-consumer`
  Lambda, not the Spring app — same DTO contract.

## Layout

- `src/app/repair-request-submission/` — the whole form (single feature component):
  reactive form, custom cross-field validator `atLeastOneFieldNotNull(['vin','plateNumber'])`,
  time-slot picking, RODO consent.
- `src/app/status/` — the customer's **status page** (`/status/:token`, read-only, opened from
  the link in confirmation / "Termin wizyty" e-mails). `status-view.ts` = pure view-model
  (chip, headline, subline, timeline per backend status — extend its map for new statuses),
  `status.component` = loading / not-found / error / ready, plus header / footer / summary /
  details sub-components (kept separate for the 4 kB component-CSS budget). Follows the Claude
  Design mockups; plan, decisions and what is deliberately left out: `STATUS-PAGE-PLAN.md`.
- `src/app/services/` — `repair-request-service` (POST submit), `unavailable-days-service`
  (fetch blocked days for the date picker), `status-service` (GET public status by token).
- `src/app/models/` — `repair-request.ts`, `unavailable-day.ts`, `repair-request-status.ts`
  (mirrors shop's `PublicRepairRequestStatusDto`).
- `src/app/commons/utc-date-time.ts` — backend timestamps are UTC without offset; visit-window
  dates are local calendar days (never shift them).
- `src/app/app.routes.ts`, `app.config.ts` / `app.config.server.ts` — standalone bootstrap.

## Conventions & pitfalls

- **Validation must mirror the backend** (`SubmitRepairRequestDto` in
  `car-repair-shop-backend/repair-request-submitted-consumer/` and in `shop/`): vin exactly 17
  chars, plate number 6–8, issue description ≤ 500, phone pattern, vin-or-plate required, rodo
  required. Change it in all three places or users get server errors the UI didn't predict.
- `reviewEmailConsent` is the one **optional** field on the form — no validator, by design
  (see `spec/04-post-visit-review-email-spec.md` §5.1). Never give it `Validators.requiredTrue`
  like `rodo`: it is a freely-given RODO consent, and a required "optional" consent is invalid
  consent. It still has to exist in both backend `SubmitRepairRequestDto`s.
- UI copy is **Polish** — keep new user-facing text Polish.
- **Status page rules:** personal data arrives masked from the API — never try to "unmask" or
  add fields client-side; the token in the URL is a secret (no logging, no analytics on it);
  keep the `noindex` robots tag; only a 404 means "link invalid" — other errors show the retry
  view. Don't set a global `LOCALE_ID` for it (the form's date handling depends on the
  default); the page formats Polish dates with `Intl`.
- SSR is configured (`main.server.ts`, `server.ts`); avoid direct `window`/`document` access
  outside browser-guarded code.
- Standalone components only — there are no NgModules; imports go on the component.
- Don't import from `repair-requests-portal/`; the apps are deliberately independent.
- TODO(owner): document hosting/deployment of the built app (CloudFront/S3 assumed from root
  README, not verifiable here).
