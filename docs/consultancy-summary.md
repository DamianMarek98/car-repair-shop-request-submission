# Renocar platform & business — consultancy summary (2026-07-04)

Four parallel review workstreams were executed. Details live in the linked documents; this
file is the consolidated executive view: what's critical across all of them, one merged
action plan, and the open questions only the owner can answer.

| Workstream | Document |
|------------|----------|
| Engineering capabilities review (senior SWE) | [engineering-capabilities-review.md](engineering-capabilities-review.md) |
| Business capabilities review (business owner) | [business-capabilities-review.md](business-capabilities-review.md) |
| renocar.pl digital-presence audit (local SEO/marketing) | [renocar-digital-presence-audit.md](renocar-digital-presence-audit.md) |
| AI orchestration improvements (per-module guides + skills) | [ai-orchestration-improvements.md](ai-orchestration-improvements.md) |

## Overall verdict

The platform genuinely works end-to-end (form → Lambda → DynamoDB → admin portal →
notification) at near-zero AWS cost, the backend core shows real engineering discipline
(DDD modulith, State pattern, LocalStack integration tests), and the parts scraper solves a
real daily problem for the shop. The weaknesses are concentrated in three places: **secrets &
un-versioned code**, **the customer never hears back digitally**, and **a 2012-era public
face with broken legal/compliance basics**.

## Critical items (do first, all small effort)

1. **Rotate the vendor credentials now.** Real Inter Cars/APCAT/Auto-Partner passwords are
   hardcoded in `renocar-win-package/dist/server.js:184-202`, in `unnamed.patch` at repo
   root, and committed on local branch `car-parts-scrapper-improvements` (not pushed —
   verified). Rotate at the vendors, purge the patch/branch, and adopt the credential
   mechanism gate in the `refresh-win-package` skill before the next bundle refresh.
2. **Commit the un-versioned software.** `car-repair-shop-ai-chat/` (entire module),
   `renocar-win-package/`, and `car-parts-scraper/src/browserSessionManager.ts` are
   untracked. A disk failure today loses working software.
3. **Fix the production submit Lambda's validation.** The consumer Lambda's `@NotNull` is
   `software.amazon.awssdk.annotations.NotNull` — not enforced, so null name/email/phone
   pass; and a null `timeSlots` NPEs in `RepairRequestItemConverter.java:19` → customer-facing
   502.
4. **Correct the Feature 2 spec to the confirmed status semantics.** Owner confirmed
   (2026-07-04): `HANDLED` = workshop contacted the client and booked the appointment
   (label "Umówiono"); `APPOINTMENT_MADE` = visit done, car fixed (label "Zakończono").
   The live label mapping is intended — it is `features-development-spec.md` that must be
   fixed: the "appointment confirmed" email belongs on `HANDLED`, the completion (and future
   review-request) email on `APPOINTMENT_MADE`. The enum name is misleading; it is now
   documented in the module guides — prefer that over renaming across the 4 synced modules.
5. **Fix the broken `tel:` links on renocar.pl** — `tel:+585201914` dials Venezuela's country
   code (+58) instead of +48 58; every mobile "call us" tap fails. Sitewide.
6. **Stop logging JWTs and customer PII** to CloudWatch (`JwtAuthFilter.java:38`,
   `RepairRequestSubmittedHandler.java:43,55`) — operational and RODO exposure.

## High-priority (this month)

7. **RODO compliance cluster** on the public sites: no privacy policy, no art. 13 information
   clause at forms, analytics loading before consent, no data-retention/TTL policy, and no
   marketing-consent checkbox on the submission form (without which the growing customer base
   is legally unusable for reminders/promotions — the single cheapest thing to add while
   Feature 1 touches the form).
8. **Sort out the legal entity on the public site.** kontakt page says "RENO CAR sp. z
   o.o.", the cookie policy says "Trzeciak, Marek Sp. j." — and KRS shows that sp.j.
   dissolved 2025-12-31; directories still carry the old name. Also note the same-named
   competitor ("RENO CAR ADAMOWICZ MARCIN", ul. Olszyńska 3, Gdańsk) making NAP consistency
   more important than usual.
9. **Analytics from zero:** the site ships a dead `ga.js`/UA tag (sunset 2023); install GA4
   (behind consent), add `robots.txt`, `sitemap.xml`, favicon, schema.org `AutoRepair`
   markup, and start a monthly submitted→booked→completed funnel count.
10. **Ship Features 1→2→12 from the existing plan** (confirmation email, status emails,
    appointment date) — the business review confirms these are the right priorities; fold
    anti-spam into Feature 1 (SES sender-reputation protection) and replace the client-side
    "one submission per day" block that locks out legitimate customers.

## Strategic (quarter+)

- **Reproducible infrastructure:** `infrastructure/` is empty; all AWS resources are
  click-ops. IaC for the existing stack + PITR/TTL on DynamoDB + DLQs/alarms (a failing
  notification path today is silent), CI for all modules (today only `shop/` builds in CI).
- **Contract-test or extract the 4×-duplicated submit contract** (already divergent — see
  critical item 3).
- **Dependency modernization:** AWS SDK v1 (EOL 12/2025), unmaintained spring-data-dynamodb
  fork, Spring Boot 3.3.1, Angular 18, jQuery 1.11.2.
- **Service reminders from the Firebird DB** (tires/oil/inspection) — the largest untapped
  recurring-revenue lever; pilot manually from AI-chat queries, automate if it fills bays.
- **Review generation:** trigger a Google-review request email on "Zakończono" — the hook
  already exists in the admin portal.
- **Marketing site refresh** working from `renocar-webpage/PLAN.md` (already prioritized).

## Owner answers received (2026-07-04)

- **Production `/submit` is the consumer Lambda** — the monolith path was migrated to it.
  Consequence: the unenforced `@NotNull` and the `timeSlots` NPE (critical item 3) are live
  production bugs; fix in `repair-request-submitted-consumer/` first.
- **Status semantics confirmed**: `HANDLED` = client contacted & appointment booked;
  `APPOINTMENT_MADE` = visit finished, car fixed. Live labels are correct; fix the feature
  spec (see critical item 4).
- **Operating legal entity: "Renocar Zbigniew Marek"** — both current site mentions are
  wrong (kontakt: "RENO CAR sp. z o.o."; cookie policy: dissolved "Trzeciak, Marek Sp. j.").
  Update the site (grep every `index.htm` — no templating) and the directory listings;
  collect NIP/registration details when doing it.
- **The credential-bearing zip was never shared** beyond the shop PC — rotation urgency drops
  to low, but rotate anyway: the credentials remain in `dist/server.js`, `unnamed.patch`,
  and local git history (`car-parts-scrapper-improvements`).
- **Google Business Profile**: the owner has manager access; a guided walkthrough will be
  done in a separate session (manual checklist is in the audit doc).

## Remaining open questions for the owner

Business:
1. Actual monthly volumes: submissions, phone-vs-online ratio, submitted→booked conversion?
2. Does Motrio provide any tooling/marketing support (network locator entry, booking,
   co-op ads) the shop isn't using?
3. Which Facebook page is the canonical one (two IDs found)?

Technical/operational:
4. How are the Lambdas and the marketing site actually deployed (function names, upload
   procedure, Plesk/FTP details)? Needed for the missing `DEPLOYMENT.md` and any future CI.
5. Is the shop's Firebird DB reachable enough (network, hours, backups) to drive automated
   service reminders, or would that need an export step?

## What was changed in the repo by this consultancy

Documents only, plus AI-agent tooling — no application code was touched:
`docs/` (this file + 4 review docs), per-module `CLAUDE.md` guides (8 modules), 5 skills
under `.claude/skills/`, and a refreshed root `CLAUDE.md`.
