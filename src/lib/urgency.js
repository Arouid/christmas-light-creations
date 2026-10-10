// Booking urgency for the home page, from the calendar (words and dates in
// content.js `urgency`). Pure: the date is passed in, so tests can pin it.
import { urgency as U } from '../data/content.js'

const md = (d) => (d.getMonth() + 1) * 100 + d.getDate()
const at = ({ month, day }) => month * 100 + day
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))

// The season being booked: July–Dec 15 → this year; after Dec 15 → next year; Jan–June → this year.
export function bookingSeason(d) {
  const y = d.getFullYear()
  return md(d) > at(U.bookingClose) ? y + 1 : y
}

export function seasonBadge(d = new Date()) {
  const now = md(d)
  const season = bookingSeason(d)
  if (now > at(U.bookingClose) || now < 700) return fill(U.badge.next, { season })
  if (now < at(U.installStart)) return U.badge.before
  if (now < at(U.discountEnd)) return fill(U.badge.countdown, { n: at(U.discountEnd) - now + 1 })
  if (now === at(U.discountEnd)) return U.badge.lastDay
  return fill(U.badge.season, { season })
}

export function bookLine(d = new Date()) {
  const now = md(d)
  if (now > at(U.bookingClose) || now < 700) return U.line.next
  return now <= at(U.discountEnd) ? U.line.early : U.line.season
}

// Staff's "how full we are" line: shown only if set within statusMaxDays.
export function freshStatus(status, now = Date.now()) {
  const text = String(status?.text ?? '').trim()
  const updated = Date.parse(status?.updatedAt ?? '')
  return text && Number.isFinite(updated) && now - updated <= U.statusMaxDays * 86400000 ? text : ''
}

// Booking info from our server, without loading Firebase (functions/index.js
// `booking`): the staff's line (if fresh) and the next open install days.
export const BOOKING_URL = 'https://us-south1-clc-leads-site.cloudfunctions.net/booking'
let pending
export function fetchBooking() {
  pending ??= fetch(BOOKING_URL)
    .then((res) => (res.ok ? res.json() : {}))
    .then((j) => ({ status: freshStatus(j.status), openDays: Array.isArray(j.openDays) ? j.openDays : [] }))
    .catch(() => { pending = undefined; return { status: '', openDays: null } })
  return pending
}

// "2026-10-16" → "Thu, Oct 16"
export const dayLabel = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// "Request this date": the estimate form puts it at the top of the message.
export function pickDate(day) {
  window.dispatchEvent(new CustomEvent('clc:pick-date', { detail: dayLabel(day) }))
  document.getElementById('estimate')?.scrollIntoView({ behavior: 'smooth' })
}
