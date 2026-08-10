# Next steps — renocar.pl (owner-blocked work)

**Date:** 2026-07-20
**Context:** the repo-side work from `spec/03-digital-presence-spec.md` is implemented
on branch `motrio-2026-adjustments` (uncommitted). Everything below is work nobody but
the site owner can do — accounts, credentials, and a physical/manual session — so it's
written for a non-developer to follow. Do the steps **in this order**; later ones depend
on earlier ones.

---

## 0. Before you start: commit the changes

Ask Claude Code to commit the working tree first ("commit the renocar-webpage changes"),
so step 2 (FTP upload) has a fixed, reviewable snapshot to work from instead of a moving
target. This file assumes that's done.

---

## 1. Create the GA4 property (spec W-C4) — ✅ DONE (2026-08-01)

Property created; measurement ID **`G-QV0734FJPC`** is now live in the snippet on all 8
pages (placeholder gone, scripts uncommented but still `type="text/plain"` so Klaro
gates them). Consent gating was re-verified in a real browser: zero requests to
`googletagmanager.com` / `google-analytics.com` before consent and after "Odrzucam";
after "Akceptuję wszystkie" a `page_view` hit fires with `anonymize_ip=true`.

The **Verification** block below still applies — re-run it against the live site once
step 2 has deployed these files, since GA4 Realtime can't show anything until then.

**Why:** the site currently collects zero analytics (the old tag was dead since 2023).
The new consent banner (Klaro) is live and working, but its Google Analytics 4 snippet
is deliberately left **commented out** in every page's `<head>` until a real GA4
property exists — right now it only has a placeholder ID (`G-XXXXXXXXXX`).

**Steps:**
1. Go to [analytics.google.com](https://analytics.google.com), sign in with the Google
   account that will also hold Search Console access (step 3) and the GBP listing
   (step 4) — one account for all three, per the earlier owner decision.
2. Admin → Create Property → name it "renocar.pl" → time zone Poland, currency PLN.
3. Add a **Web** data stream → URL `https://renocar.pl` → stream name "renocar.pl main".
4. Copy the **Measurement ID** shown (format `G-XXXXXXXXXX`, e.g. `G-ABC1234DEF`).
5. Give this ID to Claude Code and ask it to "activate GA4 with measurement ID
   G-XXXXXXXXXX" — it will uncomment the snippet and replace the placeholder in all 8
   pages, then re-verify the consent-gating still works (no request fires until a
   visitor accepts).

**Verification:**
- In GA4, open **Reports → Realtime**.
- Open `https://renocar.pl/` in an incognito window, click "Akceptuję wszystkie" on the
  cookie banner.
- Within ~30 seconds, Realtime should show 1 active user. If it doesn't:
  - Open DevTools → Network, filter `google`, reload, click Accept again — you should
    see a request to `googletagmanager.com/gtag/js` and later to
    `google-analytics.com/g/collect`. If there's no request at all, the snippet wasn't
    uncommitted correctly — ask Claude Code to check.
- Open the same URL in a **fresh** incognito window and click "Odrzucam" instead —
  confirm **no** `google-analytics.com` or `googletagmanager.com` request appears at
  all (Network tab, same filter). This is the RODO-compliance check: analytics must
  never fire before consent.

---

## 2. Deploy `httpdocs/` to the live server (FTP/SFTP)

**Why:** none of this work — the fixed phone links, the new legal entity, the privacy
policy, the consent banner, the compressed images — is live until it's uploaded. The
site currently in production is the **pre-restyle, pre-fix** version.

**What you need:** your FTP/SFTP client (FileZilla, Cyberduck, or your Plesk file
manager) and the credentials you already hold for `renocar.pl`.

**Steps:**
1. Connect to the host and navigate to the document root (`httpdocs/` on the server —
   confirm this is genuinely the same folder Plesk serves `renocar.pl` from; if unsure,
   check the Plesk "Websites & Domains" panel for the document root path).
2. **Upload these new files/folders** (they don't exist on the server yet):
   - `favicon.ico`
   - `images/icon-192.png`
   - `images/apple-touch-icon.png`
   - `js/klaro.js`
   - `js/klaro-config.js`
   - `polityka-prywatnosci/` (whole folder — the new privacy-policy page)
   - `robots.txt`
   - `sitemap.xml`
   - `ofirmie/img/new_building_with_logo.jpg` (the recompressed building photo)
   - `googlee17674568c338bcc.html` (Search Console verification for the **new** owner
     account — needed by step 3; must sit at the document root, not in a subfolder)
   - `img/ofirmie2.jpeg` (new homepage "O Firmie" teaser photo, 708×366 — authored at 2× so
     it stays sharp on retina; CSS renders it in a 354px box)
   - `ofirmie/img/firma2.jpeg` (new `/ofirmie` photo + lightbox target, 1365×768)
3. **Upload these changed files** (overwrite the versions already on the server):
   - `.htaccess`
   - `css/style-modern.css`
   - `index.htm`, `oferta/index.htm`, `ofirmie/index.htm`, `kontakt/index.htm`,
     `promocje/index.htm`, `umow-sie/index.htm`, `cookies/index.htm`
   - `images/home-slider/slide01.jpg` through `slide04.jpg` (recompressed, smaller —
     make sure your FTP client actually overwrites rather than skipping same-name files)
4. **Delete these from the server** (removed from the repo — leaving them live wastes
   space and, for `mechanicy/`, serves a dead page instead of the new redirect):
   - `mechanicy/` (whole folder)
   - `js/cookies-info.js`
   - `img/IMG_1943.jpeg`, `img/IMG_1944.jpeg`, `img/IMG_2075.jpeg`, `img/IMG_2189.jpeg`,
     `img/IMG_2317.jpeg`
   - `img/new_building_with_logo.png` (the old unreferenced root copy — **not** the one
     in `ofirmie/img/`, which you're replacing with a `.jpg` in step 2 above)
   - `ofirmie/img/new_building_with_logo.png` (replaced by the `.jpg`)
5. **Do NOT upload** any `.DS_Store` files — macOS creates them automatically (there are
   currently ones in `httpdocs/` and `httpdocs/lightbox/js/`). They're junk on a web
   server and leak your folder layout. Most FTP clients can be set to skip them.
   (`images/home-slider/backup/` is no longer relevant — it was deleted in `2eed6c1`;
   the pre-compression originals live in git history at `main` if ever needed.)

**Verification (run after upload, from any terminal — ask Claude Code to run these for
you if you'd rather not open a terminal yourself):**
```bash
curl -sI https://renocar.pl/ | head -1                          # expect: 200
curl -sI https://renocar.pl/favicon.ico | head -1                # expect: 200
curl -sI https://renocar.pl/robots.txt | head -1                 # expect: 200
curl -sI https://renocar.pl/sitemap.xml | head -1                # expect: 200
curl -sI https://renocar.pl/polityka-prywatnosci/ | head -1      # expect: 200
curl -sI https://renocar.pl/mechanicy/ | head -1                 # expect: 301, Location: https://renocar.pl/ofirmie
curl -s https://renocar.pl/js/cookies-info.js | head -1          # expect: 404 (file gone)
curl -sI https://renocar.pl/ofirmie/img/new_building_with_logo.jpg | head -1   # expect: 200
```
Then open `https://renocar.pl/` in a real browser:
- Tap the landline number on a phone — dialer must show `+48 58 520 19 14`, not `+58…`.
- Scroll to the footer — must show "Renocar Zbigniew Marek", NIP 5833538950, and a
  "Polityka prywatności" link that works.
- Cookie banner appears, "Ustawienia cookies" link in the footer reopens it.
- View page source (`Cmd+Option+U` / `Ctrl+U`) → confirm no `_gaq` or `UA-29684621`
  anywhere, and exactly one `<script type="application/ld+json">` block.

---

## 2b. Follow-up re-deploy (2026-08-03) — two post-launch fixes

The first deploy surfaced two bugs, both now fixed in the repo. **Re-upload these files:**

- `css/style-modern.css`
- all 8 `index.htm` files (root + `oferta/`, `ofirmie/`, `kontakt/`, `promocje/`,
  `umow-sie/`, `cookies/`, `polityka-prywatnosci/`)

**What was wrong:**

1. **Stale view for returning visitors.** `.htaccess` caches CSS for 30 days and HTML for
   1 hour, so a repeat visitor got new HTML with month-old CSS. Incognito looked fine —
   which is exactly why it was confusing. Fixed by versioning the asset URLs
   (`style.css?v=20260803` etc.). **Bump that date in all 8 pages on every future CSS/JS
   change**, otherwise this recurs.
2. **"więcej" buttons unclickable on phones.** Two overlapping invisible elements: a
   `<div class="col-lg-12">` spacer with no `col-xs-12` (so unfloated below `lg`, covering
   all three teaser columns), and the closed off-canvas menu leaving a 30px tap-swallowing
   strip down the left edge. Verified after the fix: all 5 buttons fully clickable at
   390px, menu still opens/closes, desktop unaffected.

**Verification after re-upload** — on a phone (or DevTools device mode), tap every
"więcej »" button on the homepage; each must navigate. Then hard-refresh
(`Cmd/Ctrl+Shift+R`) once and confirm the layout matches incognito.

---

## 3. Submit the sitemap in Google Search Console (spec W-D5)

**Depends on:** step 2 (the sitemap must be live on the server first).

**Steps:**
1. Go to [search.google.com/search-console](https://search.google.com/search-console)
   and open the **URL-prefix property `https://renocar.pl/`** added under your own
   account. Click **Verify** — this only works once step 2 has put
   `googlee17674568c338bcc.html` on the server. Verification is additive: the older
   `google76f5cd7632d7faa5.html` (a different owner's token) stays valid alongside
   yours. **Never delete either file** — removing a token unverifies its owner.
   Once verified you get the property's full ~16 months of history, not just data
   from today onward.
2. Left sidebar → **Sitemaps**.
3. Enter `sitemap.xml` in the "Add a new sitemap" box → Submit.
4. Left sidebar → **URL Inspection** → paste `https://renocar.pl/` → if it says "URL is
   not on Google" or shows an outdated snapshot, click **Request Indexing** to speed up
   the recrawl of the new content (titles, JSON-LD, fixed links).

**Verification:**
- Back on the Sitemaps page, status should read **"Success"** within a few minutes (it
  can briefly show "Couldn't fetch" right after submission — refresh after 5 minutes).
- Click into the sitemap to see "8 discovered URLs" (or however many pages, including
  the new `polityka-prywatnosci/`).
- Over the next 1–2 weeks, check the **Coverage/Pages** report: `/mechanicy/` should
  drop out of the indexed set (superseded by the redirect) and
  `/polityka-prywatnosci/` should appear as indexed.

---

## 4. Verify server headers (spec W-B1) — ✅ DONE (2026-08-03), no Plesk change needed

Checked against the live site after the deploy; all three pass, so Apache is honouring
`.htaccess` and the nginx-passthrough fallback below is **not** required:

```
content-encoding: gzip                                    (HTML compressed)
cache-control: max-age=15552000  (180 days, images)       (mod_expires active)
strict-transport-security: max-age=31536000; includeSubDomains
```

The 30-day CSS cache this enables is also what caused the stale-view bug — see step 2b for
the `?v=` versioning that works around it. The original instructions are kept below in case
the hosting config ever changes.

### Original instructions (no longer needed)

**Depends on:** step 2. **Why:** the `.htaccess` block that was added enables gzip
compression, browser caching, and HSTS — but on some Plesk configurations, "Serve
static files directly by nginx" is turned on, which silently makes Apache's
`.htaccess` rules do nothing for HTML/CSS/JS/images. This step finds out which case
you're in.

**Steps:**
1. Run these three checks (ask Claude Code to run them for you, or run them yourself
   in Terminal):
```bash
curl -sI --compressed https://renocar.pl/ | grep -i 'content-encoding'
curl -sI https://renocar.pl/images/home-slider/slide01.jpg | grep -i 'cache-control\|expires'
curl -sI https://renocar.pl/ | grep -i 'strict-transport-security'
```
2. **If all three show output** (e.g. `content-encoding: gzip`, a `cache-control` with
   a future expiry, and a `strict-transport-security` header) — you're done, `.htaccess`
   is working as-is.
3. **If any of them show nothing** — the nginx-passthrough case applies. Go to Plesk →
   **Websites & Domains → renocar.pl → Apache & nginx Settings**. Either:
   - Turn OFF "Serve static files directly by nginx" (simplest — Apache + `.htaccess`
     then governs everything), **or**
   - Keep it ON and paste into "Additional nginx directives":
     ```nginx
     gzip on;
     gzip_types text/css application/javascript image/svg+xml text/plain;
     location ~* \.(jpg|jpeg|png|gif|ico)$ { expires 6M; }
     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
     ```
   - Apply, then re-run the three `curl` checks above.

**Verification:** all three curl commands return non-empty output. **Do not** submit
the domain to the browser HSTS preload list — subdomain coverage under this Plesk host
hasn't been separately verified, and preloading is very hard to reverse.

---

## 5. Google Business Profile session (spec W-D1)

**Why:** this is the single highest-value item left — it fixes the business's public
Google Maps listing (stale hours cause 1-star reviews) and produces the Place ID needed
to finish the JSON-LD structured data (`sameAs`) already shipped on every page.

**Before you start:** there is an unrelated same-name competitor — **"RENO CAR ADAMOWICZ
MARCIN", ul. Olszyńska 3, Gdańsk**. Throughout this session, keep checking you're
editing the **Struga 8/10A** listing, never Olszyńska.

**Canonical details to paste in exactly as written (character-for-character):**
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

**Steps (at [business.google.com](https://business.google.com), logged into the
manager account):**
1. Open the profile, confirm address = Struga 8/10A.
2. **Name** → set to "RENO CAR – Pogwarancyjny Serwis Renault i Dacia".
3. **Hours** → Mon–Fri 08:00–16:00, Sat/Sun closed. (This is the #1 priority — wrong
   hours are the main source of bad reviews.)
4. **Category** → primary "Warsztat samochodowy" (Auto repair shop) — not "Renault
   dealer".
5. **Website** → `https://renocar.pl`. **Appointment link** → `https://renocar-zgloszenie.pl`.
6. **Phones** → +48 58 520 19 14 (primary), +48 690 182 354 (additional). Remove any
   old `501-512-98x` numbers if present.
7. **Description** → write ~750 characters mentioning Renault, Dacia, Gdańsk, Motrio,
   hybrydy, klimatyzacja.
8. **Attributes/payments** → gotówka, karta, przelew.
9. **Photos** → upload 10+: building front (the new compressed photo now live at
   `renocar.pl/ofirmie/img/new_building_with_logo.jpg` works well here), workshop bays,
   diagnostics gear, reception, team.
10. **Reviews** → reply to every existing review in Polish, signed "Zespół RENO CAR".
    Then use "Ask for reviews" to copy the short review-request link — save it
    somewhere, a future feature (completion e-mails) will need it.
11. **Q&A section** → check for stale answers (especially about hours) and correct them.
12. **Get the Place ID** for the site's structured data: Share → Embed a map → copy the
    generated `<iframe>` URL. Give it to Claude Code and ask it to "update the Maps
    embeds and JSON-LD sameAs with the new GBP link" — this replaces a 2015 embed with
    a zero Place ID on 5 pages (`index.htm`, `promocje/`, `umow-sie/`, `kontakt/`,
    `cookies/`) and fills in the empty `sameAs: []` in the structured data on all pages.

**Verification:**
- Search "Reno Car Struga Gdańsk" on Google Maps — confirm hours show 8:00–16:00 and
  the website/booking links are correct.
- On `https://renocar.pl/kontakt/`, the embedded map should visibly pin the Struga
  8/10A location (not show a broken/placeholder pin).
- Ask Claude Code to re-check `https://search.google.com/test/rich-results` against
  `https://renocar.pl/` — the `AutoRepair` structured-data item should now show a
  non-empty `sameAs` with the Maps URL.

---

## Order recap

1. GA4 property → give Claude Code the measurement ID → it activates the snippet.
2. FTP deploy (upload/overwrite/delete lists above).
3. GSC sitemap submission (needs step 2 done first).
4. curl header verification (needs step 2 done first; may need a Plesk panel change).
5. GBP session (independent of 1–4, but the Place ID it produces feeds back into the
   site's structured data — ask Claude Code to apply that update once you have it).

Steps 3, 4 and 5 don't depend on each other and can happen in any order once step 2 is
done — do whichever fits your schedule first.
