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
