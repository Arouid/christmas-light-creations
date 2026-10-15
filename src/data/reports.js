// The staff app's Reports (docs/specs/reports.md; owner 2026-10-15: "can we turn
// all the artifacts into actual webpages that get updated?"). Each report is
// drawn from the repo's own files at build time, so every push redraws it:
// `docs` are Markdown files read whole (minus `skip` sections, by heading),
// `todo` and `checklist` pick rows of docs/TODO.md and docs/test-checklist.md
// by id, and `live` names the Firestore-backed part the screen draws.
// A new report: an entry here, its files in src/leads/reports/docs.js.

export const REPORTS = [
  {
    id: 'winback',
    title: 'Win-back 2026',
    blurb: 'Old-site requests: the live count per group, the four emails as they go out today, and the plan.',
    live: 'winback',
    docs: [{ path: 'docs/marketing/winback-2026.md', open: true }],
    sources: ['Leads → Old-site requests (live)', 'src/lib/emailTemplates.js + Emails tab edits'],
    links: [['#past', 'Old-site requests'], ['#marketing', '📣 Marketing']],
    was: 'https://claude.ai/artifact/PNELH7FqoebqKuLwgBvN7t',
  },
  {
    id: 'season',
    title: 'Season plan 2026',
    blurb: 'Goals, phases, channels, reviews and what to measure; competitors; brand voice. The weekly jobs and the drafts are in 📣 Marketing.',
    docs: [
      { path: 'docs/marketing/season-plan-2026.md', open: true, skip: ['Week by week', 'Season log'] },
      { path: 'docs/marketing/competitors-2026-10.md' },
      { path: 'docs/marketing/brand-voice.md' },
    ],
    sources: [],
    links: [['#marketing', '📣 This week’s jobs and the drafts']],
    was: 'https://claude.ai/artifact/F3eVNmDJ81gXxyQDc4K2sZ',
  },
  {
    id: 'seo',
    title: 'SEO',
    blurb: 'What’s left to do for Google, Bing and the AI assistants, the search positions log, and the profile texts.',
    todo: ['79', '70'],
    checklist: ['158', '159', '160', '161'],
    docs: [{ path: 'docs/serp-log.md', open: true }, { path: 'docs/listings.md' }],
    sources: ['docs/TODO.md', 'docs/test-checklist.md'],
    was: 'https://claude.ai/artifact/H1WySYPH6N7k6Vz5NoUpXQ',
  },
  {
    id: 'design',
    title: 'Design',
    blurb: 'What’s still open from the design review and the designer audit, the live checks, then every finding and what was built.',
    todo: ['N'],
    checklist: ['162', '163', '164', '165', '166', '167', '168'],
    docs: [{ path: 'docs/reviews/design-2026-10.md' }, { path: 'docs/reviews/designer-2026-10.md' }],
    sources: ['docs/TODO.md', 'docs/test-checklist.md'],
    was: 'https://claude.ai/artifact/XGuBN4E8T1Dxk9TGDPvAQs',
    pictures: 'https://claude.ai/artifact/VBC9eE6KAS7PYJ6hLUhA9S',
  },
  {
    // docs/specs/staff-links.md: the list is code, the logins are typed here
    // (settings/app.logins) because the repo is public.
    id: 'links',
    title: 'Links',
    blurb: 'Every account the business runs on: its link, what it’s for, and the login it belongs to.',
    live: 'links',
    docs: [],
    sources: ['src/data/staffLinks.js', 'the logins typed here (settings)'],
  },
]

// Old reports that already have a home in the app (no page here).
export const ELSEWHERE = [
  ['Katie’s to-do list', 'Home → My checklist', 'home'],
  ['Staff release notes', '? → 📣 What’s new', ''],
]

export const reportById = (id) => REPORTS.find((r) => r.id === id) ?? null

// #reports → the list; #reports/<id> → that report ('' when unknown).
export function reportFromHash(hash) {
  const m = /^#reports\/([\w-]+)$/.exec(hash ?? '')
  return m && reportById(m[1]) ? m[1] : ''
}
