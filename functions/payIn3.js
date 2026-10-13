// Pay in 3 on a monthly schedule (owner 2026-10-12): payment 1 when they
// sign; payments 2 and 3 on the day of the month the customer picks when
// signing (the 1st or the 15th), one in each of the two months after the
// signing month. The Pay buttons open on those days and a reminder email goes
// out that morning (and a week later if still unpaid). Pure: shared by the
// pages (src/proposals/model.js) and the server (functions/index.js).
export const PAY_DAYS = [1, 15]
export const PAY_DAY_LABEL = { 1: '1st', 15: '15th' }
export const isPayDay = (d) => PAY_DAYS.includes(Number(d))

const pad = (n) => String(n).padStart(2, '0')
const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? ''))

// Any timestamp shape (Firestore Timestamp, Date, ms, ISO string) → that day in Central time.
export function centralDayOf(t) {
  const ms = t?.toMillis ? t.toMillis() : t?.seconds != null ? t.seconds * 1000 : t instanceof Date ? t.getTime() : typeof t === 'number' ? t : Date.parse(String(t ?? ''))
  return Number.isFinite(ms) ? new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) : ''
}

// When payments 2 and 3 fall due: { balance, takedown } as YYYY-MM-DD, or null without a signing day or a valid pay day.
export function payIn3Due(signedDay, payDay) {
  if (!isDay(signedDay) || !isPayDay(payDay)) return null
  const [y, m] = signedDay.split('-').map(Number)
  const on = (monthsLater) => {
    const d = new Date(Date.UTC(y, m - 1 + monthsLater, Number(payDay)))
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }
  return { balance: on(1), takedown: on(2) }
}

// The reminder to send today for an unpaid payment: 'due' on the day, 'late' a week after, else null.
const dayNum = (s) => Math.round(Date.parse(`${s}T00:00:00Z`) / 86400000)
export function payIn3Reminder(dueDay, today) {
  if (!isDay(dueDay) || !isDay(today)) return null
  const gap = dayNum(today) - dayNum(dueDay)
  return gap === 0 ? 'due' : gap === 7 ? 'late' : null
}

// "November 15"
export const dueText = (day) => (isDay(day) ? new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }) : '')
