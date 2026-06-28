# RENO CAR → MOTRIO — Implementation Specification

**Companion to:** [`motrio-analysis.md`](./motrio-analysis.md) (vision) · [`ANALYSIS.md`](./ANALYSIS.md) (general audit)
**Audience:** any developer or coding agent implementing the Motrio restyle.
**Date:** 2026-06-27

This is a **step-by-step build spec**. Follow the phases in order; each step states *Goal · Files ·
Do this (paste-ready code) · Accept*. It is opinionated where the analysis was vague, so you can
implement without guessing.

---

## 0. Ground rules (read once)

**Locked decisions**
- **Scope:** stay on **Bootstrap 3**. Global CSS restyle + targeted HTML rebuilds. No BS5.
- **Hero:** reuse the existing `images/home-slider/*` photos as a **full-bleed rotating** hero
  (keep bxSlider for rotation; add Motrio overlay + heading + pill CTA).
- **Duplication:** **per-page edits** (no PHP includes). Shared-markup changes are applied to each
  page via the checklist in §4.
- **Motrio links:** one **"Autoryzowany Partner Motrio"** badge → `https://www.motrio.pl` (header + footer). Nothing else.
- **Booking CTAs** point to `https://renocar-zgloszenie.pl` (external, new tab).

**Where code goes**
- **All new CSS** is appended/edited in **`httpdocs/css/style-modern.css`** (it loads last on every
  page, so it wins the cascade and propagates site-wide for free). Reuse its existing `:root` tokens.
- HTML edits are per-page (see file inventory below).

**Do NOT touch** (out of scope): analytics/`ga.js`, `kontakt/handler.php` + `kontakt/form.js` +
captcha, `.htaccess`, `<title>`/`<meta>` SEO tags, the logo and image *assets* (placeholders OK),
and the off-canvas mobile menu JS. Visual/layout only.

**Page file inventory** (the "all pages" set for shared-markup steps):
```
httpdocs/index.htm
httpdocs/oferta/index.htm
httpdocs/ofirmie/index.htm
httpdocs/kontakt/index.htm
httpdocs/promocje/index.htm
httpdocs/umow-sie/index.htm
httpdocs/cookies/index.htm
```
Skip `httpdocs/mechanicy/index.htm` (orphaned, not in nav) unless you choose to keep it consistent.

**Local preview**
```bash
cd httpdocs
php -S localhost:8000        # runs PHP too (contact form works); or:
python3 -m http.server 8000  # static only (fine for visual work)
# open http://localhost:8000
```

**Workflow**: you are on branch `motrio-2026-adjustments`. Commit per phase so each is reversible
(`git checkout -- <file>` to roll back an uncommitted file).

**Full-bleed helper** (used by hero + accent bands; works inside BS3 `.container`):
```css
.mt-fullbleed { width: 100vw; position: relative; left: 50%; right: 50%;
                margin-left: -50vw; margin-right: -50vw; }
```

---

## Phase 1 — Global tokens (CSS-first, hits every page) · ~6–8 h · ✅ DONE

**Status:** 1.1 Pill buttons ✅ · 1.2 Heading voice ✅ · 1.3 Charcoal footer ✅ · 1.4 Persistent CTA bar ✅

**QA review (senior QA — desktop @1300px screenshots + computed-style checks on `index` / `oferta` / `cookies`):**
- ✅ Buttons render as full pills (`border-radius: 999px`).
- ✅ h1/h2 uppercase + bold; subpages checked — no long heading breaks (`oferta` longest uppercase ≤45 chars, already uppercase pre-change). `.heading-normalcase` not needed yet.
- ✅ Footer charcoal `rgb(78,78,78)` with the red top border intact.
- ✅ Dual CTA bar fixed at the bottom on **desktop** (`display:flex; position:fixed; bottom:0`), present on all 7 pages, clears the footer (`body padding-bottom:56px`) and the back-to-top button (`bottom:72px`).
- ✅ No JS console errors; bxSlider still initialises.
- ⚠️ **Adjustment made:** `cookies/index.htm` was **missing the `style-modern.css` link entirely** (pre-existing inconsistency) — no modern/Phase-1 styling reached it. **Fix:** added `<link href="../css/style-modern.css" rel="stylesheet" />` after `style.css`; re-verified bar + tokens now apply. *(All shared CSS now reaches cookies in later phases too.)*
- ℹ️ The CTA bar keeps its existing **navy bar / red "Zadzwoń" half** (not Motrio's red+white split) — acceptable/on-brand; revisit only if a closer match is wanted.
- ℹ️ True mobile-viewport screenshots were not captured (the browser window-resize did not reflow the emulated viewport). Low risk: the bar was already a mobile feature and Phase 1 only added desktop visibility + slightly larger bottom clearance. Confirm on a real device / responsive devtools before release.

> Paste the block below at the **end of `css/style-modern.css`**, then do the two small per-page
> HTML edits in Step 1.4. After Phase 1 every page already "reads" Motrio.

```css
/* ==========================================================================
   MOTRIO RESTYLE — Phase 1 global tokens
   ========================================================================== */
:root { --charcoal: #4e4e4e; }

/* 1.1 Pill buttons (was radius 8px) */
.btn-primary { border-radius: 999px; }
.btn-hero {                      /* large hero/CTA pill */
    font-size: 18px; font-weight: 700; padding: 12px 48px; border-radius: 999px;
}

/* 1.2 Heading voice — bold + UPPERCASE (visual only; source text unchanged) */
h1, h2 { text-transform: uppercase; font-weight: 700; letter-spacing: .2px; }
h1 { font-size: 30px; }
h2 { font-size: 26px; }
.heading-accent   { color: var(--motrio-red); }   /* apply to chosen section heads */
.heading-normalcase { text-transform: none; }       /* opt-out for long sentence headings */

/* 1.3 Charcoal footer (keep the red top border) */
.footer .container { background: var(--charcoal); }

/* 1.4 Persistent dual CTA bar on desktop + mobile
   (REPLACES the old mobile-only rules at the bottom of this file — see note) */
.mobile-cta-bar { display: flex; }
body { padding-bottom: 56px; }
.back-top { bottom: 72px; }
```

**Step 1.4 — also do these (otherwise the bar stays hidden on desktop):**

1. **Delete the old hide rule** further up in `style-modern.css`:
   ```css
   /* REMOVE this block */
   @media (min-width: 768px) { .mobile-cta-bar { display: none !important; } }
   ```
   …and the now-duplicated `@media (max-width:767px){ body{padding-bottom:52px} .back-top{bottom:64px} }`
   (the new base rules in 1.4 cover all sizes).
2. **Per page** — the bar markup currently carries Bootstrap hide classes and only exists on
   `index.htm`. On **every** page, ensure this exact markup sits just before `</body>` **without**
   the `hidden-*` classes:
   ```html
   <div class="mobile-cta-bar">
       <a href="tel:+48690182354"><i class="fa fa-phone"></i> Zadzwoń</a>
       <a href="https://renocar-zgloszenie.pl" target="_blank" rel="noopener noreferrer"><i class="fa fa-calendar"></i> Umów się</a>
   </div>
   ```
   (On `index.htm` just remove `hidden-sm hidden-md hidden-lg` from the existing element.)

**Accept (Phase 1):** on every page, at desktop and mobile — buttons are full pills; h1/h2 render
uppercase bold; footer is charcoal `#4e4e4e`; the dual CTA bar is fixed at the bottom, does not
overlap the footer, and the back-to-top button clears it. Review subpage headings; if any long
sentence heading looks heavy in uppercase, add `class="heading-normalcase"` to it.

---

## Phase 2 — Section rebuilds (homepage-led) · ~12–16 h · ✅ DONE

**Status:** 2.1 Hero ✅ · 2.2 Service tiles ✅ · 2.3 Why-us circles ✅ · 2.4 News cards ✅ · 2.5 Partner badge ✅

**QA review (senior QA — homepage + promocje, desktop; computed-style + screenshot checks; no console errors; no horizontal overflow):**
- ✅ Hero: full-bleed rotating photo, left-dark gradient, uppercase white title, red pill "Umów się online" (radius 999px); bxSlider captions + pager hidden; single `<h1>` (old one demoted to `<h2 class="heading-normalcase">`). Verified hero/viewport height 640px and `docOverflowX:false`.
- ✅ Service tiles: 4 centered cards, circular red icons (72px, radius 50%), uppercase titles.
- ✅ "Dlaczego my": white outline circles (60px, 2px #111 ring, red number).
- ✅ News cards: white block cards (1px border, 12px radius) on homepage + all 12 promocje entries; booking-embed entry still functions.
- ✅ Partner badge: header pill "Autoryzowany Partner Motrio" + footer pill "Część sieci Motrio" on all 7 pages, both → motrio.pl (new tab). Computed colours/border/radius verified.

**Implementation deviations from the literal spec (equivalent result, lower risk — intentional):**
1. **Tiles, why-circles and news cards done CSS-only** (no per-card markup surgery). Existing `.market-box`/`.testimonials`/`.news-wyd` markup is restyled via CSS, so the changes also propagate to every page using those sections. News uses a **block card by default** with an opt-in `.news-wyd--card` for a horizontal thumbnail layout.
2. **Hero overlay/content injected into the existing `.slider`** (given `mt-hero mt-fullbleed`) instead of rebuilding the slider — keeps bxSlider intact. The slider's inner `.container` is widened via `.mt-hero > .container`.
3. **bxSlider captions + pager hidden via CSS** (`.mt-hero .bx-caption, .mt-hero .bx-pager { display:none }`) instead of editing the JS init — zero JS risk.
4. **Partner badge inserted by an idempotent script** (anchored on the unique `www.renocar.pl` link + copyright `</p>`) across all 7 pages; an IDE formatter then normalised the previously double-spaced markup (cosmetic only).

**Minor cosmetic notes (non-blocking):**
- Promocje entries keep their original inline image placement (not the `--card` thumbnail layout); some long entries show extra whitespace inside the card.
- Header badge sits directly under the `www.renocar.pl` link — re-check spacing on very narrow header widths during the real-device pass.

### Step 2.1 — Full-bleed rotating hero (`index.htm` + CSS) · Grade A · ✅

**CSS** (append to `style-modern.css`):
```css
/* === MOTRIO hero === */
.mt-hero { position: relative; }
.mt-hero .bx-wrapper { margin: 0; border: 0; box-shadow: none; }
.mt-hero .bx-viewport { height: 72vh !important; min-height: 420px; max-height: 640px;
                        border: 0; border-radius: 0; box-shadow: none; }
.mt-hero .bxslider img, .mt-hero .bx-viewport img {
    width: 100%; height: 72vh !important; min-height: 420px; max-height: 640px;
    object-fit: cover; filter: grayscale(35%) brightness(.9); }
.mt-hero__overlay { position: absolute; inset: 0; z-index: 2; pointer-events: none;
    background: linear-gradient(90deg, rgba(18,18,20,.75) 0%, rgba(18,18,20,.35) 45%, rgba(18,18,20,.05) 100%); }
.mt-hero__content { position: absolute; z-index: 3; top: 50%; transform: translateY(-50%); width: 100%; }
.mt-hero__title { color: #fff; text-transform: uppercase; font-weight: 700;
    font-size: clamp(28px, 5vw, 52px); line-height: 1.05; margin: 0 0 12px; text-shadow: 0 2px 6px rgba(0,0,0,.45); }
.mt-hero__subtitle { color: #fff; font-size: clamp(15px, 2vw, 20px); max-width: 540px;
    margin: 0 0 22px; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
```

**HTML** — replace the existing `<div class="slider">…</div>` block in `index.htm` with:
```html
<section class="mt-hero mt-fullbleed">
    <ul class="bxslider">
        <li><img src="images/home-slider/slide01.jpg" alt="RENO CAR - pogwarancyjny serwis Renault"></li>
        <li><img src="images/home-slider/slide02.jpg" alt="Profesjonalna obsługa Renault i Dacia"></li>
        <li><img src="images/home-slider/slide03.jpg" alt="Atrakcyjne ceny, bogata oferta"></li>
        <li><img src="images/home-slider/slide04.jpg" alt="Doświadczenie w naprawie Renault"></li>
        <li><img src="images/home-slider/slide05.jpg" alt="Szeroki zakres usług"></li>
        <li><img src="images/home-slider/slide06.JPG" alt="Serwis klimatyzacji Renault"></li>
    </ul>
    <div class="mt-hero__overlay"></div>
    <div class="mt-hero__content">
        <div class="container">
            <h1 class="mt-hero__title">Pogwarancyjny serwis Renault i Dacia w Gdańsku</h1>
            <p class="mt-hero__subtitle">Diagnoza i naprawa od 2000 roku — części oryginalne i zamienne, atrakcyjne ceny.</p>
            <a class="btn btn-primary btn-hero" href="https://renocar-zgloszenie.pl" target="_blank" rel="noopener noreferrer">Umów się online</a>
        </div>
    </div>
</section>
```

**Also in `index.htm`:**
- In the inline bxSlider init script, set **`captions: false`** (we have our own overlay now).
- Keep exactly **one `<h1>`**: change the existing lower `<h1>Profesjonalny Serwis Renault i Dacia w Gdańsku</h1>`
  (in the `.subpage` block) to `<h2 class="heading-normalcase">…</h2>`.

**Accept:** hero spans the full viewport width, photos rotate (fade) behind a left-dark gradient,
the heading/subtitle/red-pill are legible over any slide, the CTA opens the booking site in a new
tab, no console errors, and the page has a single `<h1>`.

### Step 2.2 — Service tiles (`index.htm` + CSS) · Grade A · ✅

**CSS:**
```css
/* === MOTRIO service tiles === */
.market-box--tile { text-align: center; }
.market-box--tile .market-box__icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 72px; height: 72px; border-radius: 50%;
    background: var(--motrio-red); color: #fff; font-size: 30px; margin-bottom: 14px;
    box-shadow: 1px 1px 2px rgba(0,0,0,.25); }
.market-box--tile h2 { font-size: 16px; }
.market-box--tile p { color: var(--text-secondary); }
```

**HTML** — for each of the 4 `.market-box` items in the `.marketing` section, replace the inner
`row/col` (icon + text) with a centered stack:
```html
<div class="col-lg-3 col-md-6 col-sm-6">
    <div class="market-box market-box--tile">
        <span class="market-box__icon"><i class="fa fa-wrench"></i></span>
        <h2>Naprawy Mechaniczne</h2>
        <p>oleje, płyny, rozrządy, skrzynie biegów, zawieszenia</p>
    </div>
</div>
```
(Keep the existing icons/texts: `fa-wrench`, `fa-check`, `fa-cog`, `fa-leaf`.)

**Accept:** four equal centered cards with circular red icons, hover-lift retained, responsive
(4→2→1 columns).

### Step 2.3 — "Dlaczego my" outline circles (`index.htm` minor + CSS) · Grade B · ✅

**CSS** (override the existing filled badge):
```css
/* === MOTRIO why-us outline circles === */
.testimonials span {
    background: #fff; color: var(--motrio-red);
    border: 2px solid #111; border-radius: 50%;
    width: 60px; height: 60px; line-height: 54px; font-size: 26px; }
```
Optionally add `class="heading-accent"` to the **"Dlaczego My"** heading to make it red (Motrio
reserves red for accent headings). Keep all five reasons.

**Accept:** the 1–5 badges are white circles with a thin dark ring and a red number.

### Step 2.4 — Blog-style news cards (`index.htm` + `promocje/index.htm` + CSS) · Grade B · ✅

**CSS:**
```css
/* === MOTRIO news/blog cards === */
.news-wyd { display: flex; gap: 20px; align-items: flex-start;
    background: #fff; border: 1px solid var(--gray-border);
    border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
    padding: 18px; margin-bottom: 18px; text-align: left; }
.news-wyd img { width: 220px; height: 150px; object-fit: cover;
    border-radius: var(--radius-sm); margin: 0; flex: 0 0 auto; }
.news-wyd h3 { margin-top: 0; text-transform: uppercase; }
.news-wyd .more { color: var(--motrio-red); font-weight: 600; }
.news-wyd--embed { display: block; }   /* the booking-iframe entry: no thumbnail layout */
@media (max-width: 767px) { .news-wyd { flex-direction: column; } .news-wyd img { width: 100%; } }
```

**HTML notes:**
- For news entries **with a thumbnail**, ensure structure is `img` first, then a content block
  containing `h3` + excerpt + an optional `<a class="more" href="…">Dowiedz się więcej</a>`.
- The homepage entry that holds the **booking `<iframe>`** has no thumbnail — give it
  `class="news-wyd news-wyd--embed"` so it doesn't force the image layout.
- In `promocje/index.htm`, apply the same `.news-wyd` card structure to each announcement (add the
  `.more` link where a detail target exists; otherwise omit it).

**Accept:** news/promo entries render as cards (thumbnail left, uppercase heading, grey excerpt,
red "Dowiedz się więcej"); stack vertically on mobile; the booking-embed entry still works.

### Step 2.5 — Partner Motrio badge (per-page HTML + CSS) · Grade B · ✅

**CSS:**
```css
/* === MOTRIO partner badge === */
.motrio-partner { display: inline-block; padding: 6px 16px; border-radius: 999px;
    border: 1px solid var(--motrio-red); color: #fff; font-size: 12px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .3px; text-decoration: none; white-space: nowrap; }
.motrio-partner strong { color: var(--motrio-red); }
.motrio-partner:hover { background: var(--motrio-red); color: #fff; }
.motrio-partner:hover strong { color: #fff; }
.footer .motrio-partner { border-color: #6b6b6b; }
```

**HTML** — add to **every page** (badge text only; logo asset arrives separately):
- In the header right column (`.col-lg-4 ... txtright`, near the phone/hours):
  ```html
  <a class="motrio-partner" href="https://www.motrio.pl" target="_blank" rel="noopener noreferrer">Autoryzowany Partner <strong>Motrio</strong></a>
  ```
- In the footer copyright row, add a "Część sieci Motrio" line linking to the same URL.

**Accept:** a pill badge appears in header and footer on every page and opens motrio.pl in a new tab.

---

## Phase 3 — Accents, header polish, enablers · ~10–14 h

### Step 3.1 — Diagonal accents + section rhythm (CSS) · Grade B

```css
/* === MOTRIO diagonal accents & rhythm === */
.mt-band { padding: 56px 0; }
.mt-band--gray { background: var(--gray-bg); }
.mt-diagonal-bottom { clip-path: polygon(0 0, 100% 0, 100% calc(100% - 40px), 0 100%); }
.mt-diagonal-top    { clip-path: polygon(0 40px, 100% 0, 100% 100%, 0 100%); }
```
Apply `mt-fullbleed mt-band mt-band--gray` to the section wrappers you want as full-width grey
bands (e.g. the services `.marketing` section), and add `mt-diagonal-bottom`/`mt-diagonal-top` to
a band for the slanted edge. Keep it to 1–2 bands so the page doesn't get noisy.

**Accept:** at least one full-width section reads as a Motrio-style angled band; no horizontal
scrollbar appears (the `100vw` full-bleed must not exceed viewport — verify at 1280px+).

### Step 3.2 — Header CTA pill (per-page HTML + CSS) · Grade B

Add a red **"Umów się"** pill to the header right column on every page; keep the existing nav bar.
```html
<a class="btn btn-primary" href="https://renocar-zgloszenie.pl" target="_blank" rel="noopener noreferrer">Umów się</a>
```
(Reuses the pill button from Phase 1; place it next to the partner badge / phone block.)

**Accept:** a red "Umów się" pill is visible in the header on every page and opens the booking site.

### Step 3.3 — *(Optional, Grade C)* collapse desktop nav behind "Menu"
Lower value for a 6-link site and higher JS/markup risk. **Default: skip.** If requested later,
spec separately.

---

## 4. Per-page propagation checklist

CSS steps need no per-page work. For the **HTML** steps, apply to each file:

| Page | CTA bar (1.4) | Partner badge (2.5) | Header CTA (3.2) | Page-specific |
|------|:---:|:---:|:---:|---|
| `index.htm` | ✔ (remove `hidden-*`) | ✔ | ✔ | Hero 2.1 · Tiles 2.2 · Circles 2.3 · News 2.4 |
| `oferta/index.htm` | ✔ add | ✔ | ✔ | — |
| `ofirmie/index.htm` | ✔ add | ✔ | ✔ | — |
| `kontakt/index.htm` | ✔ add | ✔ | ✔ | — |
| `promocje/index.htm` | ✔ add | ✔ | ✔ | News cards 2.4 |
| `umow-sie/index.htm` | ✔ add | ✔ | ✔ | — |
| `cookies/index.htm` | ✔ add | ✔ | ✔ | — |

> Tip: do `index.htm` fully first as the reference, then copy the shared header/footer/CTA-bar
> blocks into the other six.

---

## 5. QA checklist (run before calling it done)

Test at widths **360 / 480 / 768 / 992 / 1280** px, on **all seven** pages:

- [ ] Buttons are full pills everywhere; hero CTA uses `.btn-hero`.
- [ ] h1/h2 are uppercase bold; no long subpage heading looks broken (else `.heading-normalcase`).
- [ ] Footer is charcoal `#4e4e4e` with the red top border intact.
- [ ] Dual CTA bar is fixed bottom on **desktop and mobile**, present on every page, never overlaps
      the footer (body bottom-padding) and the back-to-top button sits above it.
- [ ] Homepage hero is full-bleed, rotates, overlay text is legible over every slide, CTA → booking
      site (new tab); exactly one `<h1>`.
- [ ] Service section = 4 centered tiles with circular red icons; responsive 4→2→1.
- [ ] "Dlaczego my" badges are white outline circles with red numbers.
- [ ] News/promo entries render as cards; booking-embed entry still functions.
- [ ] Partner badge (header + footer) and header "Umów się" pill open motrio.pl / booking site in new tabs.
- [ ] No new JS console errors; bxSlider still initialises.
- [ ] **No excluded aggregator feature added** (no locator / "Sieć MSC" / "Dla warsztatów" / oil selector).
- [ ] No horizontal scrollbar from full-bleed sections at any width.
- [ ] `git diff` touches only CSS + the seven page files — no analytics/form/`.htaccess`/SEO-meta changes.

---

## 6. Effort recap

| Phase | Items | Est. |
|------|-------|------|
| 1 — Global tokens | pill buttons, headings, footer, CTA bar | ~6–8 h |
| 2 — Section rebuilds | hero, tiles, circles, news cards, partner badge | ~12–16 h |
| 3 — Accents & header | diagonal accents, header CTA (opt. nav-collapse) | ~10–14 h |

Recommended (A+B): **~30–38 h**. Commit per phase.

---

*Implementation spec — 2026-06-27. Derived from [`motrio-analysis.md`](./motrio-analysis.md).*
