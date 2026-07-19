§# Renocar Digital Platform — Business Capabilities Review

> Perspective: business owner / consultant review of what the software lets the business do.
> Date: July 2026. Scope: all modules in this repository, reconciled against `features-development-spec.md` and `features-implementation-plan.md`.
> The end business is Polish — all customer-facing content and features must be in Polish; internal tools already are.

---

## TL;DR

Renocar has a genuinely useful, very low-cost digital foundation: a live online repair-request form, an admin portal where the receptionist tracks requests through a three-stage pipeline, a parts price comparison tool that saves real purchasing time, and an AI assistant that can answer pricing questions from the workshop's own history. What it does **not** have is any digital communication back to the customer: after submitting a request, the customer hears nothing until the shop phones them. There is no confirmation, no status visibility, no appointment record, no reminder, no review ask, and — critically — **no marketing consent**, so the growing list of customer emails and phone numbers cannot legally be used for reminders or promotions. The existing feature plan (confirmation email, appointment date, status link, photo upload) targets exactly the right first gap and should proceed — with one important correction: the plan's assumptions about what the statuses mean no longer match how the live portal actually uses them, and this must be reconciled with the owner before Feature 2 is built. After the planned features ship, the biggest untapped revenue levers are service reminders (seasonal tires, oil, inspections — the data already exists in the on-site Firebird database), Google review generation, and basic funnel analytics (today the business is flying blind: the marketing site carries a dead, decade-old analytics tag and the form has none at all).

---

## 1. Business Capability Map

End-to-end view: **customer acquisition → request intake → scheduling/availability → communication → parts sourcing → data insight.**

### 1.1 Customer acquisition — marketing site (`renocar-webpage/`)

| | |
|---|---|
| **What exists** | Static Polish-language site (renocar.pl): offer pages (mechanical repairs, periodic inspections, electrical, hybrids/EVs, replacement car), a promotions page (e.g. "25% off brakes", oil change, seasonal offers, Motrio parts), team page, about, contact page with its own PHP email form + CAPTCHA, and a prominent "Umów się na wizytę online" page linking to renocar-zgloszenie.pl. Recently restyled to Motrio branding, mobile fixes applied (May 2026). Facebook profile linked. |
| **Completeness** | Functional shop window, actively maintained. But: promotions are hand-edited HTML (updating an offer requires a developer); the analytics tag is the **defunct legacy `ga.js`** (Google killed this format years ago — **no visitor data is being collected at all**); no structured data (schema.org LocalBusiness) for Google Maps/local search; no Google reviews surfaced; contact form leads go to `info@renocar.pl` inbox and **never enter the request pipeline** — a second, disconnected intake channel. |
| **Who uses it** | Customers (read), owner/developer (content updates). |

### 1.2 Request intake — submission portal (`submission-portal/`, live at renocar-zgloszenie.pl)

| | |
|---|---|
| **What exists** | A clean, mobile-friendly Polish form: VIN (optional, "first visit only" — a smart touch), plate number (required), issue description (max 500 chars), first/last name, email, phone (all required), up to 5 preferred visit windows (date + from/to hour, 08:00–16:00) or an "as soon as possible" checkbox, RODO consent. Weekends and shop-blocked days are disabled in the date picker. Submissions go straight to the database via a dedicated fast path; the shop gets an email alert. |
| **Completeness** | The happy path works and is live. Missing: photo upload (planned — Feature 3), any anti-spam protection (only a client-side "one submission per day" browser flag, which also **locks out legitimate customers** — e.g. someone with two cars, or fixing a typo), any confirmation to the customer beyond an on-screen message, and any marketing consent option. Small polish item: the date hint reads "MM/DD/YYYY" (US format) on a Polish form. |
| **Who uses it** | Customers (submit), receptionist (receives the result). |

### 1.3 Scheduling & availability

| | |
|---|---|
| **What exists** | The receptionist can block individual days ("Dostępność warsztatu" calendar in the admin portal); blocked days and weekends disappear from the customer's date picker. Past blocked days are cleaned up automatically. Customers state *preferences*, not bookings. |
| **Completeness** | This is **preference collection, not booking**. There is no slot capacity, no real calendar, and — most importantly — **the agreed appointment date is never recorded anywhere digitally**. The actual booking happens by phone and lives only in the receptionist's head / the on-site workshop-management system. Feature 2 (capture appointment date/time) is planned. |
| **Who uses it** | Receptionist (blocks days), customers (see availability indirectly). |

### 1.4 Communication

| | |
|---|---|
| **What exists** | One-way, shop-facing only: a new submission triggers an email to the shop's subscribed address ("Nowe zgłoszenie od X Y! Obsłuż na portal.renocar-zgloszenie.pl"). All customer communication is by phone. |
| **Completeness** | **The largest gap in the platform.** The customer receives: no confirmation email, no appointment confirmation, no status page, no reminder before the visit, no "your car is ready", no post-visit follow-up or review request, no SMS at any point. Features 1, 2, 12 (confirmation email, appointment email, status link) are planned and directly target this. |
| **Who uses it** | Shop only (today). |

### 1.5 Parts sourcing — price aggregator (`car-parts-scraper/`, `renocar-win-package/`)

| | |
|---|---|
| **What exists** | A local web tool ("RENOCAR Wyszukiwarka Części") on the shop PC: enter an OEM part number, it searches Inter Cars, APCAT and Auto-Partner in parallel using persistent logged-in supplier sessions, and shows a **grouped price/availability comparison** plus per-vendor tabs. Packaged as a self-contained Windows bundle so non-technical staff can run it. |
| **Completeness** | Good at what it does — a real daily time-saver and margin protector for purchasing. Not connected to anything else: no link from a repair request to a parts search, no saved searches/history, no way to turn a comparison into a customer quote. Fragile by nature (breaks whenever a supplier changes their website) — an accepted, reasonable trade-off. |
| **Who uses it** | Receptionist / owner / whoever orders parts. Mechanics indirectly. |

### 1.6 Data insight — AI assistant (`car-repair-shop-ai-chat/`)

| | |
|---|---|
| **What exists** | "Asystent AI Warsztatu": a Polish-language chat that translates natural questions into safe, read-only queries against the **on-site Firebird workshop-management database** and answers with figures (min/average/max prices in zł, sample size, confidence level, and the SQL used). |
| **Completeness** | A working proof that the workshop's historical job/customer data is digitally reachable. Currently a lookup tool (e.g. "what do we usually charge for X"), not a reporting or marketing tool. Runs locally, needs an OpenAI key. **Strategically important:** it proves the data needed for service reminders and customer history exists and can be read. |
| **Who uses it** | Owner / receptionist. |

### 1.7 Request management — admin portal (`repair-requests-portal/`)

Covered in detail in §3. Receptionist-facing, JWT login (a single shared account), request list + detail + status pipeline + availability calendar.

**Who does what — summary:** customers touch the marketing site and the form; the receptionist touches the admin portal, the parts tool and the phone; the owner touches everything plus the AI assistant; **mechanics touch nothing** — the digital platform ends at the reception desk, and the workshop floor runs on the separate on-site management system (the Firebird DB).

---

## 2. Customer Journey Analysis

The journey as actually implemented, step by step:

1. **Discovery.** Customer finds renocar.pl (or Facebook, or Google). The site presents the offer and promotions well in Polish and pushes two actions: call, or "Umów się online". *Friction: no visible Google reviews or ratings — the strongest trust signal for a local workshop is absent. No analytics means the business has no idea which channel brings customers.*
2. **Choosing to book online.** "Umów się" leads to renocar-zgloszenie.pl. *Reasonable hand-off; the Motrio branding is consistent since the May 2026 restyle.*
3. **Filling the form.** All required data is sensible and minimal; VIN is cleverly optional ("first visit only"); preferred visit windows respect the shop's blocked days. *Friction: description limited to 500 characters with no photo option — "there's a noise" cases lose exactly the information a photo/video would carry (Feature 3 addresses photos). Minor: the "MM/DD/YYYY" hint.*
4. **Submission.** On success: an on-screen Polish thank-you ("we received your request and will contact you") and a link to the contact page. On failure: "try again or call us."
5. **Then — silence.** This is the dead end. As implemented today:
   - **No confirmation email or SMS.** The customer has no proof the request exists, no reference number, nothing to search their inbox for. ("Did it go through?" calls are the predictable symptom.)
   - **No status visibility.** There is no way to check progress; the tokenised status link is planned (Feature 12) but not built.
   - **The customer cannot submit again the same day** — the browser flag from step 4 blocks the form for the rest of the day, even to fix a mistake or add a second car.
   - **The next contact is a phone call from the shop**, at a time of the shop's choosing. If the customer misses the call, there is no digital fallback.
6. **The visit.** Agreed entirely by phone. The agreed date/time is never echoed back to the customer digitally — no confirmation, no calendar invite, no day-before reminder. *No-show risk is entirely unmanaged.*
7. **After the visit.** Nothing. No "thank you", no invoice/summary, no review request, no reminder about the next inspection or seasonal tire change. **The relationship ends until the customer remembers to come back.**

**Bottom line:** the digital journey is one-way and ends at the moment of submission. Everything the customer experiences afterwards is analog. Features 1/2/12 convert steps 5–6 from silence into a normal digital experience; nothing planned yet addresses step 7, which is where repeat revenue lives.

A second, quieter dead end: a customer who uses the **contact form on renocar.pl** instead of the request form sends an email to `info@renocar.pl` that never appears in the portal, has no status, and depends entirely on inbox discipline.

---

## 3. Back-Office Journey (Receptionist)

1. **Alert.** An email arrives: "Nowe zgłoszenie od [name]! Obsłuż na portal…". No request details in the email — the receptionist must log in to see anything. *Acceptable at low volume; forces a login round-trip per request.*
2. **Login.** One shared username/password for the whole shop (single in-memory account). *No individual accounts, no trace of who handled what. Fine for one receptionist; a limitation the day a second person or the owner also works the queue.*
3. **The queue.** A paginated table (name, VIN, plate, status, submitted date) with colour-coded statuses: yellow = Nowe, grey-blue = Umówiono, green = Zakończono. *Works, and after the June fixes is no longer artificially slow. But there is **no search or filter** — no way to find "the request from Mr. Kowalski" or "all requests for plate GD12345" except paging through. No filter by status either, so completed requests share the list with new ones forever.*
4. **Working a request.** The detail view shows everything the customer entered, including preferred visit windows. The receptionist then: **picks up the phone**, negotiates a date, and — in the current UI — clicks "Obsłużone" (moves the request to "Umówiono") and later "Wizyta odbyta" (moves it to "Zakończono").
   - **The agreed date/time cannot be recorded.** There is no field for it, no note field, nothing. The actual appointment lives in the on-site workshop system or on paper. The portal only knows "a booking happened at some point".
   - **No way to annotate anything** — "customer prefers afternoon", "waiting for parts", "left voicemail twice" have no home.
   - **No way to edit or correct** customer data (typo in phone number = call fails = dead lead).
   - **A note on naming (important for the feature plan):** in the code, the status the UI calls "Umówiono" (booked) is the enum `HANDLED`, and "Zakończono" (completed) is the enum `APPOINTMENT_MADE`. The June 2026 "Fix status mapping" commit aligned the *labels* with actual shop usage, but the internal names now mean the opposite of what they say. See §5 — this directly affects planned Feature 2.
5. **Availability.** The receptionist can block days (holidays, full days) on a calendar, which immediately hides them from the public form. *Simple and effective. But it is day-granularity only — a half-day closure or a fully-booked-but-open day cannot be expressed.*
6. **Where the digital process ends and analog begins:** phone negotiation (step 4), the appointment record itself, parts ordering paperwork, the repair itself, invoicing, payment, and all post-visit contact. The portal is, in effect, a **shared digital inbox with three statuses** — valuable, but a thin slice of the receptionist's actual workflow, which spans the portal, the phone, the on-site Firebird-based system, the parts tool, and supplier calls.

---

## 4. Gaps & Missed Revenue Opportunities (ranked)

1. **No customer-facing communication (confirmation, appointment, status).** Costs trust, generates avoidable inbound calls, and undermines the whole point of "online booking". *Already planned (Features 1, 2, 12) — right call, ship it first.*
2. **No marketing consent, no customer database.** The RODO checkbox covers only registration/repair/communication about the request — **the shop cannot legally email or text promotions or reminders to the very customers it already has.** Every submission collects a name, email, phone, and car — and then treats it as a one-off ticket. This one missing checkbox (plus a simple customer view) blocks levers 3, 4 and 5 below. Cheap to fix at intake; expensive to backfill later.
3. **No service reminders.** Seasonal tire changes, oil changes, annual inspections (przegląd rejestracyjny) are the classic recurring-revenue engine of a Polish workshop — predictable, high-margin, and appreciated by customers. The on-site Firebird DB holds the service history and dates; the AI-chat module proves it is readable. Nothing in the current platform or the plan touches this. **This is the single largest untapped revenue lever in the whole review.**
4. **No review generation.** No post-visit "oceń nas w Google" email/SMS. For a local business, Google review count/rating is arguably the highest-ROI marketing asset available, and the trigger event ("Zakończono" click) already exists in the portal.
5. **No analytics anywhere.** Dead legacy GA tag on the marketing site, nothing on the form, no funnel numbers (visits → submissions → bookings → completed), no request-volume trend for the owner. Decisions about all the above are currently guesses. Fixing this is near-zero cost (GA4/Plausible tag + a simple monthly count from the request table, where statuses and timestamps already exist).
6. **No-shows unmanaged.** No appointment record (yet) means no day-before reminder possible. Once Feature 2 lands, an SMS/email reminder is a small step with direct revenue protection (an empty bay hour is unrecoverable).
7. **No quote/estimate delivery.** The parts tool finds prices, the AI tool knows historical labour prices — but no way to send the customer a written estimate to approve. Digital estimates close jobs faster and lift average order value (documented upsell: "while it's open, the brake fluid is due").
8. **Two disconnected intake channels.** The renocar.pl contact form bypasses the pipeline entirely. Either point it into the same request flow or clearly separate its purpose (general questions only).
9. **No anti-spam / abuse protection on the public form.** Not a revenue lever but a business-continuity risk: one bot burst pollutes the queue and (after Feature 1) burns email-sender reputation. The spec flags this (§8.6) but leaves it out of scope — it should ride along with Feature 1.
10. **Online payment / deposits.** Common for premium slots or ordered-in parts (deposit reduces no-show on special-order jobs). Worth considering only after 1–7; likely low priority at this shop's scale.
11. **Real-time slot booking.** The full "pick a free slot like at the hairdresser" experience. High effort, and dangerous while the source of truth for the calendar is the on-site system — double-booking risk. Preference-based intake + fast confirmation (the current model plus Features 1/2) is a sensible interim; revisit only with evidence (analytics!) that customers abandon due to lack of instant booking.

---

## 5. Assessment of the Existing Feature Plan

**Overall verdict: the plan targets the right first problem (customer silence), sequences it sensibly, and its engineering-level self-criticism is unusually honest. Proceed — with three corrections and two additions.**

What is right:
- **Priorities.** Confirmation email (F1) → appointment capture (F2) → status link (F12) → photos (F3) is the correct value order. F1 alone removes the worst trust gap for cents per month. Starting SES verification on day 1 (the long-lead item) is correctly identified.
- **Cost discipline.** Skipping WAF, accepting rare duplicate emails, using pre-signed S3 uploads — all appropriately sized for tens of requests a day.
- **The plan already caught the key product risk itself** (spec §2.7.6): if staff must enter the appointment both here and in the on-site system, they will stop using one of them. That validation-with-the-owner gate should be treated as mandatory, not optional.

What to correct:
1. **The status-semantics assumption in Feature 2 is now wrong and must be reconciled first.** The spec (§0.5, B1) assumed `APPOINTMENT_MADE` = "Umówiono" (booked) and `HANDLED` = "Zakończono" (closed), and B1 was "fixed" that way. But a later commit ("Fix status mapping", June 23) re-swapped the labels to match how the shop actually works: today the live portal shows **`HANDLED` = "Umówiono" (booked)** and **`APPOINTMENT_MADE` = "Zakończono" (visit completed)**, and the action buttons follow that flow (NEW →"Obsłużone"→ booked →"Wizyta odbyta"→ done). Feature 2's entire design (set the appointment date when entering `APPOINTMENT_MADE`; customer email on transition to `APPOINTMENT_MADE`) is built on the old assumption — implemented as written, it would email customers an "appointment confirmed" message **when their visit is already over**. Before any Feature 2 work: sit with the owner, agree the pipeline in Polish words (proposal: Nowe → Umówiono (+date) → Zakończono), then rename the internal statuses to match once, everywhere. This is exactly the "confirm the definition of done with the shop owner" warning from the spec's own B1.3 — it materialised.
2. **Pull anti-spam into scope alongside Feature 1.** The spec itself notes (§8.6) that emailing on every submission makes the unprotected public endpoint more expensive to abuse (bounce rate → SES account suspension → *all* customer email stops). A simple CAPTCHA/turnstile + server-side throttle is a day of work and protects the flagship feature.
3. **Add one line to Feature 1's scope: a marketing-consent checkbox on the form (optional, separate from RODO).** The form and both write paths are already being touched for these features; adding one boolean now costs almost nothing and legally unlocks reminders and promotions later (gap #2). Retrofitting consent onto past customers is practically impossible.

What to re-order or trim:
- **Feature 3 (photos) is correctly last and could be deferred without much loss.** It improves triage quality but drives no revenue and carries the most operational risk surface (uploads, CORS, retention). Ship 1/2/12, then reassess.
- **Feature 12 could be simplified if needed:** with F1+F2 emails in place ("received" and "booked for [date]"), a status *page* adds modest incremental value at this volume. Keep it (it is cheap and reduces calls), but it is the first candidate to cut if time is short.
- **Reconsider D1 (no infrastructure-as-code) only lightly:** for a one-developer side platform, the documented runbook is a defensible choice; the real risk is bus-factor, not tooling. Keep the runbook discipline the plan already prescribes.

What is missing from the plan (business view):
- **Nothing in the plan builds toward repeat revenue** (reminders, reviews, customer history). Understandable for this iteration — but the owner should know the plan fixes the *first visit* experience only. Recommendations §8 covers the follow-on.
- **No measurement.** None of the features includes a success metric (fewer "did it arrive?" calls? fewer no-shows?). Adding basic analytics (gap #5) before/alongside would let the owner see whether the investment worked.

---

## 6. Cost & Value Notes

**Where the setup is well matched to a small-business budget:**
- **Serverless was the right migration.** At tens of requests per day, API Gateway + Lambda + DynamoDB + SNS costs effectively pocket change versus a permanently running server; there is nothing to patch or babysit. The deliberate split of the submit path into a small, fast Lambda keeps the customer-facing form responsive.
- **The planned features stay in the same cost class.** SES email is $0.10 per 1,000; S3 photo storage with a 120-day expiry is cents; the plan explicitly avoids the only real fixed cost (WAF, ~$5+/month) in favour of free throttling. Correct instincts throughout.
- **Static marketing site on cheap hosting** and a **local, free-to-run parts tool** (supplier logins the shop already has) both fit the budget profile.

**Where investment would pay back:**
- **A few days of "communication" work (Features 1/2/12) buys a professional customer experience** for near-zero recurring cost — the best value-for-money item on the table.
- **SMS costs money but earns it back.** Unlike email, SMS in Poland costs real (small) money per message — and is the channel Polish customers actually read for appointment reminders. One prevented no-show pays for months of SMS.
- **Recurring costs to watch:** the AI assistant's OpenAI usage (per-query, small but real — fine as an on-demand tool, watch it if it becomes a daily habit) and the scraper's hidden cost, which is maintenance time whenever a supplier site changes (budget a few hours per quarter, or accept downtime).
- **Bus-factor is the real "cost" risk, not AWS.** No IaC, manual console deployments, one developer. Cheap mitigation: keep the runbook current (the plan already mandates this) and store credentials/config where the owner can hand them to a substitute developer.
- **Do not over-invest in:** provisioned Lambda concurrency, WAF, CloudFront for admin photo viewing, or real-time booking infrastructure — all disproportionate at current volume.

---

## 7. Open Questions for the Owner

Facts the code cannot reveal, needed to prioritise correctly:

1. **Volume & conversion:** how many online requests arrive per week? What share convert to actual visits? What share of all bookings come by phone vs the form? (No analytics exists to answer this — see gap #5.)
2. **The status workflow, in your words:** what do "Obsłużone" / "Umówiono" / "Wizyta odbyta" / "Zakończono" mean at the front desk today? (Needed to resolve the Feature 2 semantics issue, §5.1.)
3. **Double entry tolerance:** would the receptionist enter the agreed appointment into this portal *in addition to* the on-site system? If not, is read-integration with the on-site system feasible instead?
4. **The on-site system:** what is it (the Firebird-based application), does it have export/reminder features already, and does its licence allow integrations? Can it produce the data needed for service reminders (last visit, mileage, inspection dates)?
5. **Motrio network:** does Motrio provide member workshops any tooling — booking, CRM, marketing campaigns, review programs, parts pricing? (No point building what the network gives away.)
6. **Staffing:** who besides the receptionist would use the portal? Is a single shared login acceptable for the next year?
7. **No-shows:** how frequent are they, and how costly? (Determines the urgency of reminders/SMS.)
8. **Marketing spend & channels:** is anything spent on Google/Facebook ads or local SEO today? How do customers say they found the shop?
9. **Seasonality:** how large are the tire-change peaks, and are customers turned away then? (Determines the value of capacity-aware scheduling vs simple day-blocking.)
10. **Reviews:** current Google rating/count, and any past attempts to solicit reviews?
11. **Contact-form leads:** how many messages arrive via the renocar.pl contact form, and what happens to them?
12. **Legal:** who is the shop's reference for RODO questions (consent text, retention), and is there a privacy policy owner?

---

## 8. Recommendations (Top 10, ranked by expected business value vs. effort)

1. **Ship the planned communication features (1 → 2 → 12), but resolve the status-meaning question with the owner first.** These features fix the platform's biggest weakness — post-submission silence — for negligible running cost. Before Feature 2, agree in plain Polish what each pipeline stage means and align the software to it once; otherwise the appointment email will fire at the wrong moment (§5.1). Start SES verification immediately, as the plan says.
2. **Add an optional marketing-consent checkbox to the form now, while it is being touched anyway.** One checkbox and one stored field legally unlock every future reminder and promotion to the customer base the shop is already collecting. Delay makes the existing base permanently unusable for marketing. Effort: hours. Value: enables recommendations 4, 5 and 7.
3. **Install working analytics and a simple monthly numbers habit.** Replace the dead `ga.js` tag with GA4 (or a lightweight Polish-friendly alternative like Plausible), add it to the submission portal, and count monthly: visits → submissions → booked → completed (statuses and timestamps already exist in the database). Effort: a day. Value: every other decision on this list stops being a guess.
4. **Launch a post-visit Google review request.** When a request is marked "Zakończono", send a short Polish email (later SMS) thanking the customer with a direct "oceń nas w Google" link. Review volume is the highest-leverage local marketing asset a workshop can own, the trigger event already exists in the portal, and the SES groundwork from Feature 1 makes it a small increment.
5. **Pilot service reminders using data the shop already has.** Start manually: once a season, pull due customers (tire change, inspection anniversaries) from the on-site Firebird system — the AI-chat module proves the data is readable — and send a Polish reminder to consented customers. If the manual pilot fills bays, automate it. This is the largest untapped recurring-revenue lever in the business (§4.3).
6. **Protect the public form (anti-spam) alongside Feature 1.** A CAPTCHA/Turnstile plus server-side throttling defends the request queue and, more importantly, the email-sender reputation that all customer communication will depend on. Replace the client-side "one per day" block (which locks out legitimate customers) with this real protection. Effort: ~a day.
7. **Add appointment reminders once Feature 2 lands.** A day-before email — and ideally SMS, which Polish customers reliably read — against the newly captured appointment date. Directly attacks no-shows; one saved bay-hour per month more than covers SMS costs. Keep it to a single, polite Polish message with the shop's phone number.
8. **Give the receptionist search, status filtering, and a notes field.** Find-by-name/plate, filter "Nowe only", and a free-text note ("left voicemail", "waiting for parts") on each request. Small, unglamorous changes that remove daily friction in the tool's most-used screen and reduce things held in one person's memory. Effort: days.
9. **Unify or clarify the second intake channel.** Point the renocar.pl contact form into the same request pipeline (or clearly relabel it "general questions only" and keep bookings on the form). Every lead should land where statuses, alerts and — soon — confirmations exist, not in a shared inbox. Effort: small.
10. **Turn parts comparison into customer-facing estimates (later, after 1–7).** A simple "build an estimate" step on top of the scraper's grouped results plus known labour prices, emailed as a PDF for customer approval. Speeds up job acceptance and lifts average order value through documented add-ons. Meaningful effort — validate demand with the owner first, and check whether Motrio or the on-site system already offers quoting (open question #5/#4).

---

*Sources: repository code as of July 2026 — `submission-portal/`, `repair-requests-portal/`, `car-repair-shop-backend/` (shop, submit consumer, notification Lambda), `car-parts-scraper/`, `car-repair-shop-ai-chat/`, `renocar-webpage/httpdocs/`, root `CLAUDE.md`, `features-development-spec.md`, `features-implementation-plan.md`.*
