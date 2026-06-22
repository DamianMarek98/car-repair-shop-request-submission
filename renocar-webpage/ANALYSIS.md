# RENO CAR – Webpage Analysis
**Analyst:** Senior Web Developer  
**Date:** 2026-05-09  
**Subject:** `/httpdocs` – www.renocar.pl – Pogwarancyjny Serwis Renault, Gdańsk

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technologies Used](#2-technologies-used)
3. [Current SEO & Google Indexing Techniques](#3-current-seo--google-indexing-techniques)
4. [Improvement Possibilities](#4-improvement-possibilities)
5. [Priority Action Plan](#5-priority-action-plan)

---

## 1. Project Overview

RENO CAR is a post-warranty Renault and Dacia service workshop based in Gdańsk, Poland (ul. Andrzeja Struga 8/10A). The website is a static HTML/PHP site serving as the company's primary online presence, providing information about services, promotions, a contact form, and an embedded online appointment booking form hosted on a separate domain (`renocar-zgloszenie.pl`).

**Pages:**

| URL | Title | Purpose |
|-----|-------|---------|
| `/` | RENO CAR - Pogwarancyjny Serwis Renault | Homepage |
| `/oferta/` | Oferta: RENO CAR | Services & pricing |
| `/ofirmie/` | O Firmie: RENO CAR | About the company |
| `/kontakt/` | Kontakt: RENO CAR | Contact & map |
| `/promocje/` | Promocje i ogłoszenia | Promotions & news |
| `/umow-sie/` | Umów się: RENO CAR | Online appointment booking |
| `/cookies/` | Cookies: RENO CAR | Cookie policy |

**Business details extracted from site:**
- Company: RENO CAR sp. z o.o. (also referenced as Trzeciak, Marek Sp. j.)
- NIP: 957-07-64-905
- Phone: 58-520-19-14, 690-182-354, 501-512-989
- Email: info@renocar.pl
- Hours: Monday–Friday 8:00–16:00

---

## 2. Technologies Used

### 2.1 Frontend Framework & Libraries

| Technology | Version | Role |
|-----------|---------|------|
| **Bootstrap** | 3.x | Responsive grid, components, off-canvas navigation |
| **jQuery** | 1.12.4 | DOM manipulation, AJAX form submission |
| **bxSlider** | ~4.x | Homepage hero image carousel |
| **Lightbox2** | latest | Image gallery overlay on `/oferta/` and `/ofirmie/` |
| **Bootstrap Offcanvas** | plugin | Mobile hamburger menu |
| **Font Awesome** | (local) | Icons throughout the site |
| **Google Fonts** | – | Poppins (400, 600, 700) |

### 2.2 Backend

| Technology | Role |
|-----------|------|
| **PHP** | Contact form handler (`kontakt/handler.php`) |
| **PHPMailer** | Email sending from contact form |
| **Google reCAPTCHA** | Bot protection on contact form |
| **PHPFormValidator** | Server-side form validation |
| **Custom CAPTCHA** | Image-based CAPTCHA fallback (`captcha.php`) |
| **Apache / .htaccess** | HTTPS redirect, www removal, URL rewrites |

### 2.3 CSS Architecture

| File | Role |
|-----|------|
| `css/bootstrap.min.css` | Bootstrap 3 base styles |
| `css/bootstrap.offcanvas.css` | Off-canvas navigation styles |
| `css/style.css` | Primary custom stylesheet (691 lines) |
| `css/style-modern.css` | CSS custom properties, transitions, modern enhancements (460 lines) |
| `jquery.bxslider/jquery.bxslider.css` | Slider plugin styles |
| `lightbox/css/lightbox.css` | Gallery lightbox styles |

**Color palette (from style.css):**
- Header/Footer: `#282b3e` (dark navy)
- Primary accent: `#e00008` (Motrio red)
- Body text: `#272626`
- Muted text: `#7c7b7b`
- Backgrounds: `#ffffff`, `#f4f5f7`

**Typography:**
- Google Fonts Poppins (400/600/700)
- Fallback: generic sans-serif

### 2.4 JavaScript Architecture

| File | Role |
|-----|------|
| `js/jquery.min.js` | Core jQuery |
| `js/bootstrap.min.js` | Bootstrap JS components |
| `js/bootstrap.offcanvas.js` | Mobile nav plugin |
| `js/cookies-info.js` | Cookie consent banner (custom, 39 lines) |
| `kontakt/form.js` | AJAX contact form submission (79 lines) |
| `lightbox/js/lightbox.min.js` | Gallery lightbox |
| `jquery.bxslider/jquery.bxslider.min.js` | Image slider |

### 2.5 Analytics & Tracking

| Tool | Implementation | Status |
|-----|---------------|--------|
| **Google Analytics** | Classic `ga.js` / `_gaq` | **Deprecated** – still tracking via UA-29684621-1 |
| **Google Search Console** | HTML file verification (`google76f5cd7632d7faa5.html`) | Active |

### 2.6 Third-Party Embeds

| Service | Location | Purpose |
|--------|---------|---------|
| Google Maps | `/kontakt/`, `/umow-sie/`, homepage | Workshop location |
| Facebook SDK v2.5 | `/ofirmie/` | Facebook page widget |
| `renocar-zgloszenie.pl` | `/umow-sie/`, homepage | Appointment booking iframe |

### 2.7 Server Configuration

- **HTTPS enforcement** via `.htaccess` 301 redirect
- **www removal** 301 redirect (canonical non-www domain)
- **URL aliases**: `/ogloszenia` → `/promocje`, `/mapa_strony` → `/kontakt`
- **Language**: `<html lang="pl">`
- **Charset**: UTF-8

---

## 3. Current SEO & Google Indexing Techniques

### 3.1 On-Page SEO

#### Title Tags
Every page has a unique, descriptive `<title>` tag following the pattern `{Page}: RENO CAR - {descriptor}`. Titles include primary keywords and brand name.

```
Homepage:  RENO CAR - Pogwarancyjny Serwis Renault
Oferta:    Oferta: RENO CAR - Profesionalny serwis pogwarancyjny od A do Z
O Firmie:  O Firmie: RENO CAR - klika słów o serwisie pogwarancyjnym renault
Kontakt:   Kontakt: RENO CAR - formy kontaktu z serwisem pogwarancyjnym Renault
Promocje:  Promocje i ogłoszenia: RENO CAR - aktualności, nowości od Serwisu Pogwarancyjnego
Umów się:  Umów się: RENO CAR - rezerwacja wizyty w serwisie pogwarancyjnym Renault
```

#### Meta Descriptions
All pages include unique `<meta name="description">` tags with relevant keywords, brand name, and a call-to-action tone. Character counts are within the ~155-character guideline on most pages.

#### Meta Keywords
All pages include `<meta name="keywords">` tags. While Google officially ignores this tag since 2009, other search engines (Bing, Yandex) may still consider it marginally.

#### Canonical Language Declaration
```html
<html lang="pl">
```
Correctly declares Polish language content.

#### Charset & Viewport
```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
```
Both present on all pages — critical for mobile indexing.

#### Robots Meta Tag
```html
<meta name="robots" content="all" />
```
Allows full crawling and indexing of all pages. Note: `content="all"` is a non-standard value — the correct standard form is `content="index,follow"`. In practice Google and Bing accept `all` as equivalent, but it should be corrected for strict compliance.

### 3.2 Technical SEO

#### HTTPS & www Canonicalization
`.htaccess` enforces HTTPS and strips `www` prefix via 301 redirects — both are positive ranking signals.

#### Google Search Console Verification
`google76f5cd7632d7faa5.html` file present in root — confirms ownership in Google Search Console.

#### Semantic HTML Structure
Pages use `<nav>`, `<header>`, `<footer>`, `<section>`, and `<article>` elements in some places, aiding crawler comprehension of page structure.

#### Alt Text on Images
All `<img>` elements have meaningful `alt` attributes describing the content. Examples:
- `alt="RENO CAR - Pogwarancyjny Serwis Renault"`
- `alt="Klimatyzacja samochodowa - Valeo"`
- `alt="Zestawienie kół na maszynie Nussbaum"`

This benefits both accessibility and image search indexing.

#### Lazy Loading
Select images use `loading="lazy"` attribute — reduces initial page load and improves Core Web Vitals.

#### 301 Redirects for Old URLs
`.htaccess` preserves link equity from old page paths:
```apache
/ogloszenia  → /promocje
/mapa_strony → /kontakt
```

#### Internal Linking
All main navigation links appear in both the header `<nav>` and footer, creating consistent internal link structure. The footer duplicate navigation reinforces crawlability.

### 3.3 Local SEO

#### Address & Phone in Content
Business address, multiple phone numbers, email, and NIP number are visible in page content (footer and contact page), making them parseable by crawlers for local intent queries.

#### Google Maps Embed
Embedded Google Maps on homepage, `/kontakt/`, and `/umow-sie/` provides geographic context to crawlers and confirms business location.

#### Location Keywords in Meta Tags
Geo-specific keywords like "warsztat renault w Gdańsku", "serwis renault Gdańsk" are present in homepage meta keywords.

### 3.4 Content SEO

#### Keyword Targeting
Consistent targeting of Polish-language queries:
- "serwis Renault" / "warsztat Renault"
- "pogwarancyjny serwis"
- "naprawa Renault/Dacia"
- City-specific: "Gdańsk"

#### Content Freshness (Promotions Page)
`/promocje/` contains dated announcements from 2012 through January 2026, demonstrating ongoing content updates — a positive signal for crawl frequency.

### 3.5 What Is Missing from SEO Standpoint

| Missing Element | Impact |
|----------------|--------|
| **Schema.org structured data** | No rich snippets (LocalBusiness, AutoRepair, Review, FAQPage) |
| **Open Graph / Twitter Card tags** | Poor social sharing preview |
| **robots.txt** | No crawl budget control |
| **XML sitemap** | No sitemap submitted to Search Console |
| **Canonical tags** | No `<link rel="canonical">` to prevent duplicate content |
| **Google Business Profile link** | No explicit GBP connection from site |
| **Breadcrumb navigation** | No breadcrumbs (usability + SEO) |

---

## 4. Improvement Possibilities

### 4.1 Critical Technical Debt

#### 4.1.1 Migrate from Universal Analytics to GA4
**Priority: HIGH**

Google has shut down Universal Analytics (UA-XXXXXX). The current `ga.js` implementation is using a deprecated tracking library that no longer processes hits. All traffic data is being lost.

```html
<!-- CURRENT (dead) -->
<script src="https://ssl.google-analytics.com/ga.js" async></script>

<!-- REPLACE WITH -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

#### 4.1.2 Upgrade Bootstrap 3 → Bootstrap 5
**Priority: MEDIUM**

Bootstrap 3 reached end-of-life. Bootstrap 5 drops jQuery dependency (significant performance gain), improves accessibility, and provides modern component patterns. This is a significant refactor but eliminates outdated dependencies.

#### 4.1.3 Upgrade jQuery 1.12.4
**Priority: MEDIUM**

jQuery 1.x is 10+ years old. At minimum upgrade to 3.x. Ideally, remove jQuery entirely given Bootstrap 5 no longer requires it — the site's jQuery usage is minimal (slider + form AJAX).

#### 4.1.4 Replace Deprecated Facebook SDK v2.5
**Priority: LOW**

Facebook SDK v2.5 is extremely outdated (current is v21). The Facebook page widget should be updated to the current version or replaced with a direct link/button.

#### 4.1.5 GDPR Cookie Consent Compliance
**Priority: HIGH**

The custom cookie banner (`cookies-info.js`) sets a `cookies_accepted` cookie and closes the bar on click, but it does not block Google Analytics or other tracking scripts from firing before consent is given. Under GDPR and Polish law (UODO), tracking scripts must not load until the user actively accepts. The current implementation is legally non-compliant.

**Recommendation:** Replace the custom banner with a proper Consent Management Platform (CMP) such as [Cookiebot](https://www.cookiebot.com/) or [Complianz](https://complianz.io/). The CMP should conditionally inject the GA4 snippet only after consent is granted.

#### 4.1.6 Orphaned `/mechanicy/` Page
**Priority: LOW**

A `mechanicy/` directory exists in `httpdocs` but the corresponding page is commented out of navigation. If it contains content, it should either be linked or removed. An unlinked but publicly accessible page is an indexability loose end and may confuse crawlers.

---

### 4.2 SEO Improvements

#### 4.2.1 Add Schema.org LocalBusiness / AutoRepair Structured Data
**Priority: HIGH**

This is the single highest-impact missing SEO element. Structured data enables rich snippets in search results (star ratings, hours, phone, address in the SERP itself).

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  "name": "RENO CAR - Pogwarancyjny Serwis Renault",
  "image": "https://www.renocar.pl/images/logo-motrio-new.png",
  "description": "Profesjonalny warsztat samochodów marki Renault i Dacia w Gdańsku.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ul. Andrzeja Struga 8/10A",
    "addressLocality": "Gdańsk",
    "postalCode": "80-116",
    "addressCountry": "PL"
  },
  "telephone": "+48585201914",
  "email": "info@renocar.pl",
  "url": "https://www.renocar.pl",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "08:00",
      "closes": "16:00"
    }
  ],
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 54.3520,
    "longitude": 18.6265
  },
  "priceRange": "$$",
  "sameAs": [
    "https://www.facebook.com/RENO-CAR-Pogwarancyjny-Serwis-Renault-291554670910421/"
  ]
}
</script>
```

#### 4.2.2 Add Open Graph & Twitter Card Meta Tags
**Priority: HIGH**

Currently, when a link to renocar.pl is shared on Facebook, WhatsApp, or social media, there is no preview image, title, or description. This costs free marketing exposure.

```html
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.renocar.pl/" />
<meta property="og:title" content="RENO CAR - Pogwarancyjny Serwis Renault | Gdańsk" />
<meta property="og:description" content="Profesjonalny serwis Renault i Dacia w Gdańsku. Naprawy mechaniczne, elektryczne, przeglądy, klimatyzacja." />
<meta property="og:image" content="https://www.renocar.pl/images/og-preview.jpg" />
<meta property="og:locale" content="pl_PL" />
<meta name="twitter:card" content="summary_large_image" />
```

#### 4.2.3 Create XML Sitemap
**Priority: HIGH**

A sitemap tells Google exactly which pages exist and their relative priority. Without it, deep pages risk not being indexed.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.renocar.pl/</loc><priority>1.0</priority></url>
  <url><loc>https://www.renocar.pl/oferta/</loc><priority>0.9</priority></url>
  <url><loc>https://www.renocar.pl/kontakt/</loc><priority>0.8</priority></url>
  <url><loc>https://www.renocar.pl/umow-sie/</loc><priority>0.8</priority></url>
  <url><loc>https://www.renocar.pl/promocje/</loc><priority>0.7</priority></url>
  <url><loc>https://www.renocar.pl/ofirmie/</loc><priority>0.6</priority></url>
</urlset>
```

Submit via Google Search Console after deployment.

#### 4.2.4 Create robots.txt
**Priority: HIGH**

Currently absent. Add a `robots.txt` to control crawl budget and submit the sitemap location:

```
User-agent: *
Allow: /
Disallow: /kontakt/vendor/
Disallow: /kontakt/captcha.php

Sitemap: https://www.renocar.pl/sitemap.xml
```

#### 4.2.5 Add Canonical Tags
**Priority: MEDIUM**

Prevent potential duplicate content penalties from trailing slashes or query parameters:

```html
<link rel="canonical" href="https://www.renocar.pl/" />
```

Each page should declare its canonical URL. This is especially important for `/umow-sie/` which renders external iframe content.

#### 4.2.6 Improve Meta Description Character Counts
**Priority: MEDIUM**

Several meta descriptions exceed 155 characters (Google truncates them in SERPs). Review and tighten to 120–155 characters, ensuring each ends with an implicit or explicit CTA.

#### 4.2.7 Add FAQPage Structured Data on Oferta/Homepage
**Priority: MEDIUM**

A FAQ section with Schema markup generates rich snippet accordions in Google results — highly visible for competitive service queries:

```json
{
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Ile kosztuje przegląd Renault?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Koszt przeglądu zależy od modelu i zakresu. Skontaktuj się z nami, aby uzyskać wycenę."
    }
  }]
}
```

#### 4.2.8 Core Web Vitals Optimization
**Priority: HIGH**

Several factors likely hurt CWV scores:
- Multiple render-blocking stylesheets loaded synchronously in `<head>`
- jQuery 1.12.4 and all scripts loaded without `defer` or `async`
- No image dimension attributes (`width`/`height`) on many images — causes layout shift (CLS)
- Slider plugin loads all images immediately — no lazy loading on non-visible slides
- No image format optimization (PNG/JPG where WebP would be 30–50% smaller)

**Fixes:**
```html
<!-- Add defer to non-critical scripts -->
<script src="js/bootstrap.min.js" defer></script>

<!-- Add dimensions to all images -->
<img src="..." width="800" height="600" alt="...">

<!-- Convert images to WebP with fallback -->
<picture>
  <source srcset="images/slide01.webp" type="image/webp">
  <img src="images/slide01.jpg" alt="...">
</picture>
```

---

### 4.3 Modern Design Improvements

#### 4.3.1 Hero Section Redesign
**Priority: HIGH**

The current 5-image generic bxSlider with overlay text is a pattern from 2012. It contributes to poor LCP (Largest Contentful Paint) by forcing the browser to load a large carousel JavaScript library upfront.

**Recommendation:** Replace the slider with a single high-quality full-viewport hero image or a CSS-only auto-advancing slideshow. Add a clear H1, one-liner value proposition, and a prominent CTA button ("Umów wizytę online").

```
┌─────────────────────────────────────────┐
│  [Hero Image: workshop interior]        │
│                                         │
│  RENO CAR                               │
│  Twój specjalista Renault i Dacia       │
│  w Gdańsku od 2000 roku                 │
│                                         │
│  [ Umów wizytę online ]  [ Zadzwoń ]    │
└─────────────────────────────────────────┘
```

#### 4.3.2 Typography Hierarchy & Whitespace
**Priority: MEDIUM**

The current layout is dense with small text and tight spacing characteristic of Bootstrap 3 default styles. Modern business sites use:
- Larger base font size (16–18px body, 2.5–4rem headings)
- Generous vertical rhythm (line-height 1.6–1.8)
- More whitespace between sections
- Clear typographic hierarchy (H1 > H2 > H3 visually distinct)

#### 4.3.3 Card-Based Service Layout
**Priority: MEDIUM**

The services section uses simple icon boxes. A modern approach uses elevated cards with hover states, clearer CTAs, and possibly pricing indicators:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  🔧      │ │  📋      │ │  ⚡      │ │  🔋      │
│ Naprawy  │ │Przeglądy │ │Elektryka │ │Hybrydy   │
│Mechanicz.│ │Okresowe  │ │          │ │Elektryki │
│          │ │          │ │          │ │          │
│[Dowiedz] │ │[Dowiedz] │ │[Dowiedz] │ │[Dowiedz] │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

#### 4.3.4 Reviews / Social Proof Section
**Priority: HIGH**

There is no customer review or testimonial section visible on the site. For a local service business, social proof is one of the strongest conversion drivers. Options:

1. **Embed Google Reviews widget** – displays live Google Business Profile reviews
2. **Static curated testimonials** – manually curated quotes with Schema.org `Review` markup
3. **Average rating display** – "4.8 ⭐ based on 120 Google reviews"

#### 4.3.5 Modern Navigation Pattern
**Priority: MEDIUM**

The current navigation is Bootstrap 3 navbar with border separators. Improvements:
- Sticky transparent-to-solid header on scroll (currently the `style-modern.css` adds some sticky behavior, but it can be refined)
- Active page indicator (current page highlighted in nav)
- Dropdown for secondary pages under a "More" item if needed

#### 4.3.6 Visual Identity Consistency
**Priority: MEDIUM**

Two logo files exist (`logo-motrio.png` and `logo-motrio-new.png`), suggesting an ongoing brand update. The site mixes Motrio branding with RENO CAR branding somewhat inconsistently. A brand audit should clarify:
- Primary logo (RENO CAR vs Motrio partner)
- Consistent color application (the red `#e00008` is Motrio red — correct for a Motrio partner)

#### 4.3.7 Dark Mode Support
**Priority: LOW**

Not essential, but adding CSS `prefers-color-scheme: dark` support is increasingly expected. Given the dark navy (`#282b3e`) already used in header/footer, a dark-mode variant would be achievable with CSS custom properties.

---

### 4.4 Business & Conversion Improvements

#### 4.4.1 Google Business Profile Integration
**Priority: HIGH**

The most impactful local SEO action for a service business. An optimized Google Business Profile (GBP) shows the business in the map pack for queries like "serwis Renault Gdańsk". From the site:
- Confirm the GBP is claimed and up to date
- Add a "Google Reviews" badge or widget linking to GBP reviews
- Add a `<link>` in the HTML header pointing to the GBP listing

#### 4.4.2 Online Appointment Flow Improvement
**Priority: HIGH**

Currently the appointment booking is embedded as an iframe from `renocar-zgloszenie.pl`. This creates several issues:
- **UX**: The iframe may not scale well on all devices
- **SEO**: Content inside iframes is not indexed by Google
- **Trust**: Users see a different domain in the iframe, potentially reducing conversion
- **Performance**: Loads an entire external site within an iframe

**Recommendation:** Integrate the booking form directly into the main domain, or at minimum ensure the iframe is responsive with proper `title` attribute for accessibility:
```html
<iframe src="https://renocar-zgloszenie.pl/" title="Formularz rezerwacji wizyty" style="width:100%; min-height:800px; border:none;" loading="lazy"></iframe>
```

#### 4.4.3 Click-to-Call Phone Numbers
**Priority: HIGH**

Phone numbers appear as plain text in several places. They should always be wrapped in `tel:` links for mobile users:

```html
<!-- CURRENT -->
(58) 520-19-14

<!-- SHOULD BE -->
<a href="tel:+585201914">58-520-19-14</a>
```

This is already done in the mobile CTA bar ("Zadzwoń" button) but not consistently across the site.

#### 4.4.4 Working Hours Prominence
**Priority: MEDIUM**

Opening hours (Monday–Friday 8:00–16:00) appear only in text on the contact page. For a service business, hours should be:
- Visible in the footer on every page
- Added to Schema.org structured data
- Showing real-time status: "Teraz otwarte" / "Zamknięte – otwieramy w poniedziałek o 8:00"

#### 4.4.5 Promotions Page Cleanup
**Priority: MEDIUM**

`/promocje/` contains announcements dating back to 2012 mixed with recent 2026 content. This creates cognitive overload and makes the page appear poorly maintained. Options:
- Archive old promotions (move to `/archiwum/`) 
- Show only the last 12 months on the main promotions page
- Add date labels more prominently so users can quickly identify recent content

#### 4.4.6 Service Pricing Transparency
**Priority: MEDIUM**

The current `/oferta/` page lists services but no pricing. For competitive local SEO and conversion, even indicative pricing ("Przegląd od 150 zł") increases trust and ranks for price-intent queries like "ile kosztuje przegląd Renault Gdańsk".

#### 4.4.7 Add a Blog / Knowledge Base
**Priority: LOW–MEDIUM**

A blog with articles like "Kiedy wymienić rozrząd w Renault Clio", "Jak przygotować Renault do zimy", etc. would:
- Generate long-tail organic traffic
- Position RENO CAR as an authority
- Provide shareable content for social media
- Create internal linking opportunities

Even 2–4 articles per year would be meaningful for a local business.

---

### 4.5 Accessibility Improvements

#### 4.5.1 Form Labels
**Priority: MEDIUM**

Contact form fields use `placeholder` attributes as the only label. When a user starts typing, the label disappears. All form inputs should have associated visible `<label>` elements.

#### 4.5.2 Skip Navigation Link
**Priority: LOW**

Add a visually hidden "Skip to main content" link as the first element in `<body>` for keyboard and screen reader users.

```html
<a href="#main-content" class="sr-only sr-only-focusable">Przejdź do treści</a>
```

#### 4.5.3 ARIA Roles & Landmarks
**Priority: LOW**

The hamburger menu toggle button lacks an `aria-label`. The slider should have `aria-live` regions or be pausable. These are WCAG 2.1 AA requirements.

#### 4.5.4 Color Contrast
**Priority: MEDIUM**

The muted gray text (`#7c7b7b` on `#ffffff`) has a contrast ratio of approximately 4.5:1 — borderline for WCAG AA. Body text and interactive elements should meet 4.5:1 minimum.

---

### 4.6 Performance Improvements

#### 4.6.1 Eliminate Render-Blocking Resources
Multiple CSS and JS files are loaded synchronously in `<head>`. Non-critical CSS should be loaded asynchronously; JS should use `defer`.

```html
<!-- Non-critical CSS -->
<link rel="preload" href="css/style.css" as="style" onload="this.rel='stylesheet'">

<!-- All JS -->
<script src="js/jquery.min.js" defer></script>
<script src="js/bootstrap.min.js" defer></script>
```

#### 4.6.2 Image Optimization

| Action | Expected Gain |
|--------|--------------|
| Convert PNG/JPG → WebP | 30–50% smaller files |
| Add `width` + `height` attributes | Eliminates CLS |
| Lazy load below-fold images | Faster LCP |
| Set `fetchpriority="high"` on hero image | Faster LCP |
| Use responsive images (`srcset`) | Correct size per device |

#### 4.6.3 Resource Consolidation

Currently each page loads 8+ separate CSS files and 5+ JS files. HTTP/2 server push or bundling would reduce request count. A build tool like Vite or even a simple concatenation script would help.

#### 4.6.4 Font Loading Optimization

```html
<!-- Add preconnect for Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<!-- Use font-display: swap (already in the CSS import URL) -->
```

---

## 5. Priority Action Plan

Ordered by impact-to-effort ratio for a local service business:

| Priority | Action | Impact | Effort |
|--------|--------|--------|--------|
| 1 | **Migrate Google Analytics to GA4** | Restore all traffic data | 30 min |
| 1b | **GDPR-compliant cookie consent (CMP)** | Legal compliance | 2 h |
| 2 | **Add Schema.org AutoRepair JSON-LD** | Rich snippets, local SEO | 2 h |
| 3 | **Create robots.txt + XML sitemap** | Crawl control, indexing | 1 h |
| 4 | **Add Open Graph tags** | Social sharing previews | 1 h |
| 5 | **Make all phone numbers clickable** | Mobile conversion | 1 h |
| 6 | **Add WebP images + lazy loading** | Performance / CWV | 4 h |
| 7 | **Add canonical tags** | Prevent duplicate content | 1 h |
| 8 | **Google Business Profile optimization** | Map pack visibility | 2 h |
| 9 | **Integrate Google Reviews on site** | Trust & conversion | 3 h |
| 10 | **Add visible opening hours in footer** | UX + Schema | 1 h |
| 11 | **Redesign hero section** | First impression | 8 h |
| 12 | **Bootstrap 5 upgrade + jQuery removal** | Tech debt clearance | 20+ h |
| 13 | **Add FAQ structured data** | Rich snippets | 3 h |
| 14 | **Archive old promotions** | Content quality | 2 h |
| 15 | **Add pricing to service page** | Conversion + SEO | 4 h |

---

## Review Notes

After completing this analysis, the following observations stand out as the most important for the business owner to understand:

**The Good:**
- The site is functional, mobile-responsive (Bootstrap 3 grid), and indexed by Google (Search Console verification present).
- All pages have unique titles, descriptions, and image alt texts — foundational SEO is in place.
- HTTPS is enforced and www canonicalization is correct.
- The custom booking system on a separate domain (`renocar-zgloszenie.pl`) shows investment in digital customer workflow.
- The `style-modern.css` addition suggests recent attempts to modernize the CSS without a full rebuild — a pragmatic approach.

**The Critical Gaps:**
1. **Analytics is broken** — the `ga.js` / Universal Analytics library was retired by Google in July 2023. Every page visit since then has gone unmeasured. This must be fixed immediately (GA4 migration) to restore visibility into traffic and conversions.
2. **No structured data** — this is the highest-leverage missing SEO element. AutoRepair schema would enable the business's hours, rating, and phone number to appear directly in Google Search results, significantly increasing click-through rates.
3. **No sitemap or robots.txt** — two basic, low-effort files that every production website should have. Their absence means Google is guessing about the site's intended crawl scope.
4. **Social sharing is broken** — without Open Graph tags, any link shared to Facebook, WhatsApp, or LinkedIn appears as a bare URL with no image or description, wasting every social touchpoint.
5. **Cookie consent is GDPR non-compliant** — the custom banner does not block tracking scripts before user consent. This is a legal liability under GDPR/UODO and must be fixed before the GA4 migration to ensure the analytics setup is lawful from day one.

**Strategic Recommendation:**
The site's technical foundation (PHP backend, Bootstrap grid, semantic HTML, Polish-language keyword targeting) is solid for its age. Rather than a full rebuild, a targeted improvement sprint addressing items 1–10 from the priority table above would deliver significant measurable gains in organic visibility and conversion within 60–90 days, with minimal disruption to an operational business site.

A complete redesign (Bootstrap 5, modern JavaScript, new design system) should be planned as a separate, longer-term project — ideally after GA4 is in place so traffic baselines are available to measure the redesign's impact.

---

*Analysis prepared by Senior Web Developer — May 2026*
