// Bad-weather heads-ups (owner 2026-10-12: "rain notifications to go out
// with expected problems or potential problems if bad weather is expected").
// Every afternoon weatherWatch (functions/index.js) reads the National
// Weather Service forecast for Pearland (api.weather.gov, free, no key) for
// the next LOOKAHEAD_DAYS days. On a day with thunderstorms, heavy rain,
// strong wind or a freeze:
//   - customers with a stop on a route that day get a scheduling heads-up
//     (the date may move; we text if it does): part of their service, so it
//     always goes out;
//   - customers whose lights are up get the "what usually goes wrong and the
//     one thing that fixes it" email (GFCI reset, strands and trees, freezes):
//     optional, off with Email preferences on their account page, at most one
//     per bad day and one every TIPS_GAP_DAYS days;
//   - staff get one phone notification and one email with the forecast and
//     who was told.
// Off with ⚙ Settings → Automatic emails (settings/app.weatherEmails false).
// Pure: the fetch and the sends live in functions/index.js.
// Spec: docs/specs/auto-emails.md. Tested in tests/autoEmails.test.mjs.
import { BIZ, PHONE, brandText, textFooter } from './brand.js'
import { FREEZE_TIP, GFCI_TIP, TREE_SHORT, WIND_TIP } from './notices.js'

export const PEARLAND = { lat: 29.5636, lon: -95.286 }
export const NWS_POINTS_URL = `https://api.weather.gov/points/${PEARLAND.lat},${PEARLAND.lon}`
// api.weather.gov wants a User-Agent that says who is asking.
export const NWS_USER_AGENT = '(christmas-light-creations.com, info@christmas-light-creations.com)'
export const LOOKAHEAD_DAYS = 3
export const TIPS_GAP_DAYS = 5
export const SENT_KEEP_DAYS = 14
export const WATCH_SCHEDULE = '30 16 * * *' // 4:30 pm Central: the day-before heads-up lands in the evening
export const THRESHOLDS = { rainPct: 60, stormPct: 40, windMph: 25, gustMph: 35, freezeF: 32 }
export const CONCERN_WORD = { storms: 'thunderstorms', rain: 'heavy rain', wind: 'strong wind', freeze: 'a freeze' }

const DAY = 24 * 60 * 60 * 1000
const mph = (s) => Math.max(0, ...String(s ?? '').match(/\d+/g)?.map(Number) ?? [0])
const addDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10)
export const weekday = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
const longDay = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })

// NWS forecast periods (12-hour, local start times) -> one row per day after
// today, for LOOKAHEAD_DAYS days: the worse of day and night.
export function forecastDays(periods, today) {
  const last = addDays(today, LOOKAHEAD_DAYS)
  const byDay = new Map()
  for (const p of periods ?? []) {
    const day = String(p.startTime ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day <= today || day > last) continue
    const d = byDay.get(day) ?? { day, name: weekday(day), hi: null, lo: null, rainPct: 0, windMph: 0, gustMph: 0, storms: false, ice: false, short: '' }
    const temp = Number(p.temperature)
    if (Number.isFinite(temp)) {
      d.hi = d.hi == null ? temp : Math.max(d.hi, temp)
      d.lo = d.lo == null ? temp : Math.min(d.lo, temp)
    }
    const pct = Number(p.probabilityOfPrecipitation?.value ?? 0) || 0
    const short = String(p.shortForecast ?? '')
    const stormy = /thunder/i.test(short)
    const icy = /freez|ice|sleet|snow|wintry/i.test(short)
    const wind = mph(p.windSpeed)
    const gust = mph(p.windGust)
    // The period that worries us most names the day.
    const worse = pct > d.rainPct || (stormy && !d.storms) || wind > d.windMph || (icy && !d.ice)
    if (worse || !d.short) d.short = short
    d.rainPct = Math.max(d.rainPct, pct)
    d.windMph = Math.max(d.windMph, wind)
    d.gustMph = Math.max(d.gustMph, gust)
    d.storms ||= stormy
    d.ice ||= icy
    byDay.set(day, d)
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
}

// What is wrong with a day: [] when nothing is.
export function concerns(d, t = THRESHOLDS) {
  const out = []
  if (d.storms && d.rainPct >= t.stormPct) out.push('storms')
  else if (d.rainPct >= t.rainPct) out.push('rain')
  if (d.windMph >= t.windMph || d.gustMph >= t.gustMph) out.push('wind')
  if (d.ice || (d.lo != null && d.lo <= t.freezeF)) out.push('freeze')
  return out
}

export const badDays = (periods, today) => forecastDays(periods, today).map((d) => ({ ...d, concerns: concerns(d) })).filter((d) => d.concerns.length)

// "Thursday, Oct 15: thunderstorms (80% chance), wind to 25 mph, low 31°F"
export function weatherLine(d) {
  const bits = []
  if (d.concerns.includes('storms') || d.concerns.includes('rain')) bits.push(`${d.storms ? 'thunderstorms' : 'rain'} (${d.rainPct}% chance)`)
  if (d.concerns.includes('wind')) bits.push(`wind to ${Math.max(d.windMph, d.gustMph)} mph`)
  if (d.concerns.includes('freeze')) bits.push(d.ice ? 'ice' : `low ${d.lo}°F`)
  return `${longDay(d.day)}: ${bits.join(', ') || d.short}`
}

const first = (name) => String(name ?? '').trim().split(/\s+/)[0] || 'there'
const JOB = { install: 'install', takedown: 'takedown', service: 'service visit' }

// A customer with a stop on a bad day: the date may move. Scheduling, so it
// goes to everyone on the route (not optional).
export function routeHeadsUp({ name, day, kind }) {
  const job = JOB[kind] ?? 'visit'
  const what = day.concerns.map((c) => CONCERN_WORD[c]).join(' and ')
  const text = `Hi ${first(name)},

A quick weather heads-up for your ${job} on ${longDay(day.day)}: the forecast says ${what} (${weatherLine(day).split(': ')[1]}). Rain, lightning and strong wind can keep our crew off the roof, so your date may move to the next clear day. If it does, we will text you; nothing to do on your side.
${day.concerns.includes('wind') && kind !== 'takedown' ? `\n${TREE_SHORT}\n` : ''}
Thank you,
${BIZ}
${PHONE}${textFooter(false)}`
  return { subject: `Weather heads-up for your ${job} ${day.name}`, text, html: brandText({ heading: `Weather heads-up for ${day.name}`, text }) }
}

// A customer whose lights are up: what usually goes wrong and the one thing
// that fixes it. Optional (Email preferences on their account page).
export function lightsHeadsUp({ name, days }) {
  const all = new Set(days.flatMap((d) => d.concerns))
  const tips = []
  if (all.has('storms') || all.has('rain')) tips.push(GFCI_TIP)
  if (all.has('wind')) tips.push(WIND_TIP)
  if (all.has('freeze')) tips.push(FREEZE_TIP)
  const text = `Hi ${first(name)},

Heads-up: the forecast for Pearland and around has ${days.map((d) => `${weatherLine(d)}`).join('; ')}. Your lights are built for the weather, but here is what sometimes happens and what to do:

${tips.map((t) => `• ${t}`).join('\n\n')}

Service calls are free all season: text a photo to ${PHONE} and we will come out.

Thank you,
${BIZ}
${PHONE}${textFooter(true)}`
  const what = [...all].map((c) => CONCERN_WORD[c]).join(', ')
  return { subject: `Weather heads-up: ${what} ${days.length === 1 ? days[0].name : 'this week'}, and your lights`, text, html: brandText({ heading: 'Weather and your lights', text, optional: true }) }
}

// Throttle (serverState/weather.sent: { '<customerId>:<day>': at, ... }).
export const sentKey = (customerId, day) => `${customerId}:${day}`
export function tipsOk(sent, customerId, day, now = Date.now()) {
  if (sent?.[sentKey(customerId, day)]) return false
  const last = Math.max(0, ...Object.entries(sent ?? {}).filter(([k]) => k.startsWith(`${customerId}:`)).map(([, at]) => Number(at) || 0))
  return now - last >= TIPS_GAP_DAYS * DAY
}
export const pruneSent = (sent, now = Date.now()) => Object.fromEntries(Object.entries(sent ?? {}).filter(([, at]) => now - (Number(at) || 0) < SENT_KEEP_DAYS * DAY))

// Customers whose lights are up this season (the season's install status).
export const lightsUp = (customer, season) => customer?.seasons?.[season]?.installStatus === 'Install Completed'
// Optional emails: on unless the customer turned them off on their account page.
export const noticesOn = (customer) => customer?.emailNotices !== false

// Staff: one notification and one email, with who was told.
export function staffWeather({ days, routeStops, told, skipped }) {
  const lines = days.map((d) => `• ${weatherLine(d)}`).join('\n')
  const stops = routeStops.length ? routeStops.map((s) => `• ${longDay(s.day)}: ${s.names.join(', ')} (${s.names.length} stop${s.names.length === 1 ? '' : 's'})`).join('\n') : '• No stops on those days.'
  const text = `Bad weather ahead:

${lines}

Routes on those days (each customer got a "your date may move" email):
${stops}

Customers with lights up who got the storm tips (GFCI reset, strands and trees, freezes): ${told}${skipped ? ` (${skipped} skipped: turned off on their account page, or told in the last ${TIPS_GAP_DAYS} days)` : ''}.

If you move a route, text the customers from the route's Day-before reminders.`
  return {
    push: { title: `Weather: ${days.map((d) => `${d.name.slice(0, 3)} ${d.concerns.map((c) => CONCERN_WORD[c]).join('/')}`).join(', ')}`, body: routeStops.length ? `${routeStops.reduce((n, s) => n + s.names.length, 0)} route stops may move` : 'No route stops on those days', link: '#route', tag: 'weather' },
    subject: `Weather heads-up: ${days.map((d) => d.name).join(', ')} (CLC staff)`,
    text,
  }
}
