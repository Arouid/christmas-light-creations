// Early-install discount: the earlier the install date, the bigger the
// discount. The schedule is a staff setting; this is the default.
// Manual prices ("Special Rate", e.g. some December installs) are never overwritten.

export const DEFAULT_SCHEDULE = [
  { from: '10-15', to: '10-31', pct: 10 },
]

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const pad = (n) => String(n).padStart(2, '0')

// "Oct 15", "October 15", "10/15", "10/15/2026", or a week like "Oct 11-17"
// (its first day) -> "MM-DD"; null if it can't be read.
export function monthDay(text) {
  const t = String(text ?? '').trim().toLowerCase()
  let m = t.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})/)
  if (m && MONTHS[m[1]]) return `${pad(MONTHS[m[1]])}-${pad(m[2])}`
  m = t.match(/^(\d{1,2})\/(\d{1,2})/)
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${pad(m[1])}-${pad(m[2])}`
  return null
}

// The install's date: the planned date if set, else the start of "week of".
export function installMonthDay(season) {
  return monthDay(season?.plannedDate) ?? monthDay(season?.weekOf)
}

export function discountFor(md, schedule = DEFAULT_SCHEDULE) {
  if (!md) return null
  const hit = schedule.find((r) => md >= r.from && md <= r.to)
  return hit ? hit.pct : 0
}

export const parseMoney = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}
export const money = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const isManual = (install = {}) => /special/i.test(`${install.discount ?? ''} ${install.discountReason ?? ''}`)

const pctOf = (discount) => parseFloat(String(discount ?? '').replace('%', '')) || 0

// What the discount and total should be for this season's install, or null
// if there's nothing to suggest (no date/rate, manual price, or already right).
// Owner rule: a customer who booked an early (October) install and gets pushed
// later never loses their discount. An Early Install customer, or one already
// carrying an early discount, keeps it whatever the date (capped at the
// schedule's top rate, so an old 15% comes down to today's rate).
export function suggestDiscount(season, schedule = DEFAULT_SCHEDULE, installType = '') {
  const install = season?.install ?? {}
  if (isManual(install)) return null
  const byDate = discountFor(installMonthDay(season), schedule)
  const rate = parseMoney(install.rate)
  if (byDate === null || rate === null) return null
  const pcts = schedule.map((r) => r.pct)
  const top = pcts.length ? Math.max(...pcts) : 0
  const floor = installType === 'Early Install' && pcts.length ? Math.min(...pcts) : 0
  const kept = /early/i.test(install.discountReason ?? '') ? Math.min(pctOf(install.discount), top) : 0
  const pct = Math.max(byDate, floor, kept)
  const next = {
    discount: pct ? `${pct}%` : '0',
    discountReason: pct ? 'Early Install' : '',
    total: money(Math.round(rate * (100 - pct)) / 100),
  }
  const same = String(install.discount ?? '0') === next.discount && parseMoney(install.total) === parseMoney(next.total)
  return same ? null : { pct, ...next }
}
