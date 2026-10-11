import { test } from 'node:test'
import assert from 'node:assert/strict'
import { claudeIncrement, costOf, monthKey, paypalFeeCents, paypalIncrement, priceFor, spendText, spentSummary } from '../functions/usage.js'

const usage = { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 4000, cache_creation_input_tokens: 2000 }

test('costOf: Opus 5.5 list prices, per token kind', () => {
  // 1000×4 + 500×20 + 4000×0.2 + 2000×5 = 4000 + 10000 + 800 + 10000 = 24800 / 1e6
  assert.equal(costOf(usage, 'claude-opus-5-5'), 0.0248)
  assert.equal(costOf({ input_tokens: 1e6 }, 'claude-haiku-5-5'), 0.1)
  assert.equal(costOf({}, 'claude-opus-5-5'), 0)
})

test('priceFor: unknown or missing model falls back to Opus 5.5 (never $0)', () => {
  assert.equal(priceFor('claude-opus-9'), priceFor('claude-opus-5-5'))
  assert.equal(costOf(usage), costOf(usage, 'claude-opus-5-5'))
  assert.equal(costOf(usage, 'claude-sonnet-5-5'), (1000 * 2 + 500 * 10 + 4000 * 0.2 + 2000 * 2.5) / 1e6)
})

test('claudeIncrement: counts, tokens, cost in thousandths of a cent, model tally', () => {
  const inc = claudeIncrement('draft', usage, 'claude-opus-5-5')
  assert.equal(inc['claude.draft.calls'], 1)
  assert.equal(inc['claude.draft.inputTokens'], 7000)
  assert.equal(inc['claude.draft.outputTokens'], 500)
  assert.equal(inc['claude.draft.microCents'], 2480)
  assert.equal(inc['claude.draft.models.claude-opus-5-5'], 1)
  assert.ok('claude.other.calls' in claudeIncrement('mystery', usage, 'x'))
})

test('monthKey: Central time month', () => {
  assert.equal(monthKey(Date.UTC(2026, 10, 1, 3, 0)), '2026-10') // Oct 31, 10 pm Central
  assert.equal(monthKey(Date.UTC(2026, 10, 1, 6, 0)), '2026-11')
})

test('paypalFeeCents: from the capture breakdown, USD only, null when missing', () => {
  const cap = { seller_receivable_breakdown: { paypal_fee: { currency_code: 'USD', value: '14.80' } } }
  assert.equal(paypalFeeCents(cap), 1480)
  assert.equal(paypalFeeCents({}), null)
  assert.equal(paypalFeeCents({ seller_receivable_breakdown: { paypal_fee: { currency_code: 'EUR', value: '1.00' } } }), null)
  assert.deepEqual(paypalIncrement(cap, 50000), { 'paypal.payments': 1, 'paypal.grossCents': 50000, 'paypal.feeCents': 1480 })
  assert.equal(paypalIncrement({}, 100)['paypal.unknownFees'], 1)
})

test('spentSummary: sums Claude and PayPal fees; Google Cloud and Ads pending until connected; no fixed costs', () => {
  const doc = {
    claude: { draft: { calls: 12, microCents: 360000 }, ask: { calls: 3, microCents: 90000 } },
    paypal: { payments: 2, feeCents: 2960, grossCents: 100000 },
  }
  const s = spentSummary(doc)
  assert.equal(s.totalCents, 450 + 2960)
  const by = Object.fromEntries(s.rows.map((r) => [r.key, r]))
  assert.equal(by.claude.cents, 450)
  assert.equal(by.claude.note, '15 calls · list price per token')
  assert.deepEqual(by.claude.parts.map((p) => p.name), ['Suggest a reply', 'Ask Claude'])
  assert.equal(by.paypal.cents, 2960)
  assert.equal(by.paypal.note, '2 online payments')
  assert.equal(by.google.cents, null)
  assert.equal(by.google.how, 'pending')
  assert.equal(s.partial, true)
  assert.deepEqual(s.missing, ['Google Cloud', 'Google Ads'])
  assert.equal(by.ads.how, 'pending')
  assert.equal(by.fixed, undefined)
  assert.deepEqual(s.rows.map((r) => r.key), ['claude', 'paypal', 'google', 'ads'])
})

test('spentSummary: empty month', () => {
  const s = spentSummary(null)
  assert.equal(s.totalCents, 0)
  assert.equal(s.rows.find((r) => r.key === 'paypal').note, 'no online payments yet')
})

test('spendText: cents under a dollar, dollars otherwise', () => {
  assert.equal(spendText(3.2), '3.2¢')
  assert.equal(spendText(0), '$0.00')
  assert.equal(spendText(123456), '$1,234.56')
  assert.equal(spendText(null), '—')
})

test('spentSummary: the total keeps fractional cents so it matches its lines ("2.1¢", not "2¢")', () => {
  const s = spentSummary({ claude: { ask: { calls: 1, microCents: 2100 } } })
  assert.equal(s.totalCents, 2.1)
  assert.equal(spendText(s.totalCents), '2.1¢')
})
