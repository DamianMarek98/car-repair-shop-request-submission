# Renocar — Digital Presence Audit

**Date:** 2026-07-04
**Scope:** renocar.pl (live site + repo source `renocar-webpage/httpdocs/`), renocar-zgloszenie.pl (booking portal), Google Business Profile, social media, Polish directories, Motrio network, local search visibility.
**Business:** RENO CAR — Pogwarancyjny Serwis Renault i Dacia, ul. Andrzeja Struga 8/10A, 80-116 Gdańsk. Tel. 58-520-19-14, 690-182-354, info@renocar.pl. Hours Mon–Fri 8:00–16:00.

Everything below is grounded in fetched pages / search results as of the audit date. Items that could not be verified are explicitly listed in the "Could not verify" section.

---

## 1. TLDR — Issue table

| # | Severity | Category | Issue | Proposed fix |
|---|----------|----------|-------|--------------|
| 1 | **Critical** | Legal / trust | Legal entity data inconsistent and likely outdated: `kontakt` page says "RENO CAR sp. z o.o.", cookie policy says "RENO CAR Trzeciak, Marek Sp. j.", and public KRS records show "RENO-CAR TRZECIAK, MAREK" SP.J. (KRS 0000256043, NIP 9570764905) **w likwidacji**, dissolved eff. 2025-12-31. Same NIP is shown on the site. | Establish the single correct current legal name; update kontakt page, cookie/privacy policy and footer. If it is a sp. z o.o., Polish law (KSH art. 206) requires stating full name, registered office, registry court, KRS, NIP and share capital on business websites/communications — add a proper footer block. Update all directory listings to match. |
| 2 | **Critical** | GDPR / RODO | Google Analytics script loads unconditionally on every page **before any consent**; the cookie bar is a 2012-era info-only banner (single "OK", no reject, no granular consent). No privacy policy exists at all, yet the contact form collects name/e-mail/phone with **no RODO art. 13 information clause**. | Add `polityka-prywatnosci` page (administrator, purposes, legal basis, retention, rights); add RODO clause + checkbox at the contact form; replace the cookie bar with a real consent-management banner (e.g. free Cookiebot/CookieYes tier or Klaro) that blocks analytics until consent. |
| 3 | **Critical** | Analytics | Analytics is dead: pages load legacy `ga.js` with `UA-29684621-1` (classic `_gaq`). Universal Analytics stopped collecting data in July 2023 — the site has had **zero analytics for ~3 years** while still shipping the dead script. | Remove the `_gaq`/ga.js snippet. Install GA4 (or a lighter privacy-friendly tool like Plausible) via Google Tag Manager, wired to the consent banner (Consent Mode v2). |
| 4 | **High** | Google Business Profile | Opening-hours data circulating on Google-Maps-mirror sites (godzinyotwarcia24.pl, pl.near-place.com, pl.polomap.com) shows **Mon–Fri 8:00–17:00**, but real hours have been **8:00–16:00 since January 2022** (per the site's own news post). Strong signal the GBP itself is outdated. GBP rating/reviews/photos could not be verified programmatically. | Claim/verify the profile at business.google.com, correct hours, confirm category "Warsztat samochodowy"/"Auto repair shop", set website to renocar.pl and the **appointment link** to https://renocar-zgloszenie.pl, add photos, start responding to reviews. |
| 5 | **High** | NAP consistency | Old phone numbers **501-512-988 / 501-512-989** still listed on trojmiasto.pl, mapa.targeo.pl and Facebook-derived listings; the website promotes 58-520-19-14 and 690-182-354. Address appears variously as "Struga 8" vs "Struga 8/10A". Business name appears in ≥5 variants ("Reno Car Sp.j. Marek Trzeciak", "RENO CAR TRZECIAK MAREK", ""Reno Car" Zbigniew Marek Jerzy Trzeciak", "RENO CAR sp. z o.o.", "RENO CAR - Pogwarancyjny Serwis Renault"). | Decide one canonical NAP (Name/Address/Phone) and propagate it: GBP, trojmiasto.pl, dobrymechanik.pl, pkt.pl, targeo, firmy.net, cylex, Facebook. Remove/replace dead numbers. |
| 6 | **High** | Technical SEO | `https://renocar.pl/robots.txt` → **404**, `https://renocar.pl/sitemap.xml` → **404**, even though a Google Search Console verification file (`google76f5cd7632d7faa5.html`) is deployed. | Add a simple `robots.txt` (allow all + `Sitemap:` line) and a `sitemap.xml` listing the 6–7 real pages; submit it in Search Console. |
| 7 | **High** | Website bug | Malformed phone links on **every page**: `<a href="tel:+585201914">` — that dials country code **+58 (Venezuela)**, not +48 58. `ofirmie` also has `tel:585201914` (no prefix). Mobile users tapping the landline number get a wrong/failed call. | Change to `tel:+48585201914` (and keep `tel:+48690182354`, which is correct) in all page templates. |
| 8 | **High** | Local SEO | No structured data at all — no schema.org `AutoRepair`/`LocalBusiness` JSON-LD (name, address, geo, hours, phone), on either renocar.pl or the booking portal. | Add one JSON-LD `<script>` block (AutoRepair type) to every page of renocar.pl; include `openingHoursSpecification`, `telephone`, `address`, `geo`, `url`, `sameAs` (Facebook, GBP). |
| 9 | **High** | Branding | `https://renocar.pl/favicon.ico` → **404** and no `<link rel="icon">` in any page. Site shows a blank icon in tabs/bookmarks/Google mobile results (Google shows favicons in mobile SERPs). | Add favicon.ico + PNG icons and `<link rel="icon">` tags. Reuse the Motrio/RENO CAR logo. |
| 10 | **High** | Brand protection | A **same-named competitor exists in Gdańsk**: "RENO CAR ADAMOWICZ MARCIN", ul. Olszyńska 3 (found via Yelp). Customers searching "Reno Car Gdańsk" can land on the wrong workshop. | Make own listings unambiguous (photos, exact address "Struga 8/10A — dojazd od ul. Kartuskiej", booking link). Monitor reviews addressed to the wrong company. |
| 11 | **Medium** | Motrio network | Presence in the motrio.pl workshop locator could not be confirmed: the locator is a JS app, and the only "Reno-Car" detail URL found (`motrio.pl/znajdz-serwis/kontakt/Reno-Car`) returns 404 — note there is an unrelated "Reno-Car" Motrio workshop in Toruń (renocarserwis.pl). Gdańsk competitor RENO ART shows up prominently in Motrio-related results. | Check the locator manually; contact the Motrio/Renault network coordinator to ensure the Gdańsk workshop is listed with correct data. The site uses the Motrio logo, so network listing should be free marketing. |
| 12 | **Medium** | SEO meta | Homepage `<title>` is "RENO CAR - Pogwarancyjny Serwis Renault" — no city, no Dacia. Also no canonical tags on any page, obsolete `meta keywords` still present, header logo links to `https://www.renocar.pl` which 301-redirects back to non-www (needless hop). | Title: "RENO CAR – Serwis Renault i Dacia Gdańsk | Warsztat pogwarancyjny (Motrio)". Add `<link rel="canonical">` per page, drop keywords meta, link to `https://renocar.pl` directly. |
| 13 | **Medium** | Social meta | No Open Graph / Twitter Card tags on renocar.pl — shares on FB/Messenger/WhatsApp render bare. (The booking portal **does** have full OG tags — good.) | Copy the OG pattern already used on renocar-zgloszenie.pl into the static pages. |
| 14 | **Medium** | Content freshness | "Promocje" page still lists offers from **2012–2016** ("25% rabatu na układy hamulcowe / 15 października 2014", "Płyn do spryskiwaczy GRATIS / 29 czerwca 2015", Christmas 2014 notice). Legally, expired promotions displayed without dates of validity can mislead consumers; practically, it screams "abandoned site". | Prune everything older than ~2 years or move to an "Archiwum" section; keep the 2026 online-booking announcement on top. |
| 15 | **Medium** | Content quality | Numerous Polish typos, including in **title tags**: "Profesionalny" (oferta title), "klika słów" (ofirmie title, should be "kilka słów"), "cisteczkach" (cookies title), "istneiej" (homepage news), "Pogwaranycjny" (kontakt, promocje), "samochochodów", "zapozniania", "oferę" (alt text). | One proofreading pass over all 7 pages. Title-tag typos hurt both credibility and keyword matching. |
| 16 | **Medium** | Performance | No gzip/brotli compression (HTML served at identical 16,125 B with and without `Accept-Encoding`), no `Cache-Control`/`Expires` headers on images; `slide02.jpg` is 452 KB; **~22 MB of unreferenced photos** (`img/IMG_2317.jpeg` 5.7 MB, `IMG_2189.jpeg` 5.5 MB, `IMG_2075.jpeg` 3.9 MB, `IMG_1943/1944.jpeg`, `new_building_with_logo.png` 2.4 MB — referenced by nothing) sit on the server; jQuery/Bootstrap-3/bxslider stack loads ~350 KB of JS/CSS. | Enable gzip + `mod_expires` in `.htaccess` (Plesk/nginx supports it); compress slider images to <150 KB WebP/JPEG; delete or exclude unused `img/IMG_*.jpeg` from deploys. |
| 17 | **Medium** | UX / performance | The homepage embeds the **entire Angular booking SPA in a 600-px iframe** (plus a Google Maps iframe), duplicating the dedicated `/umow-sie` page and inflating load. The homepage iframe form is cramped and competes with the "Umów się" nav item. | On the homepage, replace the iframe with a prominent CTA button/banner linking to `/umow-sie` (or renocar-zgloszenie.pl). Keep the iframe only on `/umow-sie`. |
| 18 | **Medium** | Social | Facebook is half-dead/ambiguous: two page IDs found (old `291554670910421` — login-walled; newer `…100071090764943`). On the kontakt page Facebook is **plain text, not a link**, with a typo: "facebook: RENOCAR - Pogwaranycjny Serwis Renault". `ofirmie` embeds the FB Page Plugin with SDK **v2.5 (2015)**. Latest confirmed FB-related site content is from 2012. **No Instagram found at all.** | Identify the current page, link it properly (icon in header/footer), update or remove the embed. Either post occasionally (photos of work, promos) or remove FB references — a visibly dead profile is worse than none. |
| 19 | **Low** | Technical SEO | Orphaned page: `/mechanicy/` returns 200 and is indexable but was removed from navigation (commented out). Old redirects for `/ogloszenia`, `/mapa_strony` exist in `.htaccess` (good). | Either restore "Mechanicy" to the menu (team pages build trust) or 301 it to `/ofirmie`. |
| 20 | **Low** | Directories | dobrymechanik.pl profile is **unclaimed** ("To Twój warsztat?"), shows no website link, "Gotówka" (cash) as the only payment method (site says cash/transfer/card), and "does not offer online appointment scheduling" — while the business actually has an online booking form. firmy.net listing lacks the website link. motointegrator.com and Yelp listings exist but block bots (HTTP 403) — content unverified. | Claim the dobrymechanik.pl profile (free), add website + booking link + payment methods; review motointegrator/Yelp/pkt.pl/cylex listings manually. |
| 21 | **Low** | Booking portal | renocar-zgloszenie.pl: SEO head is **good** (title, description, OG, canonical, `lang="pl"`, favicon), but `robots.txt` and `sitemap.xml` return 404 (S3 `NoSuchKey` behind CloudFront), and analytics presence is unknown. | Add a minimal robots.txt to the S3 bucket. Optional: 1-page sitemap. Consider GA4 event tracking (form started/submitted) once consent tooling exists. |
| 22 | **Low** | Security headers | No HSTS (`Strict-Transport-Security`) header; `cookies-info.js` links to `http://www.renocar.pl/cookies` (double redirect: http→https, www→non-www). | Add HSTS in Plesk/.htaccess; change the hardcoded link to a relative `/cookies`. |
| 23 | **Low** | Maps embed | Homepage/kontakt Google Maps iframe uses a 2015-era embed URL with a zeroed place ID (`!1s0x0000000000000000%3A0x00cd1aee085bdc0f!2sRENO+CAR…4v1449917311874`). It may render a stale or generic pin. | Regenerate the embed from Google Maps ("Share → Embed a map") after claiming/fixing the GBP. |

---

## 2. Detailed findings

### 2.1 Live website — renocar.pl

**Deployment parity:** the live homepage is byte-identical to the repo (`diff` of `curl https://renocar.pl/` vs `httpdocs/index.htm` → no differences). Whatever is fixed in the repo will match production once deployed.

**What is working well (keep):**
- HTTPS is enforced correctly: `http://renocar.pl` → 301 → `https://renocar.pl`; `https://www.renocar.pl` → 301 → `https://renocar.pl` (via `.htaccess` rewrite). HTTP/2 enabled (nginx/Plesk).
- `<meta name="viewport" content="width=device-width, initial-scale=1">` present; responsive Bootstrap grid; a **mobile CTA bar** ("Zadzwoń" / "Umów się") is a genuinely good recent addition.
- Every page has a unique `<title>`, `<meta name="description">` and an `<h1>`; homepage H1 is well targeted: "Profesjonalny Serwis Renault i Dacia w Gdańsku".
- The online booking form is linked prominently: nav item "Umów się", homepage slider CTA, homepage news iframe, kontakt page ("zgłoszenia: renocar-zgloszenie.pl"), and the mobile CTA bar. Booking discoverability **on the site itself** is solved.
- Google Search Console verification file is live (`/google76f5cd7632d7faa5.html` → 200) — Search Console access presumably exists.
- Old URLs 301-redirected in `.htaccess` (`/ogloszenia` → `/promocje`, `/mapa_strony` → `/kontakt`).

**Missing/misconfigured (evidence):**
- `robots.txt`, `sitemap.xml`, `favicon.ico`: all confirmed **404** on the live server; no `<link rel="icon">` in any source file.
- Analytics (all pages, e.g. `index.htm` lines 52–72): `_gaq.push(['_setAccount', 'UA-29684621-1'])` loading `google-analytics.com/ga.js` — a product retired in July 2023. No GA4 (`gtag.js`), no GTM found anywhere in `httpdocs/`.
- Cookie/GDPR: `js/cookies-info.js` is the webhelp.pl snippet ("Ta strona używa ciasteczek (cookies), bez nich działamy gorzej. … OK"). It does not block anything; GA fires regardless. The `/cookies` page is an old-style cookies-only policy naming "**RENO CAR Trzeciak, Marek Sp. j., ul. Andrzeja Struga 8**, 80-116 Gdańsk, NIP: 957-07-64-905" as administrator. There is **no polityka prywatności** and the kontakt form (name, e-mail, phone, message → PHP handler) shows no information clause.
- Legal entity: `kontakt/index.htm` states "RENO CAR **sp. z o.o.** … NIP: 957-07-64-905". Public registries (rejestr.io, imsig.pl, krs-pobierz.pl, aleo.com) show that NIP belongs to "RENO-CAR TRZECIAK, MAREK" SPÓŁKA JAWNA, **KRS 0000256043, w likwidacji**, dissolved effective 2025-12-31. Either the sp. z o.o. claim is premature/wrong, or a transformation happened and the cookie policy + all external listings are stale. Must be reconciled (see checklist).
- Phone links: `tel:+585201914` on index, kontakt, promocje, oferta, umow-sie; `tel:585201914` on ofirmie. Only `tel:+48690182354` is correct.
- Structured data / OG: zero `application/ld+json`, zero `og:` tags in `httpdocs/`.
- Titles/typos: `oferta` title "Oferta: RENO CAR - **Profesionalny** serwis pogwarancyjny od A do Z"; `ofirmie` title "O Firmie: RENO CAR - **klika** słów o serwisie pogwarancyjnym renault"; cookies title "…informacje o **cisteczkach**…"; homepage news "Od teraz **istneiej** możliwość umówienia się…"; kontakt "facebook: RENOCAR - **Pogwaranycjny** Serwis Renault"; homepage "Dlaczego My" box "**Profesionalna** i kompleksowa obsługa **samochochodów**"; homepage kontakt section "**zapozniania** się"; alt text "zobacz **oferę**".
- Content freshness: "Najnowsze ogłoszenie" (Styczeń 2026, online booking) is current — good — but below it and on `/promocje` sit promotions dated 2012–2016 presented as "Promocje i ogłoszenia".
- Footer: "Copyright © SDK | design by SDK" — no year, no company identification of RENO CAR itself.
- Performance: no gzip (verified: identical transfer size with `--compressed`), no cache headers on `images/home-slider/slide02.jpg` (452,907 B). Slider total ≈ 1.16 MB across 6 JPGs. `img/` contains ~22 MB of photos referenced by no page. JS stack: jQuery 95 KB + bootstrap.min.js 37 KB + offcanvas + bxslider; CSS: Bootstrap 3 + style.css + style-modern.css + Font Awesome 4. Homepage additionally boots the whole Angular SPA inside an iframe.
- `mechanicy/` and its nav link are commented out but the URL is live (200, 8,254 B) — an indexable orphan.

### 2.2 Booking portal — renocar-zgloszenie.pl

Fetched raw shell:

```html
<html lang="pl" data-critters-container>
<title>RENO CAR – Umów się | Pogwarancyjny Serwis Renault Gdańsk</title>
<meta name="description" content="Umów wizytę w RENO CAR – Pogwarancyjnym Serwisie Renault w Gdańsku. Wypełnij formularz online i wybierz preferowany termin. Tel. (58) 520-19-14.">
<meta property="og:type" content="website"> … <meta property="og:locale" content="pl_PL">
<meta property="og:image" content="https://renocar.pl/images/logo.png">
<link rel="canonical" href="https://renocar-zgloszenie.pl/">
<link href="favicon.ico" rel="icon" type="image/x-icon">
```

- **Good:** proper title with city, meta description with phone, full OG set, canonical, favicon, `lang="pl"`, font preconnects, critters-inlined CSS. `og:image` target `https://renocar.pl/images/logo.png` verified live (200, 18.5 KB).
- **Gaps:** `robots.txt` and `sitemap.xml` → 404 (`NoSuchKey`, i.e. S3 origin behind CloudFront). Being an SPA, content is invisible to non-JS crawlers, but Googlebot renders JS — acceptable for a single-purpose form. Discoverability strategy should be: main site links (done) + GBP appointment link (**not yet done** — see 2.3). Analytics/conversion tracking presence unknown (shell shows none in the head).

### 2.3 Google Business Profile

Direct programmatic access to Google Maps was not possible; assessment is based on mirror/aggregator sites and search results:

- Listings mirroring Maps data exist: godzinyotwarcia24.pl ("RENO CAR - Trzeciak, Marek Sp.j.", Andrzeja Struga 8), pl.near-place.com, pl.polomap.com ("RENO CAR, Gdańsk — Andrzeja Struga, telefon 58 520 19 14"). A Google-linked entity clearly exists (the site's own Maps embed also targets a "RENO CAR" place).
- **Hours discrepancy:** aggregators state Mon–Fri **8:00–17:00**; the workshop has operated **8:00–16:00 since January 2022** ("Teraz warsztat jest czynny od poniedziałku do piątku w godzinach 8-16." — renocar.pl news). If GBP still says 17:00, customers arriving after 16:00 find a closed shop → 1-star-review material.
- **Name mismatch risk:** mirrors show the old partnership name "RENO CAR - Trzeciak, Marek Sp.j." rather than the customer-facing brand.
- Rating, review count, review responses, photos, posts, website/appointment links: **not verifiable programmatically** — see manual checklist. Third-party review platforms suggest a healthy reputation (trojmiasto.pl: 6.0/6 from 2 reviews, most recent May 2026; dobrymechanik.pl: 11 reviews, top marks) — so collecting Google reviews actively should be easy wins.

### 2.4 Wider presence (directories, social, Motrio)

| Platform | Status | Evidence / notes |
|---|---|---|
| dobrymechanik.pl | Listed, **unclaimed** | "Reno Car Sp.j. Marek Trzeciak • Gdańsk, Struga 8", 11 reviews, "To Twój warsztat?" claim prompt, **no website link**, payment "Gotówka" only, "does not offer online appointment scheduling" (false — booking form exists). Also appears in the recommended list for the Siedlce district. |
| trojmiasto.pl | Listed, partly stale | "Reno Car Trzeciak, Marek Sp.j.", Struga 8; phones **501-512-988, 501-512-989**, 58 520-19-14 (no 690-182-354); website www.renocar.pl; rating 6.0 (2 reviews, latest May 2026); no hours/e-mail. |
| motointegrator.com | Listed, unverified | `motointegrator.com/pl/pl/warsztat/gdansk/84rqzk5-reno-car` — fetch blocked (HTTP 403). Check manually. |
| pkt.pl / biznesfinder | Listed | "Reno Car sp.j. Trzeciak M." (`pkt.pl/firma/reno-car-sp-j-trzeciak-m-1728929`) — old legal name; details unverified. |
| firmy.net | Listed | "Reno Car - Pogwarancyjny Serwis Renault", Struga 8; **no website/e-mail/hours**; shows a 6.0 rating (review count unclear from fetch). |
| cylex-polska.pl | Listed | Name variant ""Reno Car" Zbigniew Marek Jerzy Trzeciak" — yet another NAP variant. |
| Yelp | Listed ×2 (!) | "RENO CAR TRZECIAK MAREK", ul. Andrzeja Struga 8 — plus the **unrelated same-name** "RENO CAR ADAMOWICZ MARCIN", ul. Olszyńska 3, Gdańsk. Fetch blocked (403). |
| mapa.targeo.pl | Listed | Old name + NIP shown; old phones likely. |
| Facebook | Exists, state unclear | Old page ID `291554670910421` (login-walled; autoyas.com mirror shows name, Struga 8, 58 520-19-14, www.renocar.pl, category "Firma motoryzacyjna", "(11)" ratings) and a newer URL `facebook.com/p/RENO-CAR-Pogwarancyjny-Serwis-Renault-100071090764943/`. Site references date from 2012 (promocje post, ofirmie embed with SDK v2.5). Kontakt page mentions Facebook as unlinked text with a typo. |
| Instagram | **Not found** | No Renocar Gdańsk Instagram account surfaced in searches. |
| motrio.pl locator | **Unconfirmed** | Locator (`motrio.pl/nearby-repairers`) is a JS app; the only "Reno-Car" detail page found returns 404. Beware: "Autoryzowany Serwis MOTRIO Reno-Car" in **Toruń** (renocarserwis.pl) is a different company. Gdańsk competitor "RENO ART" (Trakt Św. Wojciecha 253) appears in Motrio-related listings (orlymotoryzacji.pl, yanosik). |
| oferteo.pl / fixly.pl / panoramafirm.pl | **Not found** | No Renocar listing surfaced. Oferteo's "Mechanik Gdańsk" ranking page exists and Renocar is absent from search results for it. Low priority, but free listings = free citations. |

### 2.5 Local search visibility (customer-eye queries)

- "serwis Renault Gdańsk warsztat pogwarancyjny" → **renocar.pl ranked #1** in our results, ahead of dealer Zdunek and competitor RENO ART. Branded and Renault-niche visibility is good.
- "warsztat samochodowy Gdańsk Siedlce mechanik polecany" → results dominated by directories (dobrymechanik.pl, katalog.trojmiasto.pl, pkt.pl, oferteo.pl, motointegrator). Reno Car appears **inside** dobrymechanik's Siedlce recommended list, but its own site does not rank for generic queries. This is normal — generic local queries are won via the **Google Map Pack (GBP)** and directory profiles, which is exactly where the gaps are (issues #4, #5, #20).
- Competitors visible for the same space: RENO ART (renaultgdansk.pl — exact-match domain, Motrio network member), Zdunek (authorized dealer), Tand (Gdynia/Rumia).

---

## 3. Could not verify — check manually

1. **Google Business Profile** (highest value): open Google Maps, search "Reno Car Struga Gdańsk". Verify: exact name shown, category, star rating and review count, whether reviews have owner responses, opening hours (suspected stale 8–17), website link (renocar.pl?), appointment link (should be renocar-zgloszenie.pl), photo count/quality, Q&A, posts. Then claim/manage at https://business.google.com. If the listing still carries the "Trzeciak, Marek Sp.j." name, align it with the current entity.
2. **Current legal status of the company**: confirm at https://wyszukiwarka-krs.ms.gov.pl whether a new "RENO CAR sp. z o.o." exists (new KRS number) and whether NIP 9570764905 carried over (transformation) or a new NIP applies (new entity). All website/legal texts and listings depend on this answer.
3. **Facebook**: log in and check which page is canonical (`291554670910421` vs `100071090764943`), follower count, last post date, correct hours/phones on the page, and merge/retire duplicates via Meta Business Suite.
4. **motrio.pl locator**: open https://www.motrio.pl/nearby-repairers in a browser, search "Gdańsk", confirm whether RENO CAR appears; if not, contact the Motrio network coordinator (via Renault Polska / parts distributor rep).
5. **motointegrator.com listing** (`/pl/pl/warsztat/gdansk/84rqzk5-reno-car`) and **Yelp** listing — blocked to bots (403); verify NAP, rating, and claim if possible.
6. **pkt.pl, targeo, cylex, biznesfinder** entries — verify phones/name; request corrections (all offer free edit/claim flows).
7. **renocar-zgloszenie.pl analytics** — confirm whether any tracking exists; without it there is no data on form abandonment/conversions.
8. **Google Search Console** — confirm the property is actually accessible (the verification file is live), check index coverage and whether `/mechanicy/` is indexed, then submit the new sitemap.
9. **firmy.net rating/review count** — the fetch rendered ambiguously ("6.0" / "611"); confirm actual numbers on the page.

---

## 4. Prioritized action plan

### This week (quick fixes, ~a few hours, all in `renocar-webpage/httpdocs/`)
1. Fix all `tel:` links → `tel:+48585201914` (6 pages) — issue #7.
2. Remove the dead `_gaq`/ga.js snippet from all pages — issue #3 (removal part).
3. Add `favicon.ico` + `<link rel="icon">` — issue #9.
4. Create `robots.txt` and `sitemap.xml`; submit sitemap in Search Console — issue #6.
5. Fix the typos listed in issue #15 (esp. the two title tags and "istneiej" in the current news item).
6. Decide + write the correct legal entity block (kontakt, cookies page, footer) — issue #1 (content part; registry check first, see manual item 2).
7. Turn the kontakt-page Facebook mention into a real link (after manual item 3 identifies the right page).
8. Add JSON-LD `AutoRepair` schema to all pages — issue #8 (30 minutes with a template).

### This month
1. **Claim and fix Google Business Profile** — hours 8–16, website, appointment link → renocar-zgloszenie.pl, photos, category, start replying to reviews (issues #4, #23; regenerate the site's Maps embed afterwards).
2. Claim dobrymechanik.pl (add website, booking, card payments), correct trojmiasto.pl phones, review motointegrator/pkt.pl/cylex/targeo/firmy.net — issues #5, #20.
3. GDPR package: privacy policy page, RODO clause at the contact form, consent banner replacing `cookies-info.js`; only then (optionally) add GA4/Plausible behind consent — issues #2, #3.
4. Prune 2012–2016 promotions; keep the page to 2–3 current items — issue #14.
5. Performance pass: enable gzip + expires headers in `.htaccess`, recompress slider JPGs, delete ~22 MB unused `img/IMG_*.jpeg` from the server, replace the homepage booking iframe with a CTA button — issues #16, #17.
6. Resolve `/mechanicy/` (restore or 301) — issue #19.

### Strategic (quarter+)
1. **Review engine:** after every completed repair, send/hand customers a direct Google-review link (obtainable from GBP "Ask for reviews"). Third-party ratings show customers are happy — capture that on Google, where it drives the Map Pack.
2. **Motrio network visibility:** get listed in the motrio.pl locator; ask about co-marketing (the Motrio logo is already on the site) — issue #11.
3. **Social minimal-viable presence:** one Facebook post per month (completed jobs, seasonal reminders — klimatyzacja, opony, rozrząd). Retire the 2012 FB embed on `/ofirmie` (SDK v2.5) or replace with a plain link — issue #18.
4. **Site modernization (optional):** the Bootstrap-3/jQuery site works; a static-site rebuild would improve speed/maintainability but is lower ROI than everything above. If rebuilt, preserve URLs (`/oferta`, `/kontakt`, …) with 301s.
5. Add HSTS; fix the `http://www.renocar.pl/cookies` hardcoded link — issue #22.
6. Track booking-form conversions on renocar-zgloszenie.pl once consent tooling exists (form started/submitted events) — closes the loop on all of the above.

---

*Audit method: live fetches of renocar.pl (all pages + headers + robots/sitemap/favicon probes), byte-level diff of live homepage vs repo source, raw fetch of renocar-zgloszenie.pl shell, WebFetch of directory listings (dobrymechanik.pl, trojmiasto.pl, firmy.net, autoyas.com, motrio.pl), and web searches for GBP/social/registry data. Ratings and review counts are quoted only where a source actually displayed them; Google's own listing data could not be fetched directly and is flagged for manual verification.*
