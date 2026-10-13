# Automatic emails: branding, "Got your request", "still waiting", weather heads-ups

> Status: built 2026-10-12 (owner's asks that evening: auto-responders, staff reminders for forgotten messages, company branding in every email, the "found us in spam?" line, an opt-out on the account page that never covers critical mail, weather notifications with the problems to expect, and the tree notice told plainly). Needs `deploy --only functions` (new: `staffNudge`, `weatherWatch`; changed: `newLeadAlert`, `proposalChanged`, `payIn3Reminders`, `sendAccountLink`, `sendStaffEmail`, `sendScheduledEmails`, `myAccount`, `updateMyDetails`, `dailyHealth`, `draftReply`). No rules change (settings keys are free; the new fields are server-written).

## One look for every email (`functions/brand.js`)

- `branded({ heading, paragraphs, button, rows, footer, optional })`: navy header with the wide logo (`/images/clc-logo-wide.png`), the body, a gold button, and a footer with the phone, the website, the privacy link and the **spam line** ("If this landed in your spam or promotions folder, please mark it Not spam…"). `optional: true` adds the **opt-out line** (weather heads-ups and tips are optional; turn them off on your account page; agreements, bills, payment reminders and scheduling always come through).
- `brandText({ heading, text, button, optional })`: a plain-text message into the same shell (blank lines → paragraphs, links → links, text escaped; our own `textFooter()` stripped from the HTML so the spam line shows once).
- `textFooter(optional)`: the plain-text twin's footer (`-- / business · phone · site / spam line [/ opt-out line]`).
- Used by: invoices and receipts (`functions/invoices.js`), the signed-agreement email, Pay-in-3 reminders, the sign-in link, staff emails sent now or later (`sendStaffEmail`, `sendScheduledEmails`: the HTML is the branded shell, the text is exactly what staff typed), "Got your request", the weather emails.
- **Not branded**: emails to staff (alerts, nudges, the daily check) and the Google-sent sign-in email if Firebase ever sends one itself (ours goes through `sendAccountLink`).
- Deliverability facts (checked 2026-10-12 with nslookup): SPF `include:_spf.google.com ~all`, DKIM `google._domainkey` present, DMARC `p=none` with reports to info@. The spam line is a nudge for the few that still land in spam; the DNS side is right.

## "Got your request" (`functions/ack.js`)

- `newLeadAlert` (on a new `leads` doc) alerts staff first (push + email), then `acknowledgeRequest`: if the lead has a valid email and `settings/app.ackRequests` isn't `false`, and no other lead with the same email has `ackSentAt` within 24 h (double taps), send `ackEmail(lead, { designAttached })`.
- Fixed words, no AI: what happens next (we look at photos/design or measure; one exact price, none by phone; say yes online), the free designer link (unless they sent a design), Buy/Lease/Pay in 3 at the same price, the early-install discount, the phone.
- Filed in the lead's history as an email from the app (`historyEntry` with `sentBy: 'website'`, template `request-ack`), with our own Message-ID so the sync skips the Sent copy. The lead gets `ackSentAt`.
- A failure reports an `email` incident; it never blocks the staff alert.
- Was TODO item G ("auto-reply email to website estimate requests", planned as Phase 2 of the sales assistant with Claude writing it). Done without AI; the AI version stays a later option.

## "Still waiting" nudge (`functions/nudge.js`, `staffNudge`)

- The 💬 list's rules moved to `functions/nudge.js` (`src/lib/staffAlerts.js` re-exports them): incoming, last 7 days, requests still New, reports still Open, nothing claimed with I've got it / Take it over (`claimed(activity)` → the ids).
- `waiting({ messages, leads, calls, activity, now })`: those older than **2 hours** (`WAIT_MS`).
- `staffNudge`: `0 8-20 * * *` Central. Sends when the list is non-empty and (`nudgeDue`) the set of ids changed since the last nudge or 4 hours passed (`serverState/staffNudge { at, key, count }`). One push (`alertStaff`) + one email to the alert list (`staffEmails()`): who, what kind, how long, a preview, the `#messages` link. Off with `settings/app.staffNudges: false`.
- The 7:30 am daily check adds a line when anything has waited 2+ hours.

## Weather heads-ups (`functions/weather.js`, `weatherWatch`)

- `30 16 * * *` Central. Reads the National Weather Service API (free, no key; `User-Agent` names the site): `/points/29.5636,-95.286` → the gridpoint forecast → 12-hour periods. `forecastDays` folds them into the next 3 days (the worse of day and night); `concerns`: **storms** (thunder in the text and ≥ 40% chance), **rain** (≥ 60%), **wind** (≥ 25 mph sustained or ≥ 35 mph gusts), **freeze** (low ≤ 32°F or ice/sleet/snow in the text).
- **Route stops on a bad day** (routes with `day` in those days, any status): each customer with an email gets `routeHeadsUp` (the date may move; we text if it does; on a windy install day, the tree line). Scheduling, so not optional. Once per customer per day (`serverState/weather.sent['route-<id>:<day>']`).
- **Lights up this season** (`customers` where `seasons.<season>.installStatus == 'Install Completed'`): `lightsHeadsUp` with the tips that match the concerns (GFCI reset after rain; strands and trees in wind; freezes). Optional: skipped when `emailNotices === false`; at most one per bad day and one every 5 days per customer (`tipsOk`); the sent map is pruned after 14 days.
- **Staff**: one push + one email (`staffWeather`) with the forecast lines, the route stops by day, how many got the tips and how many were skipped; once per set of bad days (`staffKey`).
- Off with `settings/app.weatherEmails: false`. A forecast fetch failure reports an incident and sends nothing.
- Owner's question answered: the business is told first and the customer emails go out in the same run; no paid API.

## Email preferences (`functions/propertyDetails.js`, `/account/` → Email preferences)

- One switch on the account page: **Weather heads-ups and seasonal tips**. Saved by `updateMyDetails({ emailNotices: bool })` onto every customer record under the email (`emailNotices: false` = off; absent = on). Logged in Recent activity as "Weather and tips emails off/on".
- Critical mail has no switch: agreements, invoices and reminders, Pay-in-3 reminders, scheduling, replies. The opt-out line says so.
- The property-details form saves only its text fields, so it can't overwrite the switch.

## Trees (`functions/notices.js`)

- `TREE_NOTICE` / `TREE_SHORT`: not covered; trim before we install and through the season; the re-hang is a paid service call scheduled after booked installs (a tree call-out can push another customer's install).
- Shown/sent: the agreement (clause 4 exclusion, clause 5 duty, clause 8 caps; seasonal terms likewise), the proposal page callout above the agreement fold, the signed-agreement email, the account page under Your lights, the day-before reminder and the "lights are up" email, the windy route heads-up and the wind tip, the Help box, the assistant's facts.

## Help (`src/data/help.js`, `/account/` → Help)

- Sixteen plain answers (sign-in, the sign-in email in spam, paying, Pay in 3, lights out, timer, trees, dates, weather, email preferences, property details, boxes, HOA dates, cancelling, price changes, the app, reaching a person) with a search box (`searchHelp`: word match, question > tags > answer). Shown signed in and on the sign-in screen.

## Who has the app

- `myAccount` takes `app` (the device name when the page runs as the installed app) and keeps `customerLogins/{email}.app = { device, at }` once set. Staff see it on the customer's login line: "📱 has the app (iPhone, since Oct 11)".
- Nothing can install the app for them: browsers only allow a prompt the person accepts. The account page says that phone notifications of any kind only work from the installed app.

## Settings (⚙ → Automatic emails)

Three switches, all on by default: "Got your request", Weather heads-ups, "Still waiting" reminders. Each function reads `settings/app` when it runs.

## Tests

`tests/autoEmails.test.mjs` (shell, text wrapper, ack, nudge rules and messages, forecast folding, concerns, throttle, staff note, trees everywhere, help search, login line), `tests/propertyDetails.test.mjs` (the switch).

## Links

- Staff alerts and the 💬 list: `docs/specs/staff-alerts.md`
- Account page: `docs/specs/account-service.md`, `docs/specs/customer-app.md`
- Invoices (the shell's first user): `docs/specs/invoices.md`
- NWS API docs (checked 2026-10-12): https://www.weather.gov/documentation/services-web-api
