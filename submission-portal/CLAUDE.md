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
- `src/app/services/` — `repair-request-service` (POST submit), `unavailable-days-service`
  (fetch blocked days for the date picker).
- `src/app/models/` — `repair-request.ts`, `unavailable-day.ts`.
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
- SSR is configured (`main.server.ts`, `server.ts`); avoid direct `window`/`document` access
  outside browser-guarded code.
- Standalone components only — there are no NgModules; imports go on the component.
- Don't import from `repair-requests-portal/`; the apps are deliberately independent.
- TODO(owner): document hosting/deployment of the built app (CloudFront/S3 assumed from root
  README, not verifiable here).
