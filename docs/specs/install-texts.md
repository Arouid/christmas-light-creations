# Install-day texts (day-before reminder, On our way, All done)

> Status: built 2026-10-11 and checked in `/leads/?demo`, pushed the same day (nothing to deploy: no server change); **wording, the 3-hour window and the 6 pm reminders approved by the owner 2026-10-11** ("1. Is a go") · Decided by Claude Code from the owner's brief

## The problem

Customers don't know when the crew is coming. They lock the side gate, leave the dog out, or call the office at 9 am asking "are you still coming today?". After the install nobody tells them the lights are on a timer, so the first evening brings "my lights aren't on" texts. Today each of these is a hand-typed text from whoever remembers.

## How a text leaves the business number today (the honest part)

The app **cannot send a text by itself**. The business number is a Google Voice number, Voice has no sending API and its terms forbid automated texting (decision 2026-10-08). "Text" anywhere in the app copies the message, opens the Voice conversation as the business number, and a person pastes and sends. The sync (`docs/specs/message-sync.md`) brings incoming texts into history, but not our outgoing ones (those only come from a Voice export). So:

- **On our way** and **All done** are **one tap on the day's route**: the text is ready, Voice opens, the crew pastes and sends. The app records the tap, not the delivery.
- The **day-before reminder** goes as an **email** from info@ through the existing scheduled sender (Send later), because that is the only message the app can send on its own. People with no email on file get a prepared **text** instead, one tap each, from the office.

## What we want

**Settings → Install-day texts**: four short texts the owner can edit (and reset): *Day-before reminder*, *On our way*, *All done (install)*, *All done (takedown)*. Placeholders fill per customer and stop: `{first}`, `{job}` (install / takedown / service call), `{visitDay}` (Thursday, Oct 15), `{when}` ("between 10 am and 1 pm", or "during the day" when the route has no times), `{eta}` ("about 20 minutes away"), `{business}`, `{businessPhone}`. Every stock text ends with **"Reply STOP to opt out of texts."** The two reminder *emails* are ordinary templates in the **Emails** tab ("We're coming tomorrow", install and takedown), with the same placeholders.

**Day-before reminder** (office, the route's edit screen, box **Day-before reminders**): for a route on a later day, every install or takedown stop with a customer is listed with their arrival window from the route's times, and:
- **⏰ Email N reminders at <the evening before, 6:00 pm>** schedules one "We're coming tomorrow" email per person through Send later (time changeable; Central). They show in Home → Scheduled emails like any scheduled email (Edit, Cancel).
- People with **no email** get a **Text** button: the reminder text, one tap each, through Voice.
- People already reminded for this route show **⏰ scheduled** / **✓ texted** and are left out; **Send again** puts one back.

**On our way** (crew, the installer screen and Home → Today's routes): each stop that isn't done yet has **🚗 On our way**: the text says about how many minutes out (the route's drive time for that leg), Voice opens, paste, send. Afterwards the stop shows **🚗 told 10:42 am**.

**All done** (crew, same places): **✓ Done** marks the stop done as today and then offers the **All done** text right away (install or takedown wording); **Not now** keeps the stop done without a text. The stop shows **💬 told 1:15 pm**; a done stop without a text keeps a **💬 All done** button.

**Home → Today's routes** lists each of today's routes with its stops (number, name, arrival ≈, status) and those taps, so a phone on Home is the crew's console. Tapping the route name still opens the full installer screen.

**Everything is logged**: each tap writes an entry in the customer's **Text & email history** ("Us · Scott M. · opened in Voice") and a line in Home → Recent activity ("Scott M. started a text to Example Family · On our way"), and the day-before email is filed by the sender like any email.

**Opt-out**: a customer who replies STOP (it shows in 💬 like any text) gets **Opted out of texts = Yes** on their record (Contact). Install-day text buttons then say *asked us not to text*; the day-before reminder still goes by email. The general Text button is not blocked (replying to their own question is fine); the field is about these one-way texts.

## What we DON'T do

| Left out | Why |
|---|---|
| Sending texts from the server, bulk texts, scheduled texts | Voice has no API and forbids automation; a texting service (Twilio-style) is a separate owner decision with a monthly cost and a new number |
| A reminder for today's route | It would say "tomorrow"; the box says so and points at On our way |
| Service stops' All done | The Service tab already has "Text: fixed + review" when a call is marked Done |
| Stops without a customer ("any address") | Nobody to text |
| Confirming the text went out | Voice doesn't tell the app; history says "opened in Voice", not "delivered". The Voice export (Import tab) is the proof |
| Re-sending the day-before email when the route's times change after it was scheduled | The email keeps the window it was scheduled with; Cancel it on Home and Send again from the route |
| An automatic STOP handler | Staff read the reply and tick the field; one-way texts are few and hand-sent anyway |

## Edge cases

- **Route not optimized** (no drive times): the window reads "during the day", On our way says "shortly"; the box warns "⚡ Optimize the route first for real times".
- **Stop carried over to another day** (skipped, re-added): it is a new stop, so it gets its own reminder and taps again. That's why the marks live on the stop, not on the season.
- **Two crews / two phones**: the mark is written on the route the moment Voice opens; the other phone sees "told 10:42" within seconds. A second tap on a told stop asks "Text again?".
- **Customer has no phone**: no text buttons, the reminder box says "no phone, no email" if both are missing.
- **Opted out of texts** and no email: the reminder box says so; nothing goes.
- **The evening before has passed** (scheduling the day of): the default time becomes "in 5 minutes" and the box says the email will say "tomorrow" only if the route is still tomorrow.
- **Scheduled email cancelled on Home**: the stop still shows ⏰ scheduled (the mark is on the stop); **Send again** clears it.
- **Demo** (`/leads/?demo`): a route today with told / untold stops, and a route tomorrow for the reminder box; nothing is sent, Voice opens with sample numbers.
- **Rules**: no new collection, no rules change (routes, customers and staff-created history entries are already allowed).

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-11 | Texts stay hand-sent through Voice (copy + open, as the Text button does); the day-before reminder is an email through Send later, with a text fallback for people without email | The only honest design with Google Voice; no new service or number |
| 2026-10-11 | The "sent" marks are on the **route stop** (`stop.texts.reminder / onway / done`), not on the season entry | A visit that is skipped and carried over must get its texts again; the season can't tell two visits apart. The day-before email also marks the season's `emailsSent` like any template, for the Season tab |
| 2026-10-11 | Arrival window = the route's arrival time rounded down to the hour, minus half an hour, three hours wide ("between 10 am and 1 pm" for 10:40) | Wide enough to run late without a second text; the owner can ask for another width |
| 2026-10-11 | Default reminder time 6:00 pm Central the evening before | People read it at dinner and can still move the car or find the gate code |
| 2026-10-11 | History entries for these texts carry `source: 'voice-app'`, not `app` | `app` means "emailed by the server and expected in Gmail's Sent"; the Outgoing email light would turn red |
| 2026-10-11 | Four texts, not six: service stops use On our way only; takedown has its own All done | "Take a look tonight" makes no sense after a takedown |
| 2026-10-11 | `textOptOut` on the customer, set by hand | The opt-out line must mean something; Voice can't do it for us |

**Open for the owner**: the wording of the four texts and two emails; the 3-hour window; 6:00 pm; whether the crew's phones are signed into the business Voice account (otherwise the texts go from their own Voice number, the existing per-device setting).

## Acceptance criteria

1. [test] Window and ETA words: 10:40 → "between 10 am and 1 pm", 8:05 → "between 7 am and 10 am"; no time → "during the day"; 3 min → "just a few minutes away", 22 → "about 20 minutes away", 70 → "about an hour away". → `tests/installTexts.test.mjs`
2. [test] Default reminder time is 6:00 pm Central the day before the route (summer and winter), or 5 minutes from now when that has passed; null for a past route day. → same file
3. [test] Each stock text fills with every placeholder, stays under 320 characters with a long name, ends with the STOP line; staff edits replace stock texts and a blank edit falls back to stock. → same file
4. [test] Per stop: which buttons show (install → onway + done; takedown → onway + done-takedown; service → onway; no customer / no phone / opted out → none, with the reason), and the told state from the marks. → same file
5. [test] Reminder list for a route: install and takedown stops with a customer only; email people vs text-only people vs nobody-reachable; already scheduled/texted left out unless "again". → same file
6. [test] History entry for a tap: kind text, direction out, source voice-app, customerId, phone in +1 form, the text, who, template, ISO time. → same file
7. [agent] `/leads/?demo` at 375 px: Home → Today's routes shows the stops with **🚗 On our way** on the open stop and **💬 told** on the done one; the tap opens the Voice box with the filled text; **Open Google Voice** marks the stop, adds the history entry and the activity line; ✓ Done on Home offers the All done text; the installer screen (`#route-…`) does the same; the route's edit screen shows **Day-before reminders** with the window per person, ⏰ schedules (demo) and shows on Home → Scheduled emails; no console errors, no horizontal scroll, every tap ≥ 44 px. Observer: Claude Code, browser pane.
8. [human] Live, a real install day: the evening before, the route's **Day-before reminders** box → ⏰ Email → the email arrives from info@ at the chosen time with the right window; on the day, from the crew's phone, **On our way** → Voice opens with the text → send → the customer gets it from the business number; **✓ Done → All done** the same; both show in the customer's history and Recent activity. Known-good control: a review-link text sent with the existing Text button. Observer: owner.
9. [check] `npm run check` green; guide, TODO, test checklist, verified log updated in the same commit.

## Contract

**Settings** `settings/app.textTemplates`: `{ reminder?, onway?, done?, doneTakedown? }` (strings; a missing or blank one means the stock text). Stock texts and placeholders: `src/lib/installTexts.js`.

**Email templates** (stock, `src/lib/emailTemplates.js`): `install-reminder` (group Install) and `takedown-reminder` (group Takedown), editable in the Emails tab; placeholders `{when}`, `{visitDay}`, `{job}` added to `PLACEHOLDERS` (filled from the stop, blank elsewhere).

**Route stop** (`routes/{id}.stops[]`), written by the browser on the tap or the schedule:

| Field | Value |
|---|---|
| `texts.onway` | `{ at: ISO, by: staff email }` |
| `texts.done` | `{ at, by }` |
| `texts.reminder` | `{ at, by, via: 'email' \| 'text', scheduledId?, when: the window text }` |

**Customer**: `textOptOut: 'Yes' | ''` (Contact group, Edit details).

**History** `messages/{tx-<stop id>-<step>-<base36 ms>}` (staff create, rules unchanged): `{ kind: 'text', direction: 'out', source: 'voice-app', at: ISO, phone: '+1…', text, customerId, sentBy, template: 'install-onway' | 'install-done' | 'takedown-done' | 'install-reminder' | 'takedown-reminder' | 'service-onway' }`. `sentBy` shows as "Us · Scott M. · opened in Voice".

**Recent activity**: the existing `text` action with `text` = "On our way" / "All done" / "Day-before reminder".

**Scheduled reminder email**: `scheduleStaffEmail` `schedule` with `template: 'install-reminder' | 'takedown-reminder'`, `mark: { season, field: 'emailsSent' }`, one email per person, `batch` = the route id + day; nothing new on the server.

## Links

- Texting through Voice: `docs/decisions.md` 2026-10-08; the Text button `src/leads/Reach.jsx`
- Send later: `docs/specs/scheduled-email.md`; email from the app: `docs/specs/staff-email.md`
- Routes and the installer screen: `src/leads/RoutesView.jsx`, `src/leads/RouteDrive.jsx`; times from `src/lib/router.js` `timeline()`
- Home → Today's routes: `docs/specs/dashboard.md`
- History: `docs/specs/message-sync.md` (why outgoing Voice texts aren't synced)
