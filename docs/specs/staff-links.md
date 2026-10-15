# Links (staff app → Reports)

> Status: implemented (not pushed) · Decided on 2026-10-15 by the owner ("make me a list of important links the staff may need — stuff like the google console, ads, firebase etc", "and email its tied to", "put them with reports")

## The problem

The business runs on about thirty outside accounts (Firebase, Google Cloud, Ads, the Business Profile, Search Console, Voice, GoDaddy, PayPal, the listings…). Their links were spread over the docs, and nobody had written down which login owns each one, so staff couldn't find a console or know which Google account to sign in with.

## What we want

A **Links** report in 📊 Reports (`/leads/#reports/links`, staff only): every service grouped (website and staff app, Google and email, money, listings and social, tools and stock), each with its direct link (new tab), one line on what staff use it for, a short note where it matters (the Ads account number, “not created yet”), and **Login:** the email or username the account belongs to.

- The list (names, links, what for, notes) is `src/data/staffLinks.js`. A new service is one line there.
- The logins are **not** in the repo (it's public): staff type them on the report (**✎ Fill in logins → Save logins**) and they are kept in `settings/app.logins` (`{ <link id>: 'login' }`). Until someone fills one in, it reads **Not recorded: ask Scott**, and the top says how many are missing.
- Three kinds of rows need no typing: fixed words (the staff app = “your own Google account”, the review link = “none: a public link”), info@ for the info@ services (Gmail, Calendar, Apps Script, YouTube, Nextdoor: the business's public address), and Google Voice, which reads the login already set in ⚙ Settings (`settings/app.voiceAccount`). A saved login wins over all of these; a blank box keeps them.

## What we DON'T do

- **No passwords, keys or tokens**, ever: the box says “email or username only”. Passwords stay with each person.
- **No personal email in the code**: `tests/staffLinks.test.mjs` refuses any address in `staffLinks.js` other than info@.
- **No new collection, no rules change**: `settings/app` already takes any field from staff (stamped).
- **Not on the public site**: `/leads/` is noindex and robots-disallowed, like every report.

## Edge cases

- **Two staff save at once**: the save merges, so each login saved is kept; the last one typed into the same box wins.
- **A box cleared on purpose**: stored as '' (a merge can't remove a key), which reads as not recorded (or the default for info@ and Voice).
- **A link is removed from the list**: its saved login stays in settings, unused and harmless.
- **Demo** (`/leads/?demo#reports/links`): everything not fixed reads “ask Scott”; saving works in memory only.

## Decisions

- 2026-10-15: the logins live in Firestore settings, not in the repo (public repo; parent session's rule).
- 2026-10-15: unlike the other reports, this one can be typed into (the logins column only), because the logins have no other home. Everything else on it is read from the code.

## Acceptance criteria

1. [test] Unique ids; every row has a name, a what-for and an https link (or, for Posty, where to find it) → `tests/staffLinks.test.mjs`.
2. [test] The only address in `src/data/staffLinks.js` is info@ → `tests/staffLinks.test.mjs`.
3. [test] The Login line: saved login, then Voice's setting, then info@, else “Not recorded: ask Scott”; fixed words can't be overwritten; Save stores only the fillable ids, trimmed and capped at 120 → `tests/staffLinks.test.mjs`.
4. [Claude, browser] `/leads/?demo#reports/links` at 375 px: groups and cards, links open in a new tab, ✎ Fill in logins → type → Save logins shows the login, no sideways scroll, no console errors.
5. [owner, live] After the push: Reports → Links on his phone, fill in the missing logins, then open it on another staff phone and see the same logins.

## Links

- Reports section: [reports.md](reports.md)
- Where most of the facts came from: `docs/decisions.md`, `docs/listings.md`, `docs/growth.md`, `docs/specs/spend.md`, `docs/specs/ads-stats.md`
