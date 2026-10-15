# Marketing in the staff app

> Built 2026-10-15. Owner: "Build the marketing plan into the site or anything that would keep everyone on track so the girls and I keep on top of it", then "the season plan … integrate it".

## What

The season plan ([docs/marketing/season-plan-2026.md](../marketing/season-plan-2026.md)) as a shared to-do list in the staff app, so Scott and the team see the same jobs, tick them off, and find the words to paste in one place.

- **📣 Marketing** section (phones: ☰ → Marketing & reviews; computers: More ▾). In order:
  1. The phase we're in and its message (four phases, on the dates the website itself switches).
  2. **This week**: the week's jobs with who does them (Scott, Team, Claude), a 44 px tick, and "Done · Katie · Oct 14, 3:00 PM" once ticked. ◀ ▶ move between weeks; "Back to this week".
  3. **Still open from earlier weeks**: anything from a past week nobody ticked (Claude's jobs left out: they wait to be asked).
  4. **Every day**: the review habits, with buttons to Season, 💬 and Customers.
  5. **Monday numbers** for the week on screen (saved as you leave each box), and every week's numbers in a table under **Goals**.
  6. **Waiting on Scott**: the plan's open questions, ticked when answered.
  7. **All the drafts**: Google profile posts, social posts, Google Ads copy and the rebook emails, each piece with a Copy button; the photo a post uses is shown and opens full size to save.
- **📋 Draft** on a job opens exactly the draft that job needs.
- **Home → Marketing** card (after My checklist): the week, the phase, "2 of 6 done", the next open jobs with who, and how many are left from earlier weeks.
- Nothing in Marketing posts, sends or changes anything outside the app. Scott posts and changes the ads; the team sends emails from the app as before.

## Where things live

| Piece | File |
|---|---|
| The plan (phases, weeks, jobs, daily habits, goals, Monday fields, questions) | `src/data/marketingPlan.js` |
| The drafts | `docs/marketing/*.md`, read at build time (`src/leads/marketing/draftDocs.js`, `?raw`) and parsed by `src/lib/marketingDocs.js`; edit the docs and the app follows |
| Week, phase, progress, what slipped | `src/lib/marketing.js` |
| Screens | `src/leads/marketing/MarketingView.jsx`, `drafts.jsx`, `MarketingPanel.jsx` |
| Progress | Firestore `settings/app.marketing`: `done.{jobId} = { by, at }`, `log.{weekId}.{field}` |

No new collection and no rules change: `settings/app` is already staff-readable and staff-writable (stamped writes), and the app already listens to it.

## Next season

Copy `src/data/marketingPlan.js` to the new year's dates and jobs (ids must change, or last year's ticks would show), write the new drafts in `docs/marketing/`, and point `DRAFT_DOCS` at them. The tests check the weeks run back to back from a Monday, ids are unique, every draft a job points to exists, and all the Google and social posts are used once.

## Acceptance (who checks)

1. [test] Plan integrity, draft lookups, the drafts reader on the real files, week/phase/progress/missed: `tests/marketing.test.mjs`.
2. [test] Marketing is in the phone menu and the Home layout: `tests/staffMenu.test.mjs`, `tests/dashLayout.test.mjs`.
3. [Claude, browser] `/leads/?demo#marketing` at 375 px: this week, ticks, drafts with Copy and the photo, Monday numbers saved, no sideways scroll; Home card.
4. [owner + staff, live] A tick on one phone shows on another within seconds, with the right name (checklist #169).
