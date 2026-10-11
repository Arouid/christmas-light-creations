// "Spent this month" on Home (docs/specs/spend.md). The rules live in
// functions/usage.js, shared with the server that writes usage/{YYYY-MM}.
export * from '../../functions/usage.js'
// Home → Google Ads panel (docs/specs/ads-stats.md): the month's ad numbers from usage.ads.
export { adsSummary } from '../../functions/googleBilling.js'
