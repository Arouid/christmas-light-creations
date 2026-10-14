// Google review request after each install (docs/specs/review-ask.md; owner
// 2026-10-13: from 3 reviews to about 40 this season, within Google's rules).
// Every afternoon reviewAsks (functions/index.js) looks at this season's
// customers marked Install Completed: the first sight starts a clock
// (reviewAsk.seenAt); ASK_AFTER_DAYS later the ask goes out once, by email
// (branded, optional: Email preferences apply) and, for people who prefer
// texts, as a "Review text to send" item in 💬 for a person to send from
// Google Voice (the server never texts); REMIND_AFTER_DAYS after an email ask,
// one reminder unless they wrote back or staff marked They reviewed.
// Everyone gets the same words, nobody is offered anything, one ask + one
// reminder per customer per season. Pure: no Firebase. Shared with the staff
// app through src/lib/reviewAsk.js. Tested in tests/reviewAsk.test.mjs.
import { customerEmailKeys, normEmail } from './account.js'
import { BIZ, PHONE, REVIEW_URL, brandText, textFooter } from './brand.js'

export const ASK_SCHEDULE = '0 16 * * *' // 4:00 pm Central: read that evening, before the 4:30 weather watch
export const ASK_AFTER_DAYS = 2
export const REMIND_AFTER_DAYS = 4
export const MAX_PER_RUN = 60
export const DONE_STATUS = 'Install Completed'
// The one sentence everyone gets (owner's brief): no "if you're happy", nothing offered.
export const REVIEW_LINE = 'If you have a minute, a Google review helps a small family business more than anything.'
export const TZ = 'America/Chicago'
const DAY = 24 * 60 * 60 * 1000

export const reviewAsksOn = (settings) => settings?.reviewAsks !== false

// 'YYYY-MM-DD' -> the season it belongs to (July–December: that year; January–June: the one before).
export const seasonOf = (day) => {
  const [y, m] = String(day).split('-').map(Number)
  return String(m >= 7 ? y : y - 1)
}

// Firestore timestamp, Date, ISO string or ms -> ms (0 if none).
export const toMs = (t) => {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  if (typeof t === 'number') return t
  return Date.parse(t) || 0
}
const first = (name) => String(name ?? '').trim().split(/\s+/)[0] || 'there'
const digits = (p) => String(p ?? '').replace(/\D/g, '')
export const phoneOk = (p) => { const d = digits(p); return d.length === 10 || (d.length === 11 && d.startsWith('1')) }

// ---- The record ----------------------------------------------------------------------

// A season entry -> where the ask stands. The automatic record is
// `reviewAsk`; a hand ask (Text / Email review link, or a scheduled Review
// request email) is the older `reviewAsked: 'YYYY-MM-DD'`, counted as asked.
export function askRecord(entry) {
  const a = entry?.reviewAsk ?? {}
  const hand = /^\d{4}-\d{2}-\d{2}$/.test(String(entry?.reviewAsked ?? '')) ? Date.parse(`${entry.reviewAsked}T12:00:00`) : 0
  const askedAt = toMs(a.askedAt)
  return {
    seenAt: toMs(a.seenAt), askedAt: askedAt || hand, manual: !askedAt && hand > 0,
    channel: askedAt ? String(a.channel ?? 'email') : hand ? 'hand' : '',
    remindedAt: toMs(a.remindedAt), replied: a.replied === true, textedAt: toMs(a.textedAt), reviewedAt: toMs(a.reviewedAt), reviewedBy: a.reviewedBy ?? '',
  }
}
export const byEmail = (channel) => String(channel ?? '').includes('email')
export const byText = (channel) => String(channel ?? '').includes('text')

// The latest season whose install is completed (where the ★ box shows).
export const reviewSeasonOf = (customer) => Object.keys(customer?.seasons ?? {}).sort().reverse().find((y) => customer.seasons[y]?.installStatus === DONE_STATUS) ?? null

// The ★ card on the customer's own account page (owner 2026-10-14: "I would
// like the review request to show up now for any past customers"): anyone who
// has had an install with us (a season before this one, a season marked
// Install Completed, or customer since before this season), until staff mark
// They reviewed on any season. Same card for everyone; nothing offered.
// myAccount returns it as `review`.
export function accountReview(customer, season) {
  const seasons = customer?.seasons ?? {}
  const years = Object.keys(seasons)
  if (years.some((y) => askRecord(seasons[y]).reviewedAt)) return null
  const now = String(season)
  const since = parseInt(String(customer?.since ?? ''), 10)
  const past = years.some((y) => y < now) || years.some((y) => seasons[y]?.installStatus === DONE_STATUS) || (since > 2000 && String(since) < now)
  return past ? { show: true } : null
}

// ---- Who gets what ---------------------------------------------------------------

// How to reach them: { email, phone, channel }; channel null = no way.
// Email: the first address on file that hasn't bounced. Text (queued for a
// person): a phone, no STOP, and they prefer texts (contactMethod Text from
// their estimate request) or have no email at all.
export function channelFor(c) {
  const bounced = Object.keys(c?.bouncedEmails ?? {}).map(normEmail)
  const email = customerEmailKeys(c).find((e) => !bounced.includes(e)) ?? ''
  const phone = phoneOk(c?.phone) ? String(c.phone) : ''
  const text = Boolean(phone) && c?.textOptOut !== 'Yes' && (c?.contactMethod === 'Text' || !email)
  return { email, phone, channel: email && text ? 'email+text' : email ? 'email' : text ? 'text' : null }
}

// One run: who to mark seen, who to ask, who to remind, and why the rest wait.
// openCalls: Set of customer ids with an Open/Scheduled service call.
export function reviewPlan(customers, { season, now = Date.now(), openCalls = new Set(), max = MAX_PER_RUN }) {
  const seen = []
  const ask = []
  const remind = []
  const skipped = { optedOut: 0, openCall: 0, hand: 0, reviewed: 0, waiting: 0, unreachable: 0, later: 0 }
  for (const c of customers ?? []) {
    const entry = c.seasons?.[season]
    if (entry?.installStatus !== DONE_STATUS) continue
    const r = askRecord(entry)
    if (r.reviewedAt) { skipped.reviewed++; continue }
    if (r.manual) { skipped.hand++; continue }
    if (c.emailNotices === false) { skipped.optedOut++; continue }
    if (!r.askedAt) {
      if (!r.seenAt) { seen.push(c.id); skipped.waiting++; continue }
      if (now - r.seenAt < ASK_AFTER_DAYS * DAY) { skipped.waiting++; continue }
      if (openCalls.has(c.id)) { skipped.openCall++; continue }
      const ch = channelFor(c)
      if (!ch.channel) { skipped.unreachable++; continue }
      if (ask.length < max) ask.push({ id: c.id, customer: c, ...ch })
      else skipped.later++
      continue
    }
    if (r.remindedAt || !byEmail(r.channel)) continue
    if (now - r.askedAt < REMIND_AFTER_DAYS * DAY) continue
    if (openCalls.has(c.id)) { skipped.openCall++; continue }
    const ch = channelFor(c)
    if (!ch.email) { skipped.unreachable++; continue }
    if (remind.length < max) remind.push({ id: c.id, customer: c, email: ch.email, askedAt: r.askedAt })
    else skipped.later++
  }
  return { seen, ask, remind, skipped }
}

// They wrote back since the ask (a synced text / email / voicemail, or an
// account chat message): then no reminder. messages: that customer's history
// entries; conversation: conversations/{customerId} or null.
export function replied({ messages, conversation, askedAt }) {
  const since = toMs(askedAt)
  if ((messages ?? []).some((m) => m.direction === 'in' && Math.max(toMs(m.at), toMs(m.syncedAt)) >= since)) return true
  return conversation?.lastFrom === 'customer' && toMs(conversation.lastAt) >= since
}

// ---- The words -------------------------------------------------------------------

const signOff = `Thank you,\n${BIZ}\n${PHONE}`

// The ask: optional mail (the opt-out line), signed by the business.
export function askEmail({ name }) {
  const text = `Hi ${first(name)},

Thank you for choosing ${BIZ} this season. We hope your lights look great every night.

${REVIEW_LINE}
${REVIEW_URL}

Anything not right? Reply to this email or text ${PHONE} and we will come out: service calls are free all season.

${signOff}${textFooter(true)}`
  return { subject: `Thank you from ${BIZ}`, text, html: brandText({ heading: 'Thank you for choosing us', text, button: { href: REVIEW_URL, label: 'Leave a Google review' }, optional: true }) }
}

// The one reminder, REMIND_AFTER_DAYS later.
export function reminderEmail({ name }) {
  const text = `Hi ${first(name)},

A few days ago we asked for a Google review. If you already left one, thank you! If not, ${REVIEW_LINE.charAt(0).toLowerCase()}${REVIEW_LINE.slice(1)}
${REVIEW_URL}

${signOff}${textFooter(true)}`
  return { subject: 'A quick favor: a Google review', text, html: brandText({ heading: 'A quick favor', text, button: { href: REVIEW_URL, label: 'Leave a Google review' }, optional: true }) }
}

// The text a person pastes into Google Voice (★ Text review link, and the queued item).
export const askText = (name) => `Hi ${first(name)}, thank you for choosing ${BIZ}! ${REVIEW_LINE} ${REVIEW_URL}`

// ---- The staff app -------------------------------------------------------------

// Queued texts -> 💬 list entries shaped like messages (docs/specs/staff-alerts.md):
// one per customer whose ask included a text nobody has sent yet.
export function reviewTextItems(customers, season) {
  return (customers ?? []).flatMap((c) => {
    const r = askRecord(c.seasons?.[season])
    if (!r.askedAt || r.manual || !byText(r.channel) || r.textedAt || r.reviewedAt) return []
    return [{
      id: `review-${c.id}`, kind: 'review', direction: 'in', customerId: c.id, at: new Date(r.askedAt).toISOString(), syncedAt: r.askedAt,
      text: `They prefer texts: open their account and tap ★ Text review link (the words are ready for Google Voice).`,
    }]
  })
}

// Home → Season: { installed, asked, reviewed, toText, waiting }.
export function reviewStats(customers, season) {
  const out = { installed: 0, asked: 0, reviewed: 0, toText: 0, waiting: 0 }
  for (const c of customers ?? []) {
    const entry = c.seasons?.[season]
    if (entry?.installStatus !== DONE_STATUS) continue
    out.installed++
    const r = askRecord(entry)
    if (r.reviewedAt) out.reviewed++
    const went = r.manual || byEmail(r.channel) || r.textedAt > 0
    if (r.askedAt && went) out.asked++
    else if (!r.askedAt) out.waiting++
    if (r.askedAt && !r.manual && byText(r.channel) && !r.textedAt && !r.reviewedAt) out.toText++
  }
  return out
}

const dayText = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ })

// The ★ box on a customer: one plain line.
export function reviewWords(entry, customer = {}, now = Date.now()) {
  const r = askRecord(entry)
  if (r.reviewedAt) return `Reviewed ✓ ${dayText(r.reviewedAt)}`
  if (r.manual) return `Asked by hand ${dayText(r.askedAt)}`
  if (r.askedAt) {
    const bits = []
    if (byEmail(r.channel)) {
      bits.push(`Asked by email ${dayText(r.askedAt)}`)
      const due = r.askedAt + REMIND_AFTER_DAYS * DAY
      if (r.replied) bits.push('no reminder: they wrote back')
      else if (r.remindedAt) bits.push(`reminded ${dayText(r.remindedAt)}`)
      else bits.push(due > now ? `reminder about ${dayText(due)} if no reply` : 'reminder due (goes at 4 pm unless a service call is open)')
    }
    if (byText(r.channel)) bits.push(r.textedAt ? `texted ${dayText(r.textedAt)}` : byEmail(r.channel) ? 'text still to send' : `Text to send (they prefer texts, asked ${dayText(r.askedAt)})`)
    return bits.join(' · ')
  }
  if (customer?.emailNotices === false) return 'Not asked: they turned optional emails off on their account page (a text by hand is fine)'
  if (!channelFor(customer).channel) return 'Not asked: no email or phone to reach them (add one and the website asks)'
  if (r.seenAt) return `Not asked yet: the website asks on ${dayText(r.seenAt + ASK_AFTER_DAYS * DAY)} (${ASK_AFTER_DAYS} days after the install)`
  return `Not asked yet: the website asks ${ASK_AFTER_DAYS} days after the install`
}

// The Season tab's Review column (short).
export function reviewShort(entry) {
  const r = askRecord(entry)
  if (r.reviewedAt) return 'reviewed ✓'
  if (!r.askedAt) return ''
  if (!r.manual && byText(r.channel) && !r.textedAt) return byEmail(r.channel) ? `asked ${dayText(r.askedAt)} · text to send` : 'text to send'
  return `asked ${dayText(r.askedAt)}`
}
