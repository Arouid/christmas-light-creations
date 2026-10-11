# Shirt designs

Eight designs built from the vector art (the cottage, the 2012 pines and Merry X-MAS sign, the
whole scene) with arched and stacked type, a round badge, a sunburst and ribbon, a string of C9
bulbs and a crew back. Made by `node scripts/shirt-designs.mjs` (about two minutes). Not shipped.

Most designs come in two versions: **`-on-navy`** for the navy tee (white and gold ink, colour
art) and **`-on-gold`** for a yellow or gold tee (navy ink, one-colour navy art, berry-red
accents). `mockup-<name>.png` shows each on a tee at size, 3 in below the collar;
`preview-sheet.png` has all sixteen.

| Design | Shirts | What | Print size |
|---|---|---|---|
| `scene` | navy | the whole 2012 scene (pines, Merry X-MAS sign, snow) under the name on an arch, Fraunces | 11 × 13.1 in front |
| `varsity` | navy, gold | CHRISTMAS LIGHT arched in Bahnschrift condensed with an outline, the cottage, CREATIONS, EST · 2011 | 11 × 12.2 in front |
| `badge` | navy, gold | round badge: the name around the top, PEARLAND · TEXAS around the bottom, cottage and two pines inside, SINCE 2011 | 10 in front |
| `badge-chest` | navy, gold | the badge at left-chest size (pines left out, lines held to 2 pt) | 3.5 in left chest |
| `sign` | navy | the Merry X-MAS sign, "from your friends at" above, the name below in Fraunces | 10 × 11.5 in front |
| `treepair` | navy, gold | two pines flanking CHRISTMAS / LIGHT / CREATIONS in Impact, phone under: **one colour**, the cheap screen print | 12 × 7.2 in front or back |
| `sunburst` | navy, gold | sunburst behind the cottage, the name on a ribbon in Georgia Bold, SINCE 2011 | 11 × 10.9 in front |
| `crew` | navy, gold | INSTALL CREW in Impact, "You never lift a finger.", name, phone and site | 12 × 8.4 in back |
| `bulbs` | navy, gold | a drooping string of seven C9 bulbs over the name in Fraunces | 11 × 6.6 in front |

Each design is three files plus the mockup:

- **`<name>.png`**: 300 dpi, transparent, at print size. The Uberprints upload (digital printing,
  same steps as in `../README.md`). These PNGs are not in git (1–5 MB each); rebuild them with the
  script if they are missing.
- `<name>.svg` and `<name>.pdf`: the same as vectors with all text as outlines, for a screen
  printer or a cutter. `treepair` and the `-on-gold` versions are one ink colour; the rest need
  full colour (digital) or several screens.
- Lines are 2 pt or thicker at print size, as on the logo shirts: the neon glow is drawn solid,
  the cottage's thin sketch lines are thickened, the chest badge drops the pines and specks.

Fonts: Fraunces and Inter are the site's own (outlined from `public/fonts`). Impact, Bahnschrift
and Georgia Bold are Windows fonts, used as outlines in these files only (no font files to send
anyone). If a design is wanted in another face, say which.

Shirt colours in the mockups: navy #152040 and gold #f2b63a, close to Bella+Canvas Navy and Gold.
The gold versions also work on yellow, mustard or heather-gold tees; the navy versions on black,
forest green or heather navy. Change the words, colours or sizes at the top of
`scripts/shirt-designs.mjs` and rerun.
