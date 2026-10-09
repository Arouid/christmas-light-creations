// Service routing for a day: order up to ~30 stops from home base and back by
// driving time, then work out arrival times. Pure functions (tested); the
// drive-time matrix comes from Google (lib/routesApi.js) or, if that isn't
// available, from straight-line miles at an average road speed.
import { milesBetween } from './geo.js'

export const STOP_KINDS = { install: 'Install', takedown: 'Takedown', service: 'Service call', other: 'Other' }
// Owner: installs take 2 to 2.5 hours, takedowns about 25 minutes.
export const DEFAULT_MINUTES = { install: 135, takedown: 25, service: 20, other: 15 }

// Straight-line fallback: roads wind ~1.3x the crow-flies distance, ~30 mph average.
export function estimateMatrix(points) {
  const miles = points.map((a) => points.map((b) => (milesBetween(a, b) ?? 0) * 1.3))
  return { minutes: miles.map((row) => row.map((m) => (m / 30) * 60)), miles, estimated: true }
}

// Order stops 1..n for a loop that starts and ends at point 0 (home base).
// Nearest-next, then 2-opt and "move one stop" passes until nothing improves.
// matrix: minutes[from][to] over [home, ...stops]. Returns stop indexes (1-based).
export function optimizeLoop(minutes, fixedFirst = []) {
  const n = minutes.length - 1
  if (n <= 0) return []
  const cost = (order) => {
    let t = 0
    let at = 0
    for (const i of order) { t += minutes[at][i]; at = i }
    return t + minutes[at][0]
  }
  // Nearest next
  const left = new Set(Array.from({ length: n }, (_, i) => i + 1))
  fixedFirst.forEach((i) => left.delete(i))
  let order = [...fixedFirst]
  let at = order.at(-1) ?? 0
  while (left.size) {
    let best = null
    for (const i of left) if (best === null || minutes[at][i] < minutes[at][best]) best = i
    order.push(best)
    left.delete(best)
    at = best
  }
  const lock = fixedFirst.length
  let bestCost = cost(order)
  let improved = true
  while (improved) {
    improved = false
    // 2-opt: reverse a stretch
    for (let i = lock; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const next = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)]
        const c = cost(next)
        if (c < bestCost - 1e-9) { order = next; bestCost = c; improved = true }
      }
    }
    // Or-opt: move one stop elsewhere
    for (let i = lock; i < n; i++) {
      for (let j = lock; j < n; j++) {
        if (i === j) continue
        const next = [...order]
        const [s] = next.splice(i, 1)
        next.splice(j, 0, s)
        const c = cost(next)
        if (c < bestCost - 1e-9) { order = next; bestCost = c; improved = true }
      }
    }
  }
  return order
}

const toMin = (hhmm) => { const [h, m] = String(hhmm || '08:00').split(':').map(Number); return h * 60 + (m || 0) }
export const clock = (min) => {
  const h = Math.floor(min / 60) % 24
  const m = Math.round(min % 60)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// Arrival time at each stop and back home. stops are in driving order, each
// with matrix index `at` and `minutes` on site. Skipped stops are driven past.
export function schedule(stops, matrix, startTime = '08:00') {
  let t = toMin(startTime)
  let from = 0
  let miles = 0
  const rows = stops.map((s) => {
    if (s.status === 'skipped') return { ...s, eta: null }
    const drive = matrix.minutes[from][s.at] ?? 0
    miles += matrix.miles?.[from]?.[s.at] ?? 0
    t += drive
    const eta = t
    t += Number(s.minutes) || 0
    from = s.at
    return { ...s, eta, driveMin: drive }
  })
  const back = matrix.minutes[from]?.[0] ?? 0
  miles += matrix.miles?.[from]?.[0] ?? 0
  return { rows, homeAt: t + back, driveMinutes: rows.reduce((x, r) => x + (r.driveMin ?? 0), 0) + back, miles }
}

// Skipped stops not yet put on another route: the carry-over list.
export function carryOver(routes) {
  return routes.flatMap((r) => (r.stops ?? [])
    .filter((s) => s.status === 'skipped' && !s.carriedTo)
    .map((s) => ({ ...s, fromRoute: r.id, fromDay: r.day })))
}

// Unique id for a stop (the same customer can be on several routes).
export const newStopId = (prefix = '') => `s-${prefix ? `${prefix}-` : ''}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// A route stop from a customer card (a snapshot; gate/phone edits also go back to the customer).
export function stopFromCustomer(c, kind = 'install', gate = '', minutes = DEFAULT_MINUTES) {
  return {
    id: newStopId(c.id),
    customerId: c.id,
    name: c.fullName ?? '',
    address: c.address ?? '',
    lat: c.geo?.lat ?? null,
    lng: c.geo?.lng ?? null,
    phone: c.phone ?? '',
    gate: gate || c.gateCode || '',
    notes: '',
    kind,
    minutes: minutes[kind] ?? 30,
    status: 'todo',
  }
}

// After optimizing: store each stop's drive from the previous stop, so the
// route can be shown and re-timed later without asking Google again.
// matrix covers [home, ...stops] in this order.
export function withLegs(stops, matrix) {
  let from = 0
  const out = stops.map((s, i) => {
    const leg = { driveMin: Math.round(matrix.minutes[from][i + 1] ?? 0), driveMiles: Math.round((matrix.miles?.[from]?.[i + 1] ?? 0) * 10) / 10 }
    from = i + 1
    return { ...s, ...leg }
  })
  return {
    stops: out,
    backMin: Math.round(matrix.minutes[from][0] ?? 0),
    backMiles: Math.round((matrix.miles?.[from]?.[0] ?? 0) * 10) / 10,
  }
}

// Arrival times from stored legs. Skipped stops add no time on site.
export function timeline(stops, startTime = '08:00', backMin = 0) {
  let t = toMin(startTime)
  const rows = stops.map((s) => {
    t += Number(s.driveMin) || 0
    const eta = t
    if (s.status !== 'skipped') t += Number(s.minutes) || 0
    return { ...s, eta }
  })
  return { rows, homeAt: t + (Number(backMin) || 0) }
}

export const legsKey = (stops) => stops.map((s) => s.id).join(',')
