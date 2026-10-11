# Email bounces (emails from info@ that Gmail accepted, then couldn't deliver)

> Status: built 2026-10-11 (tests + demo checked), not deployed: needs `messageSync` deploy, site push, and the new Apps Script pasted in info@ · Decided on 2026-10-10 by Scott (Finess): "are we watching for bounced and failed to send emails?" → alert by red banner + alert email, phone notification and Home light; flag the address on the record

## The problem

Staff email a customer from the app (or Gmail, or the app sends an invoice or a signed agreement). Gmail takes it, so the app says **Sent ✓** and history shows it. If the address has a typo, the account was closed, or the mailbox is full, the receiving server refuses it a few seconds or hours later and Gmail sends a bounce notice ("Delivery Status Notification (Failure)", "Address not found") to info@'s inbox. Nobody working from the app sees it: the message sync throws it away as automatic mail (`junkReason`: `mailer-daemon@`). The customer never got the email and staff think they did.

Failures **at send time** (Gmail refuses, daily limit) are already reported (red banner, "Didn't go"); this spec is only about bounces that come back **after** Gmail accepted the email.

## What we want

Within about 5 minutes of the bounce notice reaching info@ (the sync's pace):

| Where | What staff see |
|---|---|
| The email in that person's **Text & email history** | **❌ Bounced: the address doesn't exist (check it for a typo)** (or the other plain reasons below) |
| Their record: customer detail, Accounts page, lead card | **⚠ Email to pat@exmaple.com bounced Oct 10: the address doesn't exist.** next to their email. It disappears by itself once someone changes that address on the record |
| The **Email** box (one person) | the same warning under **To** when that address is picked; Send still works (a full mailbox can clear) |
| Bulk emails (Season / Emails tab / Past requests) | the warning on that person's screen; **Send the rest** skips them and lists them, like people with blank template parts |
| **Red banner** at the top + **alert email** | "An email bounced: An email to Pat Sample (sent Oct 10) bounced: the address doesn't exist. Open their record and fix the email address." Stays until someone taps **Dealt with ✓**. Alert email at most once an hour (existing rule) |
| **Phone notification** (devices that turned them on) | "Email to Pat Sample bounced" + the reason; tap opens their account. Several in one sync → one notification |
| **Home → System status → Outgoing email** | red "1 email bounced (fix the address)" while a bounce from the last 7 days still has its address on the record (after "didn't go" when both) |

Plain reasons (from the bounce's status code and wording, first match wins):

| Reason shown | Typical bounce |
|---|---|
| their mailbox is full | 5.2.2, "over quota", "out of storage space" |
| the domain after @ doesn't exist (check it for a typo) | 5.1.2, "Domain not found", DNS error |
| that email account is closed or disabled | 5.2.1, "disabled", "deactivated" |
| the address doesn't exist (check it for a typo) | 5.1.1, "Address not found", "user unknown", "no such user" |
| their mail server refused it (it may look like spam to them) | 5.7.x, "blocked", "spam", "policy" |
| it couldn't be delivered (code 5.x.x) | anything else that is final |

Which emails: any email from info@ that is in someone's history: sent from the app (now or scheduled), invoice and agreement emails, and emails staff typed in Gmail (filed by the sync from info@'s Sent folder).

## What we DON'T do

| Left out | Why |
|---|---|
| "Delay" notices ("Delivery incomplete", "Gmail will retry") | Not final: Gmail keeps trying for 2 days and sends a real failure if it gives up |
| Bounces for mail that isn't in anyone's history (staff alert emails, sign-in links, mail to strangers) | Nothing to mark; the notice stays in info@'s Gmail as today |
| Fixing the address automatically, or blocking sends to it | Staff decide; the warning says what to do |
| Storing the bounce notice itself as a history entry | It would look like a customer message; the ❌ on our email says it |
| Re-sending the email after the address is fixed | Staff send it again with Email (one tap) |
| Spam-folder or "not read" detection | Not knowable without tracking (site rule: no tracking) |

## Edge cases

- **The sync sends the same bounce again** (15-minute overlap, retries): an email already marked bounced isn't marked again, and no second banner or notification.
- **Several emails to the same bad address in a week**: each bounce marks the latest email to that address sent before it.
- **One email to several customers** (Bcc from Gmail): only the entry for the address that failed is marked.
- **Gmail changed the Message-ID** (or the bounce came from another server without it): matched by the failed address instead, to the latest email to it sent in the 7 days before the bounce, preferring the same subject when the bounce shows it.
- **Bounce can't be read** (no final failure wording, no code): left alone, counted as skipped (`bounce-unclear`); still in Gmail.
- **The Apps Script in info@ hasn't been updated yet**: works, matching by address only (the new script adds the original Message-ID for exact matches).
- **The record is gone or the email was on a past request with no customer**: the history entry (if any) is marked; the record flag is skipped; the banner still shows.
- **Staff fix the address, then a late bounce for the old email arrives**: the history entry is marked; the record warning doesn't show (the old address isn't on the record any more) and the Home light stays green.
- **A customer writes "Undeliverable" in a subject**: only mail from a mail server sender (`mailer-daemon@`, `postmaster@`, Microsoft's `MicrosoftExchange…@`) is read as a bounce.
- **Lead made a customer later**: the flag stays on the lead; the customer created from it carries it too (same address). A lead's email can't be edited in the app, so its warning says to call or text them, or make them a customer and fix it there.
- **✨ Suggest a reply → Email this**: no warning there (the draft's contact comes from the server without the flag); the record and history still show it.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-10 | Alert by red banner + alert email, phone notification and Home light (owner, all three) | Owner's choice |
| 2026-10-10 | Flag the address on the record (`bouncedEmails`) and warn in the Email box; the warning shows only while that address is still on the record (owner) | Fixing the typo clears it with no extra step |
| 2026-10-10 | Bulk **Send the rest** skips bounced addresses (listed); one-by-one Send only warns | Nobody sees each email in a batch; a known-bad address only hurts info@'s sending reputation |
| 2026-10-10 | Parsing and matching stay in the function (`functions/bounces.js`, pure, tested); the Apps Script only adds raw header values for mail-server senders | Same split as message-sync (decision 2026-10-09) |
| 2026-10-10 | Match by the original Message-ID (bounce's `In-Reply-To`/`References` → `em-…` id prefix), else by failed address | Message-ID is exact; address covers old scripts, other servers and a rewritten Message-ID |
| 2026-10-10 | Only final failures count (`Action: failed`, a 5.x.x code, or Gmail's failure wording); delays never | A delay may still be delivered |
| 2026-10-10 | Banner and logs name the customer, never the address or the subject | Same rule as other email problems (staff-email spec) |
| 2026-10-10 | No `firestore.rules` change | `messages` and record fields are written by the server (Admin SDK); staff updates on leads only check the keys they change; incidents already allow any `kind` |

## Acceptance criteria

1. [test] Sample Gmail bounces (made-up addresses): "Address not found" (5.1.1), "Domain not found", mailbox full, disabled account, blocked (5.7.1) → permanent with the plain reason above; a "Delivery incomplete" delay notice → skipped `bounce-delay`. → `tests/bounces.test.mjs`
2. [test] The failed address comes from `X-Failed-Recipients`, else `Final-Recipient`, else Gmail's "wasn't delivered to …" sentence; our own addresses are never it. → same file
3. [test] Matching: a Message-ID in `In-Reply-To` finds the entry with that id prefix; of a Bcc'd email's entries only the failed address's is picked; without a Message-ID the latest outgoing email to that address in the 7 days before the bounce is picked (same subject preferred); nothing older, nothing after, nothing incoming. → same file
4. [test] Other automatic mail (no-reply, newsletters) is still dropped as junk; a customer's email with "Undeliverable" in the subject is a normal email. → same file
5. [test] Home light: red while a bounce from the last 7 days still has its address on the record; green once the address changed or after 7 days. → `tests/outgoingMail.test.mjs`
6. [agent] `/leads/?demo` at 375 px: Test Homeowner's history shows "❌ Bounced: …" on the sample email; their account, detail and the Email box show the ⚠ warning, which goes away once their email is changed; Season → ✉ Email these → Send the rest skips them and lists why; Home → Outgoing email is red "1 email bounced"; the red banner lists "An email bounced"; no console errors, no horizontal scroll. Observer: Claude, browser pane.
7. [agent] `messageSync` logs counts and reasons only (no address, subject or text). → read `functions/index.js`
8. [human] Owner: from the app, email a test customer whose address is made up at a real domain (e.g. `clc-bounce-test-1@gmail.com`). Within ~10 minutes: ❌ Bounced on that email in their history, the red banner, a phone notification (if turned on), Home light red. Then fix the address on the record: the ⚠ warning and the red light go away. Known-good control: an email sent the same way to your own address shows no ❌. Observer: owner, staff app + phone.
9. [human] Apps Script → `testBounces` logs the last bounces in info@ as permanent/delay with a reason, without saving. Observer: owner, Apps Script log.

## Contract

**Apps Script → `messageSync`** (`docs/specs/message-sync.md`): items whose sender looks like a mail server (`mailer-daemon`, `postmaster`, `MicrosoftExchange…`) also carry `inReplyTo`, `references`, `failedTo` (raw values of `In-Reply-To`, `References`, `X-Failed-Recipients`; '' when absent). Optional: older scripts without them still work. The answer adds a `bounced` count; results use status `bounced`, `duplicate` (reason `already-bounced`), `skipped` (`bounce-delay`, `bounce-unclear`) or `dropped` (`bounce-no-match`). The dry run shows `{ status: 'bounce', permanent, reason, refs, address }` (counts and yes/no only).

**`messages/{id}`** (server only), added to the bounced email's entry:

| Field | Value |
|---|---|
| `bounced` | `true` (Home's query) |
| `bouncedAt` | ISO time of the bounce notice |
| `bounceReason` | plain reason (table above) |
| `bounceCode` | status code like `5.1.1`, or '' |

**`customers/{id}` · `leads/{id}` · `pastRequests/{id}`** (server only): `bouncedEmails.<lowercase address>` = `{ at, reason, entryId }`. Shown only while that address is on the record (`bouncesOnRecord`, `src/lib/bounces.js`).

**`incidents`**: kind `bounce`, message names the customer, `details: { messageId }`.

**Phone notification**: `{ title: 'Email to <name> bounced' | '<n> emails bounced', body: reason | names, link: their account | '#messages', tag: 'bounce:<id>' }`.

## Links

- Sync and history: `docs/specs/message-sync.md`; sending from the app: `docs/specs/staff-email.md`, `docs/specs/scheduled-email.md`; alerts: `docs/specs/staff-alerts.md`; Home: `docs/specs/dashboard.md`
- Apps Script: `scripts/apps-script/messageSync.gs`
- Sources checked 2026-10-10: Apps Script `GmailMessage.getHeader(name)` ("value of an RFC 2822 header … or an empty string"); RFC 3464 delivery-status fields (`Final-Recipient`, `Action`, `Status`, `Diagnostic-Code`); Gmail bounce wording from public list archives ("Address not found", "Your message wasn't delivered to … because …", "The response from the remote server was:"). Gmail's exact layout isn't published: the parser is tolerant and `testBounces` confirms it on real mail.

## Plan (2026-10-10, delete when done)

1. ~~`functions/bounces.js` + tests~~ done 2026-10-11.
2. ~~`messageSync` routing, marks, banner + push; Apps Script fields + `testBounces`~~ done.
3. ~~UI and demo data~~ done.
4. ~~Guide, privacy line, docs~~ done.
5. Owner OK → deploy `messageSync`, push; owner pastes the script; real test (criterion 8).
