# RENO CAR → MOTRIO — Style Alignment Analysis & Vision

**Analyst:** Senior Web Developer
**Date:** 2026-06-27
**Subject:** Restyle `renocar-webpage/httpdocs/` (www.renocar.pl) to follow the visual style of [motrio.pl](https://www.motrio.pl/)
**Companion doc:** [`ANALYSIS.md`](./ANALYSIS.md) (general site audit — SEO, performance, tech debt)

> Scope note: **images and the logo are out of scope** (handled separately). This document
> focuses purely on **style and layout**. It is a *vision/analysis* deliverable — implementation
> is a separate, later task. Every change and analysis item carries a **Grade** (priority/impact)
> and a **Workload** (effort) so the work can be prioritised and budgeted.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Motrio.pl Design System (ground truth)](#2-motriopl-design-system-ground-truth)
3. [Current RENO CAR Baseline](#3-current-reno-car-baseline)
4. [Gap Analysis](#4-gap-analysis)
5. [Exclusions & Partner-Link Strategy](#5-exclusions--partner-link-strategy)
6. [Grading & Workload Scheme](#6-grading--workload-scheme)
7. [Change Catalog](#7-change-catalog)
8. [Phased Roadmap](#8-phased-roadmap)
9. [Risks & Constraints](#9-risks--constraints)
10. [Verification Approach](#10-verification-approach)
11. [Appendix — Captured Motrio Tokens](#11-appendix--captured-motrio-tokens)

---

## 1. Executive Summary

RENO CAR is an **authorized Motrio partner** — a single Renault/Dacia workshop in Gdańsk.
Motrio.pl is the brand's **national portal and an aggregator of many partner workshops**. The
goal is to make the renocar site *look and feel* like a Motrio property, so the partnership
reads visually, **without** importing the features that only make sense for an aggregator.

**The good news — the foundations already match.** A live inspection of motrio.pl shows it uses
the **same typeface (Poppins)** and the **same brand red (`#e00008`)** that renocar already
uses, on white backgrounds with near-black body text. We are not changing the brand; we are
changing the **visual language** layered on top of it.

The gap is in **form, not colour**: Motrio uses pill-shaped buttons, bold uppercase headings,
a full-bleed photographic hero, a charcoal footer, diagonal/angular accents, numbered outline
circles, blog-style cards, and a persistent dual call-to-action bar on **both desktop and
mobile**. renocar currently uses a bordered carousel, mixed-case headings, rounded-rectangle
buttons, a navy footer, and a mobile-only CTA bar.

A second advantage: `httpdocs/css/style-modern.css` already added a "modern overrides" layer
(card shadows, near-pill uppercase buttons, circular badges, a fixed back-to-top, a mobile CTA
bar). Many of the changes below are therefore **small deltas on existing code**, not rewrites.

### Confirmed decisions driving this document

| Decision | Choice |
|----------|--------|
| **Scope / depth** | *Restyle + rebuild key sections* — stay on **Bootstrap 3**; global CSS restyle plus targeted HTML rebuilds of the hero, services and CTA bar. **No** Bootstrap 5 migration. |
| **Motrio cross-links** | *Partner badge + link only.* A single "Autoryzowany partner Motrio" badge/section links to motrio.pl. No locator, service-detail or oil-selector links. |
| **Sections to adapt** | All four: **full-bleed hero**, **visual services showcase**, **"Dlaczego my" numbered circles**, **blog-style news cards**. |
| **Booking CTA** | **Persistent dual bottom bar on desktop + mobile** ("Zadzwoń" + "Umów się" → renocar-zgloszenie.pl); keep the homepage booking embed. |

### Headline numbers

- Recommended **A + B** work (core look + strong improvements): **~30–38 h**.
- Optional **C** items (nav-collapse, PHP include enabler): **~10 h** extra.
- Fastest visible convergence comes from **Phase 1 global tokens** (buttons, headings, footer,
  CTA bar) — a few hours of CSS that touches every page at once.

---

## 2. Motrio.pl Design System (ground truth)

Captured directly from the live site (computed styles + screenshots), not guessed.

### 2.1 Colour tokens

| Token | Value | Notes |
|-------|-------|-------|
| Brand red | `#e00008` (`rgb(224,0,8)`) | **Identical to renocar.** Buttons, accents, headings, CTA bar. |
| Body text | `#212529` | renocar uses `#272626` — visually identical. |
| Page background | `#ffffff` | Same. |
| Footer background | `#4e4e4e` (charcoal) | renocar uses navy `#282b3e` — **differs**. |
| "Why us" badge border | `#000000` (thin), number in red | Outline circle, not a filled chip. |

Motrio is built on **Bootstrap 5** (the `--bs-*` custom properties are present); the brand red
is applied via custom classes, not by overriding `--bs-primary`.

### 2.2 Typography

| Element | Motrio | Notes |
|---------|--------|-------|
| Family | **Poppins**, sans-serif | Same family renocar already loads. |
| Body | 16px / line-height 24px (1.5) / `#212529` | — |
| H2 section title | **28px / 700 / UPPERCASE** / `#212529` | e.g. "ŚWIAT KOMPLEKSOWEJ OBSŁUGI TWOJEGO SAMOCHODU". |
| H2 accent (red) | **28px / 700 / UPPERCASE** / `#e00008` | e.g. "3 POWODY, DLA KTÓRYCH WARTO WYBRAĆ SERWIS MOTRIO". |
| H3 sub-head | 26px / 500 | Red (`#e00008`) for tool/category names, dark for content. |

**Takeaway:** the Motrio "voice" is **bold + UPPERCASE** headings, with red reserved for accent
headings and interactive labels.

### 2.3 Buttons

Two button sizes, both **fully pill-shaped** (`border-radius: 32px`):

| Variant | bg | text | radius | padding | weight | transform | size |
|---------|----|------|--------|---------|--------|-----------|------|
| Primary / hero ("Więcej") | `#e00008` | white | 32px | 11px 48px | 700 | UPPERCASE | 18px |
| Compact ("Znajdź garaż") | `#e00008` | white | 32px | 6px 24px | 500 | none | 12px |

renocar's current buttons are uppercase/bold/red already (good) but use an **8px** radius — the
single most recognisable Motrio tell is the **full pill**.

### 2.4 Layout motifs

- **Full-bleed photographic hero** — edge-to-edge desaturated workshop photo with a subtle dark
  overlay, a big white UPPERCASE headline, a one-line subtitle, and a red pill CTA ("WIĘCEJ").
- **Diagonal / angular accents** — slanted parallelograms behind imagery (the car sits on a red
  parallelogram), diagonal light-grey section dividers, and red/black chevron shapes.
- **Full-bleed image bands** — photos (e.g. a workshop storefront) span the full viewport width,
  cropped on an angle, between content sections.
- **Persistent dual bottom CTA bar** — fixed to the viewport bottom on **desktop and mobile**:
  left half red "ZNAJDŹ SERWIS MOTRIO" (pin icon), right half "UMÓW SIĘ NA WIZYTĘ" (calendar icon).
- **Minimalist header** — logo left; right side has a search icon, a red pill ("Znajdź garaż"),
  and a black "Menu" pill — the main navigation is collapsed behind "Menu" even on desktop.
- **Numbered outline circles** — "why choose us" items use a 66px circle with a thin border and a
  red number (not a filled chip).
- **Blog cards** — thumbnail left, bold UPPERCASE heading, grey excerpt, red "…Dowiedz się więcej".

### 2.5 Homepage section flow (top → bottom)

1. **Header** (logo · search · "Znajdź garaż" pill · "Menu").
2. **Hero** — full-bleed photo · "SERWISOWANIE SAMOCHODU MOŻE BYĆ TAKIE PROSTE!" · subtitle · red "WIĘCEJ".
3. **"Świat kompleksowej obsługi…"** — interactive services orbital: 12 service categories as
   circular icons arranged around a car; selecting one (e.g. "Klimatyzacja") shows its description.
4. **Red band** — "Znajdź najbliższy serwis MOTRIO" (locator CTA). *(aggregator feature)*
5. **Full-bleed workshop photo band** (angular crop).
6. **"3 powody…"** — why-choose section, red heading, numbered outline circles.
7. **Blog / news** — "Przydatne triki i porady…", thumbnail + heading + excerpt + "Dowiedz się więcej".
8. **Footer** — charcoal, multi-column.
9. **Persistent dual CTA bar.**

### 2.6 Navigation & aggregator features

Main nav (behind "Menu"): *O nas · Sieć MSC · Usługi MOTRIO · Blog i aktualności · Promocje ·
Selektor olejów · Skontaktuj się z nami*, split into **Dla Ciebie** (consumers) / **Dla
warsztatów** (workshops). Footer columns: *MOTRIO dla Ciebie · MOTRIO dla warsztatów (Dołącz do
sieci, Strefa Serwisów MOTRIO) · MOTRIO usługi (Klimatyzacja, Akumulator, Układ hamulcowy,
Diagnostyka elektroniczna, …)*.

The **bolded** items above are aggregator/network constructs — see [§5](#5-exclusions--partner-link-strategy).

---

## 3. Current RENO CAR Baseline

Static HTML/PHP on **Bootstrap 3**, jQuery, bxSlider. Shared markup is **duplicated inline** on
every page (no templating). Relevant existing structure (from `httpdocs/index.htm` + CSS):

- **Header** — navy `#282b3e` band with logo + opening hours + phone (`tel:` links already), then
  a **red `#e00008` horizontal nav bar** with justified UPPERCASE links (Strona Główna, Umów się,
  Promocje, Oferta, O Firmie, Kontakt). Off-canvas hamburger on mobile.
- **Hero** — `bxSlider` fade carousel of 6 images, wrapped in a `.container` with a 2px navy
  border + shadow; captions injected from `title` attributes (one slide already links to the
  booking site).
- **Services** — `.marketing` light-grey band with **4 `.market-box` cards** (Font Awesome icon
  on a red rounded square + H2 + description). `style-modern.css` already gives these cards a
  shadow + hover lift.
- **Intro cards** — 3 cards (O Firmie / Oferta / Ceny) with `.img-big` + text + red "więcej »" button.
- **News** — "Najnowsze ogłoszenie": `.news-wyd` blocks; the latest embeds the
  `renocar-zgloszenie.pl` booking form in an `<iframe>`.
- **"Dlaczego My"** — 5 `.testimonials` rows; `style-modern.css` already makes the number badges
  **circular (44px, red fill, white number)**.
- **Contact / map** — phone `tel:` links + Google Maps iframe.
- **Footer** — navy `#282b3e` with a 4px red top border, SDK copyright + duplicated nav links.
- **Mobile CTA bar** — `.mobile-cta-bar` (hidden ≥768px): "Zadzwoń" + "Umów się". **Already exists,
  mobile-only** — the foundation for the persistent bar.

Buttons (`.btn-primary`) are already red, uppercase, bold (via `style-modern.css`) with an **8px**
radius. Headings are **not** uppercase (`h1` navy 35px, `h2` red 32px); `h3` already is.

---

## 4. Gap Analysis

| Element | Motrio.pl | RENO CAR today | Gap size |
|---------|-----------|----------------|----------|
| Typeface | Poppins | Poppins | **None ✓** |
| Brand red | `#e00008` | `#e00008` | **None ✓** |
| Body text | `#212529` | `#272626` | None ✓ |
| Buttons | Full pill (32px), uppercase, bold | Rounded (8px), uppercase, bold | Small |
| Headings | Bold UPPERCASE; red accent heads | Mixed case; red `h2` | Medium |
| Hero | Full-bleed photo + overlay + pill CTA | Bordered carousel in a container | Large |
| Services | Visual cards / circular icons | Icon boxes (already card-like) | Small–Medium |
| "Why us" | 66px outline circles | 44px filled red circles | Small |
| News | Blog cards (thumb+excerpt+link) | Text blocks + embed | Medium |
| Footer | Charcoal `#4e4e4e`, multi-column | Navy `#282b3e` | Small |
| CTA bar | Persistent, **desktop + mobile** | Mobile-only | Medium |
| Section accents | Diagonal/angular, full-bleed bands | Rectangular, red underline rule | Large |
| Header/nav | Minimalist, collapsed "Menu" | Full horizontal red nav bar | Medium (optional) |
| Framework | Bootstrap 5 | Bootstrap 3 | Out of scope (staying BS3) |

---

## 5. Exclusions & Partner-Link Strategy

Motrio's portal is an **aggregator**. The following are **excluded** from the renocar site
because renocar *is* the workshop — including them would confuse visitors:

| Excluded feature | Why it doesn't fit | Disposition |
|------------------|--------------------|-------------|
| Workshop locator ("Znajdź garaż" / "Znajdź najbliższy serwis MOTRIO") | renocar is one location, not a directory | Omit (the bottom-bar left slot is repurposed — see §7.8) |
| "Sieć MSC" network section | Network-membership branding | Omit |
| "Dla warsztatów" / "Dołącz do sieci" / "Strefa Serwisów" | Recruiting workshops | Omit |
| "Selektor olejów" (oil selector) | Portal-level tool | Omit |
| Deep per-service catalog ("Usługi MOTRIO") | Aggregator content surface | Omit (renocar keeps its own concise offer) |

**Partner link (the one approved cross-reference):** a single **"Autoryzowany Partner Motrio"**
badge/section that links to `https://www.motrio.pl/`. Recommended placements: a small badge in
the header/hero area **and** a short "Część sieci Motrio" line in the footer (both point to the
same URL). This reinforces cooperation without turning renocar into a mini-portal. *(Logo asset
supplied separately, per scope.)*

---

## 6. Grading & Workload Scheme

Every row in the change catalog and roadmap carries both axes:

**Grade** — priority / visual impact toward the Motrio look:

- **A** — core to the Motrio look; high visual impact. Do first.
- **B** — strong improvement; clearly on-brand.
- **C** — polish / optional; nice-to-have.

**Workload** — effort in hours, **with cross-page HTML propagation already included** (see §9):

- **S** — ≤ 1 h
- **M** — 1–3 h
- **L** — 3–6 h
- **XL** — 6 h+

---

## 7. Change Catalog

> CSS-only rows edit one or two shared stylesheets and apply to **all pages at once**.
> Rows marked "per-page HTML" must be repeated across the ~8 page files (workload reflects this).

### 7.1 Global design tokens — *fastest, highest leverage*

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| 1 | **Pill buttons** — change `.btn-primary` radius 8px → **32px**; add a larger hero-CTA variant (18px, 48px padding). Already uppercase/bold/red. | `css/style-modern.css` | **A** | **S** |
| 2 | **Heading system** — make `h1`/`h2` UPPERCASE + bold at Motrio scale (~28px); add a `.heading-accent` red UPPERCASE treatment for "why us"/section heads. | `css/style.css` + `css/style-modern.css` | **A** | **M** |
| 3 | **Diagonal/angular accent utilities** — reusable CSS for `clip-path` diagonal section dividers and full-bleed photo bands; a `.accent-parallelogram` helper. | `css/style-modern.css` | **B** | **L** |
| 4 | **Section rhythm** — full-bleed alternating section backgrounds (white / `#f4f5f7`), increased vertical spacing to match Motrio's airier layout. | `css/style-modern.css` | **B** | **M** |

### 7.2 Header & navigation

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| 5 | **Header restyle** — tighten to a Motrio-style minimalist bar (logo left; phone/hours + a red **pill "Umów się"** CTA + partner badge right); restyle the existing BS3 nav (it already has uppercase + an underline-on-hover effect in `style-modern.css`). | CSS + per-page HTML (×8) | **B** | **L** |
| 6 | *(Optional)* **Collapse desktop nav behind "Menu"** — replicate Motrio's hidden-nav pattern on desktop. Bigger JS/markup change; lower value for a 6-link site. | CSS + JS + per-page HTML (×8) | **C** | **L** |

### 7.3 Hero (homepage) — full-bleed

Replace the bordered carousel with a full-bleed photo hero. (bxSlider can be retired on the home
page or kept as a CSS-only full-bleed slideshow; photo selection is handled separately.)

```
BEFORE (renocar)                         AFTER (Motrio-style)
┌───────────────────────────┐           ┌─────────────────────────────────────┐
│  .container                │           │ [ full-bleed desaturated workshop ]  │
│  ┌─────────────────────┐   │           │ [ photo + subtle dark overlay     ]  │
│  │ bxSlider (2px navy   │  │    ──►     │                                      │
│  │ border, 6 images,    │  │           │  SERWISOWANIE TWOJEGO RENAULT        │
│  │ small caption)       │  │           │  MOŻE BYĆ PROSTE                     │
│  └─────────────────────┘   │           │  Pogwarancyjny serwis Renault i…     │
│                            │           │  ( UMÓW SIĘ )  ‹red pill›            │
└───────────────────────────┘           └─────────────────────────────────────┘
```

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| 7 | **Full-bleed hero** — new hero markup (heading + subtitle + red pill CTA → renocar-zgloszenie.pl), full-bleed CSS with overlay + desaturation; retire/relayout bxSlider on home. | `index.htm` + CSS | **A** | **L** |

### 7.4 Services showcase

Keep renocar's **own four services** (not Motrio's 12). Restyle the `.market-box` cards into a
cleaner Motrio-style tile grid with circular icons. (The full interactive orbital-around-a-car is
intentionally **not** reproduced — it is complex and aggregator-flavoured.)

```
BEFORE                                AFTER
┌────┬──────────────┐  (×4)           ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ ▢  │ NAPRAWY      │                 │   (◯)   │ │   (◯)   │ │   (◯)   │ │   (◯)   │
│red │ MECHANICZNE  │      ──►         │ NAPRAWY │ │PRZEGLĄDY│ │ELEKTRYKA│ │ HYBRYDY │
│sq  │ oleje, płyny │                 │ ─────── │ │ ─────── │ │ ─────── │ │ ─────── │
└────┴──────────────┘                 │ desc…   │ │ desc…   │ │ desc…   │ │ desc…   │
                                      └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| 8 | **Service tiles** — circular icon treatment, centered card layout, hover state; reuse existing `.market-box` + Font Awesome icons. | `index.htm` + CSS | **A** | **M** |

### 7.5 "Dlaczego my" numbered circles

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| 9 | **Outline number circles** — restyle `.testimonials span` from 44px red-filled to **66px white circle, thin border, red number**; align list to Motrio's "powody" layout. (Badges are already circular — small delta.) | `index.htm` + CSS | **B** | **S** |

### 7.6 News / blog cards

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| 10 | **Blog-style cards** — restyle Promocje + the homepage "Najnowsze ogłoszenie" block into thumbnail + bold UPPERCASE heading + grey excerpt + red "Dowiedz się więcej" link. Keep the booking embed in its own block. | `promocje/index.htm` + `index.htm` + CSS | **B** | **M** |

### 7.7 Footer

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| 11 | **Footer recolor + polish** — navy `#282b3e` → **charcoal `#4e4e4e`** (keep the red accent border); optional multi-column layout (Kontakt · Godziny · Nawigacja · Partner Motrio). Recolor is CSS-only; columns add per-page HTML. | CSS (+ per-page HTML if columns) | **B** | **M** |

### 7.8 Persistent dual CTA bar (desktop + mobile)

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| 12 | **Persistent CTA bar** — extend the existing mobile-only `.mobile-cta-bar` to **show on desktop too**, styled as Motrio's full-width split bar: left "Zadzwoń" (`tel:`), right "Umów się" (→ renocar-zgloszenie.pl). Add the markup to every page (currently homepage-only). | CSS + per-page HTML (×8) | **A** | **M** |

> The left slot reuses Motrio's bar pattern but, instead of a locator, surfaces renocar's
> strongest single-workshop action ("Zadzwoń"). This keeps the Motrio look while respecting §5.

### 7.9 Partner Motrio badge

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| 13 | **"Autoryzowany Partner Motrio" badge + link** — badge in header/hero and a "Część sieci Motrio" footer line, both linking to motrio.pl. | per-page HTML + CSS | **B** | **M** |

### 7.10 Excluded (documented for completeness — 0 h)

Workshop locator as a feature · "Sieć MSC" · "Dla warsztatów" / "Dołącz do sieci" · oil selector ·
per-service Motrio catalog links. (Rationale in §5.)

### 7.11 Enabler (optional, architectural)

| # | Change | Files | Grade | Workload |
|---|--------|-------|-------|----------|
| E | **Shared header/footer PHP include** — the site already runs PHP (`kontakt/handler.php`). Extracting the duplicated header/nav/footer/CTA-bar into `inc/header.php` + `inc/footer.php` removes the **8× edit multiplier** for all current and future structural changes. Pays for itself across items 5, 12, 13. | new `inc/` + per-page edit | **C** | **L** |

### 7.12 Design / asset prerequisites (analysis items)

These are not code, but they gate the visual rows and carry effort:

| Item | Needed for | Grade | Workload |
|------|-----------|-------|----------|
| Hero photo selection + desaturation treatment | #7 | A | S* |
| Diagonal accent shapes (SVG/clip-path values) | #3 | B | S* |
| Service icon set confirmation (Font Awesome vs custom) | #8 | A | S* |
| News thumbnails | #10 | B | S* |

\* *Asset production itself is handled separately (out of scope); these S estimates cover only
the decision/spec time within this workstream.*

---

## 8. Phased Roadmap

Ordered for **fastest visible convergence first** (global CSS that hits every page), then section
rebuilds, then polish.

### Phase 1 — Global tokens (CSS-first, site-wide) · **~6–8 h**
Items **1, 2, 11, 12**. Pill buttons, uppercase heading system, charcoal footer, persistent CTA
bar. After this phase the whole site already "reads" Motrio on every page with minimal HTML risk.

### Phase 2 — Key section rebuilds (homepage-led) · **~12–16 h**
Items **7, 8, 9, 10, 13**. Full-bleed hero, service tiles, "why us" circles, blog cards, partner
badge. This is where the homepage transforms.

### Phase 3 — Accents, header & enablers · **~10–14 h**
Items **3, 4, 5**, plus optional **6** and **E**. Diagonal accents, section rhythm, header
minimalism, optional desktop nav-collapse, and the PHP include that de-duplicates markup.

**Recommended commitment (A + B):** ~30–38 h. **With optional C (6, E):** ~40–48 h.

> Tip: schedule the **PHP include (E)** *before* Phase 2/3 if budget allows — it converts every
> later per-page HTML edit from "×8" to "×1".

---

## 9. Risks & Constraints

- **No templating (the dominant workload driver).** All ~8 pages — `index.htm`, `oferta/`,
  `ofirmie/`, `kontakt/`, `promocje/`, `umow-sie/`, `cookies/`, and the orphaned `mechanicy/` —
  duplicate the header/nav/footer inline. CSS changes propagate for free; **HTML changes must be
  applied to each page**. Item **E** mitigates this.
- **Bootstrap 3 ceiling.** Staying on BS3 means some BS5-native niceties (e.g. utility-driven
  layouts) must be hand-rolled in custom CSS. Acceptable per the chosen scope; flagged because a
  future BS5 migration (see `ANALYSIS.md`) would make some of these items cheaper.
- **bxSlider entanglement.** The hero rebuild (#7) touches jQuery + bxSlider init in `index.htm`;
  removing/relaying it must not break the slider plugin load elsewhere.
- **`style.css` vs `style-modern.css` precedence.** `style-modern.css` loads last and already
  overrides many rules — new rules should extend that file to keep the cascade predictable.
- **Out-of-scope assets.** Hero/news/partner imagery and the logo are delivered separately; the
  visual rows assume those assets arrive (placeholders acceptable during implementation).
- **Don't import aggregator UX.** Keep §5 exclusions firmly out, or the single-workshop value
  proposition gets diluted.

---

## 10. Verification Approach

**This document (review):**
- Every change row has a **Grade + Workload**; the four confirmed decisions (§1) are reflected.
- Excluded aggregator features are listed with rationale; only the **partner badge** links out.

**The future implementation (when built):**
1. Open every page (`index`, `oferta`, `ofirmie`, `kontakt`, `promocje`, `umow-sie`, `cookies`)
   locally and at mobile widths (≤480px, 768px) and desktop (≥992px).
2. Compare side-by-side against the motrio.pl reference: pill buttons, uppercase headings,
   charcoal footer, full-bleed hero, numbered circles, blog cards, diagonal accents.
3. Confirm the **persistent CTA bar shows on desktop *and* mobile** and that "Umów się" reaches
   `renocar-zgloszenie.pl` and "Zadzwoń" dials.
4. Confirm **CSS-only changes propagated to all pages** automatically, and **per-page HTML edits
   (header, footer, CTA bar, partner badge) landed on every page** — the most common miss given
   the no-templating constraint.
5. Confirm the Motrio **partner badge** links to motrio.pl and that no excluded aggregator
   feature crept in.
6. Re-check the existing `ANALYSIS.md` concerns weren't regressed (clickable phones, lazy images,
   `tel:`/`mailto:` links).

---

## 11. Appendix — Captured Motrio Tokens

Raw values pulled from motrio.pl computed styles (for implementation reference):

```
Font (body)      : Poppins, sans-serif · 16px · line-height 24px · color rgb(33,37,41)
Brand red        : rgb(224,0,8)  = #e00008
Footer           : background rgb(78,78,78) = #4e4e4e · white text · padding 48px
Primary button   : bg #e00008 · white · border 1px solid #e00008 · radius 32px
                   · padding 11.2px 48px · weight 700 · UPPERCASE · 18px
Compact button   : radius 32px · padding 6px 24px · weight 500 · 12px · none
H2 section       : 28px · 700 · uppercase · #212529
H2 accent        : 28px · 700 · uppercase · #e00008
H3 sub           : 26px · 500 · (#e00008 for category/tool names)
"Why us" badge   : 66px · border-radius 50% · 1px solid #000 · number #e00008
Bottom CTA bar   : fixed · full-width split · left red "ZNAJDŹ SERWIS MOTRIO" · right "UMÓW SIĘ NA WIZYTĘ"
Framework        : Bootstrap 5 (renocar stays on Bootstrap 3 per scope)
```

---

*Prepared by Senior Web Developer — 2026-06-27. Companion to [`ANALYSIS.md`](./ANALYSIS.md).*
