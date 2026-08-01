# repair-requests-portal — admin/receptionist portal (portal.renocar-zgloszenie.pl)

Angular 18 (standalone components) + Angular Material + SSR scaffolding. Auth-guarded UI
where the shop's receptionist lists, inspects, and progresses repair requests and manages
unavailable appointment days. Talks to the `shop` Spring backend's `/api/internal/**`
endpoints (JWT-protected). Independent from `submission-portal/` — no shared code.

## Commands (verified from package.json / angular.json)

```bash
npm ci                # or: npm run install:prod
npm start             # ng serve, dev config, http://localhost:4201  (port set in angular.json)
npm run build:prod    # ng build --configuration production  (what root `npm run build:admin-portal` calls)
npm test              # ng test — Karma + Jasmine (needs Chrome)
npm run watch         # ng build --watch --configuration development
```

Local dev requires the `shop` backend on `http://localhost:8080`
(`src/environments/environment.development.ts`; prod `environment.ts` points at the API
Gateway execute-api URL). `proxy.conf.json` is not wired into `angular.json` — the app calls
`environment.apiUrl` directly.

## Layout

- `src/app/auth-guard.ts` — route guard; `src/app/auth-interceptor.interceptor.ts` — adds
  `Authorization: Bearer <token>` from `localStorage['access_token']`, clears it on 401.
- `src/app/service/` — `auth-service` (login → token), `repair-request-service`
  (`/internal/repair-request`: `/search` paginated list, get by id, `/mark-as-handled`,
  `/mark-as-appointment-made`), `unavailable-days-service`.
- `src/app/components/` — `login`, `repair-request-table` (paginated list),
  `repair-request-summary` (detail + status actions), `unavailable-days`.
- `src/app/commons/status-mapper.ts` — maps backend `RepairRequestStatus` enum values
  (`NEW` / `HANDLED` / `APPOINTMENT_MADE`) to Polish display labels; has a spec — keep both
  in sync with the backend enum.
- `src/app/models/` — `repair-request`, `repair-request-list-item`, `page-response`,
  `preferred-visit-window`, `unavailable-day`. These mirror shop's controller DTOs
  (`RepairRequestDto`, `RepairRequestListItem`, …) — update together.

## Conventions & pitfalls

- Note the service dir is `service/` here but `services/` in submission-portal — follow the
  local convention of the app you're in.
- UI copy is Polish; keep it Polish.
- Status flow mirrors the backend state machine: NEW → HANDLED → APPOINTMENT_MADE (marking
  appointment-made also marks handled server-side). Don't invent client-side states.
- `mark-as-appointment-made` takes a body (`{ sendReviewEmail }`) and returns
  `CloseRepairRequestResult`. The checkbox is **hidden** when `reviewEmailConsent` is false —
  that is a UX affordance only; the backend re-checks the stored consent and ignores the flag
  without it. The helper text under the checkbox ("odznacz tylko, jeśli wizyta nie doszła do
  skutku…") is a **Google review-gating compliance requirement**, not decoration — don't drop
  it. See `spec/04-post-visit-review-email-spec.md` §7.2 / §C2.
- SSR files exist (`server.ts`, `main.server.ts`); guard browser-only APIs. Note
  `auth-interceptor` uses `localStorage` unguarded — mind SSR if you touch it.
- Standalone components only; no NgModules.
- The stray `submission-portal/` directory in this module contains only a `package-lock.json`
  (committed by accident) — don't put anything there. TODO(owner): delete it.
- TODO(owner): document hosting/deployment of the built app.
