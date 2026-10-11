// Google Cloud spend for Home → Spent this month (docs/specs/spend.md).
// Google only reports what a project costs through a Cloud Billing export
// into BigQuery (dataset `billing`, "Standard usage cost"). Every 6 hours the
// server (googleSpend in index.js) runs billingQuery(), turns the rows into
// the `google` field of usage/{YYYY-MM} with googleSpend(), and Home shows it.
// Pure: no imports from the rest of functions/. Tested in tests/googleBilling.test.mjs.

// The export writes one table per billing account; the wildcard spares us the
// account id in the name (billing.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX).
export const BILLING_TABLE = 'clc-leads-site.billing.gcp_billing_export_v1_*'

// "202610" (Google's invoice.month) for a "2026-10" month key.
export const invoiceMonth = (monthKey) => String(monthKey).replace('-', '')
// "2026-10" for an invoice month "202610".
export const monthKeyOf = (invoice) => `${String(invoice).slice(0, 4)}-${String(invoice).slice(4, 6)}`

// "2026-09" for the month before "2026-10".
export function previousMonth(monthKey) {
  const [y, m] = String(monthKey).split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// Net cost per month and service: cost plus credits (credits are negative
// amounts, so the sum is what the bill will say). Parameterised on the months.
export function billingQuery(monthKeys, table = BILLING_TABLE) {
  return {
    query: `SELECT invoice.month AS month, service.description AS service,
  SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net,
  MAX(export_time) AS last_export
FROM \`${table}\`
WHERE invoice.month IN UNNEST(@months)
GROUP BY month, service`,
    params: { months: monthKeys.map(invoiceMonth) },
  }
}

// Firestore map keys can't hold dots or slashes (treated as paths): keep the
// name readable but safe ("Maps API" stays, "Cloud Run" stays, "." → "_").
const safeKey = (name) => String(name || 'Other').trim().replace(/[.~/*[\]]/g, '_').slice(0, 80) || 'Other'

const isoOf = (t) => {
  const v = t && typeof t === 'object' && 'value' in t ? t.value : t
  const d = v == null ? null : new Date(v)
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
}

// Query rows → { [monthKey]: google } for the months asked (a month with no
// rows yet gets a $0 entry so Home knows the export answered).
// rows: [{ month: '202610', service, net, last_export }]; asOf: query time.
export function googleSpend(rows, monthKeys, asOf = Date.now()) {
  const out = {}
  for (const k of monthKeys) out[k] = { totalCents: 0, byService: {}, asOf: new Date(asOf).toISOString(), lastExportAt: null }
  const micro = {}
  for (const r of rows ?? []) {
    const k = monthKeyOf(r.month)
    const g = out[k]
    if (!g) continue
    const net = Number(r.net) || 0
    const key = safeKey(r.service)
    // Sum in hundredths of a cent so services that each round to 0 still add up.
    micro[k] ??= {}
    micro[k][key] = (micro[k][key] ?? 0) + net
    const exp = isoOf(r.last_export)
    if (exp && (!g.lastExportAt || exp > g.lastExportAt)) g.lastExportAt = exp
  }
  for (const [k, services] of Object.entries(micro)) {
    let total = 0
    for (const [name, dollars] of Object.entries(services)) {
      total += dollars
      const cents = Math.round(dollars * 100)
      if (cents) out[k].byService[name] = cents
    }
    out[k].totalCents = Math.round(total * 100)
  }
  return out
}

// The services for the muted line on Home, biggest first (keys of byService).
export function topServices(google, n = 3) {
  return Object.entries(google?.byService ?? {})
    .map(([name, cents]) => ({ name, cents: Number(cents) || 0 }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, n)
}
