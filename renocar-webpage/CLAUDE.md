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

`.htaccess` handles the HTTPS/non-www 301 redirect and legacy path redirects
(`/ogloszenia` → `/promocje`, `/mapa_strony` → `/kontakt`) — Apache only, invisible in a
plain static preview.

## Layout

- Pages: `httpdocs/index.htm` (homepage, ~780 lines, bxSlider hero), plus directory-per-page
  `oferta/`, `ofirmie/`, `kontakt/`, `promocje/`, `mechanicy/`, `umow-sie/`, `cookies/`
  (each with its own `index.htm`).
- `httpdocs/index.htm` and `httpdocs/umow-sie/index.htm` embed the booking form via
  `<iframe src="https://renocar-zgloszenie.pl/">` — that's the `submission-portal` app; do not
  break this integration point.
- Assets: `css/`, `js/` (bootstrap, offcanvas, cookies-info), `jquery.bxslider/`,
  `font-awesome/`, `images/` (+ untracked `images/home-slider/backup/`), `lightbox/`.
- `google76f5cd7632d7faa5.html` — Google Search Console verification; never delete.

## Read before editing: ANALYSIS.md and PLAN.md

This module has a full audit (`ANALYSIS.md`) and a prioritized fix plan (`PLAN.md`) at the
module root. PLAN.md documents verified bugs — e.g. three `<h1>` tags on the homepage, slider
images missing `alt`, `type="phone"` instead of `type="tel"` in the contact form, jQuery
double-loaded on `/kontakt/`, bxSlider CSS `<link>` inside `<body>`, orphaned `</a>` tags in
the slider, `http://` logo links. If you are asked to improve the site, work from PLAN.md's
ordering instead of re-auditing.

## Conventions & pitfalls

- Each page duplicates the full header/footer markup — a change to nav/contact info must be
  repeated in **every** `index.htm` (there is no templating).
- Mixed encodings/legacy markup: verify Polish diacritics render after edits; keep files'
  existing encoding.
- Business-critical details (phone numbers, opening hours, address, NIP) appear in multiple
  places and are currently inconsistent (see PLAN.md item 10) — if you change one occurrence,
  grep for the others.
- Don't introduce a build step, framework, or npm here; the value of this module is that the
  shop's cheap PHP hosting can serve it as-is.
- Don't edit `kontakt/vendor/` (vendored composer libs).
- TODO(owner): document the deployment procedure (assumed FTP/Plesk file upload for
  `httpdocs/`; not verifiable from the repo) and whether `www.renocar.pl` hosting supports
  which PHP version.
