# Master Plan — Renocar platform & workshop improvements

> **Date:** 2026-07-11 · **Role of this file:** the single entry point. It orders ALL work
> from most critical to least, resolves conflicts between the specialist specs, and
> consolidates every open question for the owner.
> Item IDs used below: `E*` = engineering (spec 01) · `C*`/`G*` = corrections/growth
> (spec 02) · `W-*` = digital presence (spec 03) · `F1/F2/F12/F3` = feature plan.

## The spec folder

| File | Contents | Author perspective |
|---|---|---|
| `00-master-plan.md` | **This file** — combined prioritized plan + open questions | Orchestrator / critical reviewer |
| `01-engineering-remediation-spec.md` | E1–E18: live prod bugs, secrets, hygiene, hardening, IaC, modernization | Senior software engineer |
| `02-product-and-growth-spec.md` | C1–C10 (feature-plan corrections) + G1–G9 (consent, anti-spam, analytics, reviews, reminders, receptionist QoL) | Senior software architect |
| `03-digital-presence-spec.md` | W-A (site code) / W-B (hosting) / W-C (legal-RODO, Polish copy) / W-D (off-site runbook) | Senior web developer / local SEO |
| `features-development-spec.md` | F1/F2/F12/F3 design (⚠️ corrections banner — read C1–C10 first) | Pre-existing (2026-06-13) |
| `features-implementation-plan.md` | F1/F2/F12/F3 step-by-step (⚠️ corrections banner — read C1–C10 first) | Pre-existing |

**Ground truth that overrides everything** (owner, 2026-07-04, `docs/consultancy-summary.md`):
pipeline is `NEW` ("Nowe") → `HANDLED` ("Umówiono", appointment booked) → `APPOINTMENT_MADE`
("Zakończono", visit done, terminal); production `/submit` is the consumer Lambda; legal
entity is **Renocar Zbigniew Marek**; enum names are documented, not renamed.

---

## Reviewer's findings (cross-spec critical review)

Conflicts found between the three specs and their resolutions — these rulings are binding:

1. **Consent banner — two designs existed.** Spec 02 G3 step 2 sketched a custom two-button
   vanilla-JS bar; spec 03 W-C3 specifies a vendored **Klaro!** config with GA4 script
   gating. **Resolution: W-C3 (Klaro) is canonical** for renocar.pl. G3 keeps everything
   else (GA4 property, events, portal analytics with iframe suppression, the DB funnel
   habit). One consent implementation, not two.
2. **G4's Google-review link has an undeclared dependency.** The review URL needs the
   Place ID captured during the GBP session (W-D1 step 10). **Resolution: W-D1 must
   complete before G4 ships**; the captured link becomes G4's `GOOGLE_REVIEW_URL` env var.
3. **Who owns the marketing-site plan.** Spec 01 E18 defers to `renocar-webpage/PLAN.md`;
   spec 03 §0.1 absorbed/superseded most PLAN.md items after verifying Phase 1 is already
   implemented. **Resolution: spec 03 is canonical for the marketing site.** PLAN.md
   remains authoritative only for the residual items 03 explicitly leaves to it
   (preconnect, CWV Phase 4, FAQ schema, pricing table, design Phases 6–7).
4. **Slider backup dir** — E4 says delete `httpdocs/images/home-slider/backup/`, W-B2 says
   "keep local or delete". **Resolution: delete** (E4 wins; originals can be archived
   outside the repo before deletion).
5. **F12 token generation vs. monolith cleanup.** E16 deletes the shop's duplicate submit
   path, which makes feature-plan step 12.1.2 (token in `RepairRequest.from`) obsolete.
   **Resolution: if E16 lands before F12, skip 12.1.2 — the consumer Lambda is the only
   token writer.** If F12 lands first, implement 12.1.2 and delete it with E16.
6. **TTL vs. the funnel.** E11's retention expiry (proposed 24 months) will eventually
   delete the rows G3's monthly funnel counts. Non-issue if the monthly recording habit
   (G3 step 6) starts now — numbers are captured long before expiry. Noted so nobody
   "discovers" shrinking historical counts later.
7. **Verified-quality check.** Spec 01 re-verified every review claim (`path:line`) and
   found one *new* live bug (unconditional `plate_number` write → 502) plus a fix nuance
   (making `@NotNull` real on `plateNumber` would wrongly reject VIN-only submissions —
   it must be dropped instead). Spec 03 found the audit undercounted broken `tel:` links
   (11 across 8 files) and that PLAN.md Phase 1 no longer needs doing. Spec 02 verified
   the live admin flow already matches the owner semantics — only the *documents* were
   wrong. All three agree on the corrected status model. No unresolved contradictions
   remain.

---

## The plan — most critical → least important

Effort: S = hours · M = days · L = week+. Every item links to its full spec.

### Tier 0 — Do this week (live bugs, secrets, data-loss, broken phone calls)

| # | Item | What / why now | Effort | Depends on |
|---|---|---|---|---|
| 1 | **E1** — Fix the production submit Lambda | Live 502s + null-accepting validation on the customer-facing endpoint (3 bugs, incl. the newly found `plate_number` one). Prerequisite for F1 emails and G2 anti-spam. | S | — |
| 2 | **E2** — Stop logging JWTs + PII; log retention; rotate JWT secret | Session-hijack + RODO exposure on every request; ship consumer changes in the same jar as #1. | S | — |
| 3 | **W-A1 + W-A2** — Fix 11 broken `tel:` links (+48) and remove the dead GA snippet | Every mobile tap on the landline dials Venezuela today. One small site deploy; W-A8 typos can ride along. | S | — |
| 4 | **E4a** — Commit un-versioned software + fix `.gitignore`s | A disk failure today loses the ai-chat module, `browserSessionManager.ts`, and all planning docs. | S | — |
| 5 | **E3** — Vendor-credential rotation + clean win-package rebuild | Plaintext supplier credentials in the shipped bundle/patch/local branch. Rotation starts now; rebuild uses **`credentials.bat`** (owner decision 2026-07-12). Then **E4b** (commit win-package). | S* | — |

*Calendar-spread by vendor round-trips.

### Tier 1 — This month (protect the feature rollout, ship F1, legal basics)

| # | Item | What / why | Effort | Depends on |
|---|---|---|---|---|
| 6 | **F1 Step 1.1 — SES foundation** | Start day 1: domain verification + production-access request is the long-lead blocker for all customer email. | S + wait | — |
| 7 | **Site week-1 batch: W-A3–A8, A11–A14, W-B2, then W-D5** | Favicon, robots/sitemap, JSON-LD, canonicals/titles, OG, typos, promotions prune, mechanicy 301, homepage iframe→CTA, image compression; submit sitemap to GSC. All repo-only, one deploy. | M | — |
| 8 | **E8** — CI for all 7 modules + Dependabot + OIDC | Do early — every later item lands under a safety net. | M | E4 |
| 9 | **E5, E6, E7** — env-var extraction, CORS/error cleanup, honest prod frontend config + working deploy workflow | Small, parallelizable hardening; E5 implements F1's `SNS_TOPIC_ARN` step once; E7 must precede F12/G3 portal work. | S–M each | — |
| 10 | **E10** — Contract-test fixtures for the submit contract | **Hard gate: lands before ANY new persisted field** (F1/F2/F3/F12/G1/G2 all add fields to the 4× duplicated contract). | M | E1 |
| 11 | **E9** — Alarms + DLQ | Silent-failure detection **before** F1 makes the notification Lambda customer-facing. | M | E5 |
| 12 | **F1 + G1 + G2 as one change set** | Confirmation email + marketing-consent checkbox (every week of delay shrinks the legally usable customer base) + Turnstile/throttling replacing the localStorage lockout. Deploy order per G1: consumer first, then portal. | M | #1, #6, #10 |
| 13 | **Legal/RODO site package: W-A9/W-A10 → W-C1/W-C2 → W-C3+W-C4** | Correct legal entity blocks, privacy policy + art. 13 clause, Klaro consent banner gating GA4 (single deploy for C3+C4). **NIP 5833538950 received 2026-07-12 — fully unblocked.** Then G3's portal analytics + monthly funnel habit. | M | #7 |
| 14 | **G8** — Kontakt-form signposting | Route booking intent to the request form; 2 hours, independent. | S | — |
| 15 | **W-D1 → W-D2** — GBP session (captures Place ID for G4), then directory cleanup with canonical NAP. *(W-D3 Facebook consolidation cancelled 2026-07-12 — Facebook dropped from the site.)* | Off-site trust/local-SEO runbook, owner-assisted. | M | owner time |

### Tier 2 — Next quarter (the corrected feature rollout + revenue levers)

| # | Item | What / why | Effort | Depends on |
|---|---|---|---|---|
| 16 | **F2 — corrected per C1–C8** | Appointment capture on **`mark-as-handled`** ("Umów wizytę" dialog), state-machine cleanup per C3, `completed_at` (C4), C5 email triggers. Stream switch to `NEW_AND_OLD_IMAGES` **in the same maintenance window as E11's TTL enablement**. | M–L | #10, #12 |
| 17 | **E11** — DynamoDB TTL + delete the Lambda-inert `@Scheduled` cleaner | RODO retention promise + the `unavailable_day` table stops growing unbounded. | M | OQ-1, #10, window shared with #16 |
| 18 | **G4** — Completion email with Google-review ask (on "Zakończono") | Highest-ROI local-marketing asset; one extra email body on C5's MODIFY plumbing. | S | #12, #16, W-D1 |
| 19 | **F12** — Status link | Per plan + C7 timeline mapping; mind finding 5 above (12.1.2 vs E16). | M | #12, #16 |
| 20 | **G6** — Day-before appointment reminders | *Reframed 2026-07-12:* no-shows are already prevented by the receptionist's **manual** day-before call/SMS — G6's value is automating that chore, and SMS-first may be the faithful automation. Lower urgency; reassess phasing when picked up. | M | #16 |
| 21 | **G7** — Receptionist QoL: search, status filter, notes, contact correction (+ consent-withdrawal toggle) | Daily friction out of the most-used screen; contact fix protects SES bounce rate. | M | — |
| 22 | **E12 + E13** — Scraper loopback bind + parser tests; ai-chat read-only DB user, enforced timeout, no default password | Shares the shop-PC visit with E3's bundle reship. | M | E3, E8 |

### Tier 3 — Strategic (quarter+, sequenced around features)

| # | Item | What / why | Effort | Depends on |
|---|---|---|---|---|
| 23 | **E16** — Monolith cleanup: delete duplicate submit path + vestigial events; Modulith boundary test | Do before F2 starts or after it ships — never mid-feature. | M | E1, E10 |
| 24 | **F3** — Photo upload | Correctly last among features; independent once S3 is ready. | M–L | #10 |
| 25 | **G5** — Service-reminders pilot (manual, consented customers only) | The largest untapped revenue lever — **parked 2026-07-12**: owner deferred the whole Firebird topic (reachability/permission unknown). Revisit once the consent base matures (~3–6 months of G1) *and* the Firebird questions get answered. | M pilot | #12 (G1), Firebird (parked) |
| 26 | **E14** — IaC (CDK Java) for the existing stack, `cdk import`, PITR | After E5/E7/E9/E11 define the target state; runbook-first per D1. | L | #9, #17 |
| 27 | **E15** — Dependency modernization (dynamodb fork → SDK v2 enhanced → Boot; Angular LTS ×2, drop SSR) | The fork is the keystone blocker; sequence around F2. | L | #10, #16 |
| 28 | **E17** — OpenAPI + generated TS clients | Ends the third phone-regex copy; ideally after F12. | M | #10, ideally #19 |
| 29 | **W-D4 + PLAN.md residuals + quarter items from spec 03** | Motrio locator, GA4 cross-domain funnel events, og-image, CWV/preconnect/FAQ-schema/design phases. | S–M | various |
| 30 | **G9** — Estimates / payments / real-time booking | Deliberately deferred; revisit only on the evidence gates written in G9. | — | evidence |

---

## Owner decisions — Q&A completed 2026-07-12

All 23 consolidated questions were walked through with the owner. Answers are folded into
the specs (spec 01 §"Answers received", spec 02 "Addendum", spec 03 answers table). Summary:

### Decisions that changed the plan

| Decision | Effect |
|---|---|
| **NIP = 5833538950** | Legal blocks, privacy policy, footer, directory NAP all unblocked — placeholders replaced throughout spec 03 |
| **Facebook: dropped from the site entirely** (neither page) | W-A15 rewritten to *remove* all Facebook references; **W-D3 cancelled**; JSON-LD `sameAs` = Google Maps URL only |
| **Direct close from "Nowe": allowed, with a per-close checkbox** for the completion/review e-mail (cases: could-not-repair, unreachable client) | C3/C5/G4 amended — optional `sendCompletionEmail` body → stored `suppress_completion_email` attribute; admin dialog checkbox (spec 02 Addendum, Q7 delta) |
| **No-shows are rare — receptionist already calls/manually SMSes day before** | **G6 reframed** as chore-automation, not no-show prevention; lower urgency, SMS-first worth considering |
| **Firebird topic deferred** (reachability/permission/version unknown) | **G5 pilot parked**; E13's read-only-user step waits; rest of E13 proceeds |
| **AWS console state: parked** (function names, retention, PITR) | `[TODO(owner)]` placeholders stay in the RUNBOOK; filled at E2/E9 execution time |

### Confirmations (plan proceeds as specified)

- **Credentials mechanism:** `credentials.bat` next to `start.bat` (E3/E4b unblocked).
- **Review e-mail to ALL customers** (G4 variant a), consent copy as drafted, scope **e-mail + SMS** (G1).
- **GA4 behind the Klaro consent banner** (G3/W-C4); one Google account holds Search Console + GBP.
- **Prod secrets differ from committed local values** → E2 rotates the JWT secret only.
- **Site deploys via FTP/SFTP, owner holds credentials** → whole W-A batch deployable; procedure into `DEPLOYMENT.md`.
- **Scraper:** UI only on the shop PC → `127.0.0.1` bind (E12); **ToS risk consciously accepted** (S5 closed).
- **API custom domain approved** (`api.renocar-zgloszenie.pl`) → E7 full form.
- **Ops alarms → both** owner's personal inbox and `info@renocar.pl`; E9 starts by verifying the existing notification e-mail still arrives.
- **No IaC exists anywhere** → E14 starts fresh; stale CDK-named branch deleted during E4.
- **Volumes ~10–20 online submissions/month** → low-volume designs confirmed; kontakt stays signpost-only (G8 option B).
- **Mechanicy:** 301 redirect stands ("whatever ranks better").
- **Motrio:** no member tooling; locator via the parts-distributor rep (W-D4 = one call).

### Still open (parked, nothing urgent blocks on them)

| Question | Waits for | Blocks |
|---|---|---|
| AWS console state: Lambda function names, log retention, PITR [01-OQ2] | owner checks console (or AWS CLI read at execution time) | exact CLI args in E2/E9/E14 — work proceeds with placeholders |
| Firebird: reachability, vendor permission, server version [02-Q2 + 01-OQ5] | owner investigates when ready | G5 pilot, E13 read-only user |
| Plesk "serve static files by nginx" toggle [03-3b] | resolved empirically by W-B1 (deploy `.htaccess`, curl-verify, panel fallback) | nothing |
| GBP Place ID | captured during the W-D1 session | G4's review link |

---

## Reading order for an implementer

1. This file (orientation + ordering).
2. `02-product-and-growth-spec.md` **Part A (C1–C10)** — mandatory before touching F1/F2/F12.
3. The tier you're executing, following each item's link into spec 01/02/03 or the feature plan.
4. Module `CLAUDE.md`s + the repo skills (`backend-lambda-work`, `build-and-test-platform`,
   `refresh-win-package`) for build/test/sync rules — the specs assume them.
