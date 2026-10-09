# Message sync (texts, voicemails, missed calls, emails → customer history)

Status: function and rules deployed 2026-10-09; Apps Script setup pending (owner steps in `docs/TODO.md` #36). Owner: Scott (Finess).

## The problem

A customer texts the business number, leaves a voicemail, or emails info@. Today that lives only in Google Voice or Gmail, so whoever opens the customer in the staff app doesn't see it. The only history there is the one-time import of the old Voice account (Takeout).

## What we want

Within about 5 minutes, new customer contact shows in that customer's **Text & call history** in the staff app (Customers detail and Accounts page):

| Captured | From | Direction |
|---|---|---|
| Incoming texts | Voice "forward messages to email" notification | in |
| Voicemails, with Google's transcript | Voice "voicemail via email" | in |
| Missed calls | Voice email, *if* Voice sends one (not confirmed) | in |
| Customer emails to info@ | info@ inbox | in |
| info@ emails to customers (To, Cc or Bcc) | info@ Sent | out |

Messages from a number or contact that matches nobody go to an **Unmatched** list (top of the Leads tab), where staff can link one to a customer or dismiss it. Emails that match nobody are **not** stored (info@ gets vendor mail, receipts, spam).

A message that matches a website lead (not yet a customer) is stored on that lead and shows on the lead's Accounts page. If the lead was already made a customer, it goes to the customer.

## What we DON'T do

- **Outgoing Voice texts and answered calls**: Voice doesn't email them. They still come from periodic Takeout imports (same ids, so no duplicates for the same event; see Contract).
- No sending or replying from the app (decision 2026-10-08: texting stays in Voice).
- No attachments (MMS pictures, email attachments): text only. MMS shows as whatever text Voice puts in the email.
- No group texts (skipped, counted in the sync result).
- No storing unmatched emails, and no full email threads: quoted replies ("On … wrote:", `>` lines) are cut, bodies capped at 4,000 characters.
- No real-time push: a 5-minute Apps Script timer is enough for a small business.

## Edge cases

- **Same phone on two customers**: stored once on the first match; `alsoMatches` lists the others.
- **A bulk email (Bcc) to many customers**: one history entry per matched customer.
- **Voice shows a contact name instead of the number** in the subject: the number is taken from the sender address (texts) or the body; if none is found the entry is unmatched with the name kept.
- **The script runs twice / overlaps / retries**: every entry has a fixed id and is only *created*, never overwritten, so repeats are reported as duplicates and staff edits (linking, dismissing) are never undone.
- **The sync function is down**: the script keeps its cursor and retries the whole window next run.
- **Voice changes its email layout**: the parser is tolerant (looks for the sender address, subject words, any phone number) and anything it can't read is skipped with a reason, never stored wrong. The dry run (`testSync`) shows how the last Voice emails parse.
- **Sign-in link emails** to customers (`sendAccountLink`) are skipped: the link must not sit in history.
- **Our own numbers/addresses** (281-819-0163, info@, clc.voicemail.01@) never count as the customer.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-09 | Voice → email → Gmail filter forwards to info@ → Apps Script in info@ every 5 min → HTTP Cloud Function `messageSync` | Agreed with owner. Voice has no API; Apps Script runs inside Google with no server of ours to keep |
| 2026-10-09 | Apps Script only collects raw email fields; all parsing and matching happens in the function (tested in `tests/`) | One tested parser; the script stays short enough to paste |
| 2026-10-09 | Script tracks a time cursor (Script Properties) with a 15-minute overlap instead of "processed" Gmail labels | Gmail labels are per thread: a labelled thread would hide a customer's next reply. Ids make re-sends harmless |
| 2026-10-09 | Shared secret `MESSAGE_SYNC_KEY` in Firebase Secret Manager + Script Properties, sent as header `x-clc-sync-key` | No secret in the public repo; owner sets both, nobody prints it |
| 2026-10-09 | Unmatched texts/voicemails kept in `messages` with `unmatched: true` (no new collection); unmatched emails dropped | Unknown numbers are likely new customers; unknown emails are mostly not |
| 2026-10-09 | Missed calls use kind `missed` (same as the Takeout import) | One history format |

## Acceptance criteria

1. [test] Sample Voice text, voicemail and missed-call emails parse to kind, phone (E.164), direction `in`, time and cleaned text; footers and links removed. → `tests/messageSync.test.mjs`
2. [test] Customer emails: direction from info@ = out; quoted replies cut; sign-in link emails and Voice notifications are not treated as customer emails. → same file
3. [test] Matching: phone in any format, email in any case, customers before leads, converted lead → its customer, nothing → unmatched (Voice) or dropped (email). → same file
4. [test] Same input gives the same id; different text/time/kind gives a different id. → same file
5. [test] Rules: staff can link an unmatched message to a customer or dismiss it; strangers can't read messages. → `npm run test:rules`
6. [agent] The function logs only counts and reasons, never message text, phone numbers or addresses. → read `functions/index.js` `messageSync`
7. [human] Owner sends a text and an email from a personal phone/address that's on a test customer; within 10 minutes both show in that customer's history. Known-good control: an old imported message in the same history. Observer: owner, staff app.
8. [human] A text from a number on no customer shows in Unmatched on the Leads tab; "Link" puts it in the chosen customer's history. Observer: owner.
9. [human] `testSync` in Apps Script logs the last Voice emails as text/voicemail with the right last 4 digits. Observer: owner, Apps Script log.

## Contract

**Apps Script → function**: `POST https://messagesync-77t3pogapq-vp.a.run.app`, header `x-clc-sync-key`, JSON body:

```json
{ "dryRun": false,
  "items": [{ "gmailId": "…", "messageId": "<…@mail.gmail.com>", "date": "2026-10-09T15:04:05.000Z",
              "from": "\"(281) 555-0101\" <12818190163.12815550101.abc@txt.voice.google.com>",
              "to": "…", "cc": "…", "bcc": "…", "subject": "New text message from (281) 555-0101",
              "body": "plain text body (script caps at 20,000 chars)" }] }
```

At most 50 items per call. Answer: `{ ok: true, saved, duplicate, skipped, unmatched, results: [{ gmailId, status, reason? }] }` (dry run adds `kind`, `direction`, `match`, `chars`, `last4`). 401 for a wrong key (no detail), 400 for a bad body.

**`messages/{id}` written by the sync** (Admin SDK; same shape as the Takeout import plus new fields):

| Field | Value |
|---|---|
| `kind` | `text` · `voicemail` · `missed` · `email` |
| `direction` | `in` · `out` |
| `at` | ISO time of the email |
| `text` | cleaned body / transcript (≤ 4,000 chars) |
| `phone` | E.164 (Voice) |
| `email`, `subject` | counterpart's lowercase email, subject (emails) |
| `name` | contact name Voice showed, when there was no number |
| `customerId` or `leadId` or `unmatched: true` | where it shows |
| `alsoMatches` | other customer ids with the same phone |
| `source` | `voice-email` · `gmail` |
| `syncedAt` | server time |

Staff edits on unmatched entries: `customerId` + `unmatched: false`, or `dismissed: true` (stamped `updatedAt`/`updatedBy`).

**Ids** (`functions/messageSync.js`):
- Voice: `gv-` + first 20 hex of SHA-256 of `kind|phone|minute (UTC, YYYY-MM-DDTHH:MM)|text`. The Takeout import (`scripts/old-site/voice-history.mjs`, parser `voiceTakeout.mjs`) uses the same function so the same event isn't stored twice. A Takeout timestamp a minute off from the email gives a second entry; accepted.
- Email: `em-` + first 20 hex of SHA-256 of the lowercase Message-ID, + `-<customer or lead id>`.

## Links

- Apps Script source and setup: `scripts/apps-script/messageSync.gs`
- Customers/staff app: `docs/specs/customers.md`
- Decisions on texting via Voice: `docs/decisions.md` (2026-10-08)
- Format sources checked 2026-10-09: Apps Script `GmailMessage`, `UrlFetchApp.fetch`, `ClockTriggerBuilder.everyMinutes` (1, 5, 10, 15, 30) references; Firebase 2nd-gen `onRequest`. Google doesn't publish the Voice notification layout; the parser is built from known shapes (texts from `<you>.<them>.<id>@txt.voice.google.com`, voicemail/missed from `voice-noreply@google.com`) and confirmed with `testSync` on real mail.
