# Gift wrapping (new service)

Status: **built, switched off** (2026-10-13). Owner, 2026-10-13: "put the gift wrapping on a switch, I'm not ready to take it live yet." Idea from the owner (2026-10-08): offer holiday gift wrapping alongside light installs (same customers, same season). Owner is known for great wrapping; photos exist.

**Own page since 2026-10-15.** The owner looked at the home-page mock-up and agreed with the design review that the home page was already long (measured at 375 px: 18.8 phone screens without the section, 21 with it). He asked for gift wrapping to get **its own page, white and red** so it stands out as separate from the lights site, with more Christmas imagery. The home page keeps one small card. His wrapping is luxury-level (big hand-tied wired-ribbon bows, layered ribbons, matching tags); his best photo is a close-up of navy/gold snowflake bows on buffalo-check and gold paper. So far he has sent screenshots only: the original files are still to come.

## The switch

- `settings/app.giftWrapping`, a boolean, **off unless exactly `true`** (`giftWrappingOn()` in `functions/giftWrapping.js`, re-exported by `src/lib/giftWrapping.js`).
- Staff app: **⚙ Settings → 🎁 Gift wrapping → Show gift wrapping on the website** (`src/leads/SettingsPanel.jsx`). Saved like every other setting (`onSave` merge).
- The `booking` HTTP function (`functions/index.js`) adds `giftWrapping: true|false` to its JSON, next to the availability; cached 5 minutes like the rest, so the website follows within 5 minutes.
- The public pages learn it from that one fetch (`fetchBooking` → `parseBooking` in `src/lib/urgency.js`; in `src/lib/giftWrapping.js`, `useGiftWrapping()` (false until the server says on) and `useGiftWrappingAnswer()` (null until the server answers, then true or false; a failed fetch counts as off), both `useSyncExternalStore` hooks whose server snapshot is false / null). Everything below is drawn only after the answer arrives, so the **built HTML never contains a word of gift wrapping**: `scripts/prerender.mjs` refuses a build if any prerendered page (head included) carries `ift wrapping` or any phrase of the `giftWrapping` words (`giftPhrases()`: every string with a space in it, as written or as React escapes it).
- Dev server only: `?giftwrap` on any page (`/?giftwrap`, `/gift-wrapping/?giftwrap`) shows the feature without the live switch (Vite drops that branch from the build).
- Off (the default): nothing about gift wrapping renders or is mentioned anywhere public. `nav` and `faq` in content.js stay clean on purpose (they are drawn into the built HTML and feed the sales assistant); the gift-wrapping copy lives in its own `giftWrapping` export. `tests/giftWrapping.test.mjs` checks all of this.

## The page: `/gift-wrapping/`

`gift-wrapping/index.html` → `src/gift/main.jsx` → `src/gift/GiftPage.jsx`. Words in `giftWrapping` in `src/data/content.js`.

**While the switch is off, or before the answer:** the page is the shared header, an empty `<main>` (three red dots) and a footer. On an off answer it sends the visitor to the home page (`location.replace`). Chosen as the safest of the options, because each layer covers a gap in the others:

| Layer | What it stops |
|---|---|
| Content drawn only after the server says on | Nobody, crawler or person, can read the page while it is off: the built HTML has no word of it (checked at build). |
| Off → sent to the home page | Someone with the address (a guess, an old link) lands on the real site, not on a blank page; a crawler that runs JavaScript sees a redirect. |
| `noindex` in the HTML, no canonical, no description, no share card, a neutral `<title>` | Search engines never list it, whatever links to it. |
| Never in the sitemap (`sitemapUrls` in `scripts/pages.mjs`), so never pinged to IndexNow (it pings sitemap pages only) | Nothing announces it. The sitemap is built at build time and can't see a switch that lives in Firestore. |
| Not named in `robots.txt` | A `Disallow` line would itself tell everyone the page exists, and would stop crawlers from seeing the `noindex`. |

A redirect alone was rejected (a crawler that doesn't run JavaScript would read a page full of gift-wrapping words), and so was `noindex` alone (anyone with the link could read it while off). The JavaScript bundles still carry the words, as the home page's did before; only the HTML is kept clean.

**While on:** the browser tab says "Gift Wrapping in Pearland, TX | …" and the page draws itself as a wrapped present (owner 2026-10-15: "make the page look gift wrapped"), top to bottom:

1. **The lid:** pale wrapping paper (white-pink with faint red snowflakes), a wide red **satin ribbon** across the top with **one big many-looped bow** on it, and red ornaments hanging from the ribbon on strings (two on phones, four from 1024 px).
2. **The same ribbon runs down the middle of the page** behind every section, so the two cross under the bow like a tied box. Each section is a **white box** lying on it (with a thin ribbon round its top edge), so the ribbon shows only between boxes and never under words. A sprig of holly is tucked into the ribbon between boxes.
3. **Hero box:** eyebrow "New this Christmas", the title, the intro, **🎁 Ask about gift wrapping** (to the form below) and **Call 281-819-0163**.
4. **Prices on a gift tag:** a cream tag with a red notched border and a punched hole, hung by a string from a small glossy bow on the ribbon: Small $15, Medium $22, Large $30, Oversized $40, each with examples, "Your hand-tied designer bow is included in every price", and "Not sure which size? Text us a photo".
5. **Wrapped by us**: the photo grid, only once `giftWrapping.photos` is filled.
6. **How gift wrapping works**: the three steps, numbered on glossy red beads; the details list ("Good to know") once `details` is filled.
7. **Your questions, answered.**: the four gift-wrapping answers (the price one gives the four prices).
8. **Ask about gift wrapping** (`#estimate`): the estimate form in its white-and-red look with **Gift wrapping already picked** (`<EstimateForm service="Gift wrapping" skin="snow" />`); on phones the form comes right after the heading, Call / Text us follow.
9. Footer (white): ← Christmas Light Creations, the phone, the footer links.

The shared header (night blue, ☎, menu) shows the logo **with a red neon bow on the cottage's roof peak** here only (owner 2026-10-15: "be cool if we could get a red bow on our logo", option A: this page only; he turned down a photo-real stock bow as "pasted in over top" and picked a bow drawn in the logo's own neon style). `public/images/gift-wrap/logo-wide-bow.png` is the site's logo picture, unchanged, with the bow drawn on it by `scripts/gift-logo.mjs`: pale core, red tube and soft red glow like the roofline and the chimney, a faint glow inside the loops, the knot on the roof's top edge right of the chimney. Our own drawing, no stock. Passed as `<Header logo>` once the switch says on, so the built page keeps the plain logo. Every other page, the favicon, app icons, emails, print and the home card keep the logo as it is. The Call / Free estimate bar on phones (white and red here, `MobileCta skin="snow"`) are on it too. Decoration never covers text or buttons: the ribbon down the page is behind the boxes, the bow's tails end in the hero box's top padding, the ornaments hang beside the bow.

**The look** (owner 2026-10-15, an exception to "colours from the theme tokens"): realistic, glossy satin ribbon like his own hand-tied bows (not flat or cartoon), white boxes on pale paper, red from the berry tokens (two added to `src/index.css`: `berry-50` #fff5f6 for the paper and hovers, `berry-700` for hover and shade), a cream tag (`amber-50`), navy and slate text, focus rings in red (`.on-snow`). The paper's snowflakes are the `gift-snow` class in `src/index.css`; the ribbon is set inline in `src/gift/GiftPage.jsx` (a slice of the stock band repeated across and, turned, down). The bow picture is placed from where the band crosses it (26.6 % to 48.6 % of its height, printed by the script), so its band lines up with the page's ribbon at every width (`--band`: 2.25rem on phones, 3rem from 768 px, 3.75rem from 1024 px). Contrast (computed): berry-600 on white 6.6:1 (white on berry-600 buttons the same), on the paper 6.0:1 or better; slate-600 body text 7.6:1; berry-700 links 9.1:1; slate-500 placeholders 4.8:1.

**Christmas imagery and its sources** (all the owner's Vecteezy Pro downloads, confirmed Pro by him 2026-10-15, so no credit line; raw EPS files in `assets-source/stock/vecteezy/packs/gift-wrap/<name>/`, git-ignored; `scripts/gift-art.mjs` draws them with Ghostscript, takes out the white background the artist built in, keeps the soft shadows as see-through shade, and writes `public/images/gift-wrap/decor/`):

| Where | What | Vecteezy item (folder) | File |
|---|---|---|---|
| Top of the page | Ribbon band and the big many-looped bow | red-realistic-ribbon-bow 69103390 | `bow-480.webp`, `bow-800.webp`, `ribbon-x.webp` (and `ribbon-y.webp`, the same slice turned, for the ribbon down the page and the home card's edge) |
| Hanging from the top ribbon | Plain, starred and glittered ornaments on red strings | red-christmas-ornaments-set-glossy-red-baubles 86462541 | `bauble-plain.webp`, `bauble-stars.webp`, `bauble-glitter.webp` |
| Between boxes, form box | Holly sprigs with berries | christmas-holly-leaves-and-red-berries-3d-illustration 66917022 | `holly-left.webp`, `holly-right.webp` |
| Above the price tag, home card | Small glossy bow | red-realistic-silk-bows-elements 8656589 | `bow-small.webp` |
| The paper | Faint red snowflakes | Our own drawing (`gift-snow`, an inline SVG pattern) | |
| The price tag | Cream tag, red border, hole and string | Drawn in code (the stock tags' fixed shape can't hold four rows on a phone) | |
| The header, this page only | The logo with a neon bow on the cottage's roof peak | Our own drawing (`scripts/gift-logo.mjs`) on `public/images/clc-logo-wide.png` | `public/images/gift-wrap/logo-wide-bow.png` |

Not used (yet): the silver and gold snowflake sets (dark backgrounds baked in; the paper's own snowflakes do the job), the corner ribbons, curls and spare bows, the tag pictures, the gift certificate (has words printed on it). Stock decorates only; the logo's bow is our own drawing. (Vecteezy's licence, §8(f), checked 2026-10-15, would allow Pro **vector** art as part of a logo, non-exclusively, never filed as a trademark; Envato items never go in a logo.) **Every wrapped gift shown is the owner's own work**: no stock or AI gift photos, ever. Licensed Envato Elements items may be added under the rules in `assets-source/stock/envato/README.md` (download per project, raw files never committed).

## What shows when it is on, elsewhere

- **Home page:** one small card after Photos (`src/components/GiftTeaser.jsx`, words `giftWrapping.teaser`): white with a satin ribbon down its edge and the small glossy bow, "New this Christmas · We wrap gifts too · Crisp corners, real ribbon, bows that stay put. See gift wrapping", linking to the page (135 px tall at 375 px, under a quarter of a phone screen). No section and no gift FAQ group on the home page any more. Home at 375 px: 18.8 screens off, 19.1 on (was 21 with the old section).
- **Menu:** a **Gift wrapping** link after Photos, desktop nav and the ☰ drawer (`navLinks()`), to `/gift-wrapping/`. Only the home page asks the server; the header on `/cost/`, `/design/` and the policy pages doesn't.
- **Estimate form** (home, `/design/`, the gift page): **What do you need?** Christmas lights / Gift wrapping / Both, at the top. The gift page opens it on Gift wrapping; elsewhere it opens on Christmas lights. With Gift wrapping alone picked, "What would you like lit?" goes away and the form's intro, address hint, message hint, send button ("Ask for my price") and text-us line talk about wrapping (`giftWrapping.form`). Saved on the lead as `service` (`LEAD_FIELDS` in `src/lib/firebase.js`, the `leads` create rule in `firestore.rules`: one of the three, or absent). While the switch is off the form has no such field and the lead carries no `service` at all; `submitLead` drops anything that isn't one of the three. (`service` is a keyword in the rules language: the rule reads it as `request.resource.data['service']`, never `.service`; the emulator tests caught that.)
- **Staff app:** the lead card header shows **🎁 Gift wrapping (no lights)** or **🎁 Lights + gift wrapping** (`serviceLabel()`), the details line **Needs: …**. The staff alert email (`functions/leadEmail.js`) gets 🎁 in the subject and a **Needs** row. The "Got your request" email (`functions/ack.js`) has its own next steps for wrapping alone, and one extra line for Both (`docs/specs/auto-emails.md`).
- **Sales assistant:** **left out until the owner turns it on**. Its knowledge is built from `nav`/`faq`, which don't mention it; when the switch goes on, one line in ⚙ Settings → What the sales assistant knows ("We wrap gifts too: …") is enough, or add `giftWrapping.faq` to `src/assistant/lib/knowledge.js` and rebuild. Chosen over a "when the owner turns it on" clause in the prompt, which the model could read as live.
- **Privacy page:** says some pages, like the home page, ask our own server what's open right now, including which services we're offering, without naming gift wrapping.

## Turning it on (owner)

1. Paste the new `firestore.rules` (the lead's `service` field) in the Firebase console.
2. Deploy the `booking` function: `npx --yes firebase-tools@14.11.0 deploy --only functions:booking --project clc-leads-site --non-interactive` (and `newLeadAlert` for the 🎁 emails: `--only functions:booking,functions:newLeadAlert`).
3. Answer the questions below (#2–6 still open); the answers go into `giftWrapping` in `src/data/content.js` (`details`, and the FAQ answers if they change); confirm the price tag's size examples. Photos: original files (not screenshots) in `gift-wrap-incoming/` (not in git), processed like the gallery (`scripts/process-photos.mjs`: resize, strip location data, the gallery's natural touch-up), then listed in `giftWrapping.photos`.
4. Staff app → ⚙ Settings → 🎁 Gift wrapping → tick. Check the site 5 minutes later (test checklist #119–120, #181–183).
5. Google Business Profile: add "Gift wrapping" as a service.

## Listing the page in search (later, owner's call)

The page stays `noindex` and out of the sitemap even while the switch is on: the build can't see the switch, and a page that search engines list but that sends visitors home half the year would hurt more than help. When the owner wants "gift wrapping Pearland" searches to find it (decide after the first season's demand), in one commit: take `noindex` out of `gift-wrapping/index.html` and give it a canonical, description and share card (`tests/seo.test.mjs` lists public pages); add it to `sitemapUrls`; draw its content into the built HTML (drop the gift-wrapping checks for that page in `scripts/prerender.mjs` and the test); stop the redirect home; and add the FAQ structured data. That also means the switch no longer hides the page, so do it only once gift wrapping is a standing service.

## Questions for the owner

#1 answered by the owner on 2026-10-15; the rest still open, and the copy promises nothing on them (no dates, supplies or names); fill the **Answer** column and the words get updated. Idea from the 2026-10-15 conversation, not decided: wrapping Dec 15–23, last drop-off Dec 21.

| # | Question | Examples / notes | Answer |
|---|---|---|---|
| 1 | **Pricing** | Per gift by size, a basic wrap plus a signature-bow add-on, per hour, or "contact for a quote" | **Owner 2026-10-15: "do $15/$22/$30/$40 with the bow included"**: per gift by size, small $15, medium $22, large $30, oversized $40, his hand-tied designer bow in every price (no add-on tier). On the page: the price tag, the price answer, step 2. **The size examples are ours, owner to confirm:** small = jewelry box, book, gift card; medium = shirt or sweater box, small toy; large = boot box, board game, robe box; oversized = big toy boxes and odd shapes. Also to confirm: whether sales tax is added (the page doesn’t say). |
| 2 | **How gifts get to you** | Customer drops off at your place; you pick up (e.g. during an install or service call); both | |
| 3 | **Timing** | Start date; last drop-off day before Christmas; turnaround time | |
| 4 | **Supplies** | Paper, ribbon, bows included or extra? Can customers bring their own? | |
| 5 | **Who wraps** | Name on the site ("wrapped by …")? | |
| 6 | **Commercial orders** | Businesses wrapping client/employee gifts: yes/no, minimum order? | |
