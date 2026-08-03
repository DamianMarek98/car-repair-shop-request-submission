# renocar-webpage — www.renocar.pl marketing site

Legacy static multi-page site for the workshop (RENO CAR, Gdańsk). Hand-written HTML +
Bootstrap 3 + jQuery + bxSlider, with **one PHP piece**: the contact form under
`httpdocs/kontakt/` (`handler.php`, `captcha.php`, `src/FormHandler.php`, vendored libs).
Document root is `httpdocs/` (Plesk-style hosting). All content is **Polish**.

## No build system

There is nothing to install or compile. Preview locally:

```bash
cd httpdocs && python3 -m http.server 8000   # static pages; /kontakt form handler needs PHP hosting
```

`.htaccess` handles the HTTPS/non-www 301 redirect, legacy path redirects
(`/ogloszenia` → `/promocje`, `/mapa_strony` → `/kontakt`, `/mechanicy` → `/ofirmie`), plus
gzip compression, browser-cache expiry and HSTS — Apache only, invisible in a plain static
preview. On some Plesk setups nginx serves static files directly and silently bypasses these
rules; see `NEXT-STEPS.md` step 4 for the check and the nginx fallback.

## Layout

- Pages (8): `httpdocs/index.htm` (homepage, bxSlider hero), plus directory-per-page
  `oferta/`, `ofirmie/`, `kontakt/`, `promocje/`, `umow-sie/`, `cookies/`,
  `polityka-prywatnosci/` (each with its own `index.htm`).
- `httpdocs/index.htm` and `httpdocs/umow-sie/index.htm` embed the booking form via
  `<iframe src="https://renocar-zgloszenie.pl/">` — that's the `submission-portal` app; do not
  break this integration point.
- Assets: `css/`, `js/` (bootstrap, offcanvas, jquery, **klaro.js + klaro-config.js**),
  `jquery.bxslider/`, `font-awesome/`, `images/`, `img/`, `lightbox/`.
- Photo of the workshop building appears twice, at two sizes for two roles:
  `img/ofirmie2.jpeg` (homepage teaser thumbnail) and `ofirmie/img/firma2.jpeg`
  (`/ofirmie` thumbnail **and** its own lightbox target). Same picture, different files —
  that duplication is intentional, see the image-size rules below.
- SEO/meta files at the root: `robots.txt`, `sitemap.xml`, `favicon.ico`,
  `images/icon-192.png`, `images/apple-touch-icon.png`.
- **Two** Google Search Console verification files — `google76f5cd7632d7faa5.html` (original
  owner) and `googlee17674568c338bcc.html` (current owner). **Never delete either**: removing
  a token unverifies that owner. Verification is additive, so both coexist by design.

## Cookie consent & analytics (added 2026-07/08)

- Consent is handled by **Klaro** (`js/klaro.js` + `js/klaro-config.js`, service name
  `google-analytics`, cookie `renocar-consent`). The old `js/cookies-info.js` was removed.
- The GA4 snippet (measurement ID `G-QV0734FJPC`) sits near the end of `<body>` on all 8
  pages and is deliberately **inert** — `type="text/plain"` with `data-src` instead of `src`,
  so Klaro only activates it after consent. Verified: no request to `googletagmanager.com` or
  `google-analytics.com` fires before consent or after "Odrzucam".
- **Do not "fix" that snippet into a normal `<script src=…>`** — it would fire before consent
  and break RODO compliance. For the same reason GA-based Search Console verification cannot
  work here; use the HTML-file method.
- Known gap: the Google Maps embed still loads pre-consent (Klaro only manages GA). Pending
  the GBP work in `NEXT-STEPS.md` step 5.

## Read before editing: NEXT-STEPS.md, ANALYSIS.md, PLAN.md

- **`NEXT-STEPS.md` is the live checklist** — the owner-blocked wrap-up for the Motrio work
  (GA4, FTP deploy, Search Console, server headers, Google Business Profile). Start here;
  it records what is already done and what is still pending.
- `ANALYSIS.md` (audit) and `PLAN.md` (prioritized fixes) predate the Motrio restyle. Many
  PLAN.md items are now **fixed** on this branch — verify against the current files before
  acting on them rather than assuming they're still open.
- The repo-wide plan lives in `spec/` at the repository root (`00-master-plan.md` +
  `03-digital-presence-spec.md` for this module).

## Conventions & pitfalls

- Each page duplicates the full header/footer markup — a change to nav/contact info must be
  repeated in **every** `index.htm` (there is no templating).
- Mixed encodings/legacy markup: verify Polish diacritics render after edits; keep files'
  existing encoding.
- Business-critical details (phone numbers, opening hours, address, NIP) appear in multiple
  places and are currently inconsistent (see PLAN.md item 10) — if you change one occurrence,
  grep for the others.
- **Image sizing is manual and load-bearing.** There is no build step, no `srcset`, and no
  CSS that constrains image height — `.img-big` is only `max-width: 100%`, so every image
  renders at its own natural size and aspect ratio. Two consequences:
  - **Homepage teaser row** (`index.htm`, "O Firmie / Oferta / Ceny") — the three images
    carry `class="img-big img-teaser"`. `.img-teaser` (in `style-modern.css`) pins the
    rendered box to `width:100%; max-width:354px`, so the columns line up at every viewport
    and a file may be authored at 1× (354×183) **or** 2× (708×366) for retina. The
    **aspect ratio must stay 1.934** (354:183) — a different ratio makes that column taller
    than the other two. Without the 354px cap a 2× file also grows past its 1× siblings once
    the columns stack below ~992px.
  - **Other images have no such cap** — `.img-big` is only `max-width:100%`, so they render
    at natural size. Match the neighbours: `/ofirmie` column images are **1365×768**. Check
    with `sips -g pixelWidth -g pixelHeight <file>` before dropping a file in.
  - **Downscale camera originals first.** Straight-from-the-phone photos (5712×3213, ~3 MB)
    are ~100× heavier than needed and undo the compression work from spec 03 W-B1. Resize
    with `sips -z <h> <w> -s format jpeg -s formatOptions 82 in.jpeg --out out.jpeg`
    (add `sips -c <h> <w>` first to centre-crop to the target ratio).
- Don't introduce a build step, framework, or npm here; the value of this module is that the
  shop's cheap PHP hosting can serve it as-is.
- Don't edit `kontakt/vendor/` (vendored composer libs).
- **Authorship metadata** — the site's base version was built by SDK, then redesigned in-house.
  Every page carries `<meta name="author" content="Damian Marek Software">` (current designer,
  `mailto:` credit in the footer) and `<meta name="copyright" content="Renocar Zbigniew Marek">`
  (the business owns the content). The footer keeps a small `nofollow` "projekt bazowy" credit
  to SDK. Keep these consistent across all 8 pages if you touch the footer or `<head>`.
- Deployment is **manual FTP/SFTP upload of `httpdocs/`** to the Plesk document root — there is
  no CI. `NEXT-STEPS.md` step 2 holds the authoritative upload/overwrite/delete lists. Never
  upload `.DS_Store` files. Because deploys are manual, avoid anything that goes stale on its
  own (e.g. a hardcoded copyright year).
- TODO(owner): confirm which PHP version `www.renocar.pl` hosting runs (the `/kontakt` form
  handler is the only PHP on the site).
