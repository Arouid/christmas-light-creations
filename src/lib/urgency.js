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

// The staff's line, read without loading Firebase (functions/index.js bookingStatus).
export const BOOKING_STATUS_URL = 'https://us-south1-clc-leads-site.cloudfunctions.net/bookingStatus'
export async function fetchBookingStatus() {
  const res = await fetch(BOOKING_STATUS_URL)
  return res.ok ? freshStatus(await res.json()) : ''
}
