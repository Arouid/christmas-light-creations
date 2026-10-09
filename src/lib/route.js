// A day's install route as one message for the installer: numbered stops with
// what they need at each house, plus Google Maps links for the whole loop.
import { monthDay } from './discounts.js'

// Customers whose planned install date this season is the given day.
// day: "2026-10-15" (from a date input)
export function installsOn(customers, season, day) {
  const md = day.slice(5) // "10-15"
  return customers.filter((c) => monthDay(c.seasons?.[season]?.plannedDate) === md)
}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

// stops: [{ customer, gate }]; links: from loopLinks()
export function routeMessage({ day, kind = 'Install', stops, links, totalMiles, season, homeAddress }) {
  const date = new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const lines = [`${kind} route, ${date}: ${stops.length} stop${stops.length === 1 ? '' : 's'}${totalMiles ? `, about ${Math.round(totalMiles)} mi` : ''}`, '']
  stops.forEach(({ customer: c, gate }, i) => {
    const s = c.seasons?.[season] ?? {}
    const extra = [
      c.phone && `📞 ${clean(c.phone)}`,
      gate && `Gate ${clean(gate)}`,
      s.timeframe && `⏰ ${clean(s.timeframe)}`,
    ].filter(Boolean).join(' · ')
    lines.push(`${i + 1}. ${clean(c.fullName)}`, `   ${clean(c.address)}`)
    if (extra) lines.push(`   ${extra}`)
    const notes = [s.addOn, s.schedulingNotes].map(clean).filter(Boolean).join(' / ')
    if (notes) lines.push(`   Notes: ${notes}`)
  })
  lines.push('', links.length === 1 ? 'Directions (starts and ends at the shop):' : 'Directions (open in order; ends back at the shop):')
  links.forEach((l) => lines.push(links.length === 1 ? l.url : `Stops ${l.from}–${l.to}${l === links.at(-1) ? ' + home' : ''}: ${l.url}`))
  if (homeAddress) lines.push('', `Home base: ${clean(homeAddress)}`)
  return lines.join('\n')
}
