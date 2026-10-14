# Google review request after each install

> Status: built 2026-10-13 (owner's ask that day: he has never asked a customer for a review, competitors incentivize theirs, Google wiped his old reviews in the 2024 suspension; he needs to go from 3 reviews to about 40 this season by asking every customer well, within Google's rules). Needs `deploy --only functions:reviewAsks` (new). **No rules change** (staff may already update any customer field; the new fields are server-written except `reviewedAt`). Owner to confirm the wording and the 2-day / 4-day timing.

## The problem

The Google Business Profile shows 3 reviews. The old ones were lost in the 2024 suspension, and nobody has ever asked a customer for one: the staff app has a **Text / Email review link** button on completed installs, but it is a tap someone must remember, and this season's goal is about 40 reviews. The compliant way to get there is to ask **everyone**, the same way, soon after their install, with one reminder, and never for a reward.

## What we want

**By itself, every afternoon** (`reviewAsks`, 4:00 pm Central): for every customer whose install this season is marked **Install Completed**:

1. The first day the server sees the status, it starts the clock (`reviewAsk.seenAt`). Nothing goes out yet.
2. **Two days later** it sends the ask, once:
   - **Email** (the branded shell, *optional*, so Email preferences on `/account/` apply): "Thank you for choosing Christmas Light Creations this season… If you have a minute, a Google review helps a small family business more than anything." with the review link and a **Leave a Google review** button. Signed by the business, no staff name: it is automatic.
   - **Text**: the app cannot send texts (Google Voice has no API, `docs/specs/install-texts.md`). When the customer **prefers texts** (`contactMethod` = Text on their record, copied from their estimate request, or no email on file) and has a phone number and did not reply STOP, the server **queues a "Review text to send" item in 💬** instead: staff tap it, their account opens, **★ Text review link** copies the same words into Google Voice. The email still goes when there is an address.
3. **Four days after the ask**, one **reminder** by email, only when the ask went by email, nobody has marked **They reviewed**, and the customer has not written back since the ask (no incoming text, email or account message). Never a second reminder.
4. Each ask and reminder is a line in Home → Recent activity ("… was asked for a Google review by the website").

**On a customer** (Customers → detail, and the Accounts page): the ★ box says where things stand in plain words ("Asked by email Oct 15 · reminder about Oct 19 if no reply", "Asked by email Oct 15 · text still to send", "Reviewed ✓ Oct 20", "Not asked yet: the website asks on Oct 15, 2 days after the install"), keeps the **Text / Email review link** buttons for a hand ask, and has **★ They reviewed** (one tap, sets `reviewedAt`; Undo if tapped by mistake). We can't see Google reviews from here, so this is how staff close the loop.

**On Home**, in the Season panel: "⭐ Reviews this season: asked 12 · reviewed 3 · 2 texts to send" (the texts link opens 💬).

**Switch**: ⚙ Settings → Automatic emails → **Review request after install** (`settings/app.reviewAsks`, on by default). Off = no asks, no reminders, no queued texts; what was already recorded stays.

**Season tab**: the Review column says "asked Oct 15", "text to send" or "reviewed ✓" instead of only the hand-ask date.

**On the account page** (owner 2026-10-14: "I would like the review request to show up now for any past customers, which is all of them"): a ★ card right under the greeting on `/account/`, the same for everyone: "Enjoying your lights? Thank you for choosing Christmas Light Creations. If you have a minute, a Google review helps a small family business more than anything." (the middle sentence is the email's `REVIEW_LINE`; words in `accountReviewCard`, `src/data/content.js`), a **★ Leave a Google review** button (`REVIEW_URL`, new tab) and **Not now**.
- Who: `accountReview(customer, season)` (this file, tested), returned by `myAccount` as `review`: anyone with a season before this one on their record (the imported customers), a season marked Install Completed, or a customer-since year before this season. A first-season customer sees it only once their install is completed. Nobody whose record has **They reviewed** on any season.
- On the device (`src/account/reviewCard.js`, localStorage `clcReviewCard`): tapping the button says "Thank you!" and hides it there for good; **Not now** hides it for 30 days. The privacy page says so.
- It is not mail, so it shows whatever the Email preferences say; it never offers anything, and staff see no record of a tap (we can't read Google; They reviewed stays the staff's call).
- Needs the `myAccount` deploy; until then `review` is missing and the card stays hidden.

## What we DON'T do

| Never | Why |
|---|---|
| Offer anything for a review (a discount, a gift, a draw), or hint at one | Google's policy forbids incentives; a profile caught doing it loses its reviews again. The guide says so too |
| Ask only happy customers, or ask a different way depending on how the install went ("review gating") | Also forbidden. Everyone whose install is completed gets the same words; the only reasons to hold off are an open service call (we fix first, then ask) or their own opt-out |
| More than one ask + one reminder per customer per season | A third message is nagging and reads as desperate |
| Ask customers who turned optional emails off on their account page | They said no to optional mail; the review ask is optional mail. Their record says so; staff may still ask by text in person |
| Ask while a service call is Open or Scheduled | Fix the lights first; the ask waits and goes on a later day, still once |
| Ask again by itself when staff already asked by hand (`reviewAsked`) | One ask per season, whoever makes it |
| Send a text from the server | Voice has no API and forbids automation (decision 2026-10-08); the text is queued for a person |
| Write a review for them, pre-fill stars, or link anywhere but Google's own review page | The link is the same `g.page/r/…/review` link the site and the staff templates use |
| Count or read Google reviews | No API worth the setup for 40 reviews; staff mark **They reviewed** when they see one |

## Edge cases

- **Already installed when this ships**: everyone with Install Completed is "seen" on the first run and asked two days later (at most 60 per run, the rest the next day): a burst, but each person gets one email.
- **Status set back and forth** (Completed → Scheduled → Completed): `reviewAsk` stays; the clock doesn't restart and an ask that went out is never repeated.
- **No email and no phone** (or opted out of texts and no email): nothing goes, nothing is written; the box says why. Add an address and the next run asks.
- **Bounced email** (`bouncedEmails`): that address is skipped; the next address on file, else the text route.
- **Open service call** on the ask day: the ask waits; the clock is not reset. The same for the reminder.
- **Customer wrote back** after the ask (a text, an email to info@, an account message): no reminder, whatever they said. Staff see the reply in 💬 anyway.
- **Queued text not sent for 7 days**: the 💬 list only shows the last 7 days, so the item drops out; the customer's box still says "text still to send" with the button. The email reminder went at day 4 regardless.
- **They reviewed** tapped before the reminder: no reminder; the queue item (if any) goes away.
- **Settings switch off mid-way**: asks and reminders stop; nothing is marked; switch it on and the overdue ones go on the next run (still one each).
- **Season boundary**: the current season is July–December of the year, January–June the previous one (same as the app). A January-completed install belongs to the season that just ended and is asked like any other.
- **Demo** (`/leads/?demo`): "River Household" was asked by the website two days ago (email + a text still to send): the ★ box, the Season column, the Home line and the 💬 item all show it; nothing is sent.
- **Rules**: no change. Staff updates on `customers` are already allowed on any field (stamped); customers never write `customers` (only the server's callables do), so `reviewAsk` can't be forged from an account.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-14 | Every past customer sees a ★ review card on their account page until They reviewed; a tap or Not now is remembered on the device only | Owner: "show up now for any past customers, which is all of them". Signed-in customers are the warmest people we have; the email only goes after this season's installs |
| 2026-10-13 | Ask everyone, 2 days after the install is marked completed, by email; one reminder 4 days later; never an incentive, never only the happy ones | Owner: get from 3 to ~40 reviews within Google's rules. Two days: the lights have been on a couple of nights, problems have surfaced and been fixed |
| 2026-10-13 | The clock starts when the **server first sees** Install Completed (`seenAt`), not from a status timestamp | Nothing records when the status changed today (staff pick it from a list; a route's ✓ Done writes it too); a server-side "seen" needs no client change and is the same for every path. Cost: ≤ 1 day of slack |
| 2026-10-13 | Texts are queued for staff in 💬, never sent by the server | Google Voice has no sending API (decision 2026-10-08); the owner wanted texts for people who prefer them |
| 2026-10-13 | "Prefers texts" = `contactMethod` Text (from the estimate request, now copied onto the customer and editable under Contact) or no email on file | The customer record had no preference field; the lead did |
| 2026-10-13 | The ask is *optional* mail (opt-out line, `emailNotices` honoured); a hand ask by staff is not touched by the server | Owner 2026-10-12: optional emails can be turned off on the account page |
| 2026-10-13 | "Replied" = any incoming message from them after the ask (text, email, account chat); then no reminder | We can't read Google; a reply of any kind means they saw it and a reminder would be a nag |
| 2026-10-13 | The review link lives in one place, `functions/brand.js` (`REVIEW_URL`); the site copy, the staff templates and the server import it | The owner's instruction: reuse, never retype |
| 2026-10-13 | The staff templates (`textMessages.review`, the Review request email) now say the same sentence as the automatic ask | One voice whether a person or the website asks |

## Acceptance criteria

1. [test] Who is due: first sight starts the clock; the ask comes ≥ 2 days later; not before; not with `emailNotices === false`; not with an Open/Scheduled service call (and not reset by it); not when staff asked by hand; not when reviewed; at most `MAX_PER_RUN` per run. → `tests/reviewAsk.test.mjs`
2. [test] Channel: email when an address is on file (bounced ones skipped); text queued when they prefer texts or have no email and have a phone and didn't opt out; both when both; none → skipped. → same file
3. [test] Reminder: once, ≥ 4 days after an email ask, not after a reply (message or account chat since the ask), not when reviewed, never for a text-only ask, never twice. → same file
4. [test] Words: the email and the text carry "If you have a minute, a Google review helps a small family business more than anything." and the review link, greet by first name, are signed by the business (no staff name), carry the opt-out line (optional), and never say "if you're happy" or offer anything. → same file
5. [test] The 💬 items: one per queued text, kind `review`, dropped once texted or reviewed; the Home counts; the state words; the switch (`reviewAsksOn`); the activity words; the Settings box has the switch; `leadToCustomer` copies `contactMethod`. → same file
6. [agent] `/leads/?demo` at 375 px: River Household's ★ box says "Asked by email … · text still to send" with **★ Text review link**, **Email review link** and **★ They reviewed** (tap → "Reviewed ✓ today", Undo); 💬 lists "⭐ Review text to send · River Household"; Home → Season shows the reviews line; ⚙ Settings → Automatic emails has "Review request after install"; no console errors, no horizontal scroll. Observer: Claude Code, browser pane.
7. [human] Live, after the deploy: mark a test customer Install Completed; two afternoons later the email arrives from info@ (logo, the sentence, the button to the Google review page, the opt-out line); their record says "Asked by email …"; Recent activity has the line; four days later, with no reply, the reminder; **They reviewed** stops it. Observer: owner.
8. [check] `npm run check` green; guide, TODO, test checklist, verified log, decisions and `docs/specs/auto-emails.md` updated in the same commit.

## Contract

**Settings** `settings/app.reviewAsks`: `false` = off (absent = on).

**Customer** `customers/{id}.seasons.<season>.reviewAsk` (map; server-written unless noted):

| Field | Value |
|---|---|
| `seenAt` | ms, the first run that saw Install Completed |
| `askedAt` | ms, when the ask went (email sent and/or text queued) |
| `channel` | `'email'` \| `'text'` \| `'email+text'` |
| `by` | `'website'` |
| `remindedAt` | ms, the one reminder |
| `textedAt`, `textedBy` | staff: the ★ Text review link tap that closed the queued item |
| `reviewedAt`, `reviewedBy` | staff: **★ They reviewed** (Undo removes both) |

A hand ask keeps writing the older `seasons.<season>.reviewAsked` (`'YYYY-MM-DD'`, also set by a scheduled Review request email); the server treats it as asked. `contactMethod` (`'Phone' | 'Text' | 'Email' | ''`) on the customer: copied from the lead by Make customer, editable under Contact.

**Activity** (`activity`, by `website`): `review-asked`, `review-reminded` (text: the channel); by staff: `reviewed` (text: the season).

**💬 item** (`reviewTextItems`, client only, not in the server's still-waiting nudge): `{ id: 'review-<customerId>', kind: 'review', direction: 'in', customerId, at: ISO(askedAt), syncedAt: askedAt, text }`; `KIND_WORD.review` = "Review text to send"; tap → their account.

**Schedule**: `ASK_SCHEDULE = '0 16 * * *'` Central; `ASK_AFTER_DAYS = 2`, `REMIND_AFTER_DAYS = 4`, `MAX_PER_RUN = 60`. Logs carry counts only.

**Pure code**: `functions/reviewAsk.js` (plan, channel, replied, emails, text, items, counts, words), re-exported for the app by `src/lib/reviewAsk.js`; the link `REVIEW_URL` in `functions/brand.js`.

## Links

- The other automatic emails and the Settings box: `docs/specs/auto-emails.md`
- Why texts are hand-sent: `docs/specs/install-texts.md`, `docs/decisions.md` 2026-10-08
- The 💬 list: `docs/specs/staff-alerts.md`
- Email preferences: `docs/specs/auto-emails.md` → Email preferences
- The missing reviews and the profile cleanup: `docs/TODO.md` #70
- Google's review policy (checked 2026-10-13): https://support.google.com/contributionpolicy/answer/7400114 (no incentives, no selective solicitation)
