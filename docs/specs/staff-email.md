# Staff email from the app

> Status: implemented 2026-10-09, not deployed yet (TODO #38) · Decided 2026-10-09 by Scott (owner)

## The problem

Staff email customers from the staff app by tapping **Email**, which opens a Gmail compose window as info@ with the template filled in. They leave the app, need Gmail signed in as info@ on that phone, press Send there, then come back (and in a bulk list, tap "Sent ✓ Next" by hand). Owner, 2026-10-09: "is it possible to email and text from inside our app without having to leave to go to Google". Texting stays in Google Voice (no API; see decisions 2026-10-08); this spec is email only.

## What we want

**One person** (customer detail, Accounts customer and lead pages, lead cards, Past requests, "Email review link"):
- **Email** opens the compose box in the app: **To** (an email on their record; a choice when they have several), **Template**, **Subject** and **Message** filled in from the shared templates, editable.
- **Send** sends it right away from info@ ("Christmas Light Creations"); replies go to info@.
- Then **Sent ✓**: the email is in that person's **Text & email history** at once, marked as ours and who sent it.
- **Open in Gmail instead** stays, for anything the app doesn't do (attachments, Cc, another address).

**Many people** (Season → ✉ Email these N, Emails tab → Send…, Past requests → email the list):
- Same one-by-one screen as today, but each person has **Send** (sends from the app, then moves on) and **Skip**. "Already sent this season" tracking is unchanged, so a list can be resumed without repeats.
- **Send the rest (N)**: one confirm, then the app sends one at a time with a short pause, showing progress, with **Stop**. People whose template has blank parts (e.g. no install rate on file) are skipped and listed, not sent. It stops at the first problem and says what happened.
- **Open in Gmail instead** stays per person.

**Afterwards**: the customer's reply lands in info@ like any email, in the same Gmail conversation as the copy in info@'s **Sent** folder, and the message sync files it in their history within minutes.

**When it fails** (Gmail down, daily limit, not allowed): the box says so in plain words, nothing is marked sent, and failures of our own (not the limit) show in the red website-problem banner and the alert email.

## What we DON'T do

| Left out | Why |
|---|---|
| Texting from the app | Google Voice has no API; owner hasn't chosen a texting service |
| Attachments, Cc/Bcc, formatted (HTML) emails | Plain one-to-one emails like the templates; Gmail is one tap away for the rest |
| Sending to an address that isn't on their record | A typo or a stolen staff login can't email strangers; fix the record first, or use Gmail |
| An added signature | Owner: templates already end with "Thank you, Christmas Light Creations, 281-819-0163" |
| Reading or replying to the inbox inside the app | Incoming mail already reaches history through the sync; alerts are another session's work |
| Scheduled or automatic sends | Staff always press Send |
| One Bcc blast | One email per person is better for spam filters and history |
| Open/click tracking | Site rule: no tracking |

## Edge cases

- **Several emails on the record** (email field with two addresses, or "Also:" emails): To is a choice; history is filed on that record either way. Bulk sends go to the first address in their email field (shown on each person's screen).
- **No email on file**: no Email button (as today).
- **Lead already made a customer**: filed on the customer.
- **Past-request card**: filed on its customer when the card is linked to one; otherwise kept on the card's record (not shown in a history yet).
- **Double tap / two staff at once**: Send is disabled while sending; the server allows one send per second per staff member.
- **Daily limit** (300 emails a day from the app, Central time; Gmail's own cap for info@ is 2,000 a day for all its mail): "Daily limit reached"; the rest can go tomorrow or through Gmail. "Send the rest" stops there.
- **Email went out but saving it to history failed**: reported as a website problem; the sync files the Sent copy within about 5 minutes anyway.
- **The same email filed twice** (once by the app, once by the sync from info@'s Sent folder): prevented. The app's entry uses the same id the sync would give it, and the sync skips Sent copies of app emails (matched by Message-ID, or by recipient + subject + start of the text if Gmail ever changes the Message-ID).
- **Template edited after sending**: history keeps what was actually sent.
- **The customer's address bounces**: the bounce comes back to info@ (the app doesn't detect it).
- **Signed out, or not on the staff list**: refused; only staff signed in with Google can send.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-09 | Copies stay in info@'s Sent folder (owner) | Gmail keeps them anyway when we send through it; replies thread with them; same as invoice emails |
| 2026-10-09 | No extra signature (owner) | Templates already sign off |
| 2026-10-09 | Bulk: review each, plus "Send the rest" after one confirm; 300 a day from the app (owner) | Fast for long lists without anything going out unseen by accident |
| 2026-10-09 | Sending is a server function (`sendStaffEmail`) with the existing info@ mailer; the browser never holds the mail password | Same mailer as invoices and sign-in links |
| 2026-10-09 | Staff test on the server = the rules' `isStaff` (verified email, Google sign-in, lowercase email in `staff`) | One definition of staff |
| 2026-10-09 | Recipient must be an email on the customer / lead / past-request record | Limits what a mistake or a stolen login can do |
| 2026-10-09 | History entry written by the server; no `syncedAt` on it | The daily "sync stopped" check reads `syncedAt`, so app sends must not hide a dead sync |
| 2026-10-09 | No `firestore.rules` change | `messages` and `serverState` writes are server-only (Admin SDK); the browser only calls the function |

## Acceptance criteria

1. [test] The request check refuses: a bad or missing address, two addresses, empty or too long subject/message, a line break in the subject, more than one target or none, an address not on the record; accepts a valid request (trimmed). → `tests/staffEmail.test.mjs`
2. [test] For an email the app sends, the history id, `mailId` and `mailPrint` the server computes equal what the sync computes from its Sent copy (Message-ID with brackets, any letter case, Windows line endings); a different text gives a different `mailPrint`. → same file
3. [test] Daily limit and one-per-second gap: under the limit passes, the 301st of the day is refused, a new Central day starts at 0, a second send by the same staff member within a second is refused, another staff member isn't slowed. → same file
4. [agent] `sendStaffEmail` refuses callers who aren't staff (the four checks of `isStaff`) before reading or sending anything, and logs no addresses or message text. → read `functions/index.js`
5. [agent] In `/leads/?demo` at 375 px: Email → Send → "Sent ✓", and the entry appears in that customer's Text & email history marked with the sender; bulk Season → ✉ Email these → Send, Skip, Send the rest (with a skipped person), Stop; no console errors; no horizontal scroll. Observer: Claude, browser pane.
6. [human] Owner: a test customer with your second email → Email → Send. The email arrives from info@ within a minute and is in info@'s Sent folder; it shows **once** in that customer's Text & email history right away, and still once 10 minutes later (after the sync ran). Known-good control: an invoice email sent earlier shows once in history. Observer: owner, phone + staff app.
7. [human] Reply to it from the test address: in Gmail it's in the same conversation; within 10 minutes it shows in history as from the customer. Observer: owner.

## Contract

**Callable `sendStaffEmail`** (us-south1), signed-in staff only.

Request: `{ to, subject, text, customerId? | leadId? | pastRequestId?, template? }`, exactly one target id.
Limits: `to` one address ≤ 200 chars; `subject` 1–200 chars, one line; `text` 1–10,000 chars; `template` ≤ 60 chars.
Answer: `{ ok: true, id }` (the history entry id). Errors (`HttpsError`, message shown to staff): `unauthenticated` / `permission-denied` (not staff), `invalid-argument` (bad request), `not-found` (record gone), `failed-precondition` (address not on the record), `resource-exhausted` (daily limit or too fast), `unavailable` (sending failed).

**`messages/{id}` written by the function** (same shape as the sync's emails, plus who sent it):

| Field | Value |
|---|---|
| id | `em-<20 hex of SHA-256 of the lowercase Message-ID>-<record id>` (what the sync would give the Sent copy) |
| `kind`, `direction`, `source` | `email`, `out`, `app` |
| `at` | ISO time sent |
| `email`, `subject`, `text` | recipient (lowercase), subject, message (≤ 4,000 chars) |
| `customerId` / `leadId` / `pastRequestId` | where it shows (a linked past request also gets `customerId`) |
| `sentBy`, `template` | staff email, template id |
| `mailId` | `em-<20 hex>` (id without the record part) |
| `mailPrint` | `ep-<20 hex of SHA-256 of recipient, subject and the first 120 characters of the cleaned text>` |

The sync (`messageSync`) skips an outgoing email whose `mailId` or `mailPrint` is already on an app entry (counted as duplicate, reason `sent-from-app`).

**`serverState/staffEmail`** (server only): `{ day: 'YYYY-MM-DD' (Central), count, last: { <staff email>: ms } }`.

## Links

- Templates: `src/lib/emailTemplates.js`, placeholders `src/lib/messages.js`
- History and sync: `docs/specs/message-sync.md`
- Mailer, `reportIncident`, other server emails: `functions/index.js`
- Gmail limits (checked 2026-10-09): knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace (2,000 messages/user/day, 100 recipients per SMTP message). Gmail saving SMTP-sent mail in Sent: client docs (Thunderbird, Outlook, eM Client) say not to save a second copy because Gmail does it; to confirm on the owner's test (criterion 6).

## Plan (2026-10-09, delete when done)

1. Pure checks + keys in `functions/staffEmail.js` and `functions/messageSync.js`, tests.
2. `sendStaffEmail` + sync dedupe in `functions/index.js`.
3. Compose box Send + Gmail fallback; EmailQueue Send / Send the rest; callers pass the target; demo mode.
4. History shows the sender; staff guide; privacy wording; docs.
5. Owner OK → deploy `sendStaffEmail` + `messageSync`, push; owner test (6, 7).
