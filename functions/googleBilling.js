// Google Cloud and Google Ads spend for Home → Spent this month
// (docs/specs/spend.md). Google only reports what a project costs through a
// Cloud Billing export into BigQuery (dataset `billing`, "Standard usage
// cost"), and Ads spend through the BigQuery Data Transfer for Google Ads
// (same dataset). Every 6 hours the server (googleSpend in index.js) runs
// billingQuery() and adsQuery(), turns the rows into the `google` and `ads`
// fields of usage/{YYYY-MM} with googleSpend() / adsSpend(), and Home shows them.
// Pure: no imports from the rest of functions/. Tested in tests/googleBilling.test.mjs.

// The export writes one table per billing account; the wildcard spares us the
// account id in the name (billing.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX).
export const BILLING_TABLE = 'clc-leads-site.billing.gcp_billing_export_v1_*'
// The Ads transfer names its tables after the Ads customer id; wildcards again.
export const ADS_STATS_TABLE = 'clc-leads-site.billing.ads_CampaignBasicStats_*'
export const ADS_CAMPAIGN_TABLE = 'clc-leads-site.billing.ads_Campaign_*'

// A query that fails because the export or transfer hasn't made its table yet
// (BigQuery: "Not found: Table …" / "matched no tables"). Then the line on
// Home keeps saying the source isn't connected, and nothing else breaks.
export const isMissingTable = (err) => /not found|matched no tables|does not match any table/i.test(String(err?.message ?? err))

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

// Google Ads cost per month and campaign: metrics_cost_micros summed per
// campaign over the days of the month, named from the latest campaign snapshot.
export function adsQuery(monthKeys, stats = ADS_STATS_TABLE, campaigns = ADS_CAMPAIGN_TABLE) {
  return {
    query: `WITH stats AS (
  SELECT FORMAT_DATE('%Y-%m', segments_date) AS month, campaign_id,
    SUM(metrics_cost_micros) AS micros, MAX(segments_date) AS last_day
  FROM \`${stats}\`
  WHERE FORMAT_DATE('%Y-%m', segments_date) IN UNNEST(@months)
  GROUP BY month, campaign_id),
names AS (
  SELECT campaign_id, ARRAY_AGG(campaign_name ORDER BY segments_date DESC LIMIT 1)[OFFSET(0)] AS name
  FROM \`${campaigns}\` GROUP BY campaign_id)
SELECT s.month, IFNULL(n.name, CAST(s.campaign_id AS STRING)) AS campaign, s.micros, s.last_day
FROM stats s LEFT JOIN names n USING (campaign_id)`,
    params: { months: [...monthKeys] },
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

// Ads query rows → { [monthKey]: ads } for the months asked.
// rows: [{ month: '2026-10', campaign, micros, last_day }]; asOf: query time.
export function adsSpend(rows, monthKeys, asOf = Date.now()) {
  const out = {}
  for (const k of monthKeys) out[k] = { totalCents: 0, byCampaign: {}, asOf: new Date(asOf).toISOString(), lastDay: null }
  const micros = {}
  for (const r of rows ?? []) {
    const k = String(r.month)
    const a = out[k]
    if (!a) continue
    const key = safeKey(r.campaign)
    micros[k] ??= {}
    micros[k][key] = (micros[k][key] ?? 0) + (Number(r.micros) || 0)
    const day = r.last_day && typeof r.last_day === 'object' && 'value' in r.last_day ? r.last_day.value : r.last_day
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(String(day)) && (!a.lastDay || day > a.lastDay)) a.lastDay = String(day)
  }
  for (const [k, campaigns] of Object.entries(micros)) {
    let total = 0
    for (const [name, m] of Object.entries(campaigns)) {
      total += m
      const cents = Math.round(m / 1e4)
      if (cents) out[k].byCampaign[name] = cents
    }
    out[k].totalCents = Math.round(total / 1e4)
  }
  return out
}

// The services (or campaigns) for the muted line on Home, biggest first.
export function topServices(google, n = 3) {
  return Object.entries(google?.byService ?? google?.byCampaign ?? {})
    .map(([name, cents]) => ({ name, cents: Number(cents) || 0 }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, n)
}
