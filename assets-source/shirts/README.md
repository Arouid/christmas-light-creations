# Crew shirt artwork

Print-ready files for the crew t-shirts (navy Bella+Canvas tee at Uberprints), made from the
vector logo in `../brand/logo-vector/` by `node scripts/shirt-art.mjs` (rebuilds everything here in
a few seconds; needs Python with fontTools for the text, already installed). Not shipped with the site.

Every PNG is 300 dpi, sRGB, on a transparent background. The logo wasn't redrawn: lines
thinner than 2 pt at the print size were thickened in their own colour to 2 pt, or dropped
(details at the end).

## What to upload where

| File | Where | Size | Print method |
|---|---|---|---|
| `front-chest-flat.png` | left chest | 4 × 3.05 in (1200 × 914 px) | full colour: Uberprints "digital printing" (DTG, white underbase) |
| `back-full-flat.png` | full back | 12 × 10.76 in (3600 × 3228 px) | full colour, digital printing |
| `front-chest-one-color-white.png` | left chest | 4 × 3.05 in | one colour, white ink: screen printing (12-shirt minimum, the cheap route at 20+) |
| `back-full-one-color-white.png` | full back | 12 × 10.76 in | one colour, white ink: screen printing |
| `front-chest.png`, `back-full.png` | same places | same sizes | full colour with the neon glow kept as a soft fade; only if Uberprints' art team says fades print well on navy (next section) |

`preview-<file>.png` shows each file on navy (#1b2340); `preview-sheet.png` has chest and back at
the same scale (100 px = 1 in) so the proportion on a shirt is visible.

## Glow or flat: upload the `-flat` files

The colour logo's neon glow is a blur: pixels that are part magenta, part see-through. Digital
printing on a dark shirt first lays white ink under everything that isn't fully transparent, so a
soft fade comes out as a pale fuzzy halo, not a glow. The `-flat` files draw each neon line solid
(2 pt or more), no fade: that is the safe upload. `front-chest.png` and `back-full.png` keep the
glow with its faintest 20 % cut off; ask Uberprints before using them.

## Full colour or one colour

- Full colour = digital printing. No minimum, 48-hour production, the price doesn't depend on the
  number of colours (the owner's quote: about $28 a shirt).
- One colour white = screen printing. Minimum 12 shirts, 7-day production, each colour adds cost, so
  one white screen is the cheap way at 20 or more shirts. Upload the `-one-color-white` files and
  choose white ink. They come from the one-colour logo: no glow, no gold, and the shirt shows through
  the window and the wall.

## Uberprints steps

1. uberprints.com → Design Studio → choose the shirt (Bella+Canvas, Navy) and the quantity.
2. Front: Upload image → `front-chest-flat.png` (or the one-colour file). Move it to the left chest
   and set its width to 4 in; Uberprints' own left-chest example is 4 × 3 in.
3. Back: Upload image → `back-full-flat.png`, centred, width 12 in (their adult design area is
   12 × 15 in), top about 2–3 in below the collar.
4. Check the proof: no white box around the art (the background is transparent), nothing cut off,
   the phone number readable.
5. Print method: full-colour art on a dark shirt is digital printing; Uberprints prints with CMYK
   plus white ink, so the white underbase is theirs to add, nothing to tick. For the one-colour
   files on 12+ shirts choose screen printing, 1 colour, white.
6. Size complaints: the files are 300 dpi (Uberprints asks for 150 or more). If a file won't upload
   or shows wrong, email it to service@uberprints.com; they convert files.

Sources (2026-10-11): uberprints.com/help/uploaded-image-requirements (formats, 150 dpi, the 4 × 3 in
chest example), /help/artwork-size (12 × 15 in adult design area), /help/compare-decoration-methods
(12-piece screen minimum, no digital minimum, 48 h / 7 days), /help/decoration-methods (CMYK + white inks).

## What was changed for print, and why

| Part | At 4 in (chest) | At 12 in (back) |
|---|---|---|
| Snowflakes | the three big ones kept (0.30, 0.18 and 0.18 in across; the second and third are the same size), arms thickened from 0.4 pt to 2 pt; the four small ones and the specks dropped (they'd be 0.08-in asterisks) | same three kept, arms 2 pt; small ones and specks dropped |
| Smoke curl | thickened from 1.1 pt to 2 pt | as drawn (3.3 pt) |
| Wood-grain scratches on the wall, lines on the door, white marks on the posts, the white chimney sketch (colour files) | dropped: 0.4–0.7 pt, would print as noise | thickened to 2 pt |
| Neon outlines: window, posts, door, roof, chimney | 2 pt, solid in the `-flat` files | as drawn, solid in `-flat` |
| Lettering | Fraunces hairlines +0.5 pt and the tagline +0.3 pt so the serifs and the 5.6-pt tagline hold | as drawn |
| Back text | — | `CHRISTMAS-LIGHT-CREATIONS.COM` 0.41-in capitals across 11.4 in, `281-819-0163` 0.69-in capitals, 7.1 in wide; Inter Bold, white |

Known limits: the tagline `PEARLAND, TX · SINCE 2011` is 5.6-pt text at 4 in. It reads, but it is
the first thing to go soft on a chest print; a 4.5-in chest print or dropping that line on the
chest fixes it (say so and the script does it). The site line on the back is 0.41 in tall rather
than 0.6 in: at 0.6 in it would be 15 in wide, wider than the print area; the phone number is the
0.69-in line.

## Big cottage on mustard (back burner, 2026-10-16)

The owner's Recraft design: the big snowed-in cottage with falling flakes on a mustard shirt, art
running to the hem. Owner: "Im gonna go for the exact look ... this will go on the back burner until
I can locate someone to do it". Files in `recraft/` (ignored, local only):

| File | Size at 300 dpi | For |
|---|---|---|
| `big-cottage-mustard.svg` | vector, 896 × 1200 | the owner's Recraft original (white page) |
| `big-cottage-mustard-allover.png` / `.svg` | 6000 × 8036 px = 20 × 26.8 in | **all-over print** (the exact look): mustard `#C9911F` edge to edge, snow ground added under the house |
| `big-cottage-mustard-dtf.png` / `.svg` | 6000 × 8036 px, transparent | DTF on a mustard blank: front, bottom placement, about 1 in above the hem |
| `big-cottage-mustard-limited-dtg.png` (+ `-limited-snow.svg`) | 3600 × 3695 px = 12 × 12.3 in, transparent | the owner's smaller Recraft version (`-limited-size.svg`) with a snow mound added: fits the usual 12 × 16 in DTG box, so any DTG shop can print it on a mustard blank today |
| `Big-cottage-mustard-mockups.zip` | 3 × 896 × 1200 px | Recraft's cut-outs, low-res: reference only |

What to tell a printer:

- **All-over (sublimation)** is the only way to get the art all the way to the hem and seams. It
  prints on a white polyester shirt and the mustard is ink, so the shirt feels like a sports tee,
  not cotton; seams and armpits can show thin white creases. Ask for their template and send the
  allover PNG; they place it.
- **DTF** on a mustard cotton blank keeps the cotton feel, but a 20 × 27 in transfer feels like a
  large sticker and doesn't breathe. Ask for the closest blank to `#C9911F` and send the dtf PNG.
- **DTG** won't go past about 12 × 16 in: send the limited PNG.
- The house walls are close to the mustard (`#C98427` on `#C9911F`); the dark outlines carry them.

The snow added under the house (behind everything), in the 896 × 1200 drawing's units: big file
`<path fill="#FEFFFF" d="M0 1016C150 991 300 996 448 993C600 990 750 988 896 1012L896 1200L0 1200Z"/>`
and `<path fill="#ACD2E0" d="M110 1030C300 1016 600 1014 790 1026C600 1023 300 1025 110 1036Z"/>`;
limited file `<path fill="#FEFFFF" d="M150 1026C170 1000 300 986 460 985C620 984 740 996 780 1022C784 1030 772 1035 740 1036C600 1041 300 1041 182 1037C152 1036 146 1031 150 1026Z"/>`
and `<path fill="#ACD2E0" d="M200 1027C340 1018 600 1016 740 1023C600 1026 340 1028 200 1033Z"/>`.
The PNGs are sharp renders of those SVGs (metadata stripped, trimmed for the limited one).

## Collegiate (Recraft, 2026-10-16)

The owner's CHRISTMAS LIGHT / CREATIONS / EST. 2011 in collegiate block letters (`recraft/CLC-collegiate-svg.svg`,
mockup `CLC-collegiate-mockup.png`). `node scripts/shirt-collegiate.mjs` makes it print-ready, 11 × 3.4 in on
the front, in two inks: `collegiate-on-navy` (gold `#ffcf4d`, for the navy shirt) and `collegiate-on-gold` (navy
`#050b1a`, for a gold or mustard shirt), each as PNG (300 dpi, transparent), SVG and PDF, plus
`collegiate-preview.png` on navy, gold and mustard. The download's dark slivers between the letters are dropped,
every letter is one solid ink, and EST. 2011 (traced as blobs) is set again in Inter ExtraBold at the mockup's size.
One ink, so it also screen-prints as a single colour. A second version, `collegiate-font-on-*`, sets the words in Graduate (a real collegiate face, Google Fonts, SIL Open Font License, in `assets-source/brand/fonts/graduate/`) as outlines: straight clean edges, but lighter and wider than the mockup's letters; `collegiate-preview.png` shows traced (top) and font (bottom). Owner picks.

## Bradley as the mascot (2026-10-16)

In memory of Bradley, co-owner, who died in October 2025. Owner: "I wanna make him the business mascot". Two Recraft
portraits made from his photos (`recraft/bradley-blue-line art.svg`, `recraft/bradley-navy-gold.svg`, local only);
`node scripts/shirt-mascot.mjs` makes them print-ready, 11 in wide, as PNG (300 dpi), SVG and PDF in `recraft/`:

| File | Shirt | Ink |
|---|---|---|
| `mascot-line-on-navy` | navy | white (the lines are the shirt) |
| `mascot-line-on-light` | white, gold or mustard | navy |
| `mascot-gold-on-navy` | navy | gold, one ink |
| `mascot-gold-on-gold` | gold or mustard | navy, one ink |

The fishing cap's patch (another company's fish logo) is replaced by our cottage. `mascot-mockups.png`: him on a
navy polo's left sleeve (2.25 in), on the back of a navy tee (gold) and a mustard tee (line art) over the name, and
laser-engraved on a leather cap patch. Open: the owner picks the master look; a character artist redraws him in a
few poses (also gives a human-made version that can be copyrighted); his name or nickname on anything is the
owner's call.
