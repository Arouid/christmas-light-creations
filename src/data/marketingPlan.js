// The 2026 season marketing plan, as the staff app's Marketing section shows it
// (owner 2026-10-15: "Build the marketing plan into the site or anything that
// would keep everyone on track so the girls and I keep on top of it").
// From docs/marketing/season-plan-2026.md; the drafts it points to are read from
// the other files in docs/marketing/ (src/lib/marketingDocs.js). Who: owner =
// Scott, team = the office staff, claude = Claude does it when asked.
// Progress (who ticked what, and the Monday numbers) lives in settings/app.marketing.

export const MARKETING_SEASON = '2026'

export const WHO = {
  owner: { label: 'Scott', tone: 'glow' },
  team: { label: 'Team', tone: 'pine' },
  claude: { label: 'Claude', tone: 'slate' },
}

// The drafts, by short name (docs/marketing/<file>.md).
export const DRAFT_DOCS = {
  gbp: { file: 'google-business-posts', label: 'Google profile posts' },
  social: { file: 'social-posts', label: 'Social posts' },
  ads: { file: 'google-ads-copy', label: 'Google Ads copy' },
  email: { file: 'rebook-email', label: 'Rebook emails' },
}

// Four messages, on the dates the website itself switches (content.js `urgency`).
export const PHASES = [
  { id: 'early', from: '2026-10-12', to: '2026-10-31', name: 'Early install', message: 'Install by Oct 31 and save 10%. October dates go first.' },
  { id: 'filling', from: '2026-11-01', to: '2026-11-29', name: 'Dates are filling', message: 'Dates fill fast this time of year. Pay in 3 at the same price. See the next open dates.' },
  { id: 'installing', from: '2026-11-30', to: '2026-12-15', name: 'Installing now', message: 'Installing now. Free estimate, one exact price, sign online.' },
  { id: 'thanks', from: '2026-12-16', to: '2027-01-31', name: 'Thank you, takedowns, next season', message: 'Thank you. Takedowns Jan 3 to 13, labeled and boxed. Booking the 2027 season now.' },
]

// Every day, a few minutes (the reviews are the season's main job).
export const DAILY = [
  { text: 'Mark each install Install Completed the same day: the review ask counts from there.', link: '#season', linkLabel: 'Season' },
  { text: 'Send the ⭐ review texts the day they show up in 💬.', link: 'messages', linkLabel: '💬 Messages' },
  { text: 'When a new review shows on Google, tap ★ They reviewed on that customer.', link: '#customers', linkLabel: 'Customers' },
  { text: 'Fill in a missing email or phone number when you see one: no contact, no review ask.', link: '#customers', linkLabel: 'Customers' },
  // The business page went up 2026-10-15; its notices also come into 💬 as 🏘️ Nextdoor (functions/listingNotices.js), answered on Nextdoor.
  { text: 'Nextdoor: answer new messages, comments and recommendations the same day, on Nextdoor (they also show in 💬 as 🏘️ Nextdoor).', link: 'https://nextdoor.com/', linkLabel: 'Nextdoor ↗' },
  // The win-back (docs/marketing/winback-2026.md), Oct 19 to Nov 5: a status is what keeps someone from a second email.
  { text: 'Win-back answers (Oct 19 to mid-November): find the person in Old-site requests and set a status the same day. Yes: Interested (or Estimate booked), then + Make customer once they book. "No thanks": Not interested, never emailed again. Bounced: Moved / bad info.', link: '#past', linkLabel: 'Old-site requests' },
]

// Targets, not promises.
export const GOALS = [
  { what: 'Google reviews', target: '10 by Nov 15 · 25 by Dec 15 · about 40 by Jan 31', where: 'Google profile; Home → Season (asked · reviewed)' },
  { what: 'Returning customers', target: 'Everyone from last season asked once in October, once more in November', where: 'Season tab' },
  { what: 'Estimate requests', target: 'Week to week, by "How did you hear about us?"', where: 'Leads' },
  { what: 'Google Ads', target: 'Cost per estimate request flat or falling', where: 'Home → Google Ads' },
  { what: 'Win-back (old-site requests)', target: 'Everyone reachable emailed once (former customers and 2021–2026 by Oct 24, older ones in November), one follow-up for the first two; few bounces; answers and estimates counted Mondays', where: 'Leads → Old-site requests (the line under the tabs)' },
]

// Monday numbers (15 minutes, owner or team), one row per week.
export const LOG_FIELDS = [
  ['requests', 'Requests this week'], ['topSource', 'Top source'], ['adsSpent', 'Ads spent'], ['adsRequests', 'Ads requests'],
  ['reviews', 'Google reviews (total)'], ['askedReviewed', 'Asked · reviewed'], ['rebooked', 'Rebooked'],
  ['winbackAnswers', 'Win-back answers (total)'], ['winbackBooked', 'Win-back estimates booked (total)'],
]

// Week by week. A task's `draft` names a section of a draft doc: { doc, num } or { doc, title }.
export const WEEKS = [
  {
    id: 'w1', from: '2026-10-12', to: '2026-10-18', note: 'Installs start Thu Oct 15', message: 'Early install, 10% off',
    tasks: [
      { id: 'w1-ads', who: 'owner', text: 'Add the October ad lines and the negative keywords in Google Ads', draft: { doc: 'ads', title: 'Headlines' } },
      { id: 'w1-gbp', who: 'owner', text: 'Google profile post 1: the offer (Oct 15–31)', draft: { doc: 'gbp', num: 1 } },
      { id: 'w1-social', who: 'owner', text: 'Social post 1: installs start', draft: { doc: 'social', num: 1 } },
      { id: 'w1-video', who: 'owner', text: 'Halloween 15-second video live in Google Ads (until Oct 31)' },
      { id: 'w1-rebook', who: 'team', text: 'Send rebook email A (Thursday 8 am: Season → ✉ Email these)', draft: { doc: 'email', title: 'Version A' } },
      { id: 'w1-line', who: 'team', text: 'Set the "how full we are" line (⚙ Settings) with the real number' },
      { id: 'w1-winback-ok', who: 'owner', text: 'Read and OK the four win-back emails before the team sends (More ▾ / ☰ → Emails → Estimates: “We miss you”, “Still want lights?”, “It’s been a while”, “Win-back follow-up”)' },
    ],
  },
  {
    id: 'w2', from: '2026-10-19', to: '2026-10-25', message: 'Early install; no need to be home',
    tasks: [
      { id: 'w2-gbp', who: 'owner', text: 'Google profile post 2: the free designer', draft: { doc: 'gbp', num: 2 } },
      { id: 'w2-social', who: 'owner', text: 'Social post 2: we can keep a secret', draft: { doc: 'social', num: 2 } },
      { id: 'w2-replies', who: 'owner', text: 'Reply to every new Google review' },
      { id: 'w2-adscheck', who: 'owner', text: 'Monday ads check: search terms, block display and job searches', draft: { doc: 'ads', title: 'Negative keywords' } },
      { id: 'w2-line', who: 'team', text: 'Update the "how full we are" line (Monday)' },
      { id: 'w2-bing', who: 'claude', text: 'Bing index re-check (scheduled for Oct 20)' },
      { id: 'w2-winback-inbox', who: 'team', text: 'Mon, before the first batch: send the OK’d “We miss you” to your own Gmail and Outlook address (Emails → Copy subject / Copy message, from info@ in Gmail) and check it lands in the inbox, not Spam or Promotions' },
      { id: 'w2-winback-wb', who: 'team', text: 'Mon to Wed, 8 am, once Scott OK’d the emails: Old-site requests → Win-backs → To contact → ✉ Email these (“We miss you”) → Send the rest, then Stop at about 50 sent. Mon 50, Tue 50, Wed the rest (about 80) if few bounced; the list picks up where it stopped' },
      { id: 'w2-winback-recent', who: 'team', text: 'Only if under 1 in 20 bounced and nobody complained: Past requests → To contact, one year at a time → ✉ Email these (“Still want lights?”): Thu 2026, 2025, 2024 and 2023 (about 120) · Fri 2022 (about 145) · Sat 2021 (about 165)' },
      { id: 'w2-winback-calls', who: 'owner', text: 'Thu to Sat: call the win-backs who paid $1,000+ and haven’t answered (Win-backs → Emailed: the top of the list paid the most, about 20 with a phone); set a status after each call' },
    ],
  },
  {
    id: 'w3', from: '2026-10-26', to: '2026-11-01', note: 'The 10% discount ends Sat Oct 31', message: 'Last week for 10%',
    tasks: [
      { id: 'w3-gbp', who: 'owner', text: 'Google profile post 3: you don’t need to be home', draft: { doc: 'gbp', num: 3 } },
      { id: 'w3-social', who: 'owner', text: 'Social post 3: last week for 10% off', draft: { doc: 'social', num: 3 } },
      { id: 'w3-ads-nov', who: 'owner', text: 'Nov 1: remove every 10% ad line, add the November lines', draft: { doc: 'ads', title: 'Headlines' } },
      { id: 'w3-video-off', who: 'owner', text: 'Nov 1: take the Halloween video down' },
      { id: 'w3-line', who: 'team', text: 'Update the "how full we are" line (Monday)' },
      { id: 'w3-rerender', who: 'claude', text: 'Re-render the videos without the 10% line (ask Claude)' },
      { id: 'w3-winback-follow-wb', who: 'team', text: 'Mon: Win-backs → Emailed → ✉ Email these (“Win-back follow-up”, the last one)' },
      { id: 'w3-winback-follow-recent', who: 'team', text: 'Past requests → Emailed → ✉ Email these (“Win-back follow-up”): Tue 2026 to 2023 · Wed 2022 · Thu 2021. Not 2020 or older (one email only)' },
    ],
  },
  {
    id: 'w4', from: '2026-11-02', to: '2026-11-08', message: 'Dates fill fast; Pay in 3',
    tasks: [
      { id: 'w4-gbp', who: 'owner', text: 'Google profile post 4: Pay in 3', draft: { doc: 'gbp', num: 4 } },
      { id: 'w4-social', who: 'owner', text: 'Social post 4: warm white or multicolor?', draft: { doc: 'social', num: 4 } },
      { id: 'w4-adscheck', who: 'owner', text: 'Monday ads check' },
      { id: 'w4-followup', who: 'team', text: 'Send the "Estimate follow-up" email a week after any unanswered estimate' },
      { id: 'w4-winback-older', who: 'team', text: 'If Scott says go: requests from 2020 and before, one email each, no follow-up (“It’s been a while”, it starts on it when you pick the year), at most 150 a day, newest year first: 2020 (two days), 2019, 2018, 2017, then 2016 and 2015; not on the rebook-B day. Stop if more than 1 in 20 bounce. 2013 and 2012 only if those stayed clean' },
      { id: 'w4-winback-readout', who: 'claude', text: 'Win-back read-out: answers, estimates booked, bounces, and whether the oldest batch is worth it (ask Claude, Mon Nov 2)' },
    ],
  },
  {
    id: 'w5', from: '2026-11-09', to: '2026-11-15', note: 'Reviews checkpoint: 10 by Nov 15', message: 'Free service calls, lifetime warranty',
    tasks: [
      { id: 'w5-gbp', who: 'owner', text: 'Google profile post 5: free service calls and the lifetime warranty', draft: { doc: 'gbp', num: 5 } },
      { id: 'w5-social', who: 'owner', text: 'Social post 5: made for bay wind', draft: { doc: 'social', num: 5 } },
      { id: 'w5-reviews', who: 'owner', text: 'Check the review count against the 10-by-Nov-15 checkpoint' },
      { id: 'w5-rebook', who: 'team', text: 'Send rebook email B to those who didn’t answer A (the last one)', draft: { doc: 'email', title: 'Version B' } },
      { id: 'w5-serp', who: 'claude', text: 'Mid-month search check (one row in docs/serp-log.md)' },
    ],
  },
  {
    id: 'w6', from: '2026-11-16', to: '2026-11-22', message: 'Businesses too',
    tasks: [
      { id: 'w6-gbp', who: 'owner', text: 'Google profile post 6: businesses too', draft: { doc: 'gbp', num: 6 } },
      { id: 'w6-social', who: 'owner', text: 'Social post 6 (ask Tight Ends first)', draft: { doc: 'social', num: 6 } },
    ],
  },
  {
    id: 'w7', from: '2026-11-23', to: '2026-11-29', note: 'Thanksgiving Thu Nov 26', message: 'Next open dates',
    tasks: [
      { id: 'w7-gbp', who: 'owner', text: 'Google profile post 7: the next open dates', draft: { doc: 'gbp', num: 7 } },
      { id: 'w7-social', who: 'owner', text: 'Social post 7: what it looks like by day', draft: { doc: 'social', num: 7 } },
    ],
  },
  {
    id: 'w8', from: '2026-11-30', to: '2026-12-06', message: 'Installing now',
    tasks: [
      { id: 'w8-ads-dec', who: 'owner', text: 'Add the December ad lines; lighter budget', draft: { doc: 'ads', title: 'Headlines' } },
      { id: 'w8-gbp', who: 'owner', text: 'Google profile post 8: installing now', draft: { doc: 'gbp', num: 8 } },
      { id: 'w8-extra', who: 'claude', text: 'Draft any extra post Scott wants (ask Claude)' },
    ],
  },
  {
    id: 'w9', from: '2026-12-07', to: '2026-12-13', message: 'Installing now',
    tasks: [
      { id: 'w9-reshare', who: 'owner', text: 'Re-share the best post of the season' },
      { id: 'w9-adscheck', who: 'owner', text: 'Monday ads check' },
    ],
  },
  {
    id: 'w10', from: '2026-12-14', to: '2026-12-20', note: 'The site books next season from Dec 16', message: 'Thank you',
    tasks: [
      { id: 'w10-gbp', who: 'owner', text: 'Google profile post 9: thank you, and takedown dates', draft: { doc: 'gbp', num: 9 } },
      { id: 'w10-social', who: 'owner', text: 'Social post 8: thank you', draft: { doc: 'social', num: 8 } },
      { id: 'w10-ads-pause', who: 'owner', text: 'Dec 16: pause the ads, or keep them to the business name only' },
      { id: 'w10-takedown-email', who: 'team', text: 'Schedule the "Takedown is coming" email for Dec 28, 8 am (⏰ Schedule the rest)' },
      { id: 'w10-serp', who: 'claude', text: 'Mid-December search check' },
    ],
  },
  {
    id: 'w11', from: '2026-12-21', to: '2026-12-27', note: 'Christmas Fri Dec 25', message: 'Merry Christmas',
    tasks: [
      { id: 'w11-thanks', who: 'owner', text: 'Optional: a thank-you post' },
    ],
  },
  {
    id: 'w12', from: '2026-12-28', to: '2027-01-03', note: 'Takedowns start Sun Jan 3', message: 'Takedowns',
    tasks: [
      { id: 'w12-reminders', who: 'team', text: 'Takedown reminders from the route the day before' },
    ],
  },
  {
    id: 'w13', from: '2027-01-04', to: '2027-01-13', message: 'Takedowns, booking 2027',
    tasks: [
      { id: 'w13-gbp', who: 'owner', text: 'Google profile post 10: takedowns this week', draft: { doc: 'gbp', num: 10 } },
      { id: 'w13-late-reviews', who: 'team', text: 'Review texts for any late installs' },
    ],
  },
  {
    id: 'w14', from: '2027-01-14', to: '2027-01-31', message: 'Season wrap',
    tasks: [
      { id: 'w14-report', who: 'claude', text: 'Season report: requests by source, cost per request, reviews, rebooks, search positions (ask Claude)' },
      { id: 'w14-decide', who: 'owner', text: 'Read the season report; decide next year’s changes' },
    ],
  },
]

// Decisions only Scott can make (the plan's open questions); tick when answered.
export const QUESTIONS = [
  { id: 'q-bookingclose', text: 'Say "booking closes December 15" out loud in December posts and ads?' },
  { id: 'q-retouched', text: 'Was any gallery photo retouched (sky, stars, added light)? Victory Lakes 04 has a starry sky.' },
  { id: 'q-socials', text: 'Send the links of the Nextdoor business page (up since Oct 15) and the Facebook page and Instagram, if they exist.' },
  { id: 'q-names', text: 'OK to name Tight Ends and Kids ’R’ Kids in posts, or ask them first?' },
  { id: 'q-referral', text: 'A referral thank-you? Nothing offers one today (reviews can never be part of it).' },
  { id: 'q-budget', text: 'Google Ads budget by phase: your number.' },
  { id: 'q-yardsigns', text: 'Yard signs at customers’ homes this season (TODO #53)?' },
  { id: 'q-mailing', text: 'A mailing address (street or PO box) for the bottom of the win-back emails? CAN-SPAM asks for one in emails that sell to people who aren’t customers now.' },
]
