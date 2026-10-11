// Scheduled email ("Send later"): Central time, the quick picks, the time
// checks and how waiting emails are grouped in lists. Pure, browser-safe (no
// Node modules): the staff app imports this file, the server imports it
// through functions/scheduledEmail.js. Spec: docs/specs/scheduled-email.md.
// Tested in tests/scheduledEmail.test.mjs.

export const TZ = 'America/Chicago'
export const MAX_AHEAD_DAYS = 60
export const MIN_AHEAD_MS = 60_000
export const MAX_LIST = 100
const DAY_MS = 86_400_000

// Firestore Timestamp (server or browser), {seconds}, Date, ms or ISO -> ms.
export const msOf = (t) => (t?.toMillis ? t.toMillis() : t?.seconds != null ? t.seconds * 1000 : t instanceof Date ? t.getTime() : typeof t === 'number' ? t : t ? Date.parse(t) : NaN)

// ---- Central time -------------------------------------------------------------

const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

// ms -> { day: 'YYYY-MM-DD', time: 'HH:MM', hour, minute } on the wall in Pearland.
export function centralParts(ms) {
  const p = Object.fromEntries(parts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return { day: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, hour: Number(p.hour), minute: Number(p.minute) }
}

const wallMs = (day, time) => {
  const [y, mo, d] = String(day).split('-').map(Number)
  const [h, mi] = String(time).split(':').map(Number)
  return [y, mo, d, h, mi].every(Number.isInteger) ? Date.UTC(y, mo - 1, d, h, mi) : NaN
}
const offsetAt = (ms) => { const p = centralParts(ms); return wallMs(p.day, p.time) - Math.floor(ms / 60000) * 60000 }

// 'YYYY-MM-DD' + 'HH:MM' Central -> ms. Across a daylight-saving change: a
// time that happens twice is the first one; a time that doesn't exist (2:30
// am on the spring-forward day) is an hour later.
export function centralToMs(day, time) {
  const wall = wallMs(day, time)
  if (!Number.isFinite(wall)) return NaN
  const candidates = [...new Set([wall - offsetAt(wall - DAY_MS), wall - offsetAt(wall + DAY_MS)])]
  const exact = candidates.filter((ms) => { const p = centralParts(ms); return p.day === day && p.time === time })
  return exact.length ? Math.min(...exact) : Math.max(...candidates)
}

export const addDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
const weekday = (day) => new Date(`${day}T12:00:00Z`).getUTCDay()

const clockText = (ms) => new Date(ms).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).replace(/\s+/g, ' ').toLowerCase()

// "Today 3:00 pm", "Tomorrow 8:00 am", "Tue Oct 14, 8:00 am" (Central).
export function whenText(ms, now = Date.now()) {
  if (!Number.isFinite(ms)) return ''
  const day = centralParts(ms).day
  const today = centralParts(now).day
  if (day === today) return `Today ${clockText(ms)}`
  if (day === addDays(today, 1)) return `Tomorrow ${clockText(ms)}`
  const sameYear = day.slice(0, 4) === today.slice(0, 4)
  const date = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
  return `${date}, ${clockText(ms)}`
}

// Gmail-like choices: tomorrow morning and afternoon, and next Monday
// morning unless tomorrow is Monday.
export function quickPicks(now = Date.now()) {
  const tomorrow = addDays(centralParts(now).day, 1)
  const picks = [
    { label: 'Tomorrow 8:00 am', at: centralToMs(tomorrow, '08:00') },
    { label: 'Tomorrow 1:00 pm', at: centralToMs(tomorrow, '13:00') },
  ]
  if (weekday(tomorrow) !== 1) {
    let day = tomorrow
    while (weekday(day) !== 1) day = addDays(day, 1)
    picks.push({ label: 'Monday 8:00 am', at: centralToMs(day, '08:00') })
  }
  return picks
}

// A time customers would find odd (before 7 am or from 9 pm Central).
export const atNight = (ms) => { const h = centralParts(ms).hour; return h < 7 || h >= 21 }

// null, or why that time can't be used.
export function sendAtProblem(ms, now = Date.now()) {
  if (!Number.isFinite(ms)) return 'Pick a date and time.'
  if (ms < now + MIN_AHEAD_MS) return 'That time has passed: pick a later one.'
  if (ms > now + MAX_AHEAD_DAYS * DAY_MS) return `Pick a time within ${MAX_AHEAD_DAYS} days.`
  return null
}

// ---- Lists (Home, history) --------------------------------------------------------

// Open ones -> groups to show, soonest first: a list scheduled together is
// one group; everything else is a group of one.
export function groupScheduled(items) {
  const groups = new Map()
  for (const x of items) {
    const key = x.batch ? `batch:${x.batch}` : `one:${x.id}`
    if (!groups.has(key)) groups.set(key, { key, batch: x.batch ?? '', items: [] })
    groups.get(key).items.push(x)
  }
  const soonest = (g) => Math.min(...g.items.map((x) => msOf(x.sendAt)))
  return [...groups.values()]
    .map((g) => ({ ...g, items: g.items.sort((a, b) => msOf(a.sendAt) - msOf(b.sendAt) || String(a.name).localeCompare(String(b.name))), sendAt: soonest(g), failed: g.items.filter((x) => x.status === 'failed').length }))
    .sort((a, b) => a.sendAt - b.sendAt)
}
