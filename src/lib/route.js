// Route helpers: which installs are planned for a day, and the message sent
// to the installer (stops with arrival times, the app link, Maps links).
import { monthDay } from './discounts.js'

// Customers whose planned install date this season is the given day.
// day: "2026-10-15" (from a date input)
export function installsOn(customers, season, day) {
  const md = day.slice(5) // "10-15"
  return customers.filter((c) => monthDay(c.seasons?.[season]?.plannedDate) === md)
}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

// Message for a saved route (stops in driving order with arrival times).
// rows: from timeline(); appUrl: the installer screen in the staff app.
export function routeSheet({ route, rows, homeAt, links, appUrl, clock }) {
  const date = new Date(`${route.day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const live = rows.filter((s) => s.status !== 'skipped' && s.status !== 'done')
  const lines = [`Route ${date}${route.name ? ` (${route.name})` : ''}: ${live.length} stop${live.length === 1 ? '' : 's'}, leave ${clock(toMinutes(route.startTime))}, back ≈ ${clock(homeAt)}`, '']
  if (appUrl) lines.push(`Open in the CLC app (navigate, gate codes, mark done): ${appUrl}`, '')
  live.forEach((s, i) => {
    lines.push(`${i + 1}. ${clean(s.name)}${s.eta != null ? ` · ≈ ${clock(s.eta)}` : ''}`, `   ${clean(s.address)}`)
    const extra = [s.phone && `📞 ${clean(s.phone)}`, s.gate && `Gate ${clean(s.gate)}`, `${s.minutes} min`].filter(Boolean).join(' · ')
    lines.push(`   ${extra}`)
    if (clean(s.notes)) lines.push(`   Notes: ${clean(s.notes)}`)
  })
  if (links?.length) {
    lines.push('', 'Whole route in Google Maps:')
    links.forEach((l) => lines.push(links.length === 1 ? l.url : `Stops ${l.from}–${l.to}${l === links.at(-1) ? ' + home' : ''}: ${l.url}`))
  }
  return lines.join('\n')
}

const toMinutes = (hhmm) => { const [h, m] = String(hhmm || '08:00').split(':').map(Number); return h * 60 + (m || 0) }
