// What the app spends on outside services, month to date (docs/specs/spend.md).
// Pure: the server adds to usage/{YYYY-MM} after each Claude call and each
// PayPal capture; Home reads that one document (via src/lib/spend.js) and
// shows it. Only costs that go up with use (owner, 2026-10-11): no fixed bills. No imports from the rest of
// functions/ except googleBilling.js (also pure). Tested in tests/usage.test.mjs.
import { topServices } from './googleBilling.js'

// Anthropic list prices, dollars per million tokens (claude-api skill, cached
// 2026-10-06). Cache writes are 1.25× input, cache reads 0.1× (0.05× on 5.x).
export const PRICES = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-opus-5': { input: 5, output: 25, cacheRead: 0.25, cacheWrite: 6.25 },
  'claude-opus-4-8': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-fable-5-1': { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
}
export const DEFAULT_PRICE = PRICES['claude-opus-5-5']

// Price table for a model id; unknown ids (a new release) fall back to the
// Opus 5.5 price so the box never shows $0 for a real call.
export const priceFor = (model) => PRICES[String(model ?? '').trim()] ?? DEFAULT_PRICE

// Dollars for one call, from the API's usage object.
export function costOf(usage = {}, model) {
  const p = priceFor(model)
  const n = (k) => Number(usage?.[k]) || 0
  return (n('input_tokens') * p.input + n('output_tokens') * p.output
    + n('cache_read_input_tokens') * p.cacheRead + n('cache_creation_input_tokens') * p.cacheWrite) / 1e6
}

// "2026-10" for a moment, in Central time (the business's month).
export function monthKey(now = Date.now()) {
  return new Date(now).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }).slice(0, 7)
}

// Claude services the server records: callable → key in the usage doc.
export const CLAUDE_SERVICES = { draft: 'Suggest a reply', ask: 'Ask Claude', plan: 'Plan with Claude' }

// Field increments for one Claude call, keyed by Firestore field path.
// Money is kept in thousandths of a cent (microdollars would overflow nothing,
// but integers add exactly where floats drift): `claude.<service>.microCents`.
export function claudeIncrement(service, usage = {}, model) {
  const key = CLAUDE_SERVICES[service] ? service : 'other'
  const n = (k) => Number(usage?.[k]) || 0
  const micro = Math.round(costOf(usage, model) * 100 * 1000)
  return {
    [`claude.${key}.calls`]: 1,
    [`claude.${key}.inputTokens`]: n('input_tokens') + n('cache_read_input_tokens') + n('cache_creation_input_tokens'),
    [`claude.${key}.outputTokens`]: n('output_tokens'),
    [`claude.${key}.microCents`]: micro,
    [`claude.${key}.models.${String(model ?? 'unknown').replace(/[.~/*[\]]/g, '_')}`]: 1,
  }
}

// PayPal's fee for a capture, in cents, from the capture object
// (purchase_units[0].payments.captures[0].seller_receivable_breakdown.paypal_fee).
// null when PayPal didn't say (sandbox sometimes omits it).
export function paypalFeeCents(capture) {
  const fee = capture?.seller_receivable_breakdown?.paypal_fee
  if (!fee || fee.currency_code !== 'USD') return null
  const v = Number(fee.value)
  return Number.isFinite(v) ? Math.round(v * 100) : null
}

// Field increments for one PayPal capture.
export function paypalIncrement(capture, grossCents) {
  const fee = paypalFeeCents(capture)
  return {
    'paypal.payments': 1,
    'paypal.grossCents': Number(grossCents) || 0,
    'paypal.feeCents': fee ?? 0,
    ...(fee == null ? { 'paypal.unknownFees': 1 } : {}),
  }
}

// The box on Home. usageDoc: usage/{month} (or null).
// Every amount in cents. `how`: exact | pending; `partial`
// is true while Google Cloud or Google Ads has no number yet (then it's not
// in the total) and `missing` names them.
export function spentSummary(usageDoc) {
  const u = usageDoc ?? {}
  const claude = Object.entries(u.claude ?? {}).map(([key, s]) => ({
    key, name: CLAUDE_SERVICES[key] ?? 'Other', calls: Number(s?.calls) || 0,
    cents: (Number(s?.microCents) || 0) / 1000,
  }))
  const claudeCents = claude.reduce((a, s) => a + s.cents, 0)
  const claudeCalls = claude.reduce((a, s) => a + s.calls, 0)
  const pp = u.paypal ?? {}
  const feeCents = Number(pp.feeCents) || 0
  const payments = Number(pp.payments) || 0
  const unknown = Number(pp.unknownFees) || 0
  // Google Cloud: from the billing export (functions/googleBilling.js), about a
  // day behind; until the first run the line says so and stays out of the total.
  const g = u.google
  const googleCents = g ? Number(g.totalCents) || 0 : null
  const asOf = g ? asOfText(g.lastExportAt ?? g.asOf) : ''
  const top = topServices(g)
  // Google Ads: from the BigQuery Data Transfer for Google Ads (same dataset,
  // same function); `pending` until the owner connects it.
  const a = u.ads
  const adsCents = a ? Number(a.totalCents) || 0 : null
  const adsAsOf = a ? (a.lastDay ? asOfText(`${a.lastDay}T12:00:00-06:00`) : asOfText(a.asOf)) : ''
  const topAds = topServices(a)
  const rows = [
    { key: 'claude', name: 'Claude', cents: claudeCents, how: 'exact',
      note: claudeCalls ? `${claudeCalls} call${claudeCalls === 1 ? '' : 's'} · list price per token` : 'no calls yet · list price per token',
      parts: claude.filter((s) => s.calls).sort((a, b) => b.cents - a.cents) },
    { key: 'paypal', name: 'PayPal fees', cents: feeCents, how: 'exact',
      note: payments ? `${payments} online payment${payments === 1 ? '' : 's'}${unknown ? ` · ${unknown} fee${unknown === 1 ? '' : 's'} unknown` : ''}` : 'no online payments yet' },
    { key: 'google', name: 'Google Cloud', cents: googleCents, how: g ? 'exact' : 'pending',
      note: g ? [top.length ? '' : 'nothing billed yet', asOf ? `as of ${asOf}` : 'from the billing export'].filter(Boolean).join(' · ') : 'export on, first numbers within a day',
      parts: top },
    { key: 'ads', name: 'Google Ads', cents: adsCents, how: a ? 'exact' : 'pending',
      note: a ? [topAds.length ? '' : 'no ad spend yet', adsAsOf ? `as of ${adsAsOf}` : 'from the Ads transfer'].filter(Boolean).join(' · ') : 'not connected yet · BigQuery → Data transfers → Google Ads',
      parts: topAds },
  ]
  const missing = [googleCents == null && 'Google Cloud', adsCents == null && 'Google Ads'].filter(Boolean)
  return { totalCents: claudeCents + feeCents + (googleCents ?? 0) + (adsCents ?? 0), rows, partial: missing.length > 0, missing }
}

// "Oct 10" (Central) for the export's last timestamp; '' when unknown.
export function asOfText(iso) {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })
}

// "$12.34"; under a dollar shows cents ("3.2¢") so a day's Claude use isn't "$0.03".
export function spendText(cents) {
  if (cents == null) return '—'
  if (cents > 0 && cents < 100) return `${Number(cents.toFixed(1))}¢`
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
