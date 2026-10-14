# Account tour (customers)

> Status: built 2026-10-14 (front end only, no server or rules change) · Owner's question the same day: do customers also get a tour when they log in? Staff had one (`src/leads/Tour.jsx`); the customer account at `/account/` had none.

## What we want

A short look around the customer's own account page, the first time they sign in on a phone or computer, pointing at the parts of **their** page and nothing else.

- **Cards, at most five**, in page order, each pointing at a real section (`anchor` = the section's id on `AccountPage.jsx`):

| Card | Shown when | Points at |
|---|---|---|
| 🎄 Your lights this season | the Your lights section shows. Lines: the install and takedown dates (when on this season's list); **Yes, put my lights back up** (when not on it yet: the Rebook box); **🛠 Report a problem** (when they have a customer record) | `#lights` |
| 💬 Chat with us | the chat section shows | `#chat` |
| 🧾 Agreements & payments | they have a proposal or an invoice | `#agreements` |
| 📱 Get the app | not in the installed app (Get the app box shows) | `#app` |
| 🧭 Everything else is in ☰ | always, last: ☰ lists every part, Help, **Take the tour**; call or text 281-819-0163 | the ☰ button `#account-menu` |

- The first card opens with "Welcome, Pat! A quick look around." (first name from their record, as the page's "Hi, Pat").
- **Opens by itself once per device**, on the first signed-in visit, and only when it has something of theirs to show (not for the ☰ card alone: someone with nothing linked yet in the installed app gets no tour). Closing it any way (Done, ✕, Escape) marks it seen in `localStorage` `clcAccountTourDone` = `1`. A private window forgets the flag, so it shows again next time; with storage blocked outright it doesn't open by itself (☰ still has it). Never an error. The iPhone home-screen app has its own storage, so it shows once more there (without the Get the app card).
- **Any time again** from ☰ → **🧭 Take the tour** (signed in only).
- **The card**: a bottom sheet on phones (full width, 12 px margin), a 384 px card bottom-right from `sm:` up. The section it talks about scrolls to just above the top of the screen and is lit up (gold ring) with the rest of the page dimmed (`[data-tour-spot]` in `src/index.css`, screen only). Not modal: the page stays usable under it. Back / Next / Done, ← → keys, ✕ and Escape close it. Every button 44 px.
- Words in `src/data/accountTour.js` (`ACCOUNT_TOUR`, `ACCOUNT_TOUR_UI`), never in the component. Plain words, only things the page really does.

## What we don't do

| Left out | Why |
|---|---|
| A card for property details, email preferences, yearly price, paid invoices, Help | The first-sign-in nudge already asks for the details; the rest is one tap away in ☰, which the last card points to. Five cards is the limit. |
| Remembering on the server | A device flag is enough and costs nothing; nothing about the customer is stored. |
| A tour on the sign-in screens | Nothing to show yet; the sign-in form explains itself. |

## Pieces

| Piece | File |
|---|---|
| Cards, words, pure filter (`accountTourFacts`, `accountTourSteps`, `tourWorthOpening`) | `src/data/accountTour.js` |
| The card | `src/account/AccountTour.jsx` |
| Opening once, the device flag, ☰ id | `src/account/AccountPage.jsx` |
| ☰ → Take the tour | `src/account/AccountDrawer.jsx` (`onTour`) |
| Spotlight | `src/index.css` (`[data-tour-spot]`) |
| Tests | `tests/accountTour.test.mjs` (which cards and lines for which account, every anchor exists on the page, ≤ 5 cards, privacy line) |
| Privacy | `privacy` → What your browser keeps (content.js) says the device remembers the tour was seen |

The filter uses the same tests the page uses to draw each section (`scheduleText` from `functions/service.js` for the dates and the Rebook box). When a section's rule changes on the page, change it in `accountTourFacts` too; the anchor test catches a renamed id.

## Acceptance (who checks)

- `/account/?demo` (dev, after clearing `clcAccountTourDone`): five cards, each lighting its section; reload: no tour; ☰ → Take the tour: it's back; Escape and ✕ close it. `/account/?demo=rebook`: the first card talks about **Yes, put my lights back up**. Claude, browser pane at 375 px and desktop.
- Live, a real first sign-in on a phone (owner or a customer): the tour opens once; reopened from ☰. Test checklist.
