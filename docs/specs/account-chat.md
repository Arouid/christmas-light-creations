# Account chat: customers and staff write to each other in the account

> Status: spec written 2026-10-13, built the same day (new callables `sendAccountMessage` and `replyToCustomer`, `myAccount` extended, new collection `conversations`; the owner deploys the functions and republishes `firestore.rules` before it works live) · Asked for by the owner 2026-10-12: "Can we communicate directly with them in their account like a chat/text box but using our database?"

## The problem

Customers reach us by text (Google Voice), email (info@) and the account page's Report a problem. Each lands in the staff app, but we answer by text or email, which the app can't send (texts) or sends as a formal branded email. A customer who is already signed in to their account (or has the installed app) has no way to just type "can you come Friday instead?" and get an answer in the same place. The owner wants that conversation in our own database, visible to the whole team like every other message.

## What we want

**Customer side** (`/account/`, signed in, with a customer record under that email):

- A **Chat with us** section (`#chat`, in the ☰ menu): the thread as bubbles (theirs on the right, ours on the left, "Christmas Light Creations" with the day and time), a text box (up to 1,000 characters) and **Send**.
- Send saves the message and tells staff. The page says *Sent. We usually answer within a few hours; urgent? call 281-819-0163.* The thread shows the new message at once.
- When we reply, they get an email **"New message from Christmas Light Creations"** with our reply and an **Open your account** button to `/account/#chat`. It is critical mail: no switch (the Email preferences switch covers only weather heads-ups and tips).
- The page re-reads the thread when they come back to it (tab becomes visible) and on **↻ Check for replies**.
- No customer record under that email (proposal only): no chat section (the call line stays), same rule as Report a problem.
- `/account/?demo` shows a sample thread; Send adds the message locally.

**Staff side** (`/leads/`):

- A new customer message shows in **💬 New messages** as 🗨️ **Account message** with the first words, marked **Needs someone** until someone taps **I've got it** or replies; a phone notification "Account message from Pat Sample"; and an email to the alert list when the message **starts** a new unanswered thread (follow-ups while nobody has answered only buzz phones). The hourly **still waiting** nudge counts an unanswered chat like a text.
- Tapping the entry opens their account; the **💬 Chat** box sits at the top of the account page and under **Edit details** (the customer detail panel): the thread, a reply box, **Send reply**. Sending saves the reply, emails the customer, and logs *Katie P. replied in the account chat to Pat Sample* in Recent activity. Staff can start a thread (no customer message yet).
- **✨ Suggest a reply** reads the chat too: chat messages are part of the thread the assistant drafts from. The draft still goes out through the Email / Text screens (or is pasted into the chat box by hand); a "Reply in chat" button on the draft is a follow-up.
- Rules not published yet: the Chat box says the database rules need publishing (Scott); 💬 and everything else keep working.

## What we DON'T do

| Left out | Why |
|---|---|
| Browser writes to `conversations` | Both sides go through callables with the Admin SDK, so the rules are read-only (staff read; customers read nothing directly: `myAccount` returns the thread with staff emails stripped) |
| Live updates on the customer page | Customers can't subscribe to Firestore (no read rule); re-read on visibility and a button is enough for a thread answered within hours. Phone notifications for replies are TODO #63 |
| Photos in the chat | Needs Firebase Storage for customers (TODO #51 is staff-only); text one to 281-819-0163 for now |
| Threads for leads or past requests | The thread hangs off the customer record; leads chat by email/text until they are made a customer |
| A per-message read state | 💬 "Needs someone" and I've got it already say who is on it |
| Unlimited history | 200 messages per customer; older ones drop off the front (one document per customer, no subcollection) |

## Edge cases

- **Two customer records share the email**: the thread is on the first record (same as Report a problem); staff see it on that account.
- **Customer sends while a thread is unanswered**: same waiting burst (same 💬 entry id, so an I've got it holds); phones buzz again, the alert list isn't emailed again.
- **Staff reply with no email on the record** (and no customer message to answer): the reply is saved; the box says *Saved. No email on file: they'll see it when they open their account.*
- **The reply email fails**: the reply is saved, a website problem is raised (incident kind `email`), the box says so.
- **Rate limits**: a customer may send 30 messages a day, one every 5 seconds; a staff member 300 a day, one a second (`serverState/chat`, like staff email). Over the limit: `resource-exhausted` with a plain sentence.
- **Text too long or empty**: `invalid-argument`; the box keeps what was typed. Whitespace is trimmed; blank lines kept.
- **Two sends at once**: each append runs in a transaction on the conversation document, so nothing is lost.
- **A customer who later replies by email or text instead**: that lands in their history as before; the chat thread stays as it is.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-13 | One document per customer, `conversations/{customerId}`, with a `messages` array capped at 200 | One read gives the whole thread to `myAccount`, the staff box and the assistant; the 💬 list reads one collection by `lastAt` (no collection-group index); the rules are two lines. 200 × ~1.1 KB stays far under the 1 MiB document limit; a customer who writes 200 messages in a season is a phone call |
| 2026-10-13 | Only the server writes (`sendAccountMessage`, `replyToCustomer`) | Customers can't be given Firestore access by email (rules can't match case-insensitively, and the account's email-link sign-in must never count as staff); staff writes through the server keep the customer email and the activity entry in one place |
| 2026-10-13 | The 💬 entry id is `chat-<customerId>-<waitingSince ms>` (the first unanswered customer message), not per message | A customer who adds "oh, and…" keeps the same entry (I've got it holds); a staff reply ends the burst, the next customer message starts a new one and needs someone again |
| 2026-10-13 | A staff reply emails the customer, always (`optional: false`) | The owner: critical account communication can't be opted out of; a reply nobody sees is a complaint |
| 2026-10-13 | The alert list is emailed only when a message starts an unanswered burst | A chatty customer shouldn't send five emails; phones get each message, the nudge covers the rest |
| 2026-10-13 | The customer sees "Christmas Light Creations" on staff messages, never the staff email | Same as emails from the app (sent from info@); staff names stay internal |
| 2026-10-13 | Rate limits in `serverState/chat` with per-person counts | A customer at their daily limit must not block the team; staff email's shared counter wouldn't do |

## Acceptance criteria

1. [test] `chatRequest` trims, keeps blank lines, refuses empty, non-string and > 1,000-character text. → `tests/chat.test.mjs`
2. [test] `appendMessage` keeps at most 200 messages (oldest dropped), sets `lastAt`/`lastFrom`, starts `waitingSince` on a customer message when none is open and keeps it on a follow-up, clears it on a staff reply; a new document gets `customerId`/`customerName`. → same file
3. [test] `chatAllowed`: per-person daily cap and gap, counts reset on a new day. → same file
4. [test] `chatPush` says "Account message from <name>" with the first words and links to their account; `chatAlertEmail` carries the name and escapes HTML; `replyEmail` has the subject "New message from Christmas Light Creations", the text and a button to `/account/#chat`, and is not optional. → same file
5. [test] `chatItems` turns conversations into 💬 entries (kind `chat`, last 7 days by `lastAt`, preview of the last customer message, `name`); an unanswered one "needs someone" until claimed or answered; `waiting()` lists it after 2 hours. → same file
6. [test] `customerView` strips staff emails; Recent activity reads "Pat Sample sent a message from their account" and "Katie P. replied in the account chat to Pat Sample"; `targetLink` for a chat entry opens the customer's account. → same file
7. [test] The assistant's `threadText` lists chat messages as "account chat message" with Us/Customer. → same file
8. [test] Rules: staff read `conversations`, nobody writes, outsiders refused. → `tests/rules/firestore.rules.test.mjs` (`npm run test:rules`)
9. [agent] `/account/?demo` at 375 px: Chat with us with the sample thread, type, Send → the bubble appears; ☰ has "Chat with us"; no horizontal scroll, no console errors. `/leads/?demo`: 💬 shows the 🗨️ entry with Needs someone; the account page shows the Chat box; a reply appears in the thread. Observer: Claude, browser pane.
10. [human] Owner, live after the deploy and the rules paste: sign in to a test customer's account → Chat with us → Send → within a minute a phone notification and the alert email; 💬 shows the entry; reply from the Chat box on the account → the customer email arrives with the reply and the button opens `/account/#chat` showing it; Recent activity has both lines; a second customer message keeps the same 💬 entry; after the reply the next one is Needs someone again. Observer: owner.

## Contract

**`conversations/{customerId}`** (server writes only; staff read):

| Field | Value |
|---|---|
| `customerId`, `customerName` | the customer record |
| `messages` | array, oldest first, ≤ 200: `{ from: 'customer' \| 'staff', by: <email>, text: ≤ 1,000 chars, at: ISO string }` |
| `lastAt` | server time of the last message (Timestamp; the 💬 list and the nudge query `lastAt >= 7 days ago`) |
| `lastFrom` | `customer` \| `staff` |
| `waitingSince` | Timestamp of the first customer message since the last staff reply; `null` once staff replied |
| `count` | messages ever (so a capped thread shows "older messages dropped") |
| `updatedAt`, `updatedBy` | server time; `website` or the staff email |

**Callable `sendAccountMessage`** (us-south1), signed-in customer with a verified email. Request `{ text }`. Answer `{ ok: true, chat }` (the thread as `myAccount` returns it). Errors: `unauthenticated`, `failed-precondition` (no customer record: call us), `invalid-argument`, `resource-exhausted`.

**Callable `replyToCustomer`**, staff (Google sign-in on the `staff` list). Request `{ customerId, text }`. Answer `{ ok: true, emailed: true \| false, note }`. Errors: `unauthenticated`, `permission-denied`, `not-found`, `invalid-argument`, `resource-exhausted`.

**`myAccount`** also answers `chat: { messages: [{ from, text, at }], waiting: bool }` (`null` when no customer record matches).

**Activity**: `{ by: 'website', action: 'chat-message', target: { type: 'customer', id, name }, text: <first 120 chars> }` and `{ by: <staff>, action: 'chat-reply', target: customer, text: <first 120 chars> }`.

**💬 entry** (`chatItems` in `functions/nudge.js`): `{ id: 'chat-<customerId>-<ms>', kind: 'chat', direction: 'in', customerId, name, status: 'waiting' | 'answered', at, syncedAt, text }`.

**Customer email** (`replyEmail` in `functions/chat.js`, through `brandText`): subject *New message from Christmas Light Creations*; heading *New message*; the reply text; button **Open your account** → `https://christmas-light-creations.com/account/#chat`; reply-to info@.

## Links

- Report a problem and the account page: `docs/specs/account-service.md`; the customer app: `docs/specs/customer-app.md`
- 💬, I've got it and the nudge: `docs/specs/staff-alerts.md`, `docs/specs/auto-emails.md`
- The sales assistant's thread: `docs/specs/sales-assistant.md`
- Customer phone notifications for replies: TODO #63
