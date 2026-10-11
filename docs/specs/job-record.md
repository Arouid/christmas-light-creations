# Job record: after-install photos and "What's up"

Status: building, 2026-10-11. Owner: Scott (Finess). Builds on `customers.md` (the customer record) and `add-ons.md` (the yearly price).

## Why

When a crew goes back to a house in year two, nobody remembers exactly what was put up, what colour, how many feet, or where the customer keeps the boxes. The old sheet had free-text notes; the proposal has the line items, but only for customers who signed one. Photos of the finished install settle "it looked different last year" and are handy for service calls, reviews and ads.

## What

Every customer record gets two more things, both on the customer's detail (Edit details) and, read-only, on their Accounts page:

| Part | What it is |
|---|---|
| **📷 Photos** | After-install photos the crew takes on their phone, filed under the customer and the season, newest first, with the date and who took it. Tap to see full size. Removed only by the person who added it or the owner. |
| **🎄 What's up** | The list of what's installed: one line per thing (what, how much, colour, notes), e.g. "Roofline C9 warm white 180 ft", "2 wrapped oaks", "Wreath 36 in", plus **Lights stored** ("garage, 3 boxes labelled": where at *their* house, since we don't store lights). Prefilled from the signed proposal's line items when there is one. |

The Season table and the Customers table get a **What's up** column with the list in one line.

## Photos

### Flow (phone)

1. Open the customer (Accounts → their name, or Customers → tap) → **📷 Photos** → **Take photo** (camera) or **From gallery** (one or several).
2. The browser shrinks each picture to at most 1600 px on the long side, JPEG (this also drops the phone's location data), and a 400 px thumbnail, then uploads both to Firebase Storage. "Uploading 2 of 3…" shows while it works; a failure says why in plain words.
3. The list shows thumbnails, newest first, grouped by season, each with "Oct 12 · Katie P.". Tap one: full size, caption, **Remove** if allowed.

Photos are filed under the **current season** (July–June, `seasonYear()`); older seasons stay where they are. Each photo is about 200–400 KB; a thumbnail about 20–40 KB, so a list of 20 photos costs well under 1 MB on cell data.

### Data

Firebase Storage, bucket `clc-leads-site.firebasestorage.app`:

```
customers/{customerId}/{season}/{photoId}.jpg          full size (≤ 1600 px)
customers/{customerId}/{season}/{photoId}-thumb.jpg    thumbnail (≤ 400 px)
```

Both carry custom metadata `by` (the uploader's email), `customerId`, `season`. The rules use `by`.

Firestore `customers/{id}.photos`: a map keyed by photo id (so two phones adding or removing at the same time don't overwrite each other):

```
photos: { [photoId]: { path, url, thumbUrl, season, at (ms), by (email), width, height } }
```

Written with the same stamped merge write as every other customer field (`mergePaths`), so **no change to `firestore.rules`**. `url` / `thumbUrl` are Firebase download URLs: unguessable (they carry a token) and they work for anyone who has one, like proposal and invoice links; nothing lists or guesses them without passing the Storage rules. Removing a photo deletes both files, then the map entry.

### Storage rules (`storage.rules`, published by the owner)

- Staff only: same test as `firestore.rules` (`isStaff`: Google sign-in, verified email, listed in the Firestore `staff` collection), via a cross-service `firestore.exists()`.
- Only under `customers/{customerId}/{season}/{file}`, season a 4-digit year; everything else refused.
- Create: JPEG, under 2 MB, `metadata.by` must be the uploader's own email, and only where no file exists yet (in Storage rules `create` also covers overwriting; `update` is metadata only, refused).
- Delete: the uploader (`metadata.by` matches) or **the owner**: the staff doc `staff/{email}` has `owner: true` (set once in the Firebase console; nobody writes `staff` from the app).
- Tested against the emulator: `tests/rules/storage.rules.test.mjs` (`npm run test:rules` runs Firestore and Storage rules together).

The app shows **Remove** only when the rules would allow it (same test in `canDeletePhoto`); the rules are what actually enforce it.

### Enabling Storage (owner, once)

Storage isn't turned on for the project yet (the bucket answers 404). Until it is, the Photos section says so and the buttons are hidden on the live site; the demo works without it. Steps in `docs/TODO.md` #51.

## What's up

### Data (Firestore `customers/{id}`)

```
installed: [{ id, what, amount, color, notes }]   e.g. { what: 'Roofline C9', amount: '180 ft', color: 'warm white', notes: '' }
lightsStored: ''                                   where the lights are kept at their house, how many boxes
installedFrom: { token, at }                       set when the list was prefilled from a proposal
```

`amount` is free text ("180 ft", "2", "36 in"): no unit model to get wrong. One line reads as:

- a bare count first: "2 wrapped oaks";
- otherwise what, colour, amount: "Roofline C9 warm white 180 ft", "Wreath 36 in".

No rules change: these are ordinary customer fields written with the stamped update.

### Where

- **Edit details** (customer detail): section **🎄 What's up**: the lines (what / amount / colour / notes, ✕ to remove, **＋ Add a line**), **Lights stored**, and, while the list is empty and a signed or countersigned proposal exists, **Prefill from the signed proposal (date)**. Saves as you go, like the other fields.
- **Accounts page**: a read-only **🎄 What's up** section (lines + Lights stored) with **Edit details**; the **💲 Yearly price & add-ons** section says the lights themselves are listed there (prices there, lights here: no duplication).
- **Season** table and **Customers** table: a **What's up** column (lines joined with " · ", truncated); phone cards show it under the name when the column is on.

### Prefill (pure, `installedFromProposal` in `src/lib/jobRecord.js`, tested)

From the newest signed/countersigned proposal: one line per install item (removal/takedown lines skipped): `what` = the item label, `amount` = qty + unit ("180 ft"; a lone "1" with no unit is left blank), `color` = the first colour word found in the item's details or label (warm white, cool white, pure white, multicolor, red, green, blue, gold…), `notes` = the rest of the details. Staff fix anything before saving.

## Demo (`/leads/?demo`)

Sample Customer has two 2025 photos (one by the demo user, one by Katie: only the first shows Remove) and a What's up list; Example Family has a signed 2026 proposal and no list, so the prefill button shows. Adding a photo in demo keeps it in memory for the session.

## Acceptance (who observes)

1. Owner, phone, a real customer: **📷 Photos → Take photo**: the picture appears in the list within a few seconds with today's date and their name; tap it: full size; **Remove** works on their own photo. (owner)
2. A second staff member sees the same photo without refreshing, and no **Remove** on it unless they are the owner. (two staff)
3. A non-staff Google account cannot read, list, upload or delete under `customers/`; staff can't overwrite a file or upload a PNG or a 5 MB file; only the uploader or the owner can delete. (`npm run test:rules`)
4. Demo: Example Family → Edit details → **Prefill from the signed proposal**: "Roofline C9 warm white 180 ft", "2 wrapped oaks" appear; edit one, add "Lights stored"; the Season table's What's up column shows the line. (Claude, browser pane at 375 px)
5. `npm run check` green; nothing on the public pages changes (Firebase Storage is loaded only from the staff app, with `import()`). (Claude)

## Not in this version

- Photos on leads or proposals (a signed proposal already carries its design mockup).
- Sharing a photo with the customer from the app (copy the full-size link by hand for now).
- Before photos: the designer keeps the "before" picture with the design.
