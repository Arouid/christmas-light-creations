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
// The Ads transfer names its tables after the Ads customer id (926-884-6031,
// the account made 2026-10-11). No wildcard here: the `ads_*` names are views
// over the partitioned `p_*` tables, and BigQuery refuses wildcards on views.
export const ADS_CUSTOMER_ID = '9268846031'
export const ADS_STATS_TABLE = `clc-leads-site.billing.ads_CampaignBasicStats_${ADS_CUSTOMER_ID}`
export const ADS_CAMPAIGN_TABLE = `clc-leads-site.billing.ads_Campaign_${ADS_CUSTOMER_ID}`
export const ADS_TERMS_TABLE = `clc-leads-site.billing.ads_SearchQueryStats_${ADS_CUSTOMER_ID}`

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

// Google Ads per month and campaign: cost (metrics_cost_micros), impressions,
// clicks, conversions and their value summed over the days of the month, named
// from the latest campaign snapshot (_DATA_DATE = _LATEST_DATE, Google's own
// sample pattern). Column names from BigQuery's "Google Ads report
// transformation" page (CampaignBasicStats), checked 2026-10-11.
export function adsQuery(monthKeys, stats = ADS_STATS_TABLE, campaigns = ADS_CAMPAIGN_TABLE) {
  return {
    query: `WITH stats AS (
  SELECT FORMAT_DATE('%Y-%m', segments_date) AS month, campaign_id,
    SUM(metrics_cost_micros) AS micros, SUM(metrics_impressions) AS impressions, SUM(metrics_clicks) AS clicks,
    SUM(metrics_conversions) AS conversions, SUM(metrics_conversions_value) AS conversions_value,
    MAX(segments_date) AS last_day
  FROM \`${stats}\`
  WHERE FORMAT_DATE('%Y-%m', segments_date) IN UNNEST(@months)
  GROUP BY month, campaign_id),
names AS (
  SELECT campaign_id, ANY_VALUE(campaign_name) AS name
  FROM \`${campaigns}\` WHERE _DATA_DATE = _LATEST_DATE GROUP BY campaign_id)
SELECT s.month, IFNULL(n.name, CAST(s.campaign_id AS STRING)) AS campaign,
  s.micros, s.impressions, s.clicks, s.conversions, s.conversions_value, s.last_day
FROM stats s LEFT JOIN names n USING (campaign_id)`,
    params: { months: [...monthKeys] },
  }
}

// What people searched before clicking an ad: the month's search terms with
// their clicks and cost (SearchQueryStats: search_term_view_search_term). The
// query returns every term with a click; topTerms() keeps the top 5 per month.
export function termsQuery(monthKeys, terms = ADS_TERMS_TABLE) {
  return {
    query: `SELECT FORMAT_DATE('%Y-%m', segments_date) AS month, search_term_view_search_term AS term,
  SUM(metrics_clicks) AS clicks, SUM(metrics_cost_micros) AS micros
FROM \`${terms}\`
WHERE FORMAT_DATE('%Y-%m', segments_date) IN UNNEST(@months)
GROUP BY month, term
HAVING clicks > 0`,
    params: { months: [...monthKeys] },
  }
}

// Terms query rows → { [monthKey]: [{ term, clicks, cents }] }, most clicks
// first (then cost), n per month; a month with no rows gets [].
export function topTerms(rows, monthKeys, n = 5) {
  const out = Object.fromEntries(monthKeys.map((k) => [k, []]))
  for (const r of rows ?? []) {
    const list = out[String(r.month)]
    const term = String(r.term ?? '').trim()
    if (!list || !term) continue
    list.push({ term: term.slice(0, 80), clicks: Math.round(Number(r.clicks) || 0), cents: Math.round((Number(r.micros) || 0) / 1e4) })
  }
  for (const k of Object.keys(out)) out[k] = out[k].sort((a, b) => b.clicks - a.clicks || b.cents - a.cents).slice(0, n)
  return out
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
// rows: [{ month: '2026-10', campaign, micros, impressions, clicks, conversions,
// conversions_value, last_day }]; asOf: query time. Conversions are Google's
// count (a float: they can be fractional) and stay 0 until the owner defines a
// conversion action in Google Ads. topTerms (from termsQuery) is added by the caller.
export function adsSpend(rows, monthKeys, asOf = Date.now()) {
  const out = {}
  for (const k of monthKeys) out[k] = { totalCents: 0, byCampaign: {}, impressions: 0, clicks: 0, conversions: 0, conversionsValueCents: 0, topTerms: [], asOf: new Date(asOf).toISOString(), lastDay: null }
  const sums = {}
  for (const r of rows ?? []) {
    const k = String(r.month)
    const a = out[k]
    if (!a) continue
    const key = safeKey(r.campaign)
    sums[k] ??= {}
    const c = (sums[k][key] ??= { micros: 0, impressions: 0, clicks: 0, conversions: 0, value: 0 })
    c.micros += Number(r.micros) || 0
    c.impressions += Number(r.impressions) || 0
    c.clicks += Number(r.clicks) || 0
    c.conversions += Number(r.conversions) || 0
    c.value += Number(r.conversions_value) || 0
    const day = r.last_day && typeof r.last_day === 'object' && 'value' in r.last_day ? r.last_day.value : r.last_day
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(String(day)) && (!a.lastDay || day > a.lastDay)) a.lastDay = String(day)
  }
  for (const [k, campaigns] of Object.entries(sums)) {
    const a = out[k]
    let micros = 0, value = 0
    for (const [name, c] of Object.entries(campaigns)) {
      micros += c.micros
      value += c.value
      a.impressions += c.impressions
      a.clicks += c.clicks
      a.conversions += c.conversions
      const cents = Math.round(c.micros / 1e4)
      // A campaign that cost nothing and got no clicks is noise (paused); keep
      // the rest even at 0¢ so a brand-new campaign's impressions show.
      if (cents || c.clicks || c.impressions) a.byCampaign[name] = { cents, clicks: c.clicks, impressions: c.impressions, conversions: round2(c.conversions) }
    }
    a.totalCents = Math.round(micros / 1e4)
    a.conversions = round2(a.conversions)
    a.conversionsValueCents = Math.round(value * 100)
  }
  return out
}
const round2 = (x) => Math.round(x * 100) / 100

// The services (or campaigns) for the muted line on Home, biggest first. A
// byCampaign entry is `{ cents, clicks, … }` (since 2026-10-11) or, in docs
// written before that, a bare cents number; both read.
export function topServices(google, n = 3) {
  return Object.entries(google?.byService ?? google?.byCampaign ?? {})
    .map(([name, v]) => (v && typeof v === 'object' ? { name, ...v, cents: Number(v.cents) || 0 } : { name, cents: Number(v) || 0 }))
    .sort((a, b) => b.cents - a.cents || (b.clicks ?? 0) - (a.clicks ?? 0))
    .slice(0, n)
}

// Home → Google Ads panel (docs/specs/ads-stats.md): the month's numbers from
// usage.ads, or null while the transfer isn't connected. Cost per click and
// per request only when there is something to divide by.
export function adsSummary(ads) {
  if (!ads) return null
  const cents = Number(ads.totalCents) || 0
  const clicks = Number(ads.clicks) || 0
  const impressions = Number(ads.impressions) || 0
  const conversions = Number(ads.conversions) || 0
  return {
    cents, clicks, impressions, conversions,
    cpcCents: clicks ? cents / clicks : null,
    perRequestCents: conversions ? cents / conversions : null,
    ctr: impressions ? clicks / impressions : null,
    campaigns: topServices(ads, 3),
    terms: (Array.isArray(ads.topTerms) ? ads.topTerms : []).slice(0, 5),
    lastDay: ads.lastDay ?? null,
    asOf: ads.asOf ?? null,
  }
}
