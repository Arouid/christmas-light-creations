# "Design your lights": the designer on the public website

> Status: live 2026-10-10 (rules published, newLeadAlert deployed, site pushed; server check + 30-day delete live) · approved 2026-10-10 by Scott (Finess) · owner phone test pending

## The problem

Every competitor sells "custom designs", but nobody lets a homeowner try it themselves. Our light designer (built for staff proposals) can do exactly that: put lights on a photo of your own house. Today only staff can use it, so a visitor has to imagine the result and then decide whether to ask for an estimate.

## What we want

A page **christmas-light-creations.com/design/** ("Design your Christmas lights, free"), linked from the home page:

1. It **opens on a sample house** with some lights already on it, so a visitor plays right away. **Use a photo of my home** swaps in their own photo.
2. Next to the upload: **tips for a good photo** (whole front of the house, straight on from across the street, phone sideways, daylight or dusk, nothing parked in front).
3. Every uploaded photo is **resized to one standard size** (1280 px on the long side, JPEG) before the designer opens; a photo that's too small (under 800 px) is refused with a tip. Phone location data is dropped (only pixels are kept).
4. The **designer in a simple mode**: draw lights along rooflines, rectangles/ovals for windows, erase, colors (C9 bulbs only; no decorations, owner 2026-10-10), night slider, a Before toggle, undo, save the picture (the share sheet on phones, so it lands in Photos). **No prices, no $/ft, no feet or bulb counts, no measuring tool**: we don't show how we price.
5. **Get my free estimate with this design** → the usual estimate form on the same page, with a thumbnail "Your design is attached". On send, the design (and their photo) goes with the request.
6. Staff see the design on the lead (Leads card and the lead's Accounts page) and can **open it in the staff designer** for that lead (it becomes one of the lead's designs), then make the proposal as usual.
7. Phone number one tap away on the page, like everywhere.
8. **Checked and temporary** (owner, 2026-10-10): when a design arrives, the server re-encodes both pictures as real JPEGs (no hidden data, at most 1280 px) and rebuilds the design from known fields; anything that fails is deleted. Uploads are **deleted 30 days** after they arrive; a copy staff saved into the lead's designs stays with the lead.

## What we DON'T do

- **No price, no ballpark, no feet**: owner, 2026-10-10.
- **No Street View photo from an address** (costs per load, can be abused); maybe later.
- **No accounts or saving** a design to come back to; they can save the picture. The browser tab keeps the design until it's closed (so a reload or Back doesn't lose it), nothing longer.
- **Nothing leaves the visitor's phone** unless they send the estimate request (photo and design stay in the browser until then).
- **No design without a request**: we don't collect designs from people who don't ask for an estimate.
- **No keeping uploads**: website photos/designs go after 30 days (staff save a copy if they need it for a proposal).
- The staff designer itself doesn't change (simple mode is an option of the same module).

## Edge cases

- **Portrait photo**: accepted (long side 1280), with a tip that sideways fits the house better.
- **Huge photo / HEIC**: the browser decodes it; if it can't ("this photo type can't be opened here"), a tip says to take a screenshot or a regular photo.
- **Sample house + estimate**: the design is attached with `photo: sample` (no upload); staff see it on the sample house ("they liked this look").
- **Design attached but the request fails**: the visitor sees the usual "Something went wrong, call us"; nothing half-saved shows to staff (the lead is what staff see; an orphan design without a lead is harmless).
- **Spam**: same anti-spam check as the form (App Check), the honeypot field, and size limits in the rules (photo ≤ 450 KB, picture ≤ 450 KB, design ≤ 100 KB).
- **No Firebase config** (dev): the estimate step shows the call button, like the home page.
- **Someone writes to the database directly** (skipping the page): the server re-encodes the pictures and rebuilds the design; a fake picture or nonsense design is deleted, and the lead's box says it isn't available.
- **After 30 days**: the lead keeps `designId`; its box says the upload was deleted and points to saved copies.

## Watermark and terms (2026-10-13)

The owner asked (2026-10-12) what stops a competitor from lifting the designer and the site's ideas. The cheap steps, all live on this page:

- **Every picture that leaves the page carries our mark**: the wide logo on a dark see-through plate in the bottom-right corner, with `christmas-light-creations.com/design` under it, sized with the picture (logo 24% of the width, text 19 px on a 1280-px photo, 14 px on a portrait one). It's drawn into the exported bitmap only (`watermark` in `src/lib/publicDesign.js`, pure, tested with a fake canvas; called by `finishedPicture` and by the designer's ⬇ Save through its `stamp` prop, both in `src/design/photo.js`), so the thumbnail on the form, the picture staff see on the lead, and anything a visitor downloads or screenshots say where it came from. The editor on screen stays clean; the staff designer keeps its text-only brand line. If the logo can't load, the mark is text only.
- **Terms of use at `/terms/`** (words `termsOfUse` in content.js, shell `PolicyPage.jsx` shared with `/privacy/`): the site, the designer, its pictures and copy are ©; the designer is for getting an estimate from us and for personal use; no copying, scraping, reselling or building a competing tool from it; an estimate request isn't an offer until we send a price; links to the privacy page. Under 400 words, dated, and plainly not the installation agreement. Indexable (in the sitemap), linked next to Privacy in every footer (home, designer, area pages) and from the © line under the designer.
- **© lines**: "© {year} Christmas Light Creations · Terms of use" under the designer's picture; the home page footer's © line links to `/terms/`.

What this does: copying now looks like what it is, and a lawyer has something to point at. What it doesn't: stop a determined copy (the page is public JavaScript). The one step only the owner can take: register the name and the cottage logo as trademarks (USPTO), so the mark on every picture is a registered one.

## Usability round (audit 2026-10-14)

An in-depth audit of the designer (19 findings, now in `docs/reviews/designer-2026-10.md` and the staff app's 📊 Reports → Design; the Oct 14 report with screenshots: https://claude.ai/artifact/2QMZLAjfAi9ya2vAC8mac2) and the owner's "lets fix everything". What it changed:

- **Nothing drawn gets lost.** ✕, Save and the picture take the line being drawn with them (2+ taps; `withDraft` in `src/designer/model.js`). The phone's **Back** closes the designer instead of leaving the page: opening adds a history entry (`backCloses`), ✕ and Estimate → leave through it. The design, and their photo, stay in the **browser tab** (`sessionStorage`, `SAVED_KEYS` / `savedDesign` in `src/lib/publicDesign.js`, tested) so a reload or Back then Forward opens it again; gone when the tab closes (privacy page says so). A new photo over a design with lights asks first (**Start over** / **Keep this one**).
- **Undo** while a line is being drawn takes back the last tap (↶ and Ctrl+Z), never the strand before it. Sliders and typed numbers save as they change (arrow keys included) and one drag is one undo step (`pushStep` merge in `src/designer/history.js`, tested).
- **Layout.** Upright screens: tools, photo, a view bar under the photo (**Before** toggle, 🌙 Night, − + Fit: nothing sits on the house any more), then the controls at 30% of the screen. Screens wider than tall and at least 560 px (a phone turned, a tablet, a computer; the `sideways:` variant in `src/index.css`): photo on the left, tools and controls in a 20rem column on the right. Rectangle and Oval share one **Shapes** button, so the website's four tools fit 375 px. A selected strand's **Delete** sits beside its name; colors are one row that scrolls sideways on phones; the single "C9 bulbs" chip, Spacing and the pattern when there's one color are hidden on the website, and the pattern reads "Colors change every 2 bulbs". Pins and corners are rings with a clear middle.
- **Guidance.** A three-step how-to over the photo the first time it opens on a device (`coach` in content.js; remembered with `designer-intro-seen` in localStorage). The sideways-photo tip shows on the photo right after a portrait upload. While a line is being drawn, Done is the one solid gold button and Estimate → is outlined; Done appears from the second tap.
- **The page.** The picture itself opens the designer ("Tap to try it"); the screen-reader note is read first (hidden text) but shown under the buttons; the page behind the designer is `inert`, and focus comes back to Open the designer / Keep designing. The form's thumbnail is 144×96 and says "Our sample design is attached" when they didn't change the sample.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-10 | Public page /design/, sample house first, upload own photo, photo tips, standard size, no pricing | Owner |
| 2026-10-10 | Standard size = 1280 px on the long side, JPEG ~0.8, re-encoded smaller if needed to fit; < 800 px refused | Sharp enough on phones and screens; a photo + finished picture fit one Firestore document (1 MB) |
| 2026-10-10 | Simple mode is a `simple` prop of the existing designer module (hides measure, history, feet/bulbs, $/ft, price) | One designer to maintain; the module stays app-free |
| 2026-10-10 | Simple mode also hides 🎀 Decorate and every bulb style but C9 | Owner (marked them off on a screenshot) |
| 2026-10-10 | Header says "← … Back to the main site" under the name (the logo link already went home, but nothing said so) | Owner: less savvy people couldn't tell how to get back |
| 2026-10-10 | Sample house is a drawn illustration (`public/images/design/sample-house.jpg`, made from an SVG in `assets-source/`) until the owner sends a real daytime photo | Every photo we have is lit at night; a designer needs an unlit house |
| 2026-10-10 | Designs travel in a new collection `leadDesigns/{id}` (public create only, staff read); the lead gets `designId` | Keeps the lead small; a design doc is ~0.6 MB |
| 2026-10-10 | Server check on arrival (`leadDesignCreated`): sharp re-encodes photo and picture (metadata dropped, ≤ 1280 px, never larger than what arrived), `cleanDesign` keeps known fields only (styles/colors/decorations lists tested against the designer's); failures deleted | Owner asked whether uploads are sanitized; the page's own redraw can be skipped by writing to the database directly |
| 2026-10-10 | The page opens on a ready-made picture of the sample (`public/images/design/sample-design.webp`, drawn by the designer's own code in headless Chrome: `node scripts/sample-design.mjs`); the designer and drawing code load only when the visitor opens it, uploads a photo or changes the sample; the untouched sample's picture for staff is drawn when the request is sent | Drawing at load cost phones ~0.6 s of blocked time (Lighthouse); rerun the script after changing the sample, the house or `render.js` |
| 2026-10-10 | Uploads deleted 30 days after arrival (`cleanupLeadDesigns`, daily 3:15 am Central); staff-saved copies (designs/designFiles) stay | Owner: "only keep those pictures around temporarily", 30 days |
| 2026-10-13 | Every picture the page exports or attaches gets the logo + address mark, drawn into the bitmap only (editor clean, staff designer unchanged) | Owner (2026-10-12): stop competitors stealing the designer; a screenshot then advertises us |
| 2026-10-13 | `/terms/` terms of use on the privacy page's shell; © line under the designer; the footer © links to it | Same ask: cheap legal footing now, attorney later with the contract |
| 2026-10-14 | Usability round (above): Back closes the designer, the tab keeps the design, nothing tapped is lost, Shapes button, view bar under the photo, side column on wide screens, first-run how-to, Before toggle, share sheet on phones | Owner: "lets fix everything" (designer audit, 19 findings) |

## Acceptance criteria

1. [test] Standard size: long side 1280 (landscape and portrait), aspect kept, small photos refused; size checks for the stored photo/picture/design. → `tests/publicDesign.test.mjs`
2. [test] Rules: anyone can add a design within the size limits and only the known fields; nobody but staff reads them; nobody updates or deletes; a lead may carry `designId`. → `npm run test:rules`
3. [human] /design/ at 375px: sample house with lights shows; designer opens in simple mode with no $ / ft / bulbs / Measure / Decorate anywhere, only C9 bulbs; Upload a photo → tips visible → the photo opens resized; Get my free estimate shows the form with the thumbnail; no horizontal scroll; no console errors. Observer: agent, browser pane (dev, no real send).
4. [test] Server cleaning: design rebuilt from known fields (unknown styles/colors/decorations and off-photo points dropped, scale and price emptied, nonsense refused); only JPEG data URLs decoded; 30-day expiry. → `tests/leadDesigns.test.mjs`
5. [agent] The same sharp pipeline strips EXIF/GPS from a test JPEG, caps it at 1280 px, and refuses a non-image. → checked 2026-10-10 (verified.md)
6. [human] Live: owner designs on a photo of a test house, sends the request → the lead shows the design picture in Leads; Open in designer opens it for the lead. Known-good control: a request without a design still arrives normally. Observer: owner.
7. [test] The mark: laid out inside the bottom-right corner, scales with the picture, text only without a logo; `finishedPicture` draws the photo, then the logo and the address over it. → `tests/publicDesign.test.mjs`
8. [human] /design/ at 375 px: the picture on screen has no mark; after a change, the "Your design is attached" thumbnail shows the logo and address bottom-right; ⬇ Save in the designer downloads a marked JPEG; the © line under the picture opens /terms/, which reads in full with its privacy link working. Observer: agent, browser pane (download: owner on a phone).
9. [test] Nothing tapped is lost and one drag is one undo: `withDraft` keeps a line of 2+ taps, `pushStep` merges a slider's steps and never into an older one; a design kept in the tab comes back only when it's whole (`savedDesign`). → `tests/designer.test.mjs`, `tests/publicDesign.test.mjs`
10. [human] On a real Android phone and an iPhone: draw on /design/, use the Back gesture (designer closes, design still there), reload (it comes back), ⬇ Save (share sheet, Save Image lands in Photos), turn the phone sideways (photo left, controls right). Observer: owner. → test-checklist #167

## Contract

`leadDesigns/{auto id}` (public create, staff read, no update/delete):

| Field | Value |
|---|---|
| `design` | designer JSON (string, ≤ 100,000 chars), photo coordinates in the 1280-px photo |
| `photo` | `data:image/jpeg;base64,…` (≤ 450,000 chars) or `sample` |
| `image` | finished picture with lights, `data:image/jpeg;base64,…` (≤ 450,000 chars) |
| `createdAt` | server time |
| `checkedAt` | server time, set by `leadDesignCreated` after it re-encoded `photo`/`image` and rebuilt `design` (a doc that fails is deleted) |

`leads/{id}.designId`: optional, the `leadDesigns` id (string ≤ 60).

## Links

- Designer module: `src/designer/README.md`; staff designs and proposals: `src/leads/designs/`, `docs/specs/customers.md`
- Estimate form and lead fields: `src/components/Estimate.jsx`, `LEAD_FIELDS` in `src/lib/firebase.js`, `firestore.rules`
