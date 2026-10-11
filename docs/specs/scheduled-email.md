# Scheduled email ("Send later")

> Status: live 2026-10-10 (owner's end-to-end test pending: TODO #45) · Decided 2026-10-10 by Scott (owner)

## The problem

Staff write emails when they have a minute, often at night or on a weekend from a phone, but customers should get them at a sensible time (a Monday-morning reminder, a 9 am follow-up). Today the staff app only sends at once (`docs/specs/staff-email.md`), so they either send at 11 pm or have to remember to come back. Owner, 2026-10-10: "can I setup schedule send for the emails?"

## What we want

**One person** (every Email box: customer, lead, past request, review link, Claude's draft):
- Next to **Send from info@** there's **Send later…**. It offers **Tomorrow 8:00 am**, **Tomorrow 1:00 pm**, **Monday 8:00 am** (not shown when tomorrow is Monday) and **Pick date & time** (up to 60 days ahead). Times are always Central, whatever the phone's time zone, and say so.
- Then **⏰ Scheduled for Wed, Oct 14, 8:00 am**. Nothing goes out yet.
- At that time (within 5 minutes after) it goes from info@ exactly like a Send: it shows **once** in their Text & email history with who scheduled it, Home → Recent activity says "Scott M. emailed Pat Sample", and a review link marks "review asked" on their season.

**A list** (Season → ✉ Email these N, Emails tab, Past requests):
- Next to **Send the rest (N)** there's **Schedule the rest (N)…**: pick one time, one confirm, done. Each person still gets their own email; from that time they go out one a second. People with blank parts are skipped and listed, as with Send the rest.
- A list over 100 is sent to the server in parts of 100 (same list); if a later part is refused, the app says how many are already scheduled.
- Each one is marked "sent" on the person's season when it actually goes out, so a resumed list never repeats them; while waiting, the list skips them too ("already scheduled").

**Seeing and changing them**:
- **Home → Scheduled emails**: every email waiting to go, soonest first: when, who to, subject, who scheduled it. A list shows as one line ("Re-install reminder · 42 people") that opens to the names. **Edit** (time, subject, message) and **Cancel** on each; **Cancel all** on a list.
- At the top of a person's **Text & email history**: their waiting emails, with Edit and Cancel.
- **Any staff member** can edit or cancel any of them until it starts going out. After that, Cancel says "Too late: it's already going out."

**When it can't go** (address removed from the record, record deleted, Gmail refused it, daily limit reached): it isn't retried on its own. It stays in the Scheduled list as **Didn't go: <reason>** with **Edit** (pick a new time, which schedules it again) and **Remove**, and the red website-problem banner + alert email say how many didn't go.

## What we DON'T do

| Left out | Why |
|---|---|
| Scheduled texts | Texting stays in Google Voice (no API) |
| Repeating / automatic emails (every year, drip campaigns) | Owner asked for "send later"; anything automatic is a separate decision |
| Times other than Central | The business and its customers are in Pearland; one time zone avoids mistakes |
| Changing the recipient or the person of a waiting email | Cancel it and write a new one; keeps the "address on their record" check in one place |
| Sending to the minute | The sender runs every 5 minutes; "8:00 am" means 8:00–8:05 |
| Undo after it went out | Same as Send |

## Edge cases

- **Two runs of the sender at once / a run retried by Google**: each email is claimed in a database transaction before sending (scheduled → sending), so only one run can send it.
- **Cancel or edit at the moment it's being sent**: whichever lands first wins. If the sender claimed it first, Cancel/Edit says "Too late"; if Cancel landed first, the sender skips it.
- **The sender stops mid-send** (crash, timeout): an email stuck in "sending" for 15 minutes becomes **Didn't go: the server stopped while sending; check info@'s Sent folder before sending it again** (it may have gone out). Never re-sent on its own.
- **Gmail down**: each due email is tried once; after 3 failures in a row the run stops and the rest wait for the next run (each still tried once). Failed ones show as Didn't go.
- **Daily limit** (300 a day from the app, Central day, shared with Send): scheduling refuses a time whose day already has too many waiting ("Wed, Oct 14 already has 280 emails scheduled (300 a day from the app): 20 more fit"). If immediate sends fill the day anyway, the rest are marked Didn't go (daily limit), not pushed to midnight.
- **A time in the past** (picked 8 am at 9 am) or under a minute away: refused, "That time has passed: pick a later one." More than 60 days ahead: refused.
- **Night-time pick** (before 7 am or after 9 pm Central): allowed, with a note "That's at night for customers."
- **Daylight-saving change**: 8:00 am Central is 8:00 am on both sides of the change. A time that doesn't exist (2:30 am on the spring-forward day) moves to 3:30 am.
- **Address removed or record deleted before it goes**: checked again at send time; Didn't go, nothing sent.
- **Template edited after scheduling**: the email keeps the text it was scheduled with.
- **Lead made a customer after scheduling**: it's sent and filed like a Send from the lead (on the customer once linked).
- **Rules not yet published**: the Scheduled list is empty (refused) and nothing else in the app changes; scheduling itself still works (it goes through the server).
- **Signed out / not staff**: refused, like Send.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-10 | Quick picks (Tomorrow 8 am, Tomorrow 1 pm, Monday 8 am) + any date and time up to 60 days, Central (owner) | Familiar from Gmail; one time zone |
| 2026-10-10 | A list can be scheduled for one time in one go (owner) | Long Season lists without sending at night |
| 2026-10-10 | Any staff member can edit or cancel; the list shows who scheduled it (owner) | Someone away shouldn't block a fix |
| 2026-10-10 | Listed on Home and at the top of the person's history (owner) | One place for all, one where you're already looking |
| 2026-10-10 | All writes go through one server function (`scheduleStaffEmail`: schedule, edit, cancel); `firestore.rules` lets staff only read `scheduledEmails` | The checks (staff, address on the record, lengths, one-line subject) are the same code as Send, which rules can't repeat (several addresses in one field, "Also:" emails); nobody but the server writes `sent` |
| 2026-10-10 | The sender (`sendScheduledEmails`) runs every 5 minutes, sends at most 100 per run one a second, shares the daily count with Send, and never retries a failed or stuck email on its own | No duplicate emails to customers; a human decides what happens to a failure |
| 2026-10-10 | Sent scheduled emails are filed by the same code as Send (same history id, `sentBy` = who scheduled it, plus `scheduledId`) and logged in Recent activity as an `email` by that person | The message sync dedupe and Home keep working unchanged |
| 2026-10-10 | Scheduling a single email logs `email-scheduled` in Recent activity; a list doesn't (it's on Home → Scheduled emails) | Others see it's handled, without 40 lines for a list |

## Acceptance criteria

1. [test] Central time: 8:00 am Central gives the right UTC instant in summer and winter, across both DST changes; the missing 2:30 am on spring-forward day gives 3:30 am; quick picks from a Sunday, Friday and Monday evening give the right days, and Monday 8 am is left out when tomorrow is Monday. → `tests/scheduledEmail.test.mjs`
2. [test] Request checks: refuses a past time, less than a minute away, over 60 days, no emails, over 100, one bad email in a list (says who), a bad address/subject/body (same messages as Send); accepts a valid one. Room per day: refuses when waiting + new > 300 for that Central day, counts only waiting ones on that day. → same file
3. [test] Claim: sends only a `scheduled` email whose time has come; skips cancelled, sent, sending, not-yet-due; fails (no send) when the record is gone or the address left it, or the daily count is full; counts the email in the shared daily count. Stuck: only `sending` older than 15 minutes. Mark-sent path: only `seasons.<year>.emailsSent.<template>` / `seasons.<year>.reviewAsked` on a customer or past request. → same file
4. [agent] `scheduleStaffEmail` refuses non-staff (same `isStaffToken`) before reading anything; the sender claims in a transaction and logs no addresses or message text. → read `functions/index.js`
5. [test] Rules: staff read `scheduledEmails`; outsiders (anon, customer, unverified, stranger, staff by email link) can't; nobody, staff included, creates, updates (e.g. status `sent`) or deletes one. → `npm run test:rules`; live anonymous check in `npm run check:rules`.
6. [agent] In `/leads/?demo` at 375 px: Email → Send later… → Tomorrow 8:00 am → "⏰ Scheduled"; it shows in Home → Scheduled emails and at the top of that person's history; Edit changes the time; Cancel removes it from both; a list (Season → ✉ Email these → Schedule the rest) shows as one line with Cancel all; no console errors, no horizontal scroll. Observer: Claude, browser pane.
7. [human] Owner, after deploy: a test customer with your own address → Email → Send later → Pick date & time, 5–10 minutes ahead → it arrives from info@ within 5 minutes of that time; it shows **once** in that customer's history (with your name) and still once 10 minutes later; Home → Recent activity shows you emailed them. Known-good control: an email sent with Send from info@ earlier shows once in history. Observer: owner, phone.
8. [human] Owner: schedule a second test, then Cancel it from Home → Scheduled emails: it never arrives. Observer: owner.

## Contract

**Callable `scheduleStaffEmail`** (us-south1), signed-in staff only (same test as `sendStaffEmail`).

| `action` | Request | Answer |
|---|---|---|
| `schedule` | `{ sendAt: ms, batch?: string ≤ 60, emails: [{ to, subject, text, template?, customerId? \| leadId? \| pastRequestId?, mark?: { season: 'YYYY', field: 'emailsSent' \| 'reviewAsked' } }] }`, 1–100 emails, each checked like `sendStaffEmail` | `{ ok: true, ids }` |
| `edit` | `{ id, sendAt, subject, text }` (a `scheduled` or `failed` one; it becomes `scheduled`) | `{ ok: true }` |
| `cancel` | `{ ids: [1–100 ids] }` | `{ ok: true, cancelled, tooLate }` |

Errors as `sendStaffEmail` (`invalid-argument`, `not-found`, `failed-precondition` for an address not on the record or "too late", `resource-exhausted` for the day being full).

**`scheduledEmails/{auto id}`** (server writes only; staff read):

| Field | Value |
|---|---|
| `status` | `scheduled` → `sending` → `sent`, or `cancelled` / `failed` |
| `open` | true while `scheduled`, `sending` or `failed` (what the lists show) |
| `sendAt` | Timestamp |
| `to`, `subject`, `text`, `template` | as checked by the Send checks |
| `target` | `{ field: 'customerId' \| 'leadId' \| 'pastRequestId', id }` (the record the address was checked on) |
| `customerId` / `leadId` / `pastRequestId` | where it shows (same rule as the history entry) |
| `name` | the person's name when scheduled |
| `by`, `at` | staff email who scheduled it, server time |
| `batch` | same id for a list scheduled together (optional) |
| `mark` | `{ season, field }`: written on the record when sent (optional) |
| `updatedBy`, `updatedAt` | last edit |
| `cancelledBy`, `cancelledAt` | when cancelled |
| `claimedAt`, `messageId` | set when claimed |
| `sentAt`, `historyId` | when sent |
| `error` | plain reason when `failed` |

History entries of sent ones: as `docs/specs/staff-email.md`, `sentBy` = `by`, plus `scheduledId`. Daily count: the same `serverState/staffEmail` as Send.

## Links

- Send from the app (checks, history ids, daily limit): `docs/specs/staff-email.md`
- Recent activity: `docs/specs/dashboard.md`
- Website problems (`reportIncident`): `functions/index.js`
- Cloud Scheduler may run a scheduled function twice or overlap runs (firebase.google.com/docs/functions/schedule-functions, checked 2026-10-10): hence the claim transaction.

## Plan (2026-10-10, delete when done)

1. ~~Pure logic (`functions/scheduleTime.js` browser-safe, `functions/scheduledEmail.js` server) + tests~~ done.
2. ~~`scheduleStaffEmail` + `sendScheduledEmails`; rules + rules tests + `check-rules.mjs`~~ done (not deployed / published).
3. ~~Client: Send later in Email and the one-by-one list, Home panel, history list, demo data~~ done.
4. ~~Guide, privacy wording, docs~~ done.
5. ~~Owner OK → publish rules, deploy functions from a clean worktree, push~~ done 2026-10-10; owner tests 7–8 (test checklist #66–68) pending.
