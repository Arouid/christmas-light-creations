# Reports in the staff app

> Status: implemented · Decided on 2026-10-15 by the owner ("can we turn all the artifacts into actual webpages that get updated?", then "yeah", "Reports should live under reports", "the logo and icon concepts can just be left alone")

## The problem

Claude sessions wrote their reports for Scott as private claude.ai pages (artifacts): the season marketing plan, the SEO audit, the design review with its before/after pictures, the designer audit, the win-back plan. Each one is a snapshot of the day it was made. The next day a TODO item is done, a search position moves, an email template is reworded, a win-back batch goes out, and the page still says what it said. Nobody can tell which parts are still true, and the team can't open them at all.

## What we want

A **📊 Reports** section in the staff app (`/leads/#reports`, behind staff sign-in, never on the public site): a list of reports, and a page for each one that is drawn from the repository's own files at build time, so every push redraws it, plus the live numbers the app already reads from Firestore.

| Report | What it shows | Read from |
|---|---|---|
| **Win-back 2026** | The live count per group (people, can be emailed, emailed, answered, estimates booked) the same way Old-site requests counts them; the four emails as they go out today, filled in for a sample person (staff edits in the Emails tab included); the plan (groups, days, rules, what to count) | Firestore `pastRequests` + `customers`; `src/lib/emailTemplates.js` + `settings/app.emailTemplates`; `docs/marketing/winback-2026.md` |
| **Season plan 2026** | Goals, phases, channels, reviews, what to measure, open questions; competitors; brand voice. The weekly jobs and the drafts stay in 📣 Marketing (a button goes there) | `docs/marketing/season-plan-2026.md`, `competitors-2026-10.md`, `brand-voice.md` |
| **SEO** | The open SEO jobs (TODO #70, #79), the search positions log with the method, the live checks still waiting (test checklist #158–161), the profile texts | `docs/TODO.md`, `docs/serp-log.md`, `docs/test-checklist.md`, `docs/listings.md` |
| **Design** | What's still open from the design review (TODO N) and the live checks of the design and designer fixes (test checklist #162–168, with their status), then the findings of both reviews and what was built for each | `docs/TODO.md`, `docs/test-checklist.md`, `docs/reviews/design-2026-10.md`, `docs/reviews/designer-2026-10.md` |

Each page says at the top which files it is drawn from, so whoever wants to change it knows where.

Two of the old artifacts already had a home in the app and get no page: **Katie's to-do list** is Home → My checklist (`src/lib/checklist.js`), the **staff release notes** are ? → 📣 What's new. The Reports list says so.

How to reach it: the **📊 Reports** button on Home (next to 📣 Marketing and 📒 Notes), and ☰ → **Reports** on phones. `#reports/<id>` opens one report directly.

## What we DON'T do

- **No public page.** These hold customer counts, email drafts, ad strategy and audit findings; `/leads/` is noindex and robots-disallowed.
- **No copied text.** A report never holds its own words: when a number or a line changes, it changes in the doc or the code it's read from. The one exception is the two design reviews, whose findings existed only in the artifacts: they were moved into `docs/reviews/` once, and those docs are now the source.
- **No editing.** Reports read; ticks, statuses and Monday numbers stay where they are (📣 Marketing, Old-site requests).
- **No screenshots.** The before/after pictures of the design review stay on its claude.ai page (linked); a picture of a page on one day can't update itself.
- **The logo and icon boards** (5 artifacts) stay as they are (owner).
- **No new Firestore collection** and no rules change: Reports read only what the app already listens to.

## Edge cases

- **A TODO item or checklist row is finished and removed:** the report shows "Done: no longer in docs/TODO.md" instead of the item, so a finished job doesn't look lost.
- **`pastRequests` not readable or still loading** (rules not republished, demo, no signal): the counts say "Loading…" or "Can't read the old-site list" and the rest of the page still shows.
- **A staff edit to a win-back template** wins over the stock words, as in the Emails tab, and is marked "edited in the Emails tab".
- **Markdown the reader doesn't know** (HTML, images, nested lists): shown as plain text, never as HTML.
- **Links** to repo files show as their words (they mean nothing in the app); `https://` links open in a new tab; site paths (`/cost/`) open on the site.
- **After Oct 31** the `{earlyOffer}` line is empty and drops out of the sample emails, exactly as in the real ones.

## Decisions

- 2026-10-15 (owner): reports live in the staff app under **Reports**, not on the public site.
- 2026-10-15: one generic Markdown reader (`src/lib/markdown.js`, pure, tested) instead of a page per doc, so a new report is a list entry plus its docs.
- 2026-10-15: the Reports screen and its docs load only when Reports opens (a lazy chunk), so the staff app's first load doesn't grow (the chunk is about 186 KB, 68 KB gzipped, mostly the docs).
- 2026-10-15: the design review's before/after pictures are not copied into the repo; the report links to the artifact.
- 2026-10-15: the old artifacts keep their content and get a "Moved to the staff app" note at the top; the logo and icon boards are left alone (owner).

## Acceptance criteria

1. [test] The Markdown reader turns headings, paragraphs, lists, tables, quotes and code into blocks, and inline marks into parts, without ever producing HTML → `tests/reports.test.mjs`.
2. [test] Every report's sources exist on disk, every TODO id and checklist number a report asks for is found (or reported as gone), and the real docs parse → `tests/reports.test.mjs`.
3. [test] The win-back counts on a sample list match the Old-site requests rules (customers, filed statuses, outside our area, no email, emailed this season) → `tests/reports.test.mjs`.
4. [test] Reports is a section reachable from the phone menu and linked from Home → `tests/staffMenu.test.mjs`.
5. [Claude, browser] `/leads/?demo#reports` at 375 px: the list, each report opens, tables scroll inside their box, no sideways page scroll, no console errors; Win-back shows the demo counts and the four filled emails.
6. [owner, live] After the push, Reports → Win-back on his phone shows real counts that match Leads → Old-site requests (checklist).

## Links

- The Marketing tab, which already reads `docs/marketing/` at build time: [marketing-in-app.md](marketing-in-app.md)
- The win-back plan: [../marketing/winback-2026.md](../marketing/winback-2026.md)
- Staff menu rules: `src/lib/staffMenu.js`, CLAUDE.md (Site rules)
