---
name: angular-portals
description: Use when working on submission-portal/ or repair-requests-portal/ (Angular apps) — dev-server ports, build/test commands, environment/API wiring, and the backend contract each app must stay in sync with.
---

# Angular portals

Two independent Angular 18 apps (standalone components, Angular Material, SSR scaffolding).
They share the repair-request domain but **no code** — never import across them. UI copy is
Polish; keep it Polish.

## Commands (identical scripts in both package.json files)

```bash
npm ci                 # deps (or npm run install:prod)
npm start              # ng serve dev config — submission-portal :4200, repair-requests-portal :4201
npm run build:prod     # production build (what the root package.json build:* scripts call)
npm test               # Karma/Jasmine; headless: npm test -- --watch=false --browsers=ChromeHeadless
npm run watch          # dev rebuild on change
```

## API wiring (both apps)

- Dev serve/build file-replaces `src/environments/environment.ts` with
  `environment.development.ts` → `http://localhost:8080/api`. So local dev needs the `shop`
  Spring backend running on :8080 (see `car-repair-shop-backend/shop/CLAUDE.md` for how, incl.
  DynamoDB Local on :8081).
- `environment.ts` (prod) points at the AWS API Gateway execute-api URL.
- `proxy.conf.json` files exist in both apps but are NOT wired into `angular.json`; the apps
  call `environment.apiUrl` directly. Don't assume the proxy is active.

## Where the domain lives

- **submission-portal** (public form): feature component
  `src/app/repair-request-submission/`; services in `src/app/services/`
  (`repair-request-service`, `unavailable-days-service`); models in `src/app/models/`.
  Form validators must mirror backend validation (vin exactly 17 chars, plate 6–8,
  description ≤ 500, phone pattern, `atLeastOneFieldNotNull(['vin','plateNumber'])`, rodo
  required) — backend sources of truth: `SubmitRepairRequestDto` in both
  `car-repair-shop-backend/repair-request-submitted-consumer/` and `shop/`.
- **repair-requests-portal** (admin): auth in `src/app/auth-guard.ts` +
  `auth-interceptor.interceptor.ts` (JWT from `localStorage['access_token']`, cleared on 401);
  services in `src/app/service/` (note: singular `service/` here vs `services/` in the other
  app — follow local convention); components under `src/app/components/`
  (`login`, `repair-request-table`, `repair-request-summary`, `unavailable-days`);
  `src/app/commons/status-mapper.ts` maps backend statuses `NEW`/`HANDLED`/`APPOINTMENT_MADE`
  to Polish labels and has a spec — update both together with the backend enum. Semantics are
  owner-confirmed and intentional: `HANDLED`="Umówiono" (appointment booked),
  `APPOINTMENT_MADE`="Zakończono" (visit done) — the enum name misleads; never swap the labels.
- Admin API contract: `/api/internal/login`, `/api/internal/repair-request/{search,{id},
  {id}/mark-as-handled,{id}/mark-as-appointment-made}`, `/api/internal/unavailable-day` —
  defined in `shop/`'s controllers; models under `src/app/models/` mirror shop's DTOs.

## Pitfalls

- SSR is scaffolded (`server.ts`, `main.server.ts`): guard `window`/`document`/`localStorage`
  usage if you touch bootstrap-time code.
- Standalone components only — no NgModules; add imports to the component decorator.
- `repair-requests-portal/submission-portal/` contains only a stray `package-lock.json`;
  never put code there.
- After changing a backend DTO/endpoint, grep BOTH apps' `models/` and services for the field
  name before declaring the change complete.
