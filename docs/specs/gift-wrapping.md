# Gift wrapping (new service)

Status: **built, switched off** (2026-10-13). Owner, 2026-10-13: "put the gift wrapping on a switch, I'm not ready to take it live yet." Idea from the owner (2026-10-08): offer holiday gift wrapping alongside light installs (same customers, same season). Owner is known for great wrapping; photos exist.

## The switch

- `settings/app.giftWrapping`, a boolean, **off unless exactly `true`** (`giftWrappingOn()` in `functions/giftWrapping.js`, re-exported by `src/lib/giftWrapping.js`).
- Staff app: **⚙ Settings → 🎁 Gift wrapping → Show gift wrapping on the website** (`src/leads/SettingsPanel.jsx`). Saved like every other setting (`onSave` merge).
- The `booking` HTTP function (`functions/index.js`) adds `giftWrapping: true|false` to its JSON, next to the availability; cached 5 minutes like the rest, so the website follows within 5 minutes.
- The public page learns it from that one fetch (`fetchBooking` → `parseBooking` in `src/lib/urgency.js`; `useGiftWrapping()` in `src/lib/giftWrapping.js`, a `useSyncExternalStore` whose server snapshot is always false). Everything below is drawn only after the answer arrives, so the **prerendered HTML never contains a word of gift wrapping**: `scripts/prerender.mjs` refuses a build whose home or `/design/` page does.
- Dev server only: `/?giftwrap` shows the feature without the live switch (Vite drops that branch from the build).
- Off (the default): nothing about gift wrapping renders or is mentioned anywhere public. `nav` and `faq` in content.js stay clean on purpose (they are drawn into the built HTML and feed the sales assistant); the gift-wrapping copy lives in its own `giftWrapping` export. `tests/giftWrapping.test.mjs` checks all of this.

## What shows when it is on

- Home page: a **Gift wrapping** section after Photos (`src/components/GiftWrapping.jsx`; words in `giftWrapping` in `src/data/content.js`): title, intro, three steps (tell us what you have → we send a price → hand-off and back wrapped), a details list (empty until the owner answers), an "Ask about gift wrapping" button to the estimate form, and a photo grid once `photos` is filled.
- Menu: a **Gift wrapping** link after Photos, desktop nav and the ☰ drawer (`navLinks()`).
- FAQ: a **Gift wrapping** group (4 answers) with the others.
- Estimate form (home, `/design/`): **What do you need?** Christmas lights / Gift wrapping / Both, at the top of the form; choosing Gift wrapping changes the message hint. Saved on the lead as `service` (new field: `LEAD_FIELDS` in `src/lib/firebase.js`, the `leads` create rule in `firestore.rules`: one of the three, or absent). While the switch is off the form has no such field and the lead carries no `service` at all; `submitLead` drops anything that isn't one of the three. (`service` is a keyword in the rules language: the rule reads it as `request.resource.data['service']`, never `.service`; the emulator tests caught that.)
- Staff app: the lead card header shows **🎁 Gift wrapping (no lights)** or **🎁 Lights + gift wrapping** (`serviceLabel()`), the details line **Needs: …**. The staff alert email (`functions/leadEmail.js`) gets 🎁 in the subject and a **Needs** row. The "Got your request" email (`functions/ack.js`) has its own next steps for wrapping alone, and one extra line for Both (`docs/specs/auto-emails.md`).
- Sales assistant: **left out until the owner turns it on**. Its knowledge is built from `nav`/`faq`, which don't mention it; when the switch goes on, one line in ⚙ Settings → What the sales assistant knows ("We wrap gifts too: …") is enough, or add `giftWrapping.faq` to `src/assistant/lib/knowledge.js` and rebuild. Chosen over a "when the owner turns it on" clause in the prompt, which the model could read as live.

## Turning it on (owner)

1. Paste the new `firestore.rules` (the lead's `service` field) in the Firebase console.
2. Deploy the `booking` function: `npx --yes firebase-tools@14.11.0 deploy --only functions:booking --project clc-leads-site --non-interactive` (and `newLeadAlert` for the 🎁 emails: `--only functions:booking,functions:newLeadAlert`).
3. Answer the questions below; the answers go into `giftWrapping` in `src/data/content.js` (`details`, and the FAQ answers if they change). Photos: originals in `gift-wrap-incoming/` (not in git), processed like the gallery (`scripts/process-photos.mjs`: resize, strip location data, glam pass), then listed in `giftWrapping.photos`.
4. Staff app → ⚙ Settings → 🎁 Gift wrapping → tick. Check the site 5 minutes later (test checklist #109).
5. Google Business Profile: add "Gift wrapping" as a service.

## Questions for the owner

Still open. The copy promises nothing on these (no prices, dates, supplies or names); fill the **Answer** column and the words get updated.

| # | Question | Examples / notes | Answer |
|---|---|---|---|
| 1 | **Pricing** | Per gift by size (small $_, medium $_, large $_), per hour, or "contact for a quote" for the first season | |
| 2 | **How gifts get to you** | Customer drops off at your place; you pick up (e.g. during an install or service call); both | |
| 3 | **Timing** | Start date; last drop-off day before Christmas; turnaround time | |
| 4 | **Supplies** | Paper, ribbon, bows included or extra? Can customers bring their own? | |
| 5 | **Who wraps** | Name on the site ("wrapped by …")? | |
| 6 | **Commercial orders** | Businesses wrapping client/employee gifts: yes/no, minimum order? | |

## Not decided

Whether gift wrapping gets its own area/landing page for search ("gift wrapping Pearland"). Decide after the first season's demand.
