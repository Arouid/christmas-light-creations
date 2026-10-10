# "Design your lights": the designer on the public website

> Status: live 2026-10-10 (rules published, newLeadAlert deployed, site pushed) · approved 2026-10-10 by Scott (Finess) · owner phone test pending

## The problem

Every competitor sells "custom designs", but nobody lets a homeowner try it themselves. Our light designer (built for staff proposals) can do exactly that: put lights on a photo of your own house. Today only staff can use it, so a visitor has to imagine the result and then decide whether to ask for an estimate.

## What we want

A page **christmas-light-creations.com/design/** ("Design your Christmas lights, free"), linked from the home page:

1. It **opens on a sample house** with some lights already on it, so a visitor plays right away. **Use a photo of my home** swaps in their own photo.
2. Next to the upload: **tips for a good photo** (whole front of the house, straight on from across the street, phone sideways, daylight or dusk, nothing parked in front).
3. Every uploaded photo is **resized to one standard size** (1280 px on the long side, JPEG) before the designer opens; a photo that's too small (under 800 px) is refused with a tip. Phone location data is dropped (only pixels are kept).
4. The **designer in a simple mode**: draw lights along rooflines, rectangles/ovals for windows, decorations, erase, colors and styles, night slider, hold-for-before, undo, download the picture. **No prices, no $/ft, no feet or bulb counts, no measuring tool**: we don't show how we price.
5. **Get my free estimate with this design** → the usual estimate form on the same page, with a thumbnail "Your design is attached". On send, the design (and their photo) goes with the request.
6. Staff see the design on the lead (Leads card and the lead's Accounts page) and can **open it in the staff designer** for that lead (it becomes one of the lead's designs), then make the proposal as usual.
7. Phone number one tap away on the page, like everywhere.
8. **Checked and temporary** (owner, 2026-10-10): when a design arrives, the server re-encodes both pictures as real JPEGs (no hidden data, at most 1280 px) and rebuilds the design from known fields; anything that fails is deleted. Uploads are **deleted 30 days** after they arrive; a copy staff saved into the lead's designs stays with the lead.

## What we DON'T do

- **No price, no ballpark, no feet**: owner, 2026-10-10.
- **No Street View photo from an address** (costs per load, can be abused); maybe later.
- **No accounts or saving** a design to come back to; they can download the picture.
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

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-10 | Public page /design/, sample house first, upload own photo, photo tips, standard size, no pricing | Owner |
| 2026-10-10 | Standard size = 1280 px on the long side, JPEG ~0.8, re-encoded smaller if needed to fit; < 800 px refused | Sharp enough on phones and screens; a photo + finished picture fit one Firestore document (1 MB) |
| 2026-10-10 | Simple mode is a `simple` prop of the existing designer module (hides measure, history, feet/bulbs, $/ft, price) | One designer to maintain; the module stays app-free |
| 2026-10-10 | Sample house is a drawn illustration (`public/images/design/sample-house.jpg`, made from an SVG in `assets-source/`) until the owner sends a real daytime photo | Every photo we have is lit at night; a designer needs an unlit house |
| 2026-10-10 | Designs travel in a new collection `leadDesigns/{id}` (public create only, staff read); the lead gets `designId` | Keeps the lead small; a design doc is ~0.6 MB |
| 2026-10-10 | Server check on arrival (`leadDesignCreated`): sharp re-encodes photo and picture (metadata dropped, ≤ 1280 px, never larger than what arrived), `cleanDesign` keeps known fields only (styles/colors/decorations lists tested against the designer's); failures deleted | Owner asked whether uploads are sanitized; the page's own redraw can be skipped by writing to the database directly |
| 2026-10-10 | Uploads deleted 30 days after arrival (`cleanupLeadDesigns`, daily 3:15 am Central); staff-saved copies (designs/designFiles) stay | Owner: "only keep those pictures around temporarily", 30 days |

## Acceptance criteria

1. [test] Standard size: long side 1280 (landscape and portrait), aspect kept, small photos refused; size checks for the stored photo/picture/design. → `tests/publicDesign.test.mjs`
2. [test] Rules: anyone can add a design within the size limits and only the known fields; nobody but staff reads them; nobody updates or deletes; a lead may carry `designId`. → `npm run test:rules`
3. [human] /design/ at 375px: sample house with lights shows; designer opens in simple mode with no $ / ft / bulbs / Measure anywhere; Upload a photo → tips visible → the photo opens resized; Get my free estimate shows the form with the thumbnail; no horizontal scroll; no console errors. Observer: agent, browser pane (dev, no real send).
4. [test] Server cleaning: design rebuilt from known fields (unknown styles/colors/decorations and off-photo points dropped, scale and price emptied, nonsense refused); only JPEG data URLs decoded; 30-day expiry. → `tests/leadDesigns.test.mjs`
5. [agent] The same sharp pipeline strips EXIF/GPS from a test JPEG, caps it at 1280 px, and refuses a non-image. → checked 2026-10-10 (verified.md)
6. [human] Live: owner designs on a photo of a test house, sends the request → the lead shows the design picture in Leads; Open in designer opens it for the lead. Known-good control: a request without a design still arrives normally. Observer: owner.

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
