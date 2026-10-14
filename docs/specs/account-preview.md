# Staff preview of a customer's account

> Status: built 2026-10-14 (not deployed: `accountPreview` and `myAccount` need the functions deploy) · Owner the same day asked for the "customer view" he remembered, to look at what customers see. It existed only for one proposal (**Open customer view**) or one invoice (**Customer's page**), not for the account page at `/account/`.

## What we want

Staff open a customer's account page **exactly as that customer sees it**, read-only.

- **👁 View their account**: a button on the customer card (`CustomerDetail.jsx`, the panel from Customers / Edit details) and on the Accounts page (`AccountsView.jsx`). It opens `/account/?preview=<customer id>` in a new tab. Only in the staff app; never linked from the public site. The page stays `noindex` and robots-disallowed like the rest of `/account/`.
- **Sign-in**: staff Google sign-in on that page (the same Firebase sign-in as the staff app, so someone already signed in to `/leads/` goes straight in). Not signed in: a card "See their account as they do" with **Sign in with Google**, and nothing is asked of the server. Not on the staff list, or signed in by email link or phone: "Staff only", with Google sign-in again. Record gone: "That customer isn't here".
- **The server**: `accountPreview` (callable, `functions/index.js`) checks staff exactly like every staff callable (`isStaffToken`: a verified Google sign-in whose email is on the `staff` list; the token part is `staffTokenEmail` in `functions/account.js`), reads the customer record and answers with **the same payload `myAccount` gives the customer**, for every email and phone on that record (`previewIdentity`), plus `preview: { id, name, canSignIn }`.
- **One payload, two callers**: `accountFor` (`functions/index.js`) does the reads and `accountPayload` (`functions/accountPayload.js`, pure, tested) builds the answer, for both `myAccount` and `accountPreview`. The fields Firestore is asked for (`PROPOSAL_FIELDS`, `CUSTOMER_FIELDS`) sit next to the builder; a test builds the payload from records cut down to those fields and requires the same answer as from the full records. `accountFor` then adds `house` (a 1-hour link to our 🏠 house photo, `docs/specs/account-house-photo.md`), so the preview shows the same house picture.
- **Reads only**: the preview never records a sign-in (`recordLogin` is only in `myAccount`, so the Accounts login line doesn't change), never fills the account index (`fill: false`), logs no activity, alerts nobody, writes nothing.
- **The page** (`src/account/AccountPage.jsx`, `?preview`):
  - A red bar at the top that stays while scrolling: "Preview: you're seeing {name}'s account. Nothing you do here is sent." (words in `src/lib/accountPreview.js`). When the record has no email or phone: a second line saying they can't sign in to this page yet. Under the ☰ drawer (its ✕ stays reachable), above the tour's dimming.
  - Everything else drawn **as the customer sees it**: greeting, "Signed in as" their email (else phone), the ★ review card (whatever this device remembers), the details nudge, Your lights, chat, property details, email preferences, yearly price, invoices, agreements, what they've paid, Get the app, Help, ☰. **The tour opens by itself**, as on their first visit, whatever this device remembers.
  - **Every action greyed out** (disabled, or a disabled `<fieldset>` around a form, tooltip "Preview: nothing is sent"), and each handler returns early in a preview: chat Send, Report a problem, Pay (a greyed stand-in instead of PayPal's buttons; PayPal isn't loaded), Review and sign, Yes put my lights back up, property details Save, the email switch, the review card's button and Not now, the details nudge ✕, Sign out (and no Sign out in ☰, which would sign the staff member out of the staff app too), Get the app's install buttons.
  - Nothing kept on this device: closing the tour doesn't mark it seen; the review card and the nudge are neither read from nor written to storage.
  - Still live, because they only read: ☰ and its links, ↻ Check for replies (reloads the preview), Help search, View or print a signed agreement, the invoice links (opened with `&preview=1`, so the invoice isn't marked viewed).
- `/account/?demo&preview=x` (dev): the sample account with the bar and everything greyed out; the staff app's sample data (`/leads/?demo`) links there.

## What the preview shows when they have several emails or phones

A customer signs in with one email (Google, the email link) or one phone. The preview looks up **every** email and phone on the record (`email`, `otherEmails`, `phone`, `otherPhones`), so it shows what any of their sign-ins would show. Different only when an old proposal or invoice went to an address they no longer sign in with: the preview shows it, their sign-in with the other address doesn't. When two customer records share an email, the page's name, schedule and chat come from the first record found, exactly as for the customer; the red bar names the record staff opened.

A record with no email or phone can't be signed in to; the preview still shows the record (no proposals or invoices, since those are found by email or phone) and says so in the bar.

## What we don't do

| Left out | Why |
|---|---|
| Acting for the customer from the preview (send, pay, sign, save) | Staff do those from the staff app, where it's logged under their own name. |
| A preview link anyone can open | Customer data only through the server, and only to staff. |
| Firestore rules | No new collection; the callable reads with the server's rights after the staff check. |

## Pieces

| Piece | File |
|---|---|
| Payload builder, field lists | `functions/accountPayload.js` |
| Preview identity, request check, staff token check | `functions/account.js` (`previewIdentity`, `previewRequest`, `staffTokenEmail`, `accountQueries` with lists) |
| Reads (`accountFor`), `myAccount`, `accountPreview`, `isStaffToken` | `functions/index.js` |
| Link, bar words, error words | `src/lib/accountPreview.js` |
| `loadPreview` | `src/lib/account.js` |
| The page | `src/account/AccountPage.jsx`; the tour scrolls below the bar (`src/account/AccountTour.jsx`) |
| Buttons | `src/leads/CustomerDetail.jsx`, `src/leads/accounts/AccountsView.jsx` |
| Tests | `tests/accountPreview.test.mjs` |
| Staff guide | `src/leads/guide.js` (What's new, Accounts, What customers see, the task "See a customer's account page the way they see it") |

## Acceptance (who checks)

- `npm run check`; `/account/?demo&preview=x` at 375 px and desktop: the bar, the tour opening by itself and landing below the bar, every action greyed out, nothing in `localStorage` after closing the tour; `/leads/?demo` → a customer: the button on the Accounts page and on the customer card links to the preview. Claude, browser pane.
- Live, after the deploy (owner): from the staff app, 👁 View their account on a customer who has signed in before: the page matches what they see (ask them, or compare with your own test account); their **Customer login** line doesn't change; a non-staff Google account on the link gets "Staff only". Test checklist #151–#153.
