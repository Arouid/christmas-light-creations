import { test } from 'node:test'
import assert from 'node:assert/strict'
import { depositCents, partCents } from '../functions/proposalMath.js'
import { itemsFromDesign, newItem, newProposal, totals } from '../src/proposals/model.js'

// The server charges what the customer's page shows: same deposit math.
test('server deposit matches the proposal page for several proposals', () => {
  const cases = [
    newProposal({ items: itemsFromDesign({ feet: 141.4, pricePerFoot: 5 }), discountPct: 10, depositPct: 50 }),
    newProposal({ items: [newItem('Arch', 24, 'ft', 4.5), newItem('Mulch beds', 125, 'ft', 3.75), newItem('Takedown', 1, '', 150, 'removal')], depositPct: 33 }),
    newProposal({ items: [newItem('Odd', 3, 'ft', '1.333')], discountPct: 7.5, depositPct: 50 }),
    // Sales tax (2026-10-12): taxed install lines, an untaxed takedown, and a taxed one (lease).
    newProposal({ items: [newItem('Roofline', 100, 'ft', 5), newItem('Takedown', 1, '', 150, 'removal')], discountPct: 10, depositPct: 50, tax: { ratePct: 8.25 } }),
    newProposal({ items: [newItem('Lease', 1, '', 1000), newItem('Takedown', 1, '', 100, 'removal', '', true)], depositPct: 33, tax: { ratePct: 8 } }),
    newProposal({ items: [newItem('Roofline', 100, 'ft', 5), newItem('Takedown', 1, '', 150, 'removal')], discountPct: 10, depositPct: 50, tax: { ratePct: 8.25, mode: 'included' } }),
    // Pay in 3 (2026-10-12): thirds of everything, on a purchase and on a lease.
    { ...newProposal({ items: [newItem('Roofline', 100, 'ft', 5), newItem('Takedown', 1, '', 150, 'removal')], discountPct: 10, tax: { ratePct: 8.25 } }), plan: 'payin3' },
    { ...newProposal({ items: [newItem('Lease', 1, '', 1000.01)], tax: { ratePct: 8.25, mode: 'included' } }), kind: 'lease', plan: 'payin3' },
  ]
  for (const p of cases) {
    const t = totals(p)
    assert.equal(depositCents(p), t.deposit)
    assert.equal(partCents(p, 'deposit'), t.deposit)
    assert.equal(partCents(p, 'balance'), t.dueAtInstall)
    assert.equal(partCents(p, 'takedown'), t.dueAtRemoval)
    assert.equal(partCents(p, 'deposit') + partCents(p, 'balance') + partCents(p, 'takedown'), t.total)
  }
  assert.equal(partCents(cases[0], 'tip'), 0)
})
