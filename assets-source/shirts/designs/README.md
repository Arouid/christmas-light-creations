# Shirt designs

Eight designs built from the vector art (the cottage, the 2012 pines and Merry X-MAS sign, the
whole scene) with arched and stacked type, a round badge, a sunburst and ribbon, a string of C9
bulbs and a crew back. Made by `node scripts/shirt-designs.mjs` (about two minutes). Not shipped.

Most designs come in two versions: **`-on-navy`** for the navy tee (white and gold ink; the cottage
in white ink, the scene and sign in colour) and **`-on-gold`** for a yellow or gold tee (navy ink, one-colour navy art, berry-red
accents). `mockup-<name>.png` shows each on a tee at size, 3 in below the collar;
`preview-sheet.png` has all sixteen.

| Design | Shirts | What | Print size |
|---|---|---|---|
| `scene` | navy | the 2012 pines and Merry X-MAS sign on a snow drift under the name on an arch in Inter heavy (sized to keep 0.35 in from each edge); each pine is its clean half mirrored, the sign's post in a snow mound | 11 × 13.1 in front |
| `varsity` | navy, gold | CHRISTMAS LIGHT arched in Bahnschrift condensed (sized to the shirt), the one-ink cottage, CREATIONS, EST · 2011 between gold rules | 11 × 12.2 in front |
| `badge` | navy, gold | round badge: the name around the top, PEARLAND · TEXAS around the bottom, cottage and two pines inside, SINCE 2011 | 10 in front |
| `badge-chest` | navy, gold | the badge at left-chest size (pines left out, lines held to 2 pt) | 3.5 in left chest |
| `sign` | navy | the Merry X-MAS sign planted in a snow drift inside a night-sky circle with a gold ring, CHRISTMAS LIGHT / CREATIONS in Inter heavy, Pearland · since 2011 between gold rules | 10 × 11.6 in front |
| `treepair` | navy, gold | two pines flanking CHRISTMAS / LIGHT / CREATIONS in Impact, phone under: **one colour**, the cheap screen print | 12 × 7.2 in front or back |
| `sunburst` | navy, gold | sunburst behind the one-ink cottage, the name on a ribbon in Georgia Bold 0.75 in under the snow, SINCE 2011 | 11 × 10.1 in front |
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

## Polo chest marks (embroidery)

Left-chest marks for the sales polos, made by `node scripts/shirt-polo.mjs` (a few seconds). Owner,
2026-10-16: Recraft kept drawing toy-like badges, so these are built from the real logo and fonts. Each comes
`-on-navy` (white and gold thread) and `-on-white` (navy and dark-gold `#b8862b` thread: the bright gold
vanishes on white). `mockup-polo-<mark>-on-<polo>.png` shows each on a polo; `mockup-polo-sheet.png` has them all.

| Mark | What | Size |
|---|---|---|
| `polo-wordmark` | text only: Christmas Light / Creations in Fraunces (the logo's lettering), Creations in gold, PEARLAND, TX | 3.56 × 1.35 in |
| `polo-caps` | text only: CHRISTMAS LIGHT / CREATIONS (spaced, gold) in Inter ExtraBold, EST. 2011 between gold rules | 3.56 × 1.1 in |
| `polo-logo` | the cottage beside the Fraunces name: the horizontal logo made stitchable | 4.31 × 1.53 in |
| `polo-icon-1`, `polo-icon-2` | the owner's Recraft cottages (a Recraft style built from the logo; `recraft/polo-icon-*.svg`, skipped when missing) beside the same name: their navy sewn in the polo's ink, their white left unsewn (the shirt shows through), bulbs in gold | 4.31 × 1.46 in |

Made for thread: two colours, no line under 3 pt (about 1 mm, a satin column), no letters under 0.15 in, the
cottage without its snowflakes, specks and sketch lines, Fraunces' thin strokes thickened 0.012 in. Send the
embroidery shop the SVG or PDF; they digitize it into stitches (usually a one-time fee) and sew a sample.
