// Road-sign ROI. Signs get pulled within a day or two, so each placement is a
// short-lived "drop" (a corner + a time). A lead is credited to drops by:
//   confirmed: came from that corner's QR code (source "Road sign (Corner)")
//   likely:    said "Road sign" without a corner -> split across drops that
//              were up when they asked (nearest ones first)
//   nearby:    didn't say, but lives within the radius of a drop that was up
//              (shown separately; never counted as proof)
import { milesBetween } from './geo.js'

export const SIGN_DEFAULTS = { radiusMiles: 1, lifeDays: 2, lagDays: 2, cost: 10 }
const DAY = 86400000

export const cornerCode = (name) => String(name ?? '').toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

// Same wording as the lead's source ("Road sign (Broadway 288)"), see lib/sign.js.
const cornerLabel = (code) => code.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

const ms = (d) => (d instanceof Date ? d.getTime() : Date.parse(d))

// When a drop could have brought a lead: from placing it until it was pulled
// (or its usual life), plus a few days for people who call later.
export function dropWindow(drop, opts = {}) {
  const o = { ...SIGN_DEFAULTS, ...opts }
  const start = ms(drop.placedAt)
  const up = drop.removedAt ? ms(drop.removedAt) : start + (drop.lifeDays ?? o.lifeDays) * DAY
  return [start, up + o.lagDays * DAY]
}

const signCornerOf = (source) => {
  const m = String(source ?? '').match(/^Road sign \((.+)\)$/)
  return m && m[1] !== 'typed the web address' ? m[1].toLowerCase() : null
}

// leads: [{ id, createdAt, source, geo }]; drops: [{ id, code, placedAt, lat, lng, removedAt?, lifeDays? }]
// -> Map(leadId -> { level, credits: [{ dropId, code, weight }] })
export function attribute(leads, drops, opts = {}) {
  const o = { ...SIGN_DEFAULTS, ...opts }
  const out = new Map()
  for (const lead of leads) {
    const t = ms(lead.createdAt)
    if (!Number.isFinite(t)) continue
    const active = drops.filter((d) => { const [a, b] = dropWindow(d, o); return t >= a && t <= b })
    const near = lead.geo?.lat != null ? active.filter((d) => milesBetween(lead.geo, d) <= o.radiusMiles) : []
    const split = (list, level) => out.set(lead.id, { level, credits: list.map((d) => ({ dropId: d.id, code: d.code, weight: 1 / list.length })) })

    const corner = signCornerOf(lead.source)
    if (corner) {
      const atCorner = drops.filter((d) => cornerLabel(d.code).toLowerCase() === corner)
      const before = atCorner.filter((d) => ms(d.placedAt) <= t).sort((a, b) => ms(b.placedAt) - ms(a.placedAt))
      const drop = before[0] ?? atCorner[0]
      out.set(lead.id, { level: 'confirmed', corner, credits: drop ? [{ dropId: drop.id, code: drop.code, weight: 1 }] : [] })
    } else if (/^Road sign/.test(lead.source ?? '')) {
      split(near.length ? near : active, 'likely')
    } else if (near.length && !lead.source) {
      split(near, 'nearby')
    }
  }
  return out
}

// One row per corner: drops, cost, credited leads, bookings and revenue.
// revenueOf(lead) -> booked install total in dollars, or 0/null if not booked.
export function roiByCorner(drops, leads, credit, revenueOf = () => 0) {
  const rows = new Map()
  for (const d of drops) {
    const r = rows.get(d.code) ?? { id: d.code, code: d.code, name: d.corner || cornerLabel(d.code), drops: 0, cost: 0, confirmed: 0, likely: 0, nearby: 0, booked: 0, revenue: 0, lastPlaced: '' }
    r.drops++
    r.cost += Number(d.cost ?? SIGN_DEFAULTS.cost) || 0
    if (String(d.placedAt) > r.lastPlaced) r.lastPlaced = String(d.placedAt)
    rows.set(d.code, r)
  }
  const byId = new Map(leads.map((l) => [l.id, l]))
  for (const [leadId, { level, credits }] of credit) {
    const revenue = Number(revenueOf(byId.get(leadId))) || 0
    for (const { code, weight } of credits) {
      const r = rows.get(code)
      if (!r) continue
      r[level] += weight
      if (level !== 'nearby' && revenue) {
        r.booked += weight
        r.revenue += weight * revenue
      }
    }
  }
  return [...rows.values()].map((r) => {
    const leadsCredited = r.confirmed + r.likely
    return { ...r, costPerLead: leadsCredited ? r.cost / leadsCredited : null, returnRatio: r.cost ? r.revenue / r.cost : null }
  }).sort((a, b) => (b.confirmed + b.likely) - (a.confirmed + a.likely) || b.nearby - a.nearby)
}

// Requests per day (sign-credited vs other) with the number of drops placed,
// for the "did requests jump after signs went out?" chart.
export function dailySeries(leads, drops, credit, days, endDate = new Date()) {
  const key = (t) => new Date(t).toLocaleDateString('en-CA') // YYYY-MM-DD, local day
  const end = new Date(endDate)
  end.setHours(12, 0, 0, 0)
  const series = Array.from({ length: days }, (_, i) => {
    const day = key(end.getTime() - (days - 1 - i) * DAY)
    return { day, sign: 0, other: 0, drops: 0 }
  })
  const at = new Map(series.map((s) => [s.day, s]))
  for (const l of leads) {
    const s = at.get(key(ms(l.createdAt)))
    if (!s) continue
    const c = credit.get(l.id)
    if (c && c.level !== 'nearby') s.sign++
    else s.other++
  }
  for (const d of drops) {
    const s = at.get(key(ms(d.placedAt)))
    if (s) s.drops++
  }
  return series
}
