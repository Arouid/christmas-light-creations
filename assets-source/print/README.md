# Print-ready vector files

Signs, truck graphics, a banner, business cards and a sticker, made from the logo vectors in
`../brand/logo-vector/` by `node scripts/print-vectors.mjs` (about 12 s; needs Chrome for the PDFs and
Python with fontTools for the text, both already here). Not shipped with the site.

Each item is three files: **`.pdf`** (vector, text as outlines: the file to send to the shop),
`.svg` (the same, editable in Illustrator, Inkscape or Affinity) and `.png` (a preview, not for
printing). `preview-sheet.png` shows them all, not to scale.

| File | What | Size | Order as |
|---|---|---|---|
| `road-sign-24x18` | corner sign: logo, service line, phone, site, QR | 24 × 18 in, no bleed | 4 mm coroplast, both sides (same file), H-stakes |
| `yard-sign-18x12` | "Lights by" sign for a customer's yard after an install | 18 × 12 in, no bleed | coroplast, both sides, H-stake |
| `vehicle-magnet-24x12` | truck door magnet | 24 × 12 in, 0.75-in rounded corners, no bleed | 30-mil magnetic sheet |
| `door-decal-20in-white`, `-navy` | cut-vinyl door graphic, one colour: white for dark paint, navy for light paint | 20 × 11.2 in, no background | cut vinyl; the shop welds overlapping shapes |
| `banner-72x36` | vinyl banner for events or the yard | 72 × 36 in, no bleed; nothing within 3 in of the edges | 13-oz vinyl, hemmed, grommets every 2 ft |
| `business-card-front`, `-back` | cards, front logo on navy, back contact on white | 3.5 × 2 in trim, 0.125-in bleed (file 3.75 × 2.25) | 16-pt stock, full-colour both sides |
| `sticker-3in` | rounded-square sticker (the app tile) | 3 × 3 in trim, 0.65-in corners, 0.125-in bleed (file 3.25) | die-cut vinyl sticker |

## Ordering notes

- Send the PDF and ask for **100 %, no scaling**: the PDF page is the finished size (the card and
  sticker pages include the bleed; the preview PNGs draw the trim as a dashed line).
- Signs, magnet and banner have no bleed: the navy runs to the edge and nothing important sits
  within 0.75 in of it (3 in on the banner, for hems and grommets).
- Colours are sRGB: navy #050b1a (the site's background), white, gold #ffcf4d, pale blue #c9d1e6,
  neon magenta #f038ee, green #5fe757 and red #ff3a3a. Let the shop convert to CMYK; the navy
  prints near-black, which is right.
- No fonts to supply: the name is the logo's own Fraunces outlines, everything else is Inter as
  outlines. The neon glow is drawn as solid lines so the PDFs stay pure vector (no raster inside).
- **QR codes** open the site tagged `?sign=<code>`, and the estimate request then shows where it
  came from (`src/lib/sign.js`, the Signs tab in the staff app): `road-sign`, `yard-sign`,
  `vehicle`, `banner`, `card`. Road signs by corner, so each corner is counted apart:
  `node scripts/print-vectors.mjs --signs broadway-288 dixie-farm-35` writes
  `road-sign-24x18-<code>` files with the QR tagged `?sign=<code>` (use the codes from the Signs
  tab). Road-sign codes are 4.8 in wide so a phone scans them from a car; the card's 1-in code
  scans from a hand.
- The card back names Scott Minor (`CARD_NAME` at the top of the script); change it and rerun for
  another person's cards.
- The cut decal's smallest letters (PEARLAND, TX · SINCE 2011) are 0.3 in tall; that is about the
  smallest a vinyl cutter weeds cleanly. If the shop objects, ask for the decal without that line.

## Changing the words or sizes

The copy (phone, site, the service and area lines, "FREE ESTIMATES", "SCAN FOR A FREE ESTIMATE")
and each item's layout live at the top of `scripts/print-vectors.mjs`; edit and rerun. Lines
thinner than 1 pt at print size (0.5 pt on the card and sticker) are thickened automatically, and
the card and sticker leave out the specks, the small snowflakes and the wood-grain scratches, as
on the shirts (`../shirts/`).
