PP Object Sans — Motrio brand typeface
======================================

Drop the licensed font files here (Pangram Pangram, commercial — not on Google
Fonts, and not something that can be committed to this repo):

    PPObjectSans-Regular.woff2
    PPObjectSans-Regular.woff
    PPObjectSans-Bold.woff2
    PPObjectSans-Bold.woff

Filenames must match exactly — these paths are hardcoded in the @font-face
blocks at the top of css/style-modern.css.

Once the files are here:
  1. uncomment both @font-face blocks in css/style-modern.css (top of the file,
     comment header "Motrio brand typeface — PP Object Sans"),
  2. bump ?v=YYYYMMDD on css/style-modern.css across all 8 pages,
  3. FTP up fonts/pp-object-sans/ together with css/style-modern.css.

The font is used only by the .motrio-partner badge (header + footer of every
page). Until the files land, the badge renders in Poppins.

Before uploading, confirm the licence covers webfont embedding, and that the
cut ships Polish glyphs — the footer badge reads "Część sieci Motrio" (ę, ś).
