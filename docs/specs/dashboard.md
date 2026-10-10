# Home: mission-control dashboard + recent staff activity

> Status: approved 2026-10-10 by Scott (Finess) · live 2026-10-10 (rules with `activity` published, proposalChanged + invoiceChanged deployed, site pushed); two-person live test pending

## The problem

Several people work the same customers from their phones. Nobody can see that Katie already emailed Pat, sent the Smiths their invoice, or is calling back the new number, so the same thing gets done twice (or each assumes the other did it). There's also no single screen that says how the day and the season are going; you have to open five tabs.

## What we want

A **Home** tab, first in the staff app, where the app opens (installer route links `#route-…` still open their route). "Look like NASA": dark mission-control panels, big numbers, status lights, a live clock.

| Panel | Shows |
|---|---|
| **Recent activity** | Who did what, newest first, last 7 days: "Katie emailed Pat Sample · Your 2026 install · 5 min ago". Tap → that account. |
| **Live counters** | New messages (💬, yours), open estimate requests (status New), unpaid invoices ($ and how many overdue), open service calls. Tap → that tab. |
| **Today's routes** | Each route for today: crew/name, stops done/left as a bar, skipped. Tap → the route. None today → the next route day. |
| **Season** | Install progress (not confirmed → confirmed → scheduled → installed) and takedowns (scheduled → done), as bars with counts; money collected this season so far vs last season's total (season billing marked paid). |
| **System status** | Lights: text/email sync (last arrival), website problems (open incidents), alert email list set, payments (no open payment problems), notifications on this device. |

**Wall screen**: a ⛶ button shows Home full screen with bigger type for a TV in the shop; it updates live; Esc or ✕ leaves.

**What goes in Recent activity** (owner chose all four kinds):

| Kind | Entry |
|---|---|
| Emails & invoices | Emailed someone from the app (subject); invoice sent / emailed again / marked paid (how) / voided; proposal sent / voided / countersigned; *website*: a customer signed a proposal, paid a proposal payment or an invoice online |
| Messages handled | **I've got it** on a message in 💬 or Unmatched → everyone sees "Katie is on it" on that message, and it's an entry. **Take it over** (someone else has it) → "Lacie took it over from Katie" ("… from you" for Katie) and its own entry "Lacie took over the message from … · was Katie's" |
| Leads & service | Lead status changed (Called, Estimate sent, Booked, Lost), Make customer, service call logged / marked Done |
| Texts & calls started | Tapped **Text** (opened Google Voice) or a **Call** link on someone. The app can't see whether the text was sent or the call answered, so it says "started a text/call" |

## What we DON'T do

- **No full audit log**: field edits (notes, gate codes, Edit details) aren't entries; Firestore keeps `updatedBy` on records for that.
- **No undo or editing of entries**: the log is append-only (nobody, staff included, changes or deletes an entry).
- **No location tracking** of staff or crews; routes show only what installers mark Done/Skip.
- **No weather** (would be a new outside service: separate decision + privacy check).
- **No new data for the money panel**: it adds up season billing already in the app (amounts with Paid = Yes); add-on/service invoices that don't fill season billing aren't in it.
- **No push notifications for activity** (only the existing message alerts).

## Edge cases

- **Rules not published yet** (`activity` refused): actions still work (logging never blocks or slows them); Recent activity says the database rules need publishing; "I've got it" is hidden.
- **Double taps / repeated Call taps**: the same person, same action, same target within 2 minutes is logged once.
- **Number that's on nobody**: "started a call to (281) 555-0166"; our own business number isn't logged.
- **Two people tap I've got it**: the latest one shows ("Scott is on it, Katie was"); either can still act.
- **Old entries**: the box shows the last 7 days (at most 100); older entries stay in the database.
- **Demo** (`/leads/?demo`): sample entries, a route today, sample counters.
- **No routes / no season data**: panels say so in one line instead of empty charts.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-10 | Home tab first and the app opens on it, incl. the installed app (manifest `start_url` → `/leads/`, was `#route`) | Owner: "New Home tab, opens first". Installers get direct `#route-…` links by text |
| 2026-10-10 | One new collection `activity/{auto id}`: staff create only their own entries (`by` = their email, `at` = server time), nobody updates or deletes; the server writes website events | A log people can trust; rules stay simple |
| 2026-10-10 | Entries are written where the action happens in the app (after it succeeds), not reconstructed from records | Records keep only the last change; the log needs each action and who did it |
| 2026-10-10 | "I've got it" is an activity entry (action `handling`, target = the message), not a field on the message | Works for messages, unmatched numbers and estimate requests alike, with no rules change on those collections |
| 2026-10-10 | Text/Call are "started" entries (tap on Text/Call), with the person found by phone number | The app can't see Google Voice or the phone dialer |
| 2026-10-10 | Staff names are first name + last initial (Scott M., Lacie M., Katie P.), everywhere incl. the header instead of the email. The team is known by how their email starts (exatrum, katiep, lacie; no full addresses in the public repo); ⚙ Settings → Staff names (settings/app.staffNames) overrides or adds people; else from the email ("pat.helper@" → Pat H.) | Owner: "First name, last initial" |
| 2026-10-10 | Take it over is its own action (`takeover`, text "was Katie's · Text") and repeats are filtered per person | Owner tested: a take-over looked like any claim, and two accounts on one device within 2 minutes were merged |
| 2026-10-10 | Look: existing theme tokens (night/glow/berry/pine), Inter with tabular numbers and uppercase spaced labels, thin panel borders, glowing status lights; no new fonts or libraries | CLAUDE.md theme rules; fast on phones |

## Acceptance criteria

1. [test] Entry wording and links for every action; phone → person (customer first, then lead; several numbers in one box; our own number ignored); latest "I've got it" per message; repeat within 2 minutes dropped. → `tests/activity.test.mjs`
2. [test] Dashboard numbers: install/takedown progress counts for a season, collected money this season and last (only Paid = Yes, "$1,234.50" style amounts), open requests, unpaid invoice total and overdue count, open service calls, today's routes done/left, sync light green/amber. → same file
3. [test] Rules: staff create only their own stamped entries with known fields; nobody updates or deletes; outsiders get nothing. → `npm run test:rules`
4. [human] `/leads/?demo` at 375px: app opens on Home; all panels render; no horizontal scroll; tapping an activity entry opens that account; Wall screen fills the screen and ✕ leaves; no console errors. Desktop 1280px: panels in a grid. Observer: agent, browser pane.
5. [human] Live: Scott emails a test customer from the app → on Katie's phone Home shows "Scott emailed <test customer>" within seconds. Known-good control: the email in that customer's history. Observer: owner + one staff member.
6. [human] Live: tap I've got it on a new message in 💬 → the other person sees "Scott is on it" on it. Observer: owner.

## Contract

`activity/{auto id}`:

| Field | Value |
|---|---|
| `at` | server time |
| `by` | staff email (as signed in), or `website` (server) |
| `action` | `email`, `invoice-sent`, `invoice-again`, `invoice-paid`, `invoice-void`, `proposal-sent`, `proposal-void`, `proposal-countersigned`, `proposal-signed`*, `proposal-paid`* (deposit/balance/takedown paid online), `invoice-paid-online`*, `lead-status`, `make-customer`, `service-logged`, `service-done`, `handling`, `takeover`, `text`, `call` (* website) |
| `target` | `{ type: customer \| lead \| past \| message \| phone, id?, name? }` (`message` id = the message id, or `request-<leadId>` for an estimate request) |
| `text` | optional detail ≤ 300 chars: subject, amount and method, new status, issue |

## Links

- New-message alerts and 💬: `docs/specs/staff-alerts.md`; email from the app: `docs/specs/staff-email.md`; invoices: `docs/specs/invoices.md`; routes: decisions.md 2026-10-08.
