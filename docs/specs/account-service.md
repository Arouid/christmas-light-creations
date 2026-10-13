# Account: your schedule + report a problem

> Status: spec written 2026-10-11, built the same day (functions `myAccount` extended, new callable `reportProblem`; the owner deploys both before it works live) · Asked for by the session that started this one, from the owner's wish for a customer-facing app that does more than show bills

## The problem

A customer who signs in at `/account/` sees their agreements, invoices, yearly price and payments, but not the two things they ask about most once the season starts: **when are you coming** and **something's out**. Today they text or call, a staff member looks up the Season tab, and the Service tab call is typed in by hand. The account page is also the installed customer app (`docs/specs/customer-app.md`), so these belong there.

## What we want

**Your schedule** (signed-in customer with a customer record, this season):

- One line from the season fields staff already fill in on the Customers / Accounts pages, nothing new to type: *Lights up: Thu Nov 13 · Takedown: in January*.
- Install: the planned day and date when staff set them (Day + Planned date, else "week of …"), **being scheduled** when they said yes but have no date yet (with the Timeframe if staff typed one), **Up ✓** once the install is marked completed.
- Takedown: **scheduled** / **done ✓** when staff set the takedown status, **not booked** for "No Takedown", otherwise **in January** (what the agreement and the FAQ say) once the install is scheduled or done.
- Not on this year's schedule yet (status blank, Not Confirmed, or no season on file): a one-liner inviting them to call or text to book. "Off Scheduler" / "Not Servicing": nothing shown.
- Never shown: scheduling notes, billing, gate codes, anything from other seasons.

**Report a problem** (same customers):

- A **Report a problem** button opens a short form: what's wrong (a whole section is out · a bulb or a few bulbs are out · lights fell down or are damaged · the timer · something else), an optional note, and a line saying photos come later: text one to 281-819-0163 for now.
- Send creates a **service call** on their customer record exactly as staff log one on the Service tab (same collection, same fields, status Open, received today), marked as reported from the account. It shows on the Service tab, on their account's Service calls, on the Map (pulsing pin), in Home's open-calls counter, in **Recent activity** ("Pat Sample reported a problem with their lights · Section out") and in **💬 New messages** as 🛠 *Problem report* until someone taps **I've got it** or changes its status.
- Staff get the usual alerts: a phone notification ("Problem report from Pat Sample") and an email to the alert list, like a new estimate request.
- The page says: **Got it! We'll be out within 2 days. If it's urgent, call 281-819-0163.** The 2 days is the FAQ's promise ("same day locally, 48 hours max during peak weeks"), kept in one constant on the server.
- One open report per customer: while a service call for them is Open or Scheduled (theirs or one staff logged), the button is replaced by that call's status ("We've got it" / "On the schedule", what it's about, when) and a call link. A second report is refused by the server, not just hidden.
- Demo: `/account/?demo` shows a scheduled install and the report form; sending in demo shows the confirmation without a server.

## What we DON'T do

| Left out | Why |
|---|---|
| Photos with the report | Firebase Storage isn't enabled (needs the owner to turn it on and publish storage rules); the form says photos come later and how to text one |
| A takedown date | Staff have no takedown date field; routes aren't a promise. "In January" is what the agreement says |
| Customers reading the staff notes on their call | Internal |
| Writing from the browser | The page only calls `reportProblem`; the server validates, checks the open-call limit and writes `serviceCalls` and `activity` with the Admin SDK. No rules change |
| Texting the customer back automatically | Staff reply as today (Text / Email on the call card) |
| A history entry in `messages` | The 💬 list and count read service calls directly (like estimate requests read leads), so the sync's "last arrival" light stays honest |

## Edge cases

- **Signed in, but no customer record under that email** (proposal only): no schedule box and no report button; the call line stays.
- **Two customer records share the email**: the schedule is the first record's (same rule as the yearly price); the open-call check covers all of them and the report goes on the first.
- **Note too long or an unknown problem key**: refused (`invalid-argument`); the form keeps what they typed.
- **Two taps at once**: the check-and-create runs in a transaction; the second answers `already-exists` with the same "we've got it" text.
- **Alert email or push fails**: the call is already saved (the Service tab has it); the failure is reported as a website problem like a failed lead alert.
- **Staff mark the call Done**: the button is back on the customer's next load.
- **Customer-reported call on the Service tab**: a line "Reported from their account" under the issue; everything else (status, notes, Text: fixed + review) as for a logged call.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-11 | Schedule comes from the season entry's existing fields only (installStatus, day, plannedDate, weekOf, timeframe, takedownStatus) | Nothing new for staff to maintain; the Season tab is the truth |
| 2026-10-11 | Takedown without a status reads "in January" | `src/proposals/terms.js` ("take it down in January") and the FAQ ("Between January 3rd and 13th") |
| 2026-10-11 | A report is a `serviceCalls` doc with `source: 'customer'`, written by the server | Same place staff work from; no second list |
| 2026-10-11 | "A whole section is out" is logged as **Section out**, added to the staff issue list; the other four map to existing issues | A section out isn't a bulb problem and the cause (GFCI, connection) isn't the customer's to guess |
| 2026-10-11 | 💬 shows reports from `serviceCalls` (id `report-<callId>`), not from `messages` | Keeps the "sync stopped" light honest (it reads `messages.syncedAt`); estimate requests already work this way |
| 2026-10-11 | Confirmation promises 2 days, from one constant (`SERVICE_DAYS` in `functions/service.js`) | Matches the public FAQ; one place to change |
| 2026-10-11 | One open call per customer (Open or Scheduled, any source) | Rate limit the owner asked for; the customer sees it's being handled instead of a form |

## Acceptance criteria

1. [test] Schedule text: scheduled with day+date → "Thu Nov 13"; week only → "week of Nov 9-15"; confirmed, no date → "being scheduled (first week of Nov)"; completed → "Up ✓"; blank / Not Confirmed → none; Off Scheduler → nothing; takedown scheduled/done/none/January. → `tests/service.test.mjs`
2. [test] Request check: refuses an unknown problem key, a note over 1000 characters, a non-string note; trims; the five keys map to the staff issue words. → same file
3. [test] The call doc the server writes has the staff fields (customerId, customerName, issue, details, received, status Open) plus `source: 'customer'`, `reportedBy`; `openReport` finds Open/Scheduled calls and ignores Done/Cancelled; the push says "Problem report from <name>" and links to their account; the email subject carries name, city and issue and escapes HTML. → same file
4. [test] 💬: `reportItems` turns customer-reported calls into list entries (kind `report`, last 7 days), staff-logged ones are left out; an Open report "needs someone" until claimed or no longer Open. → `tests/service.test.mjs`
5. [test] Recent activity reads "Pat Sample reported a problem with their lights". → same file
6. [agent] `/account/?demo` at 375 px: the schedule line, Report a problem → form → Send → confirmation with "2 days" and the call link; no horizontal scroll, no console errors. `/leads/?demo`: the report in 💬 as 🛠 and on Service with "Reported from their account". Observer: Claude, browser pane.
7. [human] Owner, live after deploy: sign in to a test customer's account → the line matches that customer's Season fields; Report a problem → within a minute a phone notification and an alert email; the call is on the Service tab marked as from the account, in 💬 and in Recent activity; a second report is refused with "we've got it"; mark it Done → the button is back. Observer: owner.

## Contract

**`myAccount`** (extended) also answers:

```json
{ "schedule": { "season": "2026", "installStatus": "Install Scheduled", "day": "Thursday", "plannedDate": "Nov 13", "weekOf": "Nov 9-15", "timeframe": "", "takedownStatus": "" },
  "service": { "days": 2, "open": { "id": "…", "issue": "Section out", "received": "2026-12-02", "status": "Open", "source": "customer", "details": "Left side of the garage" } } }
```

Both are `null` when no customer record matches the email; `service.open` is `null` when nothing is Open or Scheduled.

**Callable `reportProblem`** (us-south1), signed-in customer with a verified email.

Request: `{ problem: "section" | "bulbs" | "down" | "timer" | "other", note?: string ≤ 1000 }`.
Answer: `{ ok: true, days: 2, open: { …as above } }`.
Errors: `unauthenticated`, `failed-precondition` (no customer record: call us), `invalid-argument`, `already-exists` (an open call exists; the message says so).

**`serviceCalls/{auto id}`** written by the server:

| Field | Value |
|---|---|
| `customerId`, `customerName` | the customer record |
| `issue` | `Section out` · `Burned-out bulbs` · `Lights down / damaged` · `Timer` · `Other` |
| `details` | the note (only when given) |
| `received` | Central day `YYYY-MM-DD` |
| `status` | `Open` |
| `source` | `customer` |
| `reportedBy`, `reportedAt` | the verified email, server time |
| `createdAt`, `updatedAt`, `updatedBy` | server time, server time, `website` |

Activity: `{ by: 'website', action: 'service-reported', target: { type: 'customer', id, name }, text: issue }`.

## Links

- Customer accounts and the account page: `docs/specs/customers.md`, `docs/specs/add-ons.md`, `docs/specs/customer-app.md`
- Staff alerts (💬 and push): `docs/specs/staff-alerts.md`; Recent activity: `docs/specs/dashboard.md`


## Your property details (2026-10-12)

Owner: "we should have things like that on their account page too so they can self fill that information in themselves" and "that information should be auto generated in the route information for the installers (not necessarily the HOA stuff, but everything else)".

- `/account/` → **Your property details**: gate code, HOA (name, rules), the date the HOA wants lights down by, things in the yard to avoid (sprinklers, landscape-light wires, pet-fence wire, cameras, fragile plants), pets. Saved through the `updateMyDetails` callable (`functions/propertyDetails.js` checks: text only, trimmed, capped; blanks clear), written onto every customer record under the verified email with `updatedBy: customer:<email>`, and logged in Recent activity as "updated their property details from their account" with the fields that changed. `myAccount` returns the current values (`details`). No rules change (server writes).
- Staff: the same five fields under **Edit details** → Contact (`CustomerDetail.jsx`); the route's installer view (`RouteDrive.jsx`) shows a red **Heads-up** line with the things to avoid and pets on each stop, and the gate code box falls back to the record's gate code; the schedule assistant gets `lightsDownBy` and a rule to place those takedowns before the date.
- Privacy page: the customer paragraph names these details and that customers can edit them.
- Boxes on the porch: the day-before reminder text and emails tell returning customers to set their labeled boxes out (re-install) and everyone to set the empty box out (takedown); a first-year install gets no box line (`boxLine` in `src/lib/installTexts.js`).

## Email preferences, Help, who has the app (2026-10-12)

- **Email preferences** (`#emails`): one switch, weather heads-ups and seasonal tips (`customers.emailNotices`, false = off), saved through `updateMyDetails({ emailNotices })`; critical mail has no switch. Rules and words: `docs/specs/auto-emails.md`.
- **Help** (`#help`, `src/data/help.js`): 16 answers with a search box, shown signed in and on the sign-in screen (owner: self-help instead of tech support).
- **Trees and your lights** under Your lights (`functions/notices.js`), told plainly as the owner asked.
- **Who has the app**: `loadAccount()` sends the device name when the page runs standalone; `myAccount` keeps `customerLogins/{email}.app`; staff see "📱 has the app (…)" on the login line. The Get the app box says phone notifications of any kind only work from the installed app.

## Yes, put my lights back up (2026-10-13)

- Shown under Your lights while `scheduleText` says `none` (no status, Not Confirmed): week chips (`WEEKS` in `functions/rebook.js`), an optional 300-character note, one button.
- `rebookMe` callable: verified email → every customer record under it; a season entry that is empty or Not Confirmed becomes `Confirmed - Needs to be Scheduled` with `firstContact: 'Confirmed'`, `timeframe` = the week, `customerNote` = the note, `rebookedAt`; already Confirmed/Scheduled/Completed/Off Scheduler → `{ already }` and nothing written. Then `logWebsite('rebooked')`, a push to staff phones and an email to the alert list.
- The Re-install invite template points at the button. Demo: `/account/?demo=rebook`.
