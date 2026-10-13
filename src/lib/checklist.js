// "My checklist" on Home (owner 2026-10-13: Katie's to-do list in a visible
// place she comes back to). Three lists: today's ticks clear every day, the
// week's every Monday, the season's stay. Ticks live on the device
// (localStorage), one set per person's phone or computer. Pure.
// Each item: [id, what, where] (where: a tab id, 'messages' for 💬, or '').
export const CHECKLIST = {
  daily: [
    ['d-messages', 'Open 💬 and take what’s yours: tap I’ve got it before you answer', 'messages'],
    ['d-leads', 'New estimate requests: call or text within the hour, set the status', 'leads'],
    ['d-email', 'Answer from the app (customer → Email), not Gmail, so it lands in their history', 'accounts'],
    ['d-home', 'Glance at Recent activity before you call anyone', 'home'],
    ['d-service', 'Lights out? Service → Log call. Done = ask for the review', 'service'],
    ['d-paid', 'Zelle, check or cash that came in: Mark paid on the invoice', 'invoices'],
  ],
  weekly: [
    ['w-confirm', 'Season → Installs: everyone “Not confirmed” gets a call or the email', 'season'],
    ['w-data', 'Fix what you touch: phones, ❌ Bounced emails, missing gate codes', 'accounts'],
    ['w-reminders', 'Tomorrow’s routes → Day-before reminders → ⏰ Email them', 'route'],
    ['w-booked', '⚙ Settings → How booked we are: one true line', ''],
    ['w-reviews', 'Review requests to everyone whose install finished this week', 'season'],
    ['w-bill', 'Bill what’s done: Season → Bill everyone → Invoices → Send all drafts', 'invoices'],
  ],
  season: [
    ['s-winbacks', 'Past requests → Win-backs: “We miss you” text or email', 'past'],
    ['s-teach', 'Answered the same question three times? Teach the sales assistant once', ''],
    ['s-list', 'Keep a note for Scott: questions the FAQ, Help or templates don’t answer', 'notes'],
    ['s-walk', 'Once a month, open a proposal, an invoice and the account page as a customer', ''],
  ],
}
export const GROUP_LABEL = { daily: 'Today', weekly: 'This week', season: 'This season' }
export const STORE_KEY = 'clcChecklist'

const pad = (n) => String(n).padStart(2, '0')
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
// Monday-based week key: the Monday's date.
export function weekKey(d) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return dayKey(m)
}

// What's stored -> { daily, weekly, season } sets of ticked ids, expired ones dropped.
export function ticksFor(stored, now = new Date()) {
  let s = {}
  try { s = typeof stored === 'string' ? JSON.parse(stored) : stored ?? {} } catch { s = {} }
  const pick = (group, key) => (key && s?.[group]?.key !== key ? [] : s?.[group]?.ids ?? [])
  return {
    daily: new Set(pick('daily', dayKey(now))),
    weekly: new Set(pick('weekly', weekKey(now))),
    season: new Set(pick('season', null)),
  }
}

// -> what to store after a tick (ids kept with their period key).
export function storeTicks(ticks, now = new Date()) {
  return {
    daily: { key: dayKey(now), ids: [...ticks.daily] },
    weekly: { key: weekKey(now), ids: [...ticks.weekly] },
    season: { key: null, ids: [...ticks.season] },
  }
}

export function toggleTick(ticks, group, id, on) {
  const next = { daily: new Set(ticks.daily), weekly: new Set(ticks.weekly), season: new Set(ticks.season) }
  if (on) next[group].add(id)
  else next[group].delete(id)
  return next
}

export const doneCount = (ticks, group) => CHECKLIST[group].filter(([id]) => ticks[group].has(id)).length
