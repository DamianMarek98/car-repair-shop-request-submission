# Digital-Presence Implementation Spec — renocar.pl

**Spec ID:** 03
**Date:** 2026-07-11
**Author:** Senior web developer / local-SEO consultant
**Primary input:** `docs/renocar-digital-presence-audit.md` (23 ranked issues + §4 action plan)
**Authoritative owner answers:** `docs/consultancy-summary.md` §"Owner answers received (2026-07-04)"
**Site source:** `renocar-webpage/httpdocs/` (static HTML + Bootstrap 3 + jQuery + bxSlider, one PHP contact form under `kontakt/`; Plesk-style hosting, document root = `httpdocs`; all content Polish; **no build system — none introduced by this spec**)

Every file/line reference below was verified against the working tree on 2026-07-11 and
**re-verified 2026-07-19 against branch `motrio-2026-adjustments`** (the implemented
Motrio restyle — see the new §0.4 for what that branch changed and how it interacts with
the items below). Where reality differed from the audit, the spec follows reality and
flags the difference (see §0.2). Spec language is English; all site copy, legal text and typo corrections are
in Polish, ready to paste.

> **Encoding warning (module CLAUDE.md):** all pages are UTF-8 with Polish diacritics.
> After every edit, re-open the file and visually verify `ą ć ę ł ń ó ś ź ż` render
> correctly. Do not let an editor re-save in a different encoding.

---

## 0. Ground truth

### 0.1 Reconciliation with `renocar-webpage/PLAN.md` (single-plan rule)

`renocar-webpage/PLAN.md` (2026-05-09) predates the audit. Its **Phase 1 is already
implemented** in the working tree — do not redo it. Verified applied:

| PLAN.md item | Status in `httpdocs/` today |
|---|---|
| 1.1 H1 fix | Done — the single `<h1>` is now the Motrio hero title (`index.htm:207`); the pre-restyle body `<h1>` was demoted to `<h2 class="heading-normalcase">` (`index.htm:367`); columns are `<h2 class="section-nav-title">` |
| 1.2 tel: wrapping | Done, **but with the wrong prefix** — see W-A1 (audit issue #7 supersedes) |
| 1.3 slider `alt` + orphaned `</a>` | Done — `index.htm:217–227` all slides have `alt`, no orphans |
| 1.4 `type="tel"` on contact form | Done — `kontakt/index.htm:208` |
| 1.5 logo `http://`→`https://` | Done on the 7 main pages (they now link `https://www.renocar.pl` — see W-A6 for the residual www hop); `mechanicy/index.htm` still `http://` (moot after W-A12) |
| 1.6 bxSlider CSS into `<head>` | Done — `index.htm` head |
| 1.7 duplicate jQuery on kontakt | Done — only `kontakt/index.htm:300–301` remain |
| 1.8 contradictory header hours | Done on main pages (single "Pon - Pt: 8.00 - 16.00"); `mechanicy/index.htm:137–139` still has the old double hours (moot after W-A12) |
| 1.9 `.htaccess` RewriteEngine order | Done — `RewriteEngine On` is line 1 |
| 1.10 `meta robots` `index, follow` | Done on all 8 pages |
| R1, R2 review fixes | Done |
| R3: cookies-page mechanicy nav uncommented | **Fixed since** — now commented out (`cookies/index.htm:96–98`) |
| R3: `ofirmie` body "8.00 do 17.00" | **Still open** — absorbed into W-A8 |
| R3: `ofirmie` dead `../cennik` footer link | **Still open** — absorbed into W-A10 |

**PLAN.md items superseded/duplicated by this spec** (this spec is now the source of
truth for them): 2.1 GA4 (→ W-C4), 2.2 JSON-LD (→ W-A5), 2.3 robots.txt / 2.4 sitemap
(→ W-A4), 2.5 OG tags (→ W-A7), 2.6 canonical (→ W-A6), 3.1 consent banner (→ W-C3),
3.2 footer entity/hours (→ W-A9/W-A10), 3.3 GBP (→ W-D1), 3.5 promotions archive
(→ W-A11), 5.3 typos (→ W-A8).

**Corrections to PLAN.md carried into this spec:**
- PLAN.md's robots.txt/sitemap/canonical snippets use `https://www.renocar.pl/…`.
  That is **wrong**: `.htaccess` 301-redirects www→non-www, so the canonical origin is
  `https://renocar.pl`. All URLs in this spec are non-www.
- PLAN.md's robots.txt disallows `/js/`, `/lightbox/`, `/font-awesome/`. Do **not** —
  Google must fetch CSS/JS to render pages; blocking them harms mobile-friendliness
  evaluation. W-A4 uses a minimal disallow list.

**PLAN.md items NOT covered by the audit and still open** (remain owned by PLAN.md;
execute after this spec's items): 2.7 preconnect hints, Phase 4 CWV work (image
dimensions, `fetchpriority`, `defer` — *partially done: the Motrio restyle already
`defer`s `lightbox.min.js` on `oferta/`+`ofirmie/`, fixing a pre-existing "jQuery is not
defined" breakage* — WebP `<picture>`, iframe `title`, hamburger `aria-label`),
3.4 reviews section, 5.1 FAQ schema, 5.2 pricing table. **PLAN Phases 6–7 (design
modernization) are superseded — the Motrio restyle (§0.4) delivered the design
modernization on Bootstrap 3**; only the optional Bootstrap 5 migration idea remains,
deliberately unplanned. W-B2 (image compression) partially overlaps PLAN 4.4 and takes
precedence for the slider files.

### 0.2 Discrepancies: audit vs. actual files (spec follows reality)

1. **Bad tel: links also on `cookies/index.htm`** (`cookies/index.htm:68`) — audit
   listed only index/kontakt/promocje/oferta/umow-sie/ofirmie. 8 files affected, not 6.
2. **`ofirmie` has three prefix-less/wrong links, not one**: `tel:+585201914` (line 148),
   `tel:585201914` (line 506), **and `tel:690182354` (line 508)** — the last one wasn't
   in the audit.
3. **`mechanicy/index.htm` has no tel: links at all** — old header template with
   plain-text phone and the contradictory "10.00 - 16.00" hours (pre-PLAN-Phase-1
   markup). Moot after the 301 (W-A12).
4. **`img/new_building_with_logo.png` (2.4 MB) is not entirely unreferenced**: the copy
   at `httpdocs/img/new_building_with_logo.png` is unreferenced (delete), but an
   identical 2,437,273-byte copy at `httpdocs/ofirmie/img/new_building_with_logo.png`
   **is live** on `ofirmie/index.htm:382,384` — it must be compressed, not deleted
   (W-B2).
5. **`/mechanicy/` has no team content** — body is a placeholder: "Dział w trakcie
   aktualizacji, zapraszamy za klika dni." (`mechanicy/index.htm:344`, typo included).
   This decides restore-vs-301 in favour of **301** (W-A12).
6. **Every nav/footer "Mechanicy" link is already commented out on all 8 pages**
   (re-verified 2026-07-19: `index.htm:172–174`, `oferta:89–91`, `ofirmie:194–196`,
   `promocje:169–171`, `kontakt:85`, `umow-sie:85`, `cookies:96–98` + footer
   equivalents, e.g. `index.htm:723–726`; the comment markers sit on their own lines, so
   a plain grep shows the links as seemingly active — check the surrounding lines) — the
   PLAN-era note about the cookies page being uncommented is outdated.
7. **`.htaccess` is already in the corrected order** (RewriteEngine first) — PLAN 1.9
   applied; audit text describing its content otherwise matches (272 bytes: SSL/www
   rewrite + two legacy redirects; no compression/caching/HSTS).
8. **Slider alt/typos partially fixed since audit**: slider images now have `alt`
   attributes and "Profesjonalna" is spelled correctly in slide titles. The remaining
   typos are exactly the ones listed in W-A8 (all re-verified with line numbers).
9. **Header hours are already unified** on the 7 main pages; only `ofirmie` body text
   (line 370, "8.00 do 17.00") still contradicts real hours.
10. Homepage `meta robots` is already `index, follow` (ANALYSIS.md's "non-standard
    `all`" note is stale).

### 0.3 Canonical business data (single source of truth for every item below)

| Field | Value |
|---|---|
| Legal entity | **Renocar Zbigniew Marek** (owner-confirmed 2026-07-04) |
| NIP / registration | **NIP 5833538950** (owner-confirmed 2026-07-12; the site's old 957-07-64-905 belonged to the dissolved sp.j. — remove everywhere) |
| Brand | RENO CAR – Pogwarancyjny Serwis Renault i Dacia |
| Address | ul. Andrzeja Struga 8/10A, 80-116 Gdańsk |
| Phones | +48 58 520 19 14 (landline), +48 690 182 354 (mobile) |
| E-mail | info@renocar.pl |
| Hours | pon.–pt. 8:00–16:00 |
| Web | https://renocar.pl (canonical, non-www) |
| Booking | https://renocar-zgloszenie.pl |
| Geo | 54.34786, 18.60654 (from the existing Maps embed) |
| Facebook | **none — dropped from the site** (owner decision 2026-07-12; two stray page IDs exist: `291554670910421`, `…100071090764943`) |
| Payment | gotówka, karta płatnicza, przelew (per `ofirmie/index.htm:368`) |

The 8 editable pages (header/footer duplicated per page — **no templating; every
sitewide change must be applied to each file**):
`index.htm`, `oferta/index.htm`, `ofirmie/index.htm`, `kontakt/index.htm`,
`promocje/index.htm`, `umow-sie/index.htm`, `cookies/index.htm`, `mechanicy/index.htm`
(the last one is removed by W-A12). W-C1 adds `polityka-prywatnosci/index.htm`.

### 0.4 Motrio restyle delta (branch `motrio-2026-adjustments`, implemented 2026-07)

After this spec was written, the site was restyled to Motrio branding. Canonical record
of that work: **`renocar-webpage/specification-motrio.md`** (Phases 1–3 + QA fixes +
branch-vs-main regression review, all marked DONE) and `renocar-webpage/motrio-analysis.md`
(vision). All line references in this spec were **re-verified 2026-07-19 against that
branch**. **Execute every W-A/W-B/W-C item on top of the restyle branch** — it touched
the same 7 page files plus `css/style-modern.css`; branching from the pre-restyle `main`
will conflict on merge. (`mechanicy/index.htm` was deliberately not restyled — moot
after W-A12.)

What the restyle changed that this spec's items touch:

1. **Every page (now including `cookies/`) gained** a header "Autoryzowany Partner
   Motrio" badge + a red "Umów się" header CTA (both new-tab; CTA →
   renocar-zgloszenie.pl), a footer "Część sieci Motrio" badge (`.footer-partner` div),
   and the **persistent dual CTA bar on desktop + mobile** (was mobile-only, and absent
   from `cookies/`; carries a *correct* `tel:+48690182354`). Body line numbers shifted
   accordingly; `<head>` line numbers are unchanged except on `cookies/`.
2. **`cookies/index.htm` now loads `css/style-modern.css`** (line 17 — a pre-existing
   omission fixed by the restyle QA), shifting its lines after 16 by +1.
3. **Homepage hero rebuilt** (`index.htm` ~200–212): full-bleed rotating `.mt-hero`
   with a new single `<h1 class="mt-hero__title">` (line 207) and its own booking CTA;
   the former body `<h1>` is now `<h2 class="heading-normalcase">` (line 367).
4. **`h1`/`h2` render bold + UPPERCASE site-wide** (Phase-1 tokens; visual transform
   only — source text unchanged). Any new page (W-C1) inherits this.
5. **kontakt submit button** is now `btn btn-lg btn-primary` (red pill),
   `kontakt/index.htm:215`.
6. **`lightbox.min.js` is now `defer`red** on `oferta/` + `ofirmie/` (regression-review
   fix for a pre-existing "jQuery is not defined" breakage).
7. **`promocje/`**: two announcements with malformed markup ("Serwis klimatyzacji",
   "Płyn do spryskiwaczy…") got their missing `.news-wyd` opening divs — all entries
   are now well-formed cards, which makes W-A11's whole-block deletions cleaner.
8. **`.btn-primary` is now a pill** (border-radius 999px) — W-A13's replacement CTA
   renders as a Motrio-style red pill with no extra work.

---

## W-A — Code changes in `httpdocs/` (repo-editable; deploy = upload)

### W-A1 — Fix broken `tel:` links (+48 prefix)

- **Audit issues:** #7 | **Severity:** High | **Effort:** S | **Dependencies:** none
- **Files & exact occurrences** (11 wrong links in 8 files):

| File | Line | Current | Change to |
|---|---|---|---|
| `index.htm` | 126 | `tel:+585201914` | `tel:+48585201914` |
| `index.htm` | 630 | `tel:+585201914` | `tel:+48585201914` |
| `oferta/index.htm` | 65 | `tel:+585201914` | `tel:+48585201914` |
| `ofirmie/index.htm` | 148 | `tel:+585201914` | `tel:+48585201914` |
| `ofirmie/index.htm` | 506 | `tel:585201914` | `tel:+48585201914` |
| `ofirmie/index.htm` | 508 | `tel:690182354` | `tel:+48690182354` |
| `kontakt/index.htm` | 61 | `tel:+585201914` | `tel:+48585201914` |
| `kontakt/index.htm` | 179 | `tel:+585201914` | `tel:+48585201914` |
| `promocje/index.htm` | 123 | `tel:+585201914` | `tel:+48585201914` |
| `umow-sie/index.htm` | 61 | `tel:+585201914` | `tel:+48585201914` |
| `cookies/index.htm` | 68 | `tel:+585201914` | `tel:+48585201914` |

  (`tel:+48690182354` occurrences elsewhere are already correct — leave them, including
  the ones the Motrio restyle added in the CTA bar on every page. **Trap:**
  `kontakt/index.htm:179` holds a wrong landline link *and* a correct mobile link on the
  same line — fix only the landline half.)
- **Verification:** `grep -rno 'tel:[^"]*' httpdocs --include='*.htm' | grep -v vendor | grep -v 'tel:+48'`
  must return nothing (the `-o` matters: a line-level grep would silently pass a wrong
  link sharing a line with a correct `tel:+48…` one, as on `kontakt:179`). On a phone,
  tap the landline link on `/kontakt/` — dialer must show +48 58 520 19 14, not +58….

### W-A2 — Remove the dead `_gaq`/ga.js analytics snippet

- **Audit issues:** #3 (removal half; GA4 install is W-C4) | **Severity:** Critical | **Effort:** S | **Dependencies:** none
- **Files & snippet location** (identical 10-line block `<script type="text/javascript"> var _gaq = _gaq || []; … ga.js … </script>` in each `<head>`):
  - `index.htm:52–72`, `oferta/index.htm:27–37`, `ofirmie/index.htm:56–76`,
    `kontakt/index.htm:23–33`, `promocje/index.htm:49–69`, `umow-sie/index.htm:23–33`,
    `cookies/index.htm:30–40`, `mechanicy/index.htm:~67–83`
- **Change:** delete the whole block, including the `UA-29684621-1` account line. Do
  **not** add GA4 here — GA4 goes in only behind consent (W-C3/W-C4).
- **Verification:** `grep -rn '_gaq\|google-analytics\|UA-29684621' httpdocs --include='*.htm'` → empty.

### W-A3 — Favicon + `<link rel="icon">`

- **Audit issues:** #9 | **Severity:** High | **Effort:** S | **Dependencies:** none
- **Assets to create** (from `images/logo.png`, 18.5 KB, the RENO CAR mark also used as
  `og:image` by the booking portal):
  - `httpdocs/favicon.ico` (32×32 + 16×16 multi-size ICO)
  - `httpdocs/images/icon-192.png` (PNG, for Android/GBP)
  - `httpdocs/images/apple-touch-icon.png` (180×180)
- **Files:** all 7 remaining pages (after W-A12) + `polityka-prywatnosci/index.htm` —
  add in `<head>` after the viewport meta (root-relative paths work from subdirectories):

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/images/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
```

- **Verification:** `https://renocar.pl/favicon.ico` returns 200 after deploy; browser
  tab shows the icon on every page; Google mobile SERP favicon updates within days of
  recrawl.

### W-A4 — `robots.txt` + `sitemap.xml`

- **Audit issues:** #6 (+ #19 interaction) | **Severity:** High | **Effort:** S | **Dependencies:** W-A12 decided (mechanicy excluded), W-C1 (adds one URL — re-upload sitemap when the privacy page ships)
- **New file `httpdocs/robots.txt`** (exact content — note non-www; do not block css/js):

```
User-agent: *
Allow: /
Disallow: /kontakt/vendor/
Disallow: /kontakt/captcha.php
Disallow: /kontakt/handler.php

Sitemap: https://renocar.pl/sitemap.xml
```

- **New file `httpdocs/sitemap.xml`** (exact content; `/mechanicy/` deliberately absent
  — it 301s after W-A12; add `<lastmod>` values at deploy time in `YYYY-MM-DD`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://renocar.pl/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>https://renocar.pl/oferta/</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://renocar.pl/umow-sie/</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://renocar.pl/kontakt/</loc><changefreq>yearly</changefreq><priority>0.8</priority></url>
  <url><loc>https://renocar.pl/promocje/</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://renocar.pl/ofirmie/</loc><changefreq>yearly</changefreq><priority>0.6</priority></url>
  <url><loc>https://renocar.pl/polityka-prywatnosci/</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://renocar.pl/cookies/</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>
</urlset>
```

  (If deploying before W-C1, ship the sitemap without the `polityka-prywatnosci` row
  and re-upload when the page goes live.)
- **Verification:** both URLs return 200 with correct content-type; GSC "Sitemaps"
  report shows "Success" after W-D5 submission.

### W-A5 — JSON-LD `AutoRepair` structured data on every page

- **Audit issues:** #8 | **Severity:** High | **Effort:** S–M | **Dependencies:** GBP Maps URL (W-D1) for `sameAs` — ship now with an empty `sameAs` and extend later (Facebook dropped per owner decision 2026-07-12, see W-A15)
- **Files:** all 7 pages + `polityka-prywatnosci/index.htm` — one identical block in
  `<head>`, immediately before `</head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  "@id": "https://renocar.pl/#autorepair",
  "name": "RENO CAR – Pogwarancyjny Serwis Renault i Dacia",
  "legalName": "Renocar Zbigniew Marek",
  "url": "https://renocar.pl/",
  "image": "https://renocar.pl/images/logo.png",
  "logo": "https://renocar.pl/images/logo-motrio-new.png",
  "description": "Profesjonalny pogwarancyjny serwis samochodów Renault i Dacia w Gdańsku. Naprawy mechaniczne i elektryczne, przeglądy okresowe, serwis klimatyzacji, hybrydy i elektryki.",
  "telephone": "+48585201914",
  "email": "info@renocar.pl",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ul. Andrzeja Struga 8/10A",
    "addressLocality": "Gdańsk",
    "postalCode": "80-116",
    "addressCountry": "PL"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 54.34786,
    "longitude": 18.60654
  },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "08:00",
    "closes": "16:00"
  }],
  "priceRange": "$$",
  "currenciesAccepted": "PLN",
  "paymentAccepted": "Cash, Credit Card, Bank Transfer",
  "contactPoint": [{
    "@type": "ContactPoint",
    "telephone": "+48690182354",
    "contactType": "customer service",
    "availableLanguage": "pl"
  }],
  "potentialAction": {
    "@type": "ReserveAction",
    "target": "https://renocar-zgloszenie.pl/"
  },
  "sameAs": []
}
</script>
```

  After W-D1 resolves, populate `"sameAs"` with the Google Maps listing URL only
  (all files — grep for `"sameAs"`; no Facebook entry per owner decision 2026-07-12).
- **Verification:** paste each page into https://search.google.com/test/rich-results —
  expect a valid `AutoRepair` (LocalBusiness) item, zero errors;
  `curl -s https://renocar.pl/ | grep -c 'application/ld+json'` = 1.

### W-A6 — Canonical tags, improved titles, drop `meta keywords`, link hygiene

- **Audit issues:** #12 | **Severity:** Medium | **Effort:** M | **Dependencies:** none
- **Canonical tags** — add to `<head>` of each page:

| File | Canonical |
|---|---|
| `index.htm` | `<link rel="canonical" href="https://renocar.pl/" />` |
| `oferta/index.htm` | `<link rel="canonical" href="https://renocar.pl/oferta/" />` |
| `ofirmie/index.htm` | `<link rel="canonical" href="https://renocar.pl/ofirmie/" />` |
| `kontakt/index.htm` | `<link rel="canonical" href="https://renocar.pl/kontakt/" />` |
| `promocje/index.htm` | `<link rel="canonical" href="https://renocar.pl/promocje/" />` |
| `umow-sie/index.htm` | `<link rel="canonical" href="https://renocar.pl/umow-sie/" />` |
| `cookies/index.htm` | `<link rel="canonical" href="https://renocar.pl/cookies/" />` |
| `polityka-prywatnosci/index.htm` | `<link rel="canonical" href="https://renocar.pl/polityka-prywatnosci/" />` |

- **New titles** (exact replacements; current titles verified at `index.htm:21`,
  `oferta:11`, `ofirmie:21`, `kontakt:11`, `promocje:21`, `umow-sie:11`, `cookies:11`;
  the typo fixes here overlap W-A8 — apply once):

| File | New `<title>` |
|---|---|
| `index.htm` | `RENO CAR – Serwis Renault i Dacia Gdańsk \| Warsztat pogwarancyjny (Motrio)` |
| `oferta/index.htm` | `Oferta – naprawy i przeglądy Renault i Dacia Gdańsk \| RENO CAR` |
| `ofirmie/index.htm` | `O firmie – kilka słów o serwisie Renault w Gdańsku \| RENO CAR` |
| `kontakt/index.htm` | `Kontakt – RENO CAR Gdańsk, ul. Andrzeja Struga 8/10A \| Serwis Renault i Dacia` |
| `promocje/index.htm` | `Promocje i ogłoszenia – RENO CAR, serwis Renault Gdańsk` |
| `umow-sie/index.htm` | `Umów wizytę online – serwis Renault i Dacia Gdańsk \| RENO CAR` |
| `cookies/index.htm` | `Polityka cookies \| RENO CAR Gdańsk` |

- **Remove `meta keywords`** from all pages (obsolete; present on every page, e.g.
  `index.htm:23`, `kontakt/index.htm:12`).
- **Link hygiene:**
  - Header logo + "www.renocar.pl" text links currently point to
    `https://www.renocar.pl` (both anchors in the `container logo` block of every
    page, e.g. `index.htm` header) — change to `https://renocar.pl` (kills the
    needless www→non-www 301 hop).
  - `cookies/index.htm:313–320` footer uses absolute `http://www.renocar.pl/...` links —
    change to relative (`/`, `/promocje`, `/oferta`, `/ofirmie`, `/kontakt`, `/cookies`)
    to match the other pages.
- **Verification:** W3C validator passes each page;
  `grep -rn 'http://www.renocar.pl' httpdocs --include='*.htm' | grep -v vendor` → empty
  (after W-A12 removes mechanicy); SERP titles update after recrawl.

### W-A7 — Open Graph tags (pattern copied from renocar-zgloszenie.pl)

- **Audit issues:** #13 | **Severity:** Medium | **Effort:** S–M | **Dependencies:** none (uses the already-live `https://renocar.pl/images/logo.png`, verified 200/18.5 KB by the audit; a purpose-made 1200×630 `images/og-preview.jpg` is a nice-to-have follow-up)
- **Files:** all 7 pages + privacy page — add to `<head>` after `<meta name="description">`.
  Template (adjust `og:url`, `og:title`, `og:description` per page — reuse the W-A6
  title and the page's existing meta description):

```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="RENO CAR" />
<meta property="og:url" content="https://renocar.pl/" />
<meta property="og:title" content="RENO CAR – Serwis Renault i Dacia Gdańsk" />
<meta property="og:description" content="Profesjonalny pogwarancyjny serwis Renault i Dacia w Gdańsku. Naprawy, przeglądy, klimatyzacja, hybrydy. Umów wizytę online." />
<meta property="og:image" content="https://renocar.pl/images/logo.png" />
<meta property="og:locale" content="pl_PL" />
<meta name="twitter:card" content="summary" />
```

  (Use `summary` not `summary_large_image` while the image is the square logo; switch
  to `summary_large_image` if/when `og-preview.jpg` 1200×630 is created.)
- **Verification:** https://developers.facebook.com/tools/debug/ on `https://renocar.pl/`
  shows title/description/image; WhatsApp link preview renders.

### W-A8 — Typo & content corrections (Polish)

- **Audit issues:** #15 (+ PLAN.md R3 leftover) | **Severity:** Medium | **Effort:** S | **Dependencies:** none
- **Exact list (file:line → wrong → correct):**

| File:line | Błędnie | Poprawnie |
|---|---|---|
| `oferta/index.htm:11` (title — covered by W-A6) | Profesionalny | Profesjonalny |
| `oferta/index.htm:211` | Profesionalny serwis | Profesjonalny serwis |
| `ofirmie/index.htm:21` (title — covered by W-A6) | klika słów | kilka słów |
| `ofirmie/index.htm:414` | Profesionalny serwis | Profesjonalny serwis |
| `ofirmie/index.htm:502` | zapozniania się | zapoznania się |
| `ofirmie/index.htm:570` | Profesionalna … samochochodów | Profesjonalna … samochodów |
| `ofirmie/index.htm:378` (alt) | Pogwaranycjny | Pogwarancyjny |
| `ofirmie/index.htm:384` (alt) | Pogwaranycjny | Pogwarancyjny |
| `cookies/index.htm:11` (title — covered by W-A6) | cisteczkach | ciasteczkach |
| `cookies/index.htm:248` | Profesionalna … samochochodów | Profesjonalna … samochodów |
| `cookies/index.htm:266` | zapozniania się | zapoznania się |
| `index.htm:377` (alt) | Pogwaranycjny | Pogwarancyjny |
| `index.htm:399` (alt) | oferę … Pogwaranycjnego | ofertę … Pogwarancyjnego |
| `index.htm:421` (alt) | Pogwaranycjny | Pogwarancyjny |
| `index.htm:474` | istneiej możliwość | istnieje możliwość |
| `index.htm:590` | Profesionalna … samochochodów | Profesjonalna … samochodów |
| `index.htm:626` | zapozniania się | zapoznania się |
| `promocje/index.htm:344` | istneiej możliwość | istnieje możliwość |
| `promocje/index.htm:779` | Pogwaranycjny | Pogwarancyjny (block is deleted by W-A11 anyway) |
| `promocje/index.htm:837` | Profesionalna … samochochodów | Profesjonalna … samochodów |
| `promocje/index.htm:873` | zapozniania się | zapoznania się |
| `kontakt/index.htm:186` | Pogwaranycjny | Pogwarancyjny (line is also rebuilt by W-A15) |

  (`mechanicy/index.htm:344` "za klika dni" becomes moot after W-A12.)
- **Content correction (not a typo):** `ofirmie/index.htm:370` — "…od Poniedziałku do
  Piątku w godzinach **8.00 do 17.00**" → "…w godzinach **8.00 do 16.00**" (hours
  changed January 2022; PLAN.md R3 leftover).
- **Verification:** `grep -rn 'Profesionaln\|klika\|cisteczk\|istneiej\|Pogwaranycjny\|samochochod\|zapozniania\|oferę' httpdocs --include='*.htm' | grep -v vendor` → empty.
  Visually confirm diacritics after saving.

### W-A9 — Correct legal-entity block (kontakt + cookies pages)

- **Audit issues:** #1 | **Severity:** Critical | **Effort:** S | **Dependencies:** none — NIP 5833538950 confirmed by owner 2026-07-12
- **`kontakt/index.htm:168–173`** — before → after:

```html
<!-- BEFORE -->
RENO CAR sp. z o.o. <br/>
ul. Andrzeja Struga 8/10A <br/>
80-116 Gdańsk <br/>
NIP: 957-07-64-905

<!-- AFTER -->
Renocar Zbigniew Marek <br/>
ul. Andrzeja Struga 8/10A <br/>
80-116 Gdańsk <br/>
NIP: 5833538950
```

- **`cookies/index.htm:186`** — before → after:

```html
<!-- BEFORE -->
3. Administratorem danych jest firma RENO CAR Trzeciak, Marek Sp. j., ul. Andrzeja Struga 8, 80-116 Gdańsk, NIP: 957-07-64-905

<!-- AFTER -->
3. Administratorem danych jest Renocar Zbigniew Marek, ul. Andrzeja Struga 8/10A, 80-116 Gdańsk, NIP: 5833538950. Szczegóły w <a href="/polityka-prywatnosci/">Polityce prywatności</a>.
```

  (Note the cookie page also fixes the address to `8/10A`.)
- **Verification:** `grep -rn 'sp. z o.o.\|Sp. j.\|Trzeciak\|957-07-64-905' httpdocs --include='*.htm' | grep -v vendor` → empty.

### W-A10 — Footer: company identification + hours + dead-link fix

- **Audit issues:** #1 (footer part), PLAN 3.2 | **Severity:** Medium | **Effort:** S–M | **Dependencies:** NIP for the entity line (deployable without NIP if that line is omitted until known)
- **Files:** footer's first column in all 7 pages (`index.htm:698–712` and the
  equivalent block per page — currently the "Copyright © SDK | design by SDK" `<p>`
  followed by the Motrio-restyle `.footer-partner` badge div).
- **Change** — replace the copyright-only `<p>` with the block below; **keep the
  `.footer-partner` div** (Motrio restyle, §0.4) after it:

```html
<p>
  <strong>Renocar Zbigniew Marek</strong><br/>
  ul. Andrzeja Struga 8/10A, 80-116 Gdańsk<br/>
  Pon–Pt: 8:00–16:00<br/>
  <a href="tel:+48585201914">58 520 19 14</a> · <a href="tel:+48690182354">690 182 354</a><br/>
  <a href="mailto:info@renocar.pl">info@renocar.pl</a>
</p>
<p>
  Copyright © RENO CAR | design by
  <a href="https://www.sdk.it" title="SDK | Projektowanie, Administracja IT" target="_blank" rel="noopener noreferrer">SDK</a>
</p>
```

- Also in footers: add `<a href="/polityka-prywatnosci/">Polityka prywatności</a> <span>|</span>`
  next to the existing "Cookies" link (all 7 pages), and fix the dead link
  `ofirmie/index.htm:642` `<a href="../cennik">Cennik</a> <span>|</span>` → delete the
  line (no cennik page exists).
- **Verification:** every page footer shows NAP + hours; no `href="../cennik"` remains;
  the new links work from subdirectories (root-relative paths).

### W-A11 — Prune stale promotions (2012–2019)

- **Audit issues:** #14 | **Severity:** Medium | **Effort:** S–M | **Dependencies:** none
- **File:** `promocje/index.htm`. Current items (verified `<h3>` list):
  - Umów się online / Styczeń 2026 (line 332) — **KEEP** (top item)
  - Zmiany godzin pracy warsztatu / Styczeń 2022 (line 361) — **KEEP** (still the
    authoritative "we open 8–16" notice)
  - Serwis klimatyzacji / 12 czerwca 2019 (line 400) — **DELETE**
  - Płyn do spryskiwaczy do każdego Przeglądu / 4 marca 2016 (line 441) — **DELETE**
  - Kosmetyki samochodowe ELF / 7 września 2015 (line 477) — **DELETE**
  - Płyn do spryskiwaczy GRATIS / 29 czerwca 2015 (line 529) — **DELETE**
  - Części zamienne MOTRIO / 5 marca 2015 (line 563) — **DELETE**
  - Wesołych Świąt / 10 grudnia 2014 (line 593) — **DELETE**
  - Akumulatory Renault / 24 października 2014 (line 623) — **DELETE**
  - 25% rabatu na układy hamulcowe / 15 października 2014 (line 653) — **DELETE**
  - WYMIANA ROZRZĄDU / 07 października 2014 (line 683) — **DELETE**
  - Wymiana Oleju / 2 marca 2012 (line 713) — **DELETE**
  - RENO CAR – zobacz Nasz profil na facebooku / 1 marca 2012 (line 747) — **DELETE**
    (references the old FB page, incl. the profile link at line 757; superseded by W-A15)
  - RENO CAR … nowa strona internetowa / 1 marca 2012 (line 779) — **DELETE**
- Deletion = remove each item's whole `news-wyd` block. The Motrio restyle (§0.4)
  repaired the two malformed blocks ("Serwis klimatyzacji", "Płyn do spryskiwaczy…"),
  so every item is now a well-formed `<div class="news-wyd">…</div>` — delete opening
  div through closing div. No archive page — expired promotions without validity dates
  are a consumer-law liability, and an archive adds crawl noise for zero value
  (deliberate deviation from PLAN 3.5's archive idea).
- **Homepage:** `index.htm` "Najnowsze ogłoszenie" (line 457+) already shows only the
  2026 booking item — keep as is (its iframe is handled by W-A13).
- **Verification:** `/promocje/` shows exactly 2 items (2026, 2022); page renders
  correctly; no dangling markup (W3C check).

### W-A12 — `/mechanicy/`: 301 to `/ofirmie/` (decision: redirect, not restore)

- **Audit issues:** #19 | **Severity:** Low | **Effort:** S | **Dependencies:** none
- **Decision & justification:** **301-redirect**. Verified reality: the page body is an
  "under construction" placeholder ("Dział w trakcie aktualizacji, zapraszamy za klika
  dni." — `mechanicy/index.htm:344`) with **no team content**, on a stale pre-Phase-1
  template (plain-text phones, contradictory "10.00 - 16.00" hours at lines 137–139,
  `http://` links, dead GA). Restoring would mean writing new content and photos the
  owner hasn't provided; an indexable empty page is worse than a redirect. If the owner
  later supplies staff bios/photos, recreate the page on the current template and lift
  the redirect (tracked in Open questions #5).
- **Changes:**
  1. `httpdocs/.htaccess` — append under the `#### OLD PAGE` block:
     `Redirect 301 /mechanicy /ofirmie`
  2. Delete the `httpdocs/mechanicy/` directory from the repo and from the server.
  3. Optional tidy-up: remove the commented-out "Mechanicy" nav/footer remnants from
     the other 7 pages (e.g. `index.htm:172–174, 723–726`) — cosmetic only.
- **Verification:** `curl -sI https://renocar.pl/mechanicy/` → `301` with
  `Location: https://renocar.pl/ofirmie`; GSC coverage report eventually drops the URL.

### W-A13 — Homepage: replace the embedded booking-SPA iframe with a CTA

- **Audit issues:** #17 | **Severity:** Medium | **Effort:** S | **Dependencies:** none
- **File:** `index.htm:478–484` (inside the "Najnowsze ogłoszenie" section):

```html
<!-- BEFORE -->
<iframe 
  src="https://renocar-zgloszenie.pl/"
  width="100%"
  height="600"
  style="border:none;"
  loading="lazy">
</iframe>

<!-- AFTER (uses existing .btn-primary from css/style-modern.css:234) -->
<p class="txtcenter" style="margin: 30px 0 10px;">
  <a href="umow-sie" class="btn btn-primary btn-lg">Umów wizytę online &rarr;</a>
</p>
```

  Keep the surrounding news text (with the W-A8 "istnieje" fix). The CTA links to the
  internal `/umow-sie/` page — the full-height iframe stays **only** there
  (`umow-sie/index.htm:110–114`, already `min-height: 800px`, correct). Do not touch
  the `umow-sie` embed — that is the `submission-portal` integration point flagged in
  the module CLAUDE.md.
- **Verification:** homepage no longer loads the Angular SPA (no
  `renocar-zgloszenie.pl` **iframe** in the homepage source — the Motrio hero CTA at
  `index.htm:209`, the header CTA, the slider link and the bottom CTA bar are plain
  links to booking and stay); homepage transfer size drops by the SPA's weight; the
  button renders as a red Motrio pill per `.btn-primary` (pill radius since the
  restyle, §0.4).

### W-A14 — `js/cookies-info.js`: fix hardcoded `http://www` link

- **Audit issues:** #22 (link half; HSTS is W-B1) | **Severity:** Low | **Effort:** S | **Dependencies:** none — but note W-C3 **replaces this whole script** with the consent banner; apply this one-liner only if deploying before W-C3
- **File:** `httpdocs/js/cookies-info.js`, inside the `html_code` string in
  `WHCheckCookies()`:
  - Before: `<a href="http://www.renocar.pl/cookies" style="color: #e0c9b7;">Dowiedz się więcej</a>`
  - After: `<a href="/cookies" style="color: #e0c9b7;">Dowiedz się więcej</a>`
- **Verification:** click "Dowiedz się więcej" in the banner → lands on
  `https://renocar.pl/cookies` with no redirect chain (network tab: single 200).

### W-A15 — Facebook: remove all Facebook references from the site *(owner decision 2026-07-12: drop Facebook entirely)*

- **Audit issues:** #18 | **Severity:** Medium | **Effort:** S | **Dependencies:** none — owner chose "neither page": no Facebook link anywhere on the site
- **`kontakt/index.htm:186`** — delete the whole plain-text line `facebook: RENOCAR - Pogwaranycjny Serwis Renault` (typo included; do not replace with a link).
- **`ofirmie/index.htm`** — remove the Facebook SDK v2.5 loader (`<div id="fb-root">`
  line 90 + loader script lines 92–104,
  `connect.facebook.net/pl_PL/sdk.js#xfbml=1&version=v2.5`) **and the entire
  "dołącz do nas na facebooku:" section** (heading line 530 + the `fb-page` widget
  line 534, hardcoded to old page ID `291554670910421`). Nothing replaces it.
- **`ofirmie/index.htm:464`** *(gap found during the 2026-07-19 re-verification — the
  original list missed this body-copy mention, which would have made the verification
  grep unpassable)* — trim the promotions paragraph: "…Nasze promocje ogłaszamy na
  Naszej stronie internetowej oraz na facebooku. Zachęcamy do odwiedzania strony oraz
  profilu" → "…Nasze promocje ogłaszamy na Naszej stronie internetowej. Zachęcamy do
  odwiedzania strony".
- W-A5's JSON-LD `"sameAs"` carries **only** the Google Maps listing URL (after W-D1) — no Facebook entry.
- If a Facebook page is ever revived, re-adding one footer/kontakt link is a one-line change.
- **Verification:** `grep -rni 'facebook' httpdocs --include='*.htm' | grep -v vendor` → empty.
  **Run this only after W-A6 and W-A11** — until then two expected hits remain outside
  this item's scope: `kontakt/index.htm:12` (`meta keywords`, removed by W-A6) and the
  promocje Facebook announcement (block deleted by W-A11, profile link at line 757).
  Also: no `connect.facebook.net` request on `/ofirmie/` (network tab).

---

## W-B — Hosting / server configuration

### W-B1 — Compression, caching, HSTS

- **Audit issues:** #16 (headers half), #22 (HSTS) | **Severity:** Medium | **Effort:** S–M | **Dependencies:** confirming who serves static files (see caveat; Open question #3)
- **Caveat (important):** the audit observed the live site on **HTTP/2 via nginx
  (Plesk)**. In the common Plesk setup, nginx proxies to Apache but **"Serve static
  files directly by nginx" may be enabled** — in that case `.htaccess`
  `mod_deflate`/`mod_expires`/`mod_headers` directives are silently ignored for
  `.html/.css/.js/.jpg`. Deploy the `.htaccess` version first (harmless either way),
  verify with curl, and fall back to the Plesk panel if headers don't appear.
- **`.htaccess` version** — append to `httpdocs/.htaccess`:

```apache
#### COMPRESSION (ignored if nginx serves static files - see Plesk fallback)
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml
  AddOutputFilterByType DEFLATE application/javascript application/x-javascript application/json
  AddOutputFilterByType DEFLATE image/svg+xml application/xml
</IfModule>

#### BROWSER CACHING
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpeg "access plus 6 months"
  ExpiresByType image/png "access plus 6 months"
  ExpiresByType image/gif "access plus 6 months"
  ExpiresByType image/x-icon "access plus 6 months"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/html "access plus 1 hour"
</IfModule>

#### HSTS (only over HTTPS)
<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains" "expr=%{HTTPS} == 'on'"
</IfModule>
```

- **Plesk-panel fallback** (owner/hosting-panel steps if curl shows no effect):
  1. Plesk → *Websites & Domains → renocar.pl → Apache & nginx Settings*.
  2. If "Serve static files directly by nginx" is ON: either turn it OFF (simplest;
     Apache + `.htaccess` then govern everything), or keep it ON and add to
     "Additional nginx directives":
     ```nginx
     gzip on;
     gzip_types text/css application/javascript image/svg+xml text/plain;
     location ~* \.(jpg|jpeg|png|gif|ico)$ { expires 6M; }
     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
     ```
  3. Apply and re-test. (If the panel offers an "HSTS" toggle under security settings,
     prefer that over hand-written directives.)
- **Verification:**
  - `curl -sI --compressed https://renocar.pl/ | grep -i 'content-encoding'` → `gzip` (or `br`);
  - `curl -sI https://renocar.pl/images/home-slider/slide01.jpg | grep -i 'cache-control\|expires'` → 6-month caching;
  - `curl -sI https://renocar.pl/ | grep -i strict-transport` → HSTS header present.
  Do **not** submit to the HSTS preload list — subdomain coverage of the Plesk host is
  unverified.

### W-B2 — Image compression & dead-weight removal

- **Audit issues:** #16 (images half) | **Severity:** Medium | **Effort:** M | **Dependencies:** none (keep originals in a local backup outside `httpdocs`)
- **Recompress the live slider JPGs** (`httpdocs/images/home-slider/`, verified sizes;
  target ≤130 KB each at display width 1170px, quality ~80, e.g.
  `magick slideNN.jpg -resize 1170x -quality 80 slideNN.jpg` or Squoosh):

| File | Current | Target |
|---|---|---|
| `slide01.jpg` | 135,623 B | ≤130 KB |
| `slide02.jpg` | 452,907 B | **≤150 KB** (biggest win) |
| `slide03.jpg` | 172,611 B | ≤130 KB |
| `slide04.jpg` | 209,187 B | ≤130 KB |
| `slide05.jpg` | 78,376 B | keep |
| `slide06.JPG` | 108,434 B | keep (or ≤100 KB) |

- **Compress the live ofirmie photo** (audit called it unreferenced — the **root** copy
  is, but this one is referenced at `ofirmie/index.htm:382,384`):
  `httpdocs/ofirmie/img/new_building_with_logo.png` 2,437,273 B → re-encode as JPEG
  ≤250 KB (`new_building_with_logo.jpg`) and update both the lightbox `href` (line 382)
  and `<img src>` (line 384).
- **Delete unreferenced files** (verified: no page/CSS references them; ~24.7 MB):

| File | Size |
|---|---|
| `httpdocs/img/IMG_1943.jpeg` | 3,657,831 B |
| `httpdocs/img/IMG_1944.jpeg` | 3,482,563 B |
| `httpdocs/img/IMG_2075.jpeg` | 3,936,515 B |
| `httpdocs/img/IMG_2189.jpeg` | 5,553,742 B |
| `httpdocs/img/IMG_2317.jpeg` | 5,679,267 B |
| `httpdocs/img/new_building_with_logo.png` (root copy — the referenced copy lives in `ofirmie/img/`) | 2,437,273 B |

- **Exclude from deploys** (keep local or delete): `httpdocs/images/home-slider/backup/`
  (~2.3 MB, untracked originals) — never upload it.
- **Keep:** `img/oferta.jpg`, `img/ofirmie.jpg`, `img/sam.jpg` (referenced by
  `index.htm:365–409`), everything under `oferta/img/`, `ofirmie/img/*.jpg`.
- **Verification:** `du -sh httpdocs/img httpdocs/images/home-slider` shows the drop;
  all pages render with images intact (open each page locally via
  `python3 -m http.server`); Lighthouse "Properly size images" improves;
  `grep -rn 'IMG_' httpdocs --include='*.htm'` → empty.

---

## W-C — Legal / RODO content (Polish copy included)

### W-C1 — New page: `polityka-prywatnosci/`

- **Audit issues:** #2 (policy part) | **Severity:** Critical | **Effort:** M | **Dependencies:** **NIP from owner** (placeholder marked); W-A10 adds the footer link; W-A4 adds it to the sitemap
- **New file:** `httpdocs/polityka-prywatnosci/index.htm` — clone the page shell from
  `cookies/index.htm` (same header/nav/footer, minus the GA block per W-A2, plus the
  W-A3/5/6/7 head tags; **keep the Motrio restyle elements the shell now carries** —
  the `style-modern.css` link, header partner badge + "Umów się" CTA, footer
  `.footer-partner` badge, and the bottom CTA bar, per §0.4), with
  `<h1>Polityka prywatności</h1>` and the following body copy (complete skeleton,
  placeholders marked `[...]`):

```
POLITYKA PRYWATNOŚCI SERWISU WWW.RENOCAR.PL

Data ostatniej aktualizacji: [DATA-PUBLIKACJI]

1. Administrator danych osobowych
Administratorem Państwa danych osobowych jest Renocar Zbigniew Marek,
ul. Andrzeja Struga 8/10A, 80-116 Gdańsk, NIP: 5833538950
(dalej: „Administrator").
Kontakt w sprawach danych osobowych: e-mail: info@renocar.pl, tel. +48 58 520 19 14.

2. Jakie dane przetwarzamy i skąd je mamy
a) Formularz kontaktowy (strona /kontakt/): imię i nazwisko, adres e-mail, numer
   telefonu oraz treść wiadomości — dane podane przez Państwa dobrowolnie.
b) Formularz rezerwacji wizyty (renocar-zgloszenie.pl): imię i nazwisko, adres e-mail,
   numer telefonu, dane pojazdu (marka, model, numer VIN) oraz opis usterki
   i preferowany termin wizyty.
c) Pliki cookies i dane statystyczne: wyłącznie po wyrażeniu przez Państwa zgody
   w banerze cookies (szczegóły w pkt 7 oraz w zakładce /cookies/).

3. Cele i podstawy prawne przetwarzania
a) udzielenie odpowiedzi na wiadomość przesłaną przez formularz kontaktowy — art. 6
   ust. 1 lit. f RODO (prawnie uzasadniony interes Administratora polegający na
   prowadzeniu korespondencji);
b) obsługa rezerwacji wizyty w warsztacie i wykonanie usługi serwisowej — art. 6 ust. 1
   lit. b RODO (działania zmierzające do zawarcia i wykonania umowy);
c) ustalenie, dochodzenie lub obrona roszczeń — art. 6 ust. 1 lit. f RODO;
d) statystyka odwiedzin strony (narzędzia analityczne) — art. 6 ust. 1 lit. a RODO
   (Państwa zgoda wyrażona w banerze cookies; zgodę można w każdej chwili wycofać).

4. Okres przechowywania danych
a) korespondencja z formularza kontaktowego — przez czas prowadzenia korespondencji,
   nie dłużej niż 12 miesięcy od jej zakończenia;
b) dane związane z rezerwacją i wykonaniem usługi — przez okres wykonania usługi oraz
   okres przedawnienia roszczeń wynikający z przepisów prawa oraz okresy wymagane
   przepisami podatkowymi;
c) dane statystyczne (cookies) — zgodnie z okresami wskazanymi w banerze cookies,
   nie dłużej niż do wycofania zgody.

5. Odbiorcy danych
Dane mogą być powierzane podmiotom przetwarzającym je na zlecenie Administratora:
dostawcy hostingu strony internetowej, dostawcy usług IT oraz — wyłącznie po wyrażeniu
zgody na cookies statystyczne — Google Ireland Ltd. (narzędzie Google Analytics).
Dane nie są sprzedawane ani udostępniane podmiotom trzecim w celach marketingowych.

6. Przekazywanie danych poza EOG
W związku z korzystaniem z narzędzi Google dane statystyczne mogą być przekazywane do
państw trzecich (USA). Przekazanie odbywa się na podstawie standardowych klauzul
umownych zatwierdzonych przez Komisję Europejską oraz decyzji dotyczącej ram ochrony
danych UE–USA (EU-U.S. Data Privacy Framework).

7. Pliki cookies
Strona wykorzystuje pliki cookies niezbędne do jej działania oraz — za Państwa zgodą —
cookies statystyczne. Zgodę można wyrazić, odrzucić lub wycofać w każdej chwili za
pomocą banera cookies (link „Ustawienia cookies" w stopce strony). Szczegółowe
informacje: /cookies/.

8. Państwa prawa
Przysługuje Państwu prawo do:
- dostępu do swoich danych oraz otrzymania ich kopii,
- sprostowania (poprawienia) danych,
- usunięcia danych,
- ograniczenia przetwarzania,
- wniesienia sprzeciwu wobec przetwarzania opartego na art. 6 ust. 1 lit. f RODO,
- przenoszenia danych,
- wycofania zgody w dowolnym momencie (bez wpływu na zgodność z prawem przetwarzania
  dokonanego przed jej wycofaniem),
- wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2,
  00-193 Warszawa, www.uodo.gov.pl).
Aby skorzystać z powyższych praw, prosimy o kontakt: info@renocar.pl.

9. Dobrowolność podania danych
Podanie danych jest dobrowolne, jednak niezbędne do udzielenia odpowiedzi na wiadomość
lub obsługi rezerwacji wizyty.

10. Zautomatyzowane podejmowanie decyzji
Państwa dane nie są wykorzystywane do zautomatyzowanego podejmowania decyzji, w tym
profilowania.
```

- **Verification:** page live at `/polityka-prywatnosci/`, linked from every footer
  (W-A10), from the cookie policy (W-A9) and from the contact-form clause (W-C2);
  diacritics verified; W3C-valid.

### W-C2 — RODO art. 13 clause at the kontakt form

- **Audit issues:** #2 (form part) | **Severity:** Critical | **Effort:** S | **Dependencies:** W-C1 (link target), NIP
- **File:** `kontakt/index.htm` — insert **inside the `<form>` (id `reused_form`),
  between the message-textarea group (ends ~line 213) and the submit-button `<p>`
  (line 215; the button is `btn btn-lg btn-primary` since the Motrio restyle)**:

```html
<div class="form-group col-lg-12 col-md-12 col-sm-12 col-xs-12">
  <p style="font-size: 12px; color: #7c7b7b; text-align: left;">
    Administratorem Twoich danych osobowych jest Renocar Zbigniew Marek,
    ul. Andrzeja Struga 8/10A, 80-116 Gdańsk. Dane podane w formularzu będą
    przetwarzane w celu udzielenia odpowiedzi na Twoją wiadomość
    (art. 6 ust. 1 lit. f RODO). Przysługuje Ci m.in. prawo dostępu do danych,
    ich sprostowania i usunięcia. Szczegóły — w tym pełną informację o Twoich
    prawach — znajdziesz w <a href="/polityka-prywatnosci/">Polityce prywatności</a>.
  </p>
</div>
```

- **Legal note:** for processing based on art. 6(1)(f) (answering an inquiry) an
  **information clause is required, a consent checkbox is not** — a fake "consent"
  checkbox would assert the wrong legal basis. If the owner later wants marketing
  contact, add a separate, optional, unticked consent checkbox at that time.
- **Backend impact:** none — `kontakt/handler.php` validates only
  `name/phone/email/message` via `FormGuide\Handlx\FormHandler`; the clause is
  display-only. Do not touch `kontakt/vendor/`.
- **Verification:** clause visible above the "Wyślij" button on desktop + mobile;
  form still submits successfully (AJAX via `kontakt/form.js` → `handler.php`).

### W-C3 — Consent-management banner (replaces `js/cookies-info.js`)

- **Audit issues:** #2 (consent part), #3 (gating), #22 (retires the old script) | **Severity:** Critical | **Effort:** M | **Dependencies:** W-C4 (GA4 measurement ID), W-C1 (policy link)
- **Tool comparison (free tiers, 2026):**

| Tool | Cost | Auto-blocking | Self-hosted | Fit for this site |
|---|---|---|---|---|
| **Klaro!** (kiprotect/klaro) | Free, open source (BSD-3) | Yes (via `data-name` script tagging) | **Yes — single JS file, no account, no external CDN** | **Best fit** — no vendor lock-in, no recurring cost, works on plain PHP hosting, config is one JS file in the repo |
| CookieYes | Free ≤ 1 domain / page-view caps | Yes | No (external script + account) | OK, but external dependency, upsell banners, caps |
| Cookiebot (Usercentrics) | Free ≤ 50 subpages | Yes (best-in-class scanner) | No | OK; strongest compliance tooling, but account-bound and free tier can change |

  **Pick: Klaro!** — matches the module's constraints (no build system, no external
  services, cheap hosting) and keeps consent fully first-party. Fallback if the owner
  prefers a managed dashboard: Cookiebot free tier.
- **Implementation (all 7 pages + privacy page):**
  1. Vendor the dist file into the repo: `httpdocs/js/klaro.js` (single ~100 KB file
     from the Klaro GitHub release; no npm).
  2. New file `httpdocs/js/klaro-config.js`:

```js
var klaroConfig = {
  lang: 'pl',
  acceptAll: true,
  mustConsent: false,
  privacyPolicy: '/polityka-prywatnosci/',
  cookieName: 'renocar-consent',
  translations: {
    pl: {
      consentNotice: {
        description: 'Używamy plików cookies: niezbędnych do działania strony oraz — za Twoją zgodą — statystycznych (Google Analytics). Możesz zaakceptować wszystkie lub wybrać ustawienia.',
        learnMore: 'Ustawienia'
      },
      consentModal: {
        title: 'Ustawienia prywatności',
        description: 'Tutaj możesz zdecydować, które usługi mogą być używane na tej stronie.'
      },
      purposes: { analytics: 'Statystyka' },
      ok: 'Akceptuję wszystkie',
      decline: 'Odrzucam',
      acceptSelected: 'Zapisz wybór'
    }
  },
  services: [
    {
      name: 'google-analytics',
      title: 'Google Analytics 4',
      purposes: ['analytics'],
      cookies: [/^_ga(_.*)?/],
      required: false,
      default: false
    }
  ]
};
```

  3. In every page, **remove** `<script src="js/cookies-info.js"></script>`
     (`index.htm:748`, `oferta:339`, `ofirmie:668`, `kontakt:299`, `promocje:995`,
     `umow-sie:189`, `cookies:327`; delete `js/cookies-info.js` afterwards) and
     add at the end of `<body>` (root-relative, so identical on subpages):

```html
<script defer src="/js/klaro-config.js"></script>
<script defer data-config="klaroConfig" src="/js/klaro.js"></script>
```

  4. GA4 snippet (W-C4) goes in **blocked form** so Klaro controls it:

```html
<script type="text/plain" data-type="application/javascript" data-name="google-analytics"
        data-src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" async></script>
<script type="text/plain" data-type="application/javascript" data-name="google-analytics">
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', { 'anonymize_ip': true });
</script>
```

  5. Footer (all pages): add a re-open link
     `<a href="#" onclick="klaro.show();return false;">Ustawienia cookies</a>` next to
     the Polityka prywatności link.
- **Verification:** fresh incognito visit → no `google-analytics.com` /
  `googletagmanager.com` requests before consent (network tab); "Akceptuję" → GA4
  requests appear and `_ga` cookies set; "Odrzucam" → still none; choice persists;
  banner text in Polish with correct diacritics.

### W-C4 — Analytics tool decision: GA4 (behind consent)

- **Audit issues:** #3 (install half) | **Severity:** Critical | **Effort:** S (snippet) + owner account setup | **Dependencies:** owner's Google account; **W-C3 must ship in the same deploy — never deploy GA4 unblocked**
- **GA4 vs Plausible:**
  - *GA4*: free; integrates with Search Console (needed anyway for W-D5) and the GBP
    funnel; supports cross-domain measurement with `renocar-zgloszenie.pl` (the audit's
    strategic conversion-tracking goal). Downside: consent complexity (solved by W-C3)
    and a clunky UI.
  - *Plausible*: elegant and cookieless (arguably no consent needed for it alone), but
    **€9+/month** — a recurring cost against a platform explicitly migrated to
    serverless *to cut costs*; self-hosting it means a server to babysit.
  - **Pick: GA4**, consent-gated via Klaro (`anonymize_ip`, default-denied until
    opt-in). Zero cost, one vendor already in the stack, unlocks future booking-funnel
    measurement.
- **Steps:** owner creates the GA4 property (analytics.google.com → property
  "renocar.pl", web data stream for `https://renocar.pl`) → replace `G-XXXXXXXXXX` in
  the W-C3 snippet on all pages → deploy → later add `renocar-zgloszenie.pl` as a
  second stream / cross-domain config (quarter horizon).
- **Verification:** GA4 Realtime shows the visit after consenting; DebugView shows
  `page_view`; no hits when consent is declined.

---

## W-D — Off-site manual runbook (owner-assisted)

> **Same-name competitor caveat — read first:** an unrelated workshop
> **"RENO CAR ADAMOWICZ MARCIN", ul. Olszyńska 3, Gdańsk** exists (found via Yelp).
> During every claim/edit below, verify you are editing the **Struga 8/10A** listing,
> never the Olszyńska one. Make our listings visually unambiguous (photos, exact
> address "ul. Andrzeja Struga 8/10A — dojazd od ul. Kartuskiej", booking link) and
> watch for reviews meant for the other business.

**Canonical NAP block** — paste this, character-for-character, into every profile:

```
Nazwa (marka): RENO CAR – Pogwarancyjny Serwis Renault i Dacia
Podmiot prawny: Renocar Zbigniew Marek
Adres: ul. Andrzeja Struga 8/10A, 80-116 Gdańsk
Telefony: +48 58 520 19 14, +48 690 182 354
E-mail: info@renocar.pl
WWW: https://renocar.pl
Rezerwacja online: https://renocar-zgloszenie.pl
Godziny: pon.–pt. 8:00–16:00 (sob., niedz. — zamknięte)
Płatności: gotówka, karta płatnicza, przelew
NIP: 5833538950
```

### W-D1 — Google Business Profile claim & fix (owner-assisted guided session)

- **Audit issues:** #4, #23, #5 (GBP part) | **Severity:** High | **Effort:** M (one session) | **Dependencies:** owner has manager access (confirmed 2026-07-04); the Maps-embed regeneration (last step) blocks on this item
- Checklist (business.google.com, logged in as the manager account):
  1. Open the profile; confirm it is the **Struga 8/10A** listing (see caveat).
  2. **Name:** set to the customer-facing brand "RENO CAR – Pogwarancyjny Serwis
     Renault i Dacia" (mirror sites show the stale "RENO CAR - Trzeciak, Marek Sp.j.").
  3. **Hours:** Mon–Fri **08:00–16:00** (mirrors show stale 8:00–17:00 — the single
     highest-priority fix; wrong hours generate 1-star reviews).
  4. **Category:** primary "Warsztat samochodowy" (Auto repair shop). Do not use
     "Renault dealer" (it is not a dealer).
  5. **Website:** `https://renocar.pl` · **Appointment link:** `https://renocar-zgloszenie.pl`.
  6. **Phones:** +48 58 520 19 14 (primary), +48 690 182 354 (additional). Remove any
     501-512-98x legacy numbers.
  7. **Address/description:** confirm "ul. Andrzeja Struga 8/10A"; add a 750-char
     Polish description mentioning Renault, Dacia, Gdańsk, Motrio, hybrydy,
     klimatyzacja.
  8. **Attributes/payments:** gotówka, karta, przelew.
  9. **Photos:** upload 10+ (building front — the `new_building_with_logo` photo is
     ideal, workshop bays, diagnostics gear, reception, team).
  10. **Reviews:** respond to every existing review (PL, short, signed "Zespół RENO
      CAR"); from "Ask for reviews" copy the short review link for post-repair review
      requests (strategic item).
  11. Check the Q&A section for stale answers (hours!).
- **Post-GBP site task (repo):** regenerate the Maps embed (Share → Embed a map) from
  the fixed listing and replace the 2015 zero-place-ID iframe src
  (`…!1s0x0000000000000000%3A0x00cd1aee085bdc0f!2sRENO+CAR…4v1449917311874`) at:
  `index.htm:670`, `promocje/index.htm:917`, `umow-sie/index.htm:131`,
  `kontakt/index.htm:241`, `cookies/index.htm:288`. Keep `loading="lazy"` and add
  `title="Mapa dojazdu do RENO CAR, ul. Andrzeja Struga 8/10A, Gdańsk"`.
- **Verification:** Maps search "Reno Car Struga Gdańsk" shows corrected hours/links;
  the embedded map on `/kontakt/` pins the correct listing.

### W-D2 — Directory cleanup (one pass with the canonical NAP)

- **Audit issues:** #5, #20 | **Severity:** High | **Effort:** M (2–3 h total) | **Dependencies:** canonical NAP incl. NIP; ideally after W-D1
- Steps per platform:
  1. **dobrymechanik.pl** — profile is unclaimed ("To Twój warsztat?"): claim (free),
     set website + booking link, fix payments (currently "Gotówka" only → add karta,
     przelew), enable online-appointment info (profile currently claims none exists),
     paste canonical NAP.
  2. **trojmiasto.pl** (katalog) — request correction: remove dead phones
     **501-512-988 / 501-512-989**, add +48 690 182 354, add hours + e-mail, update
     the name to the brand form.
  3. **pkt.pl** (`pkt.pl/firma/reno-car-sp-j-trzeciak-m-1728929`) — old legal name
     "Reno Car sp.j. Trzeciak M."; claim/edit to canonical NAP.
  4. **cylex-polska.pl** — name variant „«Reno Car» Zbigniew Marek Jerzy Trzeciak";
     request edit to canonical NAP.
  5. **mapa.targeo.pl** — old name/NIP/phones; request correction.
  6. **firmy.net** — add missing website, e-mail, hours.
  7. **motointegrator.com** (`/pl/pl/warsztat/gdansk/84rqzk5-reno-car`) and **Yelp**
     ("RENO CAR TRZECIAK MAREK") — verify manually in a browser (both blocked bots
     during the audit), claim/correct; on Yelp double-check you are on the Struga
     listing, not Olszyńska (competitor caveat).
  8. Optional free citations (quarter horizon): oferteo.pl, panoramafirm.pl — currently
     absent; add with canonical NAP.
- **Verification:** re-search each platform after 2–4 weeks; no 501-512-98x number and
  no "Trzeciak" entity name remains anywhere editable.

### W-D3 — Facebook consolidation — **CANCELLED** *(owner decision 2026-07-12)*

- **Status:** the owner chose to drop Facebook from the site entirely (see W-A15) —
  no canonical page will be selected, linked, or maintained.
- **Optional low-priority tidy-up** (only if ever convenient): log into Meta Business
  Suite and unpublish/close the two stray pages (old ID `291554670910421`, newer
  `…100071090764943`) so customers don't find a dead profile the site no longer links.
- Nothing blocks on this item; W-A5's `sameAs` uses only the Google Maps URL.

### W-D4 — Motrio network locator listing

- **Audit issues:** #11 | **Severity:** Medium | **Effort:** S (inquiry) | **Dependencies:** none
- Steps:
  1. Open https://www.motrio.pl/nearby-repairers in a browser, search "Gdańsk";
     record whether RENO CAR (Struga 8/10A) appears.
     Two traps: "Reno-Car" **Toruń** (renocarserwis.pl) is an unrelated Motrio
     workshop; Gdańsk competitor "RENO ART" appears in Motrio-adjacent listings.
  2. If absent/wrong: contact the Motrio/Renault Polska network coordinator (via the
     parts-distributor rep the shop already buys from) and request a listing with the
     canonical NAP + booking link. The site already carries Motrio branding
     (`images/logo-motrio-new.png`) — the network listing should be free co-marketing.
- **Verification:** the locator shows the Gdańsk workshop with correct NAP.

### W-D5 — Google Search Console: property check + sitemap submission

- **Audit issues:** #6 (submission half) | **Severity:** High | **Effort:** S | **Dependencies:** W-A4 deployed; GSC access (verification file `google76f5cd7632d7faa5.html` is live — **never delete it**)
- Steps:
  1. Confirm access to the `renocar.pl` property in Search Console.
  2. Submit `https://renocar.pl/sitemap.xml` (Sitemaps section).
  3. Check Index Coverage: confirm `/mechanicy/` drops out post-301 (W-A12) and the
     new `/polityka-prywatnosci/` gets indexed.
  4. Use URL Inspection on `/` after the W-A5/6/7 deploy to request re-indexing.
- **Verification:** Sitemap status "Success"; coverage report clean after ~2–4 weeks.

---

## Execution order

**Week 1 — repo-only quick wins (no owner input needed, one deploy):**
W-A1 (tel links) → W-A2 (dead GA) → W-A8 (typos + ofirmie hours) → W-A3 (favicon) →
W-A4 (robots + sitemap, without the privacy URL yet) → W-A5 (JSON-LD, empty `sameAs`) →
W-A6 (canonical/titles/keywords/link hygiene) → W-A7 (OG) → W-A11 (promotions) →
W-A12 (mechanicy 301) → W-A13 (homepage CTA) → W-A14 (cookies-info link, interim) →
W-B2 (image compression + deletions). Then W-D5 (submit sitemap).

**Month 1 — needs owner input (NIP, FB page, Google accounts):**
Collect NIP → W-A9 + W-A10 (legal blocks/footer) → W-C1 (privacy page) + W-C2 (form
clause) + re-upload sitemap with the new URL → W-C4 (GA4 property) + W-C3 (Klaro
consent, GA4 gated) in one deploy → W-B1 (compression/caching/HSTS with Plesk
fallback) → W-D1 (GBP session, owner-assisted) then Maps-embed regeneration → W-D3
(Facebook) then W-A15 + populate `sameAs` → W-D2 (directories).

**Quarter — strategic:**
W-D4 (Motrio locator) · review-request loop using the GBP short link (hook exists in
the admin portal per the consultancy summary) · GA4 cross-domain + booking-funnel
events on renocar-zgloszenie.pl (+ its own robots.txt on S3 — audit #21, outside this
module) · og-preview.jpg 1200×630 + `summary_large_image` · remaining PLAN.md items
(preconnect, CWV Phase 4, FAQ schema, pricing table — design Phases 6–7 done via the
Motrio restyle, §0.4).

---

## Open questions for the owner — answered 2026-07-12 (one residual)

| # | Question | Answer |
|---|---|---|
| 1 | NIP of "Renocar Zbigniew Marek" | **5833538950** — folded into W-A9/W-A10/W-C1/W-C2 and the W-D NAP block above |
| 2 | Canonical Facebook page | **Neither — Facebook dropped from the site.** W-A15 rewritten to remove all references; W-D3 cancelled; `sameAs` = Google Maps URL only |
| 3a | How is `httpdocs/` deployed | **FTP/SFTP; owner holds the credentials** — record host/procedure (never passwords) in `DEPLOYMENT.md` |
| 3b | Plesk "Serve static files directly by nginx" toggle | **Still unknown — the only residual.** W-B1 resolves it empirically: deploy the `.htaccess`, curl-verify headers, fall back to the panel if absent |
| 4 | Google accounts | **One account holds Search Console + GBP manager access; GA4 will be created under it** (W-C4/W-D1/W-D5 proceed) |
| 5 | Mechanicy page future | Owner: "whatever ranks better" → **the W-A12 301 redirect stands permanently** (revisit only if team content ever materialises) |
| 6 | Review-request workflow | **Approved — completion e-mail with review link to all customers** (spec 02 G4 variant a); GBP short link captured during W-D1 |
| 7 | Motrio contact | **Exists** (the parts-distributor rep); no member tooling known — W-D4 is one call/e-mail through them |
