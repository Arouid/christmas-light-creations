# assets-source

The working files behind the site, the ads and the print work. Nothing here ships: what the site
serves lives in `public/`. Git keeps the small files we made ourselves (about 48 MB). Big, licensed
or private files stay on this PC only, ignored in `.gitignore`, so **they have no backup unless
someone copies them elsewhere** (the folders marked *ignored* below).

Reorganized on 2026-10-14; the old folder names are at the bottom.

## What lives where

| Folder | What | In git? | Read by |
|---|---|---|---|
| `brand/logo-vector/` | The cottage logo as SVG (colour, one-colour white/navy, stacked, horizontal), tiles, sign-and-trees | yes | `scripts/lib/logoArt.mjs` (print, shirts), `scripts/make-account-icons.mjs`, `video/scripts/prepare-assets.mjs` |
| `brand/logo-exports/` | PNG exports: social 1080, Google Business 720, transparent 3x | yes | uploaded by hand |
| `brand/fonts/` | Fonts the print scripts outline that the site doesn't ship: Graduate (collegiate, SIL Open Font License, licence beside it) | yes | `scripts/shirt-collegiate.mjs` |
| `brand/2012-backdrop/` | The 2012 site's winter art the logo was traced from | yes; `hi-res-3x/` ignored | reference |
| `site/sample-house.svg` | The designer page's sample house | yes | `scripts/sample-house.mjs` → `public/images/design/` |
| `photos/gallery-hi-res/` | The owner's hi-res rescans (about 3 MB each), named by neighborhood and town | *ignored* | `scripts/process-gallery.mjs` → `public/images/gallery/` |
| `photos/google-photos/` | Install photos from Google Photos (`originals/`); the web gallery taken down on 2026-10-14 (`old-web-gallery-2026-10-08/`) | *ignored* (customers' houses) | by hand |
| `stock/svg-repo-icons/` | 16 free holiday icons, kept untouched | yes | `scripts/holiday-icons.mjs` → `public/images/holiday/` |
| `stock/vecteezy/` | Vecteezy Pro downloads (zips, packs, mockups, and the gift-wrapping PNGs at the top of the folder) | *ignored* (licensed) | `stock/vecteezy/make-mockups.mjs`; `scripts/gift-bows.mjs` (the gift-wrapping page's bows, ornaments, characters, candy canes, sleigh, holly, the Santa bow, the corner ribbon (red, from the owner's `ribbon corner.png`), bell and garland → `public/images/gift-wrap/decor/`) |
| `stock/envato/` | Envato Elements rules and workflow (`README.md`); downloads in `downloads/<project>/` | README yes; `downloads/` ignored (licensed) | by hand |
| `ads/gemini/` | The owner's Gemini renders of the cottage | yes | `video/scripts/prepare-assets.mjs` |
| `ads/image-assets/` | Google Ads image assets: landscape and square crops, the two ad logos, crop previews | yes | uploaded by hand; `scripts/ads-video.py` reads the logos |
| `ads/youtube/` | Channel banner, profile picture, video thumbnails | yes | uploaded by hand |
| `ads/Gift-Wrapping/` | The owner's photos of his own gift wrapping (`luxury-gift-01..08.jpg`, up to 2752 px), the gift-wrapping page's "Wrapped by us" placeholders | *ignored* (originals) | `scripts/gift-photos.mjs` → `public/images/gift-wrap/` |
| `ads/contact-sheet.jpg`, `ads/contact-sheet-index.txt` | Numbered sheet of `photos-incoming/` (the photo numbers the ads use) | yes | `scripts/ads-video.py`, `video/` |
| `ads/clips/`, `ads/music/`, `ads/sfx/` | Licensed footage, music and sound effects | *ignored* (licensed) | `video/scripts/prepare-assets.mjs` |
| `ads/motion/` | Uppbeat motion graphics, extracted: `snow/`, `light/`, `film/`, `Assets/` (packs as they unzipped), `Support/` | *ignored* (licensed) | not wired yet |
| `ads/video/` | Rendered ads; `keep/` and `Dont-Delete/` are the owner's | *ignored*, except its README and the 5-second ad | `video/`, `scripts/ads-video.py` |
| `print/` | Road and yard signs, banner, cards, door decals, magnet, sticker | yes | `scripts/print-vectors.mjs` |
| `listings/` | Pictures for profiles outside the site (Nextdoor, Thumbtack, Angi, Google): `profile-1080.png` (the cottage render, centred for round crops) and 2:1 covers from roofline photos | yes | `scripts/listing-images.mjs`; uploaded by hand, words in `docs/listings.md` |
| `shirts/` | Crew shirt art; `designs/`; `recraft/` (AI-made designs downloaded from Recraft and their navy knock-out prints `*-on-navy.png`) | yes; big PNGs in `designs/` and all of `recraft/` ignored | `scripts/shirt-art.mjs`, `scripts/shirt-designs.mjs`, `scripts/shirt-knockout.mjs`, `scripts/shirt-collegiate.mjs`, `scripts/shirt-polo.mjs` |

The logo's tracing scripts are in `logo-vector.local/` at the repo root (ignored).

## Where new things go

- **A new gallery photo**: `photos/gallery-hi-res/`, then `node scripts/process-gallery.mjs` and a line in `gallery` in `src/data/content.js`.
- **A licensed download**: `stock/<vendor>/`, or `ads/clips/`, `ads/music/`, `ads/sfx/` for the video pipeline. A new vendor folder goes in `.gitignore` before anything is saved in it.
- **Something we made** (logo, print, shirt, site art): its folder here, in git.
- **Private photos** (customers' houses): `photos/`, ignored. Never commit them.

## Old names (before 2026-10-14)

| Was | Now |
|---|---|
| `logo-vector/`, `logo-exports/`, `2012-backdrop/` | `brand/…` |
| `sample-house.svg` | `site/sample-house.svg` |
| `untouched-svg/` | `stock/svg-repo-icons/` |
| `Vecteezy Downloads/` | `stock/vecteezy/` |
| `envato/` | `stock/envato/` |
| `gallery-hi-res/` | `photos/gallery-hi-res/` |
| `Photos-Downloads/` (its `New folder/`) | `photos/google-photos/` (`old-web-gallery-2026-10-08/`) |
| `Gemini/` | `ads/gemini/` |
| `ads/landscape-*`, `ads/square-*`, `ads/logo-*`, `ads/crops-preview.jpg` | `ads/image-assets/` |
| `ads/youtube-*` | `ads/youtube/` |
| `ads/Mothion Graphics/` | gone: its zips were already extracted in `ads/motion/` (checked file by file), the one unique video moved to `ads/motion/snow/` |
