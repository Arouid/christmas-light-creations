# Spam filters: marketing blasts to info@ and sales pitches through the form

Owner, 2026-10-13: "spam disguised as an order. bullshit" (a Constant Contact blast from a printing company showed in 💬 as "1 message from people we don't know yet") and "another person abusing our submission form" (a janitorial company's cold pitch, ending "Respond with stop to optout", arrived as an estimate request with the alert email, the push and the "Got your request" email).

## The problem

Two doors.

1. **The email sync** (`docs/specs/message-sync.md`) keeps mail from unknown senders as Unmatched so a new customer's first email isn't lost. Its junk rule wanted "unsubscribe" *plus a link*; Gmail's plain-text body of a Constant Contact email carries the footer words ("Unsubscribe | Update Profile | Constant Contact Data Notice") without the links.
2. **The estimate form** is behind App Check (reCAPTCHA Enterprise), which stops scripts, not a person paid to paste a pitch into every contact form in Houston.

## What we want

- **Marketing blasts never show in 💬.** Mail from a bulk-mail relay domain (Constant Contact's ccsend.com / rs6.net, Mailchimp, SendGrid, HubSpot, Klaviyo, Brevo, Mailgun, Amazon SES, Campaign Monitor, MailerLite…), a relay-style sender (`orders-shop.com@shared1.ccsend.com`: the customer's domain in the local part), a `List-Unsubscribe` header (when the Apps Script sends it) or a footer ("Unsubscribe | Update Profile", "Constant Contact", "respond with stop to opt out") is dropped as `bulk`. A person writing "please unsubscribe me" is still kept.
- **A cold pitch through the form is filed, not alerted**: status `spam`, `spamReason` on the lead, `updatedBy: 'website'`, a Recent-activity line "<name> was filed under Spam / test by the website"; no staff push, no alert email, no "Got your request", no "still waiting" nudge (spam is already left out). The weekly all-OK email counts them.
- **Staff see why and undo in one tap**: the lead card shows the reason and **It's a real request** (status → New). The "Got your request" email never goes out for those; staff reply themselves.
- **A switch**: ⚙ Settings → Automatic emails → "File sales pitches as spam" (`settings/app.pitchFilter`, on by default).

## What we DON'T do

- No AI classifier: fixed, tested rules (`functions/pitch.js`, `junkReason` in `functions/messageSync.js`), each filing explainable in one line.
- Never delete: filed requests sit under Leads → Spam / test like hand-marked ones, and only there can be deleted.
- No automatic "STOP" reply to pitchers (it confirms the address is live) and no reporting on anyone's behalf. Reporting a Constant Contact sender is the owner's: forward the email to abuse@constantcontact.com, and Gmail's Report spam counts against the sender too.
- Nothing changes on the form itself (no honeypot field, no extra question): the people doing this are humans.

## Rules (`pitchReason`)

Tells, with points: an opt-out line (3); pitching to "christmas light installers / companies" (2); a business service: cleaning, SEO, web design, lead generation, payroll, merchant services, staffing, bookkeeping, marketing… (2); offering a free / complimentary bid (1); "we help local companies" (1); signing with a sales title: VP, General Manager, Account Executive… (1). Customer words (lights, roofline, house, trees, install…) protect a request: it files at 3+ points with no customer words, or 5+ regardless. One tell alone never files a request. The reason names the top three tells.

## Edge cases

- A business customer: "I'm the General Manager at Park Ten Offices, please send a free quote for lights on our building" → 2 points + customer words → kept.
- "Please unsubscribe me" through the form → 0 points → kept (spam-worthy by hand, but not a pitch).
- A real customer misfiled: Recent activity shows it the same minute, the Leads Spam / test chip counts it, Monday's email counts it; **It's a real request** brings it back (then call or email them: no ack went out).
- Filter off in settings → everything flows as before.
- Older leads have no `spamReason`; the card shows nothing extra.
- An incoming customer email that happens to carry a `List-Unsubscribe` header (a company mailbox behind a marketing tool) is dropped; known customers' emails are never filtered, only unknown senders'.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-13 | File silently (activity line, no push, no email) rather than a quiet alert | The owner's complaint is being bothered at all; Home shows the filing and one tap undoes it |
| 2026-10-13 | Points with a customer-words guard, thresholds 3 / 5 | The Jan-Pro text scores 8; a manager asking for lights scores 2; nothing files on one tell |
| 2026-10-13 | Email: relay domains + footer words + the optional `List-Unsubscribe` header | Gmail's plain body loses the links the old rule needed; the header is the honest signal when the script sends it |
| 2026-10-13 | The switch lives in the Automatic emails box | Same place as the other things the website does by itself |

## Acceptance criteria

1. [test] `tests/pitch.test.mjs`: the Jan-Pro text files with a reason naming the opt-out line; the chips line, a free-estimate ask, the manager's request and a lone tell don't; an SEO pitch to "christmas light installers" with "Reply STOP" files despite the word light; the switch.
2. [test] `tests/messageSync.test.mjs`: a ccsend relay, the footer without links, "respond with stop to optout" and a `List-Unsubscribe` header → `bulk`; a person's unsubscribe request kept.
3. [test] `tests/health.test.mjs`: Monday's email counts filed pitches.
4. [human] Live after the deploy: a pitch-like test request files itself and shows on Home (checklist #127); the next marketing blast to info@ never shows in 💬 (#128); It's a real request brings a filed one back (#129).

## Contract

- `pitchReason(lead) -> '' | string` (≤ 200 chars, "Looks like a sales pitch: …"); `pitchFilterOn(settings)`.
- Lead fields written by the server only: `spamReason` (string), `updatedBy: 'website'`, `status: 'spam'`. Not in the create rules nor `LEAD_FIELDS`; staff never write `spamReason` (the update rule's key list doesn't include it).
- Activity action `spam-filed` (by `website`, target the lead) → `src/lib/activity.js`.
- `junkReason(from, body, { listUnsubscribe })`; the Apps Script sends `listUnsubscribe` once the owner pastes the updated `scripts/apps-script/messageSync.gs` (optional: the domain and footer rules catch Constant Contact without it).
- Deploy: `functions:newLeadAlert`, `functions:messageSync`, `functions:dailyHealth`. No rules change.

## Links

`docs/specs/message-sync.md` (the sync and its junk rule), `docs/specs/auto-emails.md` (the settings box), `docs/specs/staff-alerts.md`, TODO #69, test-checklist #127–#129.
