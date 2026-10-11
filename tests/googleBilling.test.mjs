import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADS_CAMPAIGN_TABLE, ADS_STATS_TABLE, ADS_TERMS_TABLE, BILLING_TABLE, adsQuery, adsSpend, adsSummary, billingQuery, googleSpend, invoiceMonth, isMissingTable, monthKeyOf, previousMonth, termsQuery, topServices, topTerms } from '../functions/googleBilling.js'
import { asOfText, spendText, spentSummary } from '../functions/usage.js'

test('months: invoice month, back and forth, previous month across a year', () => {
  assert.equal(invoiceMonth('2026-10'), '202610')
  assert.equal(monthKeyOf('202610'), '2026-10')
  assert.equal(previousMonth('2026-10'), '2026-09')
  assert.equal(previousMonth('2026-01'), '2025-12')
})

test('billingQuery: wildcard export table, net = cost + credits, parameterised months', () => {
  const q = billingQuery(['2026-10', '2026-09'])
  assert.ok(q.query.includes(`\`${BILLING_TABLE}\``))
  assert.ok(q.query.includes('SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0))'))
  assert.ok(q.query.includes('invoice.month IN UNNEST(@months)'))
  assert.deepEqual(q.params, { months: ['202610', '202609'] })
})

test('googleSpend: cents per month and service, rounded once; latest export time; empty month is $0', () => {
  const rows = [
    { month: '202610', service: 'Cloud Firestore', net: 0.1234, last_export: { value: '2026-10-10T08:00:00.000Z' } },
    { month: '202610', service: 'Cloud Functions', net: 0.004, last_export: { value: '2026-10-10T14:00:00.000Z' } },
    { month: '202610', service: 'Maps API', net: 0.004, last_export: '2026-10-09T14:00:00.000Z' },
    { month: '202609', service: 'Cloud Firestore', net: 1.5, last_export: { value: '2026-10-01T02:00:00.000Z' } },
    { month: '202608', service: 'Old', net: 99, last_export: null },
  ]
  const out = googleSpend(rows, ['2026-10', '2026-09'], Date.UTC(2026, 9, 10, 20))
  // 0.1234 + 0.004 + 0.004 = 0.1314 → 13 cents, even though two services round to 0 on their own
  assert.equal(out['2026-10'].totalCents, 13)
  assert.deepEqual(out['2026-10'].byService, { 'Cloud Firestore': 12 })
  assert.equal(out['2026-10'].lastExportAt, '2026-10-10T14:00:00.000Z')
  assert.equal(out['2026-10'].asOf, '2026-10-10T20:00:00.000Z')
  assert.equal(out['2026-09'].totalCents, 150)
  assert.equal(out['2026-08'], undefined)
  assert.deepEqual(googleSpend([], ['2026-10'])['2026-10'].byService, {})
  assert.equal(googleSpend([], ['2026-10'])['2026-10'].totalCents, 0)
})

test('googleSpend: service names safe as Firestore keys, credits can make a service negative', () => {
  const out = googleSpend([
    { month: '202610', service: 'Cloud Run Admin API.', net: 0.5 },
    { month: '202610', service: 'Cloud Run Admin API.', net: 0.25 },
    { month: '202610', service: '', net: -0.1 },
  ], ['2026-10'])
  assert.deepEqual(out['2026-10'].byService, { 'Cloud Run Admin API_': 75, Other: -10 })
  assert.equal(out['2026-10'].totalCents, 65)
})

test('topServices: biggest three', () => {
  const g = { byService: { A: 1, B: 50, C: 20, D: 30 } }
  assert.deepEqual(topServices(g).map((s) => s.name), ['B', 'D', 'C'])
  assert.deepEqual(topServices(null), [])
})

test('spentSummary: Google Cloud counted in the total once the export has run', () => {
  const doc = {
    claude: { ask: { calls: 1, microCents: 2100 } },
    google: { totalCents: 137, byService: { 'Cloud Firestore': 120, 'Cloud Functions': 17 }, asOf: '2026-10-11T04:20:00.000Z', lastExportAt: '2026-10-10T14:00:00.000Z' },
  }
  const s = spentSummary(doc)
  const g = s.rows.find((r) => r.key === 'google')
  assert.equal(g.how, 'exact')
  assert.equal(g.cents, 137)
  assert.equal(g.note, 'as of Oct 10')
  assert.deepEqual(g.parts, [{ name: 'Cloud Firestore', cents: 120 }, { name: 'Cloud Functions', cents: 17 }])
  assert.equal(s.totalCents, 2.1 + 137)
  assert.equal(s.partial, true) // Ads still pending
  assert.deepEqual(s.missing, ['Google Ads'])
  assert.equal(spendText(g.cents), '$1.37')
})

test('spentSummary: before the first export run Google Cloud is pending and out of the total', () => {
  const s = spentSummary({ claude: { ask: { calls: 1, microCents: 2100 } } })
  const g = s.rows.find((r) => r.key === 'google')
  assert.equal(g.how, 'pending')
  assert.equal(g.cents, null)
  assert.equal(g.note, 'export on, first numbers within a day')
  assert.equal(s.totalCents, 2.1)
  assert.equal(s.partial, true)
  const zero = spentSummary({ google: { totalCents: 0, byService: {}, asOf: '2026-10-11T04:20:00.000Z', lastExportAt: null } })
  assert.equal(zero.rows.find((r) => r.key === 'google').note, 'nothing billed yet · as of Oct 10')
  assert.equal(spentSummary({ google: { totalCents: 0 } }).rows.find((r) => r.key === 'google').note, 'nothing billed yet · from the billing export')
  assert.deepEqual(zero.missing, ['Google Ads'])
})

test('asOfText: Central date, empty when unknown', () => {
  assert.equal(asOfText('2026-10-11T03:30:00.000Z'), 'Oct 10')
  assert.equal(asOfText(null), '')
  assert.equal(asOfText('nope'), '')
})

test('adsQuery: the customer’s transfer tables (no wildcard: they are views), cost and the four metrics per month and campaign, latest names, parameterised months', () => {
  const q = adsQuery(['2026-10', '2026-09'])
  assert.equal(ADS_STATS_TABLE, 'clc-leads-site.billing.ads_CampaignBasicStats_9268846031')
  assert.equal(ADS_CAMPAIGN_TABLE, 'clc-leads-site.billing.ads_Campaign_9268846031')
  assert.ok(!ADS_STATS_TABLE.includes('*') && !ADS_CAMPAIGN_TABLE.includes('*') && !ADS_TERMS_TABLE.includes('*'))
  assert.ok(q.query.includes(`\`${ADS_STATS_TABLE}\``))
  assert.ok(q.query.includes(`\`${ADS_CAMPAIGN_TABLE}\``))
  for (const col of ['metrics_cost_micros', 'metrics_impressions', 'metrics_clicks', 'metrics_conversions', 'metrics_conversions_value']) assert.ok(q.query.includes(`SUM(${col})`), col)
  assert.ok(q.query.includes('_DATA_DATE = _LATEST_DATE'))
  assert.ok(q.query.includes("FORMAT_DATE('%Y-%m', segments_date) IN UNNEST(@months)"))
  assert.deepEqual(q.params, { months: ['2026-10', '2026-09'] })
})

test('termsQuery: search terms with clicks and cost per month; topTerms keeps the 5 most clicked per month', () => {
  const q = termsQuery(['2026-10'])
  assert.equal(ADS_TERMS_TABLE, 'clc-leads-site.billing.ads_SearchQueryStats_9268846031')
  assert.ok(q.query.includes(`\`${ADS_TERMS_TABLE}\``))
  assert.ok(q.query.includes('search_term_view_search_term AS term'))
  assert.ok(q.query.includes('SUM(metrics_clicks)') && q.query.includes('SUM(metrics_cost_micros)'))
  assert.deepEqual(q.params, { months: ['2026-10'] })
  const rows = [
    { month: '2026-10', term: 'christmas light installers pearland', clicks: 9, micros: 31_500_000 },
    { month: '2026-10', term: 'christmas lights near me', clicks: 14, micros: 40_000_000 },
    { month: '2026-10', term: ' holiday lighting friendswood ', clicks: 3, micros: 9_000_000 },
    { month: '2026-10', term: 'light hangers', clicks: 3, micros: 12_000_000 },
    { month: '2026-10', term: 'xmas lights', clicks: 2, micros: 1_000_000 },
    { month: '2026-10', term: 'install lights', clicks: 1, micros: 1_000_000 },
    { month: '2026-10', term: '', clicks: 5, micros: 1_000_000 },
    { month: '2026-09', term: 'early birds', clicks: 1, micros: 2_000_000 },
    { month: '2026-08', term: 'old', clicks: 50, micros: 0 },
  ]
  const top = topTerms(rows, ['2026-10', '2026-09'])
  assert.deepEqual(top['2026-10'].map((t) => t.term), ['christmas lights near me', 'christmas light installers pearland', 'light hangers', 'holiday lighting friendswood', 'xmas lights'])
  assert.deepEqual(top['2026-10'][0], { term: 'christmas lights near me', clicks: 14, cents: 4000 })
  assert.deepEqual(top['2026-09'], [{ term: 'early birds', clicks: 1, cents: 200 }])
  assert.equal(top['2026-08'], undefined)
  assert.deepEqual(topTerms([], ['2026-10']), { '2026-10': [] })
})

test('adsSpend: micros → cents per month and campaign, rounded once; metrics summed; last day with data; empty month is $0', () => {
  const rows = [
    { month: '2026-10', campaign: 'Pearland lights', micros: 12_340_000, impressions: 800, clicks: 20, conversions: 1.5, conversions_value: 0, last_day: { value: '2026-10-09' } },
    { month: '2026-10', campaign: 'Pearland lights', micros: 1_000_000, impressions: 100, clicks: 2, conversions: 0.5, conversions_value: 250, last_day: { value: '2026-10-10' } },
    { month: '2026-10', campaign: 'Friendswood', micros: 4_000, impressions: 10, clicks: 0, conversions: 0, conversions_value: 0, last_day: '2026-10-10' },
    { month: '2026-10', campaign: 'Brand.', micros: 4_000, impressions: 0, clicks: 0, conversions: 0, conversions_value: 0, last_day: null },
    { month: '2026-10', campaign: 'Paused', micros: 0, impressions: 0, clicks: 0, conversions: 0, conversions_value: 0, last_day: null },
    { month: '2026-09', campaign: 'Pearland lights', micros: 50_000_000, impressions: 1000, clicks: 50, conversions: 0, conversions_value: 0, last_day: { value: '2026-09-30' } },
    { month: '2026-08', campaign: 'Old', micros: 1e9 },
  ]
  const out = adsSpend(rows, ['2026-10', '2026-09'], Date.UTC(2026, 9, 11, 4))
  const oct = out['2026-10']
  assert.equal(oct.totalCents, 1335) // $13.348 → 1335 cents: the two tiny campaigns count though each rounds to 0
  assert.deepEqual(oct.byCampaign, {
    'Pearland lights': { cents: 1334, clicks: 22, impressions: 900, conversions: 2 },
    Friendswood: { cents: 0, clicks: 0, impressions: 10, conversions: 0 },
  })
  assert.equal(oct.impressions, 910)
  assert.equal(oct.clicks, 22)
  assert.equal(oct.conversions, 2)
  assert.equal(oct.conversionsValueCents, 25000)
  assert.deepEqual(oct.topTerms, [])
  assert.equal(oct.lastDay, '2026-10-10')
  assert.equal(oct.asOf, '2026-10-11T04:00:00.000Z')
  assert.equal(out['2026-09'].totalCents, 5000)
  assert.equal(out['2026-08'], undefined)
  const empty = adsSpend([], ['2026-10'])['2026-10']
  assert.deepEqual(empty, { totalCents: 0, byCampaign: {}, impressions: 0, clicks: 0, conversions: 0, conversionsValueCents: 0, topTerms: [], asOf: empty.asOf, lastDay: null })
})

test('topServices reads both byCampaign shapes; adsSummary: cost per click and per request only when divisible, null while not connected', () => {
  assert.deepEqual(topServices({ byCampaign: { A: 500, B: 900 } }).map((c) => c.cents), [900, 500])
  const ads = { totalCents: 4850, clicks: 97, impressions: 3200, conversions: 4, byCampaign: { A: { cents: 3900, clicks: 80, impressions: 2500, conversions: 4 }, B: { cents: 950, clicks: 17, impressions: 700, conversions: 0 } },
    topTerms: [{ term: 'x', clicks: 9, cents: 300 }], lastDay: '2026-10-10', asOf: '2026-10-11T04:20:00.000Z' }
  const s = adsSummary(ads)
  assert.equal(s.cents, 4850)
  assert.equal(s.cpcCents, 50)
  assert.equal(s.perRequestCents, 1212.5)
  assert.equal(s.ctr, 97 / 3200)
  assert.deepEqual(s.campaigns.map((c) => c.name), ['A', 'B'])
  assert.deepEqual(s.terms, ads.topTerms)
  assert.equal(s.lastDay, '2026-10-10')
  const zero = adsSummary({ totalCents: 0, byCampaign: {} })
  assert.equal(zero.cpcCents, null)
  assert.equal(zero.perRequestCents, null)
  assert.equal(zero.ctr, null)
  assert.deepEqual(zero.terms, [])
  assert.equal(adsSummary(undefined), null)
})

test('spentSummary: Google Ads counted once present, "as of" its last day, top campaigns', () => {
  const doc = {
    google: { totalCents: 100, byService: { 'Cloud Firestore': 100 }, asOf: '2026-10-11T04:20:00.000Z', lastExportAt: '2026-10-10T14:00:00.000Z' },
    ads: { totalCents: 1335, byCampaign: { 'Pearland lights': { cents: 1334, clicks: 22, impressions: 900, conversions: 2 }, Friendswood: { cents: 1, clicks: 0, impressions: 10, conversions: 0 } }, asOf: '2026-10-11T04:20:00.000Z', lastDay: '2026-10-10' },
  }
  const s = spentSummary(doc)
  const a = s.rows.find((r) => r.key === 'ads')
  assert.equal(a.how, 'exact')
  assert.equal(a.cents, 1335)
  assert.equal(a.note, 'as of Oct 10')
  assert.deepEqual(a.parts.map((p) => p.name), ['Pearland lights', 'Friendswood'])
  assert.equal(s.totalCents, 1435)
  assert.equal(s.partial, false)
  assert.deepEqual(s.missing, [])
  const none = spentSummary({ ads: { totalCents: 0, byCampaign: {}, asOf: '2026-10-11T04:20:00.000Z', lastDay: null } }).rows.find((r) => r.key === 'ads')
  assert.equal(none.note, 'no ad spend yet · as of Oct 10')
  const pending = spentSummary({}).rows.find((r) => r.key === 'ads')
  assert.equal(pending.how, 'pending')
  assert.equal(pending.cents, null)
  assert.equal(pending.note, 'not connected yet · BigQuery → Data transfers → Google Ads')
})

test('isMissingTable: BigQuery "table not found" errors, nothing else', () => {
  assert.ok(isMissingTable(new Error('Not found: Table clc-leads-site:billing.ads_CampaignBasicStats_123 was not found in location US')))
  assert.ok(isMissingTable({ message: 'clc-leads-site.billing.ads_CampaignBasicStats_* matched no tables' }))
  assert.ok(!isMissingTable(new Error('Access Denied: BigQuery BigQuery: Permission denied')))
})
