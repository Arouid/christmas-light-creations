// "Check availability" on the home page: the next REAL open install days.
// A day is open while its booked installs are below that day's capacity.
// Booked = customers' planned install dates this season (any date style, as
// typed in the Season tab) + install stops on saved routes, each customer
// counted once per day. Capacity = staff settings (settings/app.availability).
// Pure, so tests can pin dates. Nothing about customers leaves the server.

export const DEFAULTS = { perDay: 2, workDays: [1, 2, 3, 4, 5, 6], overrides: {}, show: 3 }
export const SEASON = { start: '10-15', close: '12-15' } // install season, month-day

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const pad = (n) => String(n).padStart(2, '0')

// "Oct 15", "October 15th", "10/15", "10/15/2026" → "10-15" (same as the staff app).
export function monthDay(text) {
  const t = String(text ?? '').trim().toLowerCase()
  let m = t.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})/)
  if (m && MONTHS[m[1]]) return `${pad(MONTHS[m[1]])}-${pad(m[2])}`
  m = t.match(/^(\d{1,2})\/(\d{1,2})/)
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${pad(m[1])}-${pad(m[2])}`
  return null
}

// The season being booked on `today` ("YYYY-MM-DD"): after Dec 15 it's next year's.
export const bookingSeason = (today) => (today.slice(5) > SEASON.close ? Number(today.slice(0, 4)) + 1 : Number(today.slice(0, 4)))

// "YYYY-MM-DD" → count of installs booked that day.
export function bookedByDay({ customers = [], routes = [], season }) {
  const days = new Map()
  const add = (day, who) => { if (!days.has(day)) days.set(day, new Set()); days.get(day).add(who) }
  for (const c of customers) {
    const md = monthDay(c.seasons?.[season]?.plannedDate)
    if (md) add(`${season}-${md}`, `c:${c.id}`)
  }
  for (const r of routes) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.day ?? ''))) continue
    ;(r.stops ?? []).forEach((s, i) => { if ((s.kind ?? 'install') === 'install') add(r.day, s.customerId ? `c:${s.customerId}` : `r:${r.id}:${i}`) })
  }
  return new Map([...days].map(([d, set]) => [d, set.size]))
}

const addDays = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const weekday = (day) => new Date(`${day}T12:00:00Z`).getUTCDay()

export function capacity(day, settings = {}) {
  const s = { ...DEFAULTS, ...settings }
  const o = s.overrides?.[day]
  if (o !== undefined && o !== null && o !== '') return Math.max(0, Number(o) || 0)
  return s.workDays.includes(weekday(day)) ? Math.max(0, Number(s.perDay) || 0) : 0
}

// Next open days from tomorrow (never today), within the install season.
export function openDays({ today, booked, settings = {} }) {
  const s = { ...DEFAULTS, ...settings }
  const season = bookingSeason(today)
  const start = `${season}-${SEASON.start}`
  const close = `${season}-${SEASON.close}`
  let day = addDays(today, 1)
  if (day < start) day = start
  const out = []
  while (day <= close && out.length < s.show) {
    if ((booked.get(day) ?? 0) < capacity(day, s)) out.push(day)
    day = addDays(day, 1)
  }
  return out
}
