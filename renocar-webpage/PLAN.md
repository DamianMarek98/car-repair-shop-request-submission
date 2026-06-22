# RENO CAR – Implementation Plan
**Author:** Google/SEO Expert Review  
**Date:** 2026-05-09  
**Based on:** `ANALYSIS.md` + deep code audit of `httpdocs/`  
**Goal:** Improve Google ranking, mobile conversion, and site quality — prioritized from fastest win to longest effort

---

## Critical notes on the initial analysis

Before the plan, corrections to `ANALYSIS.md` that matter for ordering work:

1. **The analysis missed the most damaging SEO bug on the site:** the homepage has **three `<h1>` tags** ("O Firmie", "Oferta", "Ceny") but **zero correct H1**. Google uses H1 as the primary topic signal. This is a one-line fix with major impact.
2. **Phone numbers on the homepage contact section** (`(58) 520-19-14`, `501-512-989`) are plain text — not `<a href="tel:">` links. Tap-to-call is the #1 mobile conversion mechanism for a workshop.
3. **All 6 slider images are missing `alt` attributes entirely.** They have `title` attributes (not the same). Google cannot read image content; alt text is what gets indexed. The analysis said alt text was present — it's not on the slider.
4. **jQuery is loaded twice on `/kontakt/`**: once from Google CDN at the top of `<head>` and again from a local file at the bottom of `<body>`. Double load.
5. **The contact form uses `type="phone"` — this is not a valid HTML input type.** Should be `type="tel"`. Mobile browsers won't show the numeric keypad.
6. **The bxSlider CSS `<link>` is inside `<body>` not `<head>`** — causes FOUC (flash of unstyled content) on page load.
7. **Header logo links use `http://` not `https://`** — creates mixed-content issues.
8. **Slider HTML has orphaned `</a>` closing tags** on slides 2–6 with no matching `<a>` opening. Invalid HTML.
9. **`RewriteEngine On` in `.htaccess` appears AFTER the SSL redirect block**, meaning the SSL redirect may silently fail depending on server configuration.
10. **Two contradictory phone hours displayed in header**: "Pon–Pt 8.00–16.00" and "Pon–Pt 10.00–16.00" — users see conflicting information before they even read the page.

---

## Phase 1 — Bug fixes & zero-cost wins
**Effort: ~3–4 hours | Impact: HIGH | Risk: None**

These are actual code bugs or trivially cheap changes. Do these first regardless of anything else. Each item is self-contained; they can be done in any order.

### 1.1 ✅ Fix H1 tags on every page (SEO critical)

**File:** `httpdocs/index.htm` lines 358, 379, 399  
**Problem:** Three `<h1>` headings exist where there should be one, and none of them is the main page topic.

```html
<!-- CURRENT (wrong) -->
<h1>O Firmie</h1>
<h1>Oferta</h1>
<h1>Ceny</h1>

<!-- FIX -->
<!-- Add ONE H1 above all three columns: -->
<h1>Profesjonalny Serwis Renault i Dacia w Gdańsku</h1>

<!-- Change the three column headers to H2: -->
<h2>O Firmie</h2>
<h2>Oferta</h2>
<h2>Ceny</h2>
```

**Check all subpages** — each should have exactly one `<h1>` matching its page topic. `/oferta/index.htm` (line 168) already has a correct `<h1>Oferta</h1>`.

---

### 1.2 ✅ Wrap all phone numbers in tel: links

**Files:** `index.htm`, `kontakt/index.htm`, `ofirmie/index.htm`, and any other page with phone numbers in body text  
**Problem:** Plain-text phone numbers. Mobile users cannot tap to call.

```html
<!-- index.htm — header (lines 122-124) -->
<!-- CURRENT -->
<p>Pon - Pt:  10.00 - 16.00 &nbsp;&nbsp; <b> 58-520-19-14</b></p>
<p><b> 690-182-354</b></p>

<!-- FIX -->
<p>Pon - Pt:  10.00 - 16.00 &nbsp;&nbsp; <a href="tel:+48585201914"><b>58-520-19-14</b></a></p>
<p><a href="tel:+48690182354"><b>690-182-354</b></a></p>

<!-- index.htm — contact section (lines 612-614) -->
<!-- CURRENT -->
<p class="phone">(58) 520-19-14 </p>
<p class="phone">501-512-989 </p>

<!-- FIX -->
<p class="phone"><a href="tel:+585201914">58-520-19-14</a></p>
<p class="phone"><a href="tel:+48501512989">501-512-989</a></p>

<!-- kontakt/index.htm (lines 182-183) -->
<!-- CURRENT -->
<p>biuro: 58-520-19-14 , 690-182-354<br/>Zbigniew Marek: 501-512-989</p>

<!-- FIX -->
<p>biuro: <a href="tel:+48585201914">58-520-19-14</a>, <a href="tel:+48690182354">690-182-354</a><br/>
Zbigniew Marek: <a href="tel:+48501512989">501-512-989</a></p>
```

Apply the same pattern everywhere a phone number appears as text.

---

### 1.3 ✅ Add alt attributes to slider images

**File:** `httpdocs/index.htm` lines 203–213  
**Problem:** Slider `<img>` tags have `title` but no `alt`. Google Image Search cannot index them. Screen readers announce nothing.

```html
<!-- CURRENT -->
<li><img src="images/home-slider/slide01.jpg" title="RENO CAR - pogwarancyjny serwis renault - umów się"/></li>
<li><img src="images/home-slider/slide02.jpg" title="Profesionalna obsługa samochodów renault, dacia"/></li>

<!-- FIX — copy the title text into alt -->
<li><img src="images/home-slider/slide01.jpg"
     alt="RENO CAR - pogwarancyjny serwis renault - umów się"
     title="RENO CAR - pogwarancyjny serwis renault - umów się"/></li>
<li><img src="images/home-slider/slide02.jpg"
     alt="Profesjonalna obsługa samochodów Renault i Dacia"
     title="Profesjonalna obsługa samochodów Renault i Dacia"/></li>
<!-- ...repeat for slides 03–06 -->
```

Also fix the broken orphan `</a>` tags on slides 2–6 (remove them — they have no matching `<a>`):
```html
<!-- CURRENT (broken HTML) -->
<li><img src="images/home-slider/slide02.jpg" title="..."/></a></li>

<!-- FIX -->
<li><img src="images/home-slider/slide02.jpg" alt="..." title="..."/></li>
```

---

### 1.4 ✅ Fix contact form input type

**File:** `httpdocs/kontakt/index.htm` line 211  
**Problem:** `type="phone"` is not a valid HTML attribute value. Mobile browsers show a text keyboard instead of the numeric/tel keyboard.

```html
<!-- CURRENT -->
<input type="phone" class="form-control" id="phone" name="phone" required maxlength="11">

<!-- FIX -->
<input type="tel" class="form-control" id="phone" name="phone" required maxlength="15"
       pattern="[0-9\s\-\+]{7,15}" autocomplete="tel">
```

Also increase `maxlength` from 11 to 15 to accommodate international format (`+48 585 201 914`).

---

### 1.5 ✅ Fix logo and header links HTTP → HTTPS

**Files:** `index.htm` lines 110, 116; same in all subpages  
**Problem:** Logo anchor and header URL text link to `http://www.renocar.pl` instead of the HTTPS canonical URL. Causes mixed content warnings and breaks referral chains.

```html
<!-- CURRENT -->
<a href="http://www.renocar.pl" title="...">

<!-- FIX — all occurrences in all files -->
<a href="https://www.renocar.pl" title="...">
```

---

### 1.6 ✅ Move bxSlider CSS to `<head>`

**File:** `httpdocs/index.htm` around line 747  
**Problem:** `<link href="jquery.bxslider/jquery.bxslider.css">` is inside `<body>`, after the slider markup. This causes FOUC — the slider renders unstyled for a moment on every page load.

```html
<!-- Move this line from body to <head>, after style-modern.css: -->
<link href="jquery.bxslider/jquery.bxslider.css" rel="stylesheet" />
```

---

### 1.7 ✅ Fix duplicate jQuery load on kontakt page

**File:** `httpdocs/kontakt/index.htm`  
**Problem:** jQuery 1.12.4 is loaded from Google CDN on line 24 AND again from the local file on line ~302. Double load, 90 KB wasted.

```html
<!-- REMOVE this line from <head>: -->
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>

<!-- Keep the local load at end of body (already there): -->
<script src="../js/jquery.min.js"></script>
<!-- form.js depends on jQuery, so move it to AFTER the jQuery load: -->
<script src="form.js"></script>
```

---

### 1.8 ✅ Fix contradictory opening hours in header

**Files:** All pages — header section  
**Problem:** Header shows two sets of hours:
- "Pon - Pt: 8.00 - 16.00" (workshop hours)
- "Pon - Pt: 10.00 - 16.00" (next to phone number)

```html
<!-- CURRENT — confusing -->
<p>Pon - Pt:  8.00 - 16.00 <i class="fa fa-home"></i></p>
<p>Pon - Pt:  10.00 - 16.00 &nbsp;&nbsp; <b>58-520-19-14</b></p>

<!-- FIX — one consistent set of hours -->
<p><i class="fa fa-clock-o"></i> Pon - Pt: 8.00 - 16.00</p>
<p><i class="fa fa-phone"></i> <a href="tel:+48585201914">58-520-19-14</a></p>
```

---

### 1.9 ✅ Fix `.htaccess` RewriteEngine placement

**File:** `httpdocs/.htaccess`  
**Problem:** `RewriteEngine On` appears on line 9, after the SSL/www redirect block. Apache processes rules sequentially and the directive must precede the rules.

```apache
<!-- FIX — correct order -->
RewriteEngine On

#### CERT SSL — force HTTPS and strip www
RewriteCond %{HTTP_HOST} ^(www\.)(.+) [OR]
RewriteCond %{HTTPS} off
RewriteCond %{HTTP_HOST} ^(www\.)?(.+)
RewriteRule ^ https://%2%{REQUEST_URI} [R=301,L]

#### OLD PAGE redirects
Redirect 301 /ogloszenia /promocje
Redirect 301 /mapa_strony /kontakt
```

---

### 1.10 ✅ Fix meta robots value

**Files:** All HTML files, `<head>` section  
**Problem:** `content="all"` is non-standard. Use the canonical value.

```html
<!-- CURRENT -->
<meta name="robots" content="all" />

<!-- FIX -->
<meta name="robots" content="index, follow" />
```

---

## Phase 2 — Google indexing & tracking
**Effort: ~3–4 hours | Impact: VERY HIGH | Risk: None**

These items directly affect how Google sees and ranks the site. They require no design changes.

### 2.1 Migrate to Google Analytics 4

**Files:** All HTML files — `<head>` section  
**Problem:** The `ga.js` / Universal Analytics library was shut down by Google in July 2023. Zero traffic data has been collected since then.

**Step 1:** Create a new GA4 property at analytics.google.com  
**Step 2:** Get the Measurement ID (format: `G-XXXXXXXXXX`)  
**Step 3:** Replace the old snippet on **every page**:

```html
<!-- REMOVE the entire old _gaq block -->
<script type="text/javascript">
  var _gaq = _gaq || [];
  ...
</script>

<!-- REPLACE WITH GA4 snippet (in <head>, before </head>) -->
<!-- IMPORTANT: only inject after cookie consent is given (see Phase 3.1) -->
<!-- For now, add as-is to restore any data collection -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

Note: After Phase 3.1 (GDPR consent), this snippet must be moved inside the consent callback.

---

### 2.2 Add Schema.org AutoRepair JSON-LD

**File:** `httpdocs/index.htm` — add in `<head>` before `</head>`  
**Impact:** Enables rich search results: hours, phone, rating, address visible directly in Google SERPs.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  "name": "RENO CAR – Pogwarancyjny Serwis Renault",
  "image": "https://www.renocar.pl/images/logo-motrio-new.png",
  "description": "Profesjonalny pogwarancyjny serwis samochodów Renault i Dacia w Gdańsku. Naprawy mechaniczne, elektryczne, przeglądy, klimatyzacja, hybrydy.",
  "url": "https://www.renocar.pl",
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
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "16:00"
    }
  ],
  "priceRange": "$$",
  "currenciesAccepted": "PLN",
  "paymentAccepted": "Cash, Credit Card, Bank Transfer",
  "sameAs": [
    "https://www.facebook.com/RENO-CAR-Pogwarancyjny-Serwis-Renault-291554670910421/"
  ]
}
</script>
```

Validate at: https://search.google.com/test/rich-results

---

### 2.3 Create `robots.txt`

**File:** `httpdocs/robots.txt` (new file)

```
User-agent: *
Allow: /
Disallow: /kontakt/vendor/
Disallow: /kontakt/captcha.php
Disallow: /lightbox/
Disallow: /font-awesome/
Disallow: /js/

Sitemap: https://www.renocar.pl/sitemap.xml
```

---

### 2.4 Create `sitemap.xml`

**File:** `httpdocs/sitemap.xml` (new file)  
After creating, submit the URL to Google Search Console.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.renocar.pl/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.renocar.pl/oferta/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.renocar.pl/kontakt/</loc>
    <changefreq>yearly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.renocar.pl/umow-sie/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.renocar.pl/promocje/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.renocar.pl/ofirmie/</loc>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

---

### 2.5 Add Open Graph + Twitter Card tags to all pages

**Files:** All HTML pages — add to `<head>` after `<meta name="description">`  
**Impact:** Proper image/title/description preview when links are shared on Facebook, WhatsApp, Messenger, LinkedIn.

**Create the OG preview image first:** `httpdocs/images/og-preview.jpg` — 1200×630px, logo + workshop photo + brand colors. This is a one-time asset creation task.

**Homepage template:**
```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="RENO CAR" />
<meta property="og:url" content="https://www.renocar.pl/" />
<meta property="og:title" content="RENO CAR – Serwis Renault i Dacia w Gdańsku" />
<meta property="og:description" content="Profesjonalny pogwarancyjny serwis Renault i Dacia w Gdańsku od 2000 roku. Naprawy, przeglądy, klimatyzacja, hybrydy." />
<meta property="og:image" content="https://www.renocar.pl/images/og-preview.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="pl_PL" />
<meta name="twitter:card" content="summary_large_image" />
```

Adjust `og:url` and `og:title` per page. `og:image` can be the same on all pages.

---

### 2.6 Add canonical tags to all pages

**Files:** All HTML pages — add to `<head>`

```html
<!-- index.htm -->
<link rel="canonical" href="https://www.renocar.pl/" />

<!-- oferta/index.htm -->
<link rel="canonical" href="https://www.renocar.pl/oferta/" />

<!-- kontakt/index.htm -->
<link rel="canonical" href="https://www.renocar.pl/kontakt/" />

<!-- umow-sie/index.htm -->
<link rel="canonical" href="https://www.renocar.pl/umow-sie/" />

<!-- promocje/index.htm -->
<link rel="canonical" href="https://www.renocar.pl/promocje/" />

<!-- ofirmie/index.htm -->
<link rel="canonical" href="https://www.renocar.pl/ofirmie/" />
```

---

### 2.7 Add preconnect hints for external resources

**Files:** All HTML pages — add to `<head>` before CSS `<link>` tags

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://www.googletagmanager.com">
```

---

## Phase 3 — Legal compliance & local SEO
**Effort: ~4–6 hours | Impact: HIGH | Risk: Low**

### 3.1 Replace cookie consent with GDPR-compliant solution

**Problem (critical):** The current `cookies-info.js` banner shows a notice but does NOT block `ga.js` from firing. Under Polish UODO/GDPR, analytics tracking cannot run before explicit user consent. This is a legal risk regardless of the site's size.

**Simplest compliant approach — add Cookiebot (free tier):**
1. Register at cookiebot.com, add domain `renocar.pl`
2. Get the Cookiebot script tag
3. Remove `cookies-info.js` load from all pages
4. Replace with:
```html
<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js"
        data-cbid="YOUR-CBID" data-blockingmode="auto" type="text/javascript"></script>
```
Cookiebot auto-blocks other scripts (including GA4) until consent is given.

**Alternatively, DIY minimal approach:**
- Move GA4 snippet behind a `localStorage`-based consent check
- Update `cookies-info.js` to set consent flag before loading GA4 dynamically

---

### 3.2 Fix and add opening hours to footer (all pages)

**Problem:** Hours appear only in the header (with conflicting values) and on the contact page. Footer has no hours.

**Add to every page footer, left column:**
```html
<div class="col-lg-4 col-md-4 col-sm-4 col-xs-12">
  <p>
    <strong>RENO CAR sp. z o.o.</strong><br/>
    ul. Andrzeja Struga 8/10A, Gdańsk<br/>
    Pon–Pt: <strong>8:00–16:00</strong><br/>
    <a href="tel:+48585201914">58-520-19-14</a><br/>
    <a href="tel:+48690182354">690-182-354</a>
  </p>
  <p>Copyright © <a href="https://www.sdk.it" target="_blank">SDK</a></p>
</div>
```

This also feeds directly into Schema.org trust signals.

---

### 3.3 Google Business Profile (GBP) audit

**This is off-site but the highest single impact item for local "serwis Renault Gdańsk" ranking.**

Checklist (manual steps, not code):
- [ ] Claim/verify ownership at business.google.com if not already done
- [ ] Confirm address matches site exactly: "ul. Andrzeja Struga 8/10A, 80-116 Gdańsk"
- [ ] Set hours: Monday–Friday 8:00–16:00
- [ ] Add all three phone numbers
- [ ] Upload 10+ interior/exterior photos
- [ ] Set business categories: "Auto repair shop" + "Renault dealer" (secondary)
- [ ] Write a 750-character business description mentioning Renault, Dacia, Gdańsk
- [ ] Enable messaging/booking link to https://renocar-zgloszenie.pl
- [ ] Respond to all existing reviews (both positive and negative)
- [ ] Add GBP "Write a review" link to the contact page

---

### 3.4 Add a Google Reviews display to homepage

After GBP is confirmed active (3.3), add a visible review count and star rating to the homepage. Options:

**Option A — Elfsight widget (easiest, ~€9/mo):**  
Register at elfsight.com, create a Google Reviews widget, paste embed code above the "Dlaczego My" section.

**Option B — Static curated quotes (free, zero dependency):**
```html
<div class="container subpage">
  <hr class="header-line">
  <div class="row">
    <div class="col-lg-12">
      <h2>Co mówią nasi klienci</h2>
      <p class="txtcenter">⭐⭐⭐⭐⭐ Średnia ocena na Google</p>
    </div>
    <div class="col-lg-4">
      <blockquote>
        <p>"Profesjonalna obsługa, uczciwe ceny. Polecam serwis wszystkim właścicielom Renault."</p>
        <footer>Jan K., Gdańsk</footer>
      </blockquote>
    </div>
    <!-- ...repeat for 2–3 more reviews -->
  </div>
  <p class="txtcenter">
    <a href="https://g.page/r/[GOOGLE-MAPS-CID]/review" class="btn btn-primary" target="_blank">
      Zostaw opinię na Google
    </a>
  </p>
</div>
```

Add Schema.org markup if using static quotes.

---

### 3.5 Archive old promotions

**File:** `httpdocs/promocje/index.htm`  
**Problem:** Promotions from 2012–2020 are mixed with current 2026 content. The page looks abandoned to both users and crawlers.

**Solution:**
1. Move all announcements older than 2023 to `httpdocs/promocje/archiwum/index.htm` (new file)
2. Add a link at the bottom of `/promocje/`: "Zobacz archiwum promocji"
3. Add `<meta name="robots" content="noindex, follow">` to the archive page (don't waste crawl budget on old content)

---

## Phase 4 — Mobile & Core Web Vitals
**Effort: ~4–6 hours | Impact: HIGH | Risk: Low**

Google uses Core Web Vitals (LCP, CLS, INP) as ranking signals. These are the practical fixes targeting measurable score improvements.

### 4.1 Fix image Cumulative Layout Shift (CLS)

**Problem:** Images without explicit `width` and `height` cause layout shift as they load — the page jumps. This directly hurts CLS score.

Add `width` and `height` to every `<img>` that doesn't have them. Start with above-the-fold images:

```html
<!-- Slider images — add actual pixel dimensions -->
<img src="images/home-slider/slide01.jpg" alt="..." width="1170" height="460">

<!-- Logo -->
<img src="images/logo-motrio-new.png" alt="..." width="300" height="100">

<!-- Section images -->
<img src="img/ofirmie.jpg" alt="..." width="360" height="240">
```

Check actual dimensions with: `file httpdocs/images/home-slider/slide01.jpg` or in any image editor.

---

### 4.2 Set `fetchpriority="high"` on first slider image

**File:** `httpdocs/index.htm` line 203  
**Impact:** Tells the browser to load the hero image first, directly improving LCP.

```html
<!-- CURRENT -->
<li><a href="https://renocar-zgloszenie.pl" ...>
  <img src="images/home-slider/slide01.jpg" ...>
</a></li>

<!-- FIX -->
<li><a href="https://renocar-zgloszenie.pl" ...>
  <img src="images/home-slider/slide01.jpg" alt="..." fetchpriority="high" loading="eager">
</a></li>
```

Keep remaining slides as `loading="lazy"`.

---

### 4.3 Defer non-critical JavaScript

**Files:** All HTML pages  
**Problem:** jQuery, Bootstrap, and the slider plugin are loaded synchronously, blocking page render.

```html
<!-- Add defer to all script tags at end of body -->
<script src="js/jquery.min.js" defer></script>
<script src="js/bootstrap.offcanvas.js" defer></script>
<script src="js/bootstrap.min.js" defer></script>
<script src="jquery.bxslider/jquery.bxslider.min.js" defer></script>
<script src="js/cookies-info.js" defer></script>
```

Note: `defer` scripts execute after DOM is ready in order, so dependencies are respected.

The inline `$(document).ready()` bxSlider init block needs no change — it already waits for DOM.

---

### 4.4 Convert slider images to WebP

**Impact:** 30–50% smaller files → faster LCP, lower bandwidth for mobile users on 4G.

```bash
# Install cwebp (macOS: brew install webp)
for f in httpdocs/images/home-slider/*.jpg; do
  cwebp -q 82 "$f" -o "${f%.jpg}.webp"
done
```

Then use `<picture>` fallback in slider HTML:
```html
<li>
  <picture>
    <source srcset="images/home-slider/slide01.webp" type="image/webp">
    <img src="images/home-slider/slide01.jpg" alt="..." fetchpriority="high" loading="eager" width="1170" height="460">
  </picture>
</li>
```

Repeat for all slider images and consider doing the same for large section images (ofirmie.jpg, oferta.jpg, sam.jpg).

---

### 4.5 Add `title` attribute to Google Maps iframes

**Files:** `index.htm`, `kontakt/index.htm`, `umow-sie/index.htm`  
**Reason:** Accessibility (screen readers announce iframe content) and Chrome Lighthouse score.

```html
<!-- CURRENT -->
<iframe src="https://www.google.com/maps/embed?..." ...></iframe>

<!-- FIX -->
<iframe src="https://www.google.com/maps/embed?..."
        title="Mapa dojazdu do RENO CAR, ul. Andrzeja Struga 8/10A, Gdańsk"
        ...></iframe>

<!-- Same for the booking iframe -->
<iframe src="https://renocar-zgloszenie.pl/"
        title="Formularz rezerwacji wizyty online – RENO CAR"
        ...></iframe>
```

---

### 4.6 Add `aria-label` to hamburger menu button

**Files:** All HTML pages — `<header>` section  
**Problem:** The hamburger button has `<span class="sr-only">Toggle navigation</span>` but no `aria-label` on the button itself. Some screen readers miss the `sr-only` span.

```html
<!-- CURRENT -->
<button type="button" class="navbar-toggle offcanvas-toggle" data-toggle="offcanvas" data-target="#js-bootstrap-offcanvas">
  <span class="sr-only">Toggle navigation</span>
  ...
</button>

<!-- FIX -->
<button type="button" class="navbar-toggle offcanvas-toggle"
        data-toggle="offcanvas" data-target="#js-bootstrap-offcanvas"
        aria-label="Otwórz menu nawigacji" aria-expanded="false">
  <span class="icon-bar"></span>
  <span class="icon-bar"></span>
  <span class="icon-bar"></span>
</button>
```

---

## Phase 5 — Content & conversion
**Effort: ~6–10 hours | Impact: MEDIUM–HIGH | Risk: Low**

### 5.1 Add FAQPage with schema to /oferta/

Add a visible FAQ section and schema markup — generates accordion-style rich results in Google SERPs. High click-through impact for "serwis Renault Gdańsk" queries.

**File:** `httpdocs/oferta/index.htm` — add new section before footer

```html
<div class="container subpage">
  <hr class="header-line">
  <div class="row">
    <div class="col-lg-12">
      <h2>Często zadawane pytania</h2>
      <div class="faq-item">
        <h3>Czy serwisujecie inne marki niż Renault?</h3>
        <p>Specjalizujemy się w samochodach Renault i Dacia. Obsługujemy również Opel Vivaro, Movano i Nissan Primastar.</p>
      </div>
      <div class="faq-item">
        <h3>Czy oferujecie samochód zastępczy?</h3>
        <p>Tak, podczas większych napraw udostępniamy samochód zastępczy dla naszych klientów.</p>
      </div>
      <div class="faq-item">
        <h3>Jak umówić się na wizytę?</h3>
        <p>Możesz umówić się online przez <a href="https://renocar-zgloszenie.pl">formularz rezerwacji</a>, telefonicznie pod numerem <a href="tel:+48585201914">58-520-19-14</a> lub mailowo na info@renocar.pl.</p>
      </div>
      <div class="faq-item">
        <h3>Jakie formy płatności akceptujecie?</h3>
        <p>Przyjmujemy płatności gotówką, kartą płatniczą oraz przelewem bankowym.</p>
      </div>
    </div>
  </div>
</div>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Czy serwisujecie inne marki niż Renault?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Specjalizujemy się w samochodach Renault i Dacia. Obsługujemy również Opel Vivaro, Movano i Nissan Primastar."
      }
    },
    {
      "@type": "Question",
      "name": "Czy oferujecie samochód zastępczy?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Tak, podczas większych napraw udostępniamy samochód zastępczy dla naszych klientów."
      }
    },
    {
      "@type": "Question",
      "name": "Jak umówić się na wizytę?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Możesz umówić się online przez formularz rezerwacji na renocar-zgloszenie.pl, telefonicznie pod numerem 58-520-19-14 lub mailowo na info@renocar.pl."
      }
    },
    {
      "@type": "Question",
      "name": "Jakie formy płatności akceptujecie?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Przyjmujemy płatności gotówką, kartą płatniczą oraz przelewem bankowym."
      }
    }
  ]
}
</script>
```

---

### 5.2 Add indicative pricing to /oferta/

**File:** `httpdocs/oferta/index.htm`  
**Impact:** Ranks for price-intent queries ("ile kosztuje przegląd Renault Gdańsk"). Increases trust.

Add a simple pricing table after the service lists:
```html
<div class="col-lg-12">
  <h2>Orientacyjny cennik</h2>
  <p>Ceny uzależnione od modelu pojazdu i zakresu prac. Podane kwoty są orientacyjne — skontaktuj się w celu dokładnej wyceny.</p>
  <table class="table">
    <thead><tr><th>Usługa</th><th>Cena od</th></tr></thead>
    <tbody>
      <tr><td>Przegląd okresowy (olej + filtr)</td><td>od 200 zł</td></tr>
      <tr><td>Wymiana rozrządu</td><td>od 600 zł</td></tr>
      <tr><td>Serwis klimatyzacji</td><td>od 150 zł</td></tr>
      <tr><td>Wymiana klocków hamulcowych (oś)</td><td>od 120 zł</td></tr>
      <tr><td>Diagnostyka komputerowa</td><td>od 80 zł</td></tr>
    </tbody>
  </table>
</div>
```

**Note:** Fill in actual prices from the workshop — the above figures are placeholder examples only.

---

### 5.3 Fix typos visible in page content

While editing files, fix the typos that appear in public content (they harm trust):

| Location | Current | Fix |
|---------|---------|-----|
| Homepage H2 service title | "Przeglądy Okresowe" (minor) | OK |
| oferta title tag | "Profesialny" | "Profesjonalny" |
| ofirmie title | "klika słów" | "kilka słów" |
| multiple pages | "Pogwaranycjny" | "Pogwarancyjny" |
| index.htm marketing | "Profesionalna" | "Profesjonalna" |
| slider title | "Profesionalna" | "Profesjonalna" |
| oferta H3 | "Profesionalny" | "Profesjonalny" |

---

## Phase 6 — Design modernization
**Effort: ~10–16 hours | Impact: MEDIUM | Risk: Medium (visual changes)**

These changes improve first impressions, mobile UX, and conversion — but require more careful testing.

### 6.1 Redesign homepage hero section

Replace the bxSlider with a static hero using CSS-only Ken Burns / fade transitions. This eliminates a heavy JS dependency, improves LCP, and modernizes the first impression.

**Approach:**
- Remove bxSlider entirely
- Single full-width image (best of the current 6 slides, compressed to WebP)
- Overlay `<h1>`, one-liner tagline, two CTA buttons
- Pure CSS fade between 2–3 images using `@keyframes` (no JavaScript)

```
Layout mockup:
┌─────────────────────────────────────────────┐
│ [Workshop hero image — full width]          │
│                                             │
│  RENO CAR                          [dark    │
│  Twój serwis Renault i Dacia        overlay]│
│  w Gdańsku od 2000 roku                     │
│                                             │
│  [ Umów wizytę ] [ Zadzwoń: 58-520-19-14 ] │
└─────────────────────────────────────────────┘
```

---

### 6.2 Add social proof section to homepage

Insert between the "Dlaczego My" and "Kontakt" sections:

```
┌─────────────────────────────────────────────┐
│  Co mówią nasi klienci                      │
│  ⭐⭐⭐⭐⭐ 4.9 / 5 na Google               │
│                                             │
│  "Polecam! Uczciwy warsztat, ..."           │
│  "Profesjonalna obsługa, ..."               │
│  "Znalazłem usterkę której dealer ..."      │
│                                             │
│  [ Sprawdź nas na Google ]                  │
└─────────────────────────────────────────────┘
```

---

### 6.3 Active page indicator in navigation

**Files:** All pages — nav `<ul>`  
All pages already set `class="active"` on the correct `<li>` — this is already done correctly. Verify `style-modern.css` underline is visible:

```css
/* Confirm this is rendering: */
.nav > li.active > a::after {
    width: 100%;
    left: 0;
}
```

If the visual indicator is not visible, add:
```css
.nav-justified > li.active > a {
    background: var(--navy) !important;
}
```

---

### 6.4 Improve the "Dlaczego My" section

The numbered list is functional but generic. Replace with specific, credible claims:

```
1. Działamy od 2000 roku — ponad 20 lat doświadczenia z Renault i Dacią
2. Sprzęt diagnostyczny CLIP — ten sam co u autoryzowanego dealera
3. Części oryginalne i sprawdzone zamienniki (Bosch, Valeo, Gates, SKF)
4. Trzy formy płatności: gotówka, karta, przelew
5. Samochód zastępczy podczas większych napraw
```

---

## Phase 7 — Long-term structural improvements
**Effort: 20–40+ hours | Impact: MEDIUM | Risk: High (full refactor)**

Do these only after Phases 1–5 are complete and you have GA4 data to measure improvement baselines.

### 7.1 Bootstrap 5 + jQuery removal

**Current:** Bootstrap 3 + jQuery 1.12.4  
**Target:** Bootstrap 5 + vanilla JS  
**Scope:** Full HTML/CSS/JS rewrite. Bootstrap 5 drops jQuery entirely and has a significantly improved grid, utilities, and accessibility.

Key changes:
- `col-xs-*` → `col-*` (Bootstrap 5 removes xs prefix)
- `hidden-sm/md/lg` → `d-sm-none d-md-block` etc.
- `.navbar-inverse` → `.navbar-dark`
- Off-canvas navigation: Bootstrap 5 has native Offcanvas component
- All jQuery calls replaceable with vanilla JS (fetch, querySelector, classList)

---

### 7.2 Replace deprecated Facebook SDK

**File:** `httpdocs/ofirmie/index.htm`  
**Current:** Facebook SDK v2.5 (from 2014)

Option A — Update to current SDK:
```html
<div id="fb-root"></div>
<script async defer crossorigin="anonymous"
    src="https://connect.facebook.net/pl_PL/sdk.js#xfbml=1&version=v21.0"
    nonce="RANDOM_NONCE"></script>
```

Option B — Replace with a simple "Follow us on Facebook" button (no SDK needed, no third-party JS dependency).

---

### 7.3 Unify booking form into main domain

**Current:** Appointment form is on `renocar-zgloszenie.pl`, embedded via iframe  
**Problem:** Different domain reduces trust, iframe content not indexed, harder to track conversions in GA4  
**Solution:** Move the form logic into `renocar.pl/umow-sie/` using the same PHP backend pattern as the contact form (`kontakt/handler.php`).

This eliminates the cross-domain iframe and allows:
- GA4 form submission tracking
- Consistent branding
- Proper mobile responsiveness without iframe height hacks

---

### 7.4 Add a blog / knowledge base section

**Path:** `httpdocs/blog/`  
**Minimum viable:** 4–6 articles per year on Renault-specific topics.

Suggested first articles:
- "Kiedy wymieniać rozrząd w Renault Clio IV?" — targets long-tail query
- "Serwis klimatyzacji w Renault — kiedy i ile kosztuje?" — high intent
- "Przegląd Renault Dacia — co obejmuje i ile trwa?" — educates buyers
- "Opel Vivaro vs Renault Trafic — serwis dostawczaków w Gdańsku"

Each article should use Schema.org `Article` markup and link back to `/oferta/`.

---

## Implementation session guide

Each phase is designed to be completable in a single focused session:

| Phase | Session time | Prerequisite | Can deploy independently? |
|-------|-------------|--------------|--------------------------|
| 1 — Bug fixes | 3–4 h | None | Yes |
| 2 — Indexing & tracking | 3–4 h | Phase 1 done | Yes |
| 3 — Legal & local SEO | 4–6 h | Phase 2 done (GA4 needed for GDPR) | Mostly yes |
| 4 — Mobile & CWV | 4–6 h | Phase 1 done | Yes |
| 5 — Content | 6–10 h | None | Yes |
| 6 — Design | 10–16 h | Phase 4 done | Yes (test on staging first) |
| 7 — Structural | 20–40 h | All prior phases | Requires staging environment |

**Recommended start order:** 1 → 2 → 4 → 3 → 5 → 6 → 7

Start Phase 2.1 (GA4) immediately after Phase 1 so you begin accumulating traffic data before any further changes. Everything else builds on having working analytics.

---

---

## Phase 1 — Post-implementation review fixes
**Applied after critical review of all Phase 1 changes (2026-05-09)**

### R1 ✅ H2 color regression fix (caused by 1.1)
**Problem:** Changing "O Firmie", "Oferta", "Ceny" from `<h1>` to `<h2>` caused them to render red (`#e00008`) instead of navy (`#282b3e`) because the global `h2` style uses the Motrio red color. This was an unintended visual regression.

**Fix:**
- Added `class="section-nav-title"` to all three `<h2>` tags in `index.htm`
- Added CSS rule to `css/style-modern.css`:
  ```css
  h2.section-nav-title {
      color: var(--navy);
      font-size: 32px;
      font-weight: bold;
  }
  ```

### R2 ✅ Removed leftover placeholder comment from kontakt head
A `<!-- contact form scripts loaded at end of body after jQuery -->` comment was left in `kontakt/index.htm` head as a trace of the jQuery deduplication fix. Removed.

### R3 ⚠️ Known pre-existing issues (not fixed — out of Phase 1 scope)
- `ofirmie/index.htm` body text still says "8.00 do 17.00" — conflicts with the now-corrected header (16.00). Needs content edit in Phase 5.
- `cookies/index.htm` nav has `<li><a href="../mechanicy">Mechanicy</a></li>` not commented out, unlike all other pages. Fix in Phase 6 or as a standalone cleanup.
- `ofirmie/index.htm` footer has a dead link `<a href="../cennik">Cennik</a>` (page does not exist). Pre-existing — fix during Phase 3 footer update.

---

*Plan prepared by Google/SEO Expert review — May 2026*  
*Companion to: `ANALYSIS.md`*
