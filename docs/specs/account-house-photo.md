# House picture on the customer account

> Status: built 2026-10-14 (myAccount change: needs the owner's functions deploy and one Google Cloud permission, see below) · Owner's question the same day: do customers see their house in their account like staff do? They didn't: the staff customer card showed our own house photo (`housePhoto`, `docs/specs/job-record.md` → House photo) or Street View, while `/account/` showed only the name and address.

## What we want

The signed-in customer sees **the same picture of their house staff see on the customer card**, at the top of their account page, under "Hi, Pat" and the address.

| Staff picked a 🏠 house photo | Street View has the address | The customer sees |
|---|---|---|
| yes | (not asked) | **our photo**, captioned "📷 Our photo · Dec 2, 2025" |
| no | yes | **Google Street View** facing the house, captioned "Google Street View" (owner 2026-10-14: Street View rather than nothing) |
| no | no / Google doesn't answer in 10 s | nothing (no "not found" notice, no empty box) |

- Rounded box, full width of the page, 3:2 on phones and 2:1 from `sm:` up, cropped to fill (`object-cover`). The box holds its shape while the picture loads, so the page doesn't jump; a grey pulse stands in while Street View is looked up.
- Alt text: "Your house at 123 Example St, Pearland, TX 77581" (our photo), "Google Street View of your house" (Street View). `loading="lazy"`, `decoding="async"`. Not a link (nothing to tap).
- Words in `accountHouse` (`src/data/content.js`).
- The address used is the one shown under the greeting (their newest proposal's, else their customer record's), the same as the page already shows.

## Our photo: a 1-hour link, Storage stays staff-only

Photos live in Firebase Storage at `customers/{customerId}/{season}/{photo}.jpg`, readable by staff only (`storage.rules`), so the page can't load them itself. The server does it, in `accountFor` (`functions/index.js`), which builds the answer for both `myAccount` (the customer) and `accountPreview` (staff's 👁 View their account, `docs/specs/account-preview.md`), so staff's preview shows the same picture:

1. `housePhoto` and `photos` are in `CUSTOMER_FIELDS` (`functions/accountPayload.js`), so Firestore returns them with the record it already reads; `photos` is never sent on. The record used is the first one, the same that gives the name and address.
2. `housePhotoFile(customerId, record)` (`functions/account.js`, pure, tested) returns the picked photo's Storage path, only if it sits in **that customer's own folder** as the staff app saves it (`customers/{id}/20YY/{name}.jpg`); a missing, removed, foreign or odd path gives null.
3. `houseLink` signs a **V4 read link to that one file, valid for an hour** (`getSignedUrl`, Admin SDK), made fresh on every visit, and returns `house: { id, url, at }` (`at` = when the photo was taken, for the caption). Never any other photo, never the stored staff download link.

The owner chose the short-lived link over the permanent download link staff's app stores (2026-10-14): a link the customer passes on stops working within the hour.

**Signing needs a permission** the functions don't have by default: the functions' service account (`448935757441-compute@developer.gserviceaccount.com`) must hold **Service Account Token Creator** on the project, and the **IAM Service Account Credentials API** must be on (Google's signed-URL docs). Until then signing fails, the account shows Street View instead, the log says "House photo link failed", and staff get one incident (`house-photo`, red banner + alert email) at most once an hour per server instance, naming the fix.

The page keeps the link it is showing when the account reloads (after a chat message, a payment, a details save): same photo id = no second download. If that link has run out (the page sat open over an hour) it swaps in the newer one; if the photo still won't load, Street View takes its place.

## Street View

The staff card's own lookup (`findStreetView`, `src/lib/streetView.js`): the Maps JavaScript API geocodes the address, the free metadata call checks there is imagery, and the static picture is 640×320 facing the house. Only loaded when there is no photo of ours; with our photo the page makes no Google Maps request. The Maps key is locked to the site's domains and `localhost:5173`, so on another dev port Google refuses it and the page shows nothing after 10 s (that is the time-out at work, not a bug).

Costs: one Geocoding and one Static Street View request per account visit without our photo, inside Google Maps' free monthly allowance at our size.

## Privacy

`privacy` (content.js): **What we collect** names the photos we take of what we installed; **How we use it** says the account shows a picture of the house (our photo through a private 1-hour link, else Street View); **Who else handles it** → Google says that without our photo the account page asks Google Maps for the Street View picture of the address, so Google sees that visit and the address. Nothing new is stored in the browser.

## Staff side

Nothing new to tap: the 🏠 house photo staff pick on the customer card (`HousePicture.jsx`, 🏠 Use as house photo) is what the customer sees. The staff guide says so (Add photos of an install, the account page line in What's new, Leads).

## Pieces

| Piece | File |
|---|---|
| Which file may be linked (pure) | `functions/account.js` `housePhotoFile` · `tests/account.test.mjs` |
| The 1-hour link, `house` in the answer | `functions/index.js` `accountFor` → `houseLink`; fields in `CUSTOMER_FIELDS` (`functions/accountPayload.js`) |
| The picture | `src/account/AccountHouse.jsx`, placed in `AccountPage.jsx` under the address |
| Words | `accountHouse` in `src/data/content.js` |
| Demo | `src/account/demoAccount.js` `house` (a gallery photo); `/account/?demo=street` = no photo of ours (Street View only works on `localhost:5173`) |

## Acceptance (who checks)

- `/account/?demo` at 375 px and desktop: the photo under the address, caption "📷 Our photo · Dec 2, 2025", no sideways scroll, no Google request; `?demo=street` on another port: grey box, gone after 10 s. Claude, browser pane (2026-10-14).
- Live, after the owner grants the role and deploys `myAccount` + `accountPreview` (TODO #78): a customer with a 🏠 house photo sees it on their account (and the link stops working after an hour); a customer without one sees Street View; the staff card shows the same picture. Test checklist #154–#155.
