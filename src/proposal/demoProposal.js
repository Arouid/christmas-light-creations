// Sample proposals for previewing /proposal/?demo in development. Not a real customer.
import { fillTerms, itemsFromDesign, newItem, newProposal, termVars } from '../proposals/model.js'
import { defaultTerms } from '../proposals/terms.js'

const customer = { name: 'Pat Sample', email: 'pat@example.com', phone: '555-0101', address: '123 Example St, Pearland, TX 77581' }
const BIZ = { name: 'Christmas Light Creations', phone: '281-819-0163' }

export const DEMO_PROPOSAL = {
  ...newProposal({
    customer,
    items: itemsFromDesign({ feet: 132, pricePerFoot: 4.5 }),
    discountPct: 10,
    depositPct: 50,
    season: '2026',
    tax: { ratePct: 8.25 }, // sales tax on the install lines (docs/specs/receipts.md)
  }),
  status: 'sent',
  sentAt: '2026-10-09T15:00:00Z',
  termsText: '1. The work. Christmas Light Creations will install the lighting described above.\n\n2. Price and payment. Sample terms for preview only.',
  terms: 'Sample terms',
}

// /proposal/?demo=payin3: a lease (we keep the lights) paid in three equal
// payments, everything included (owner 2026-10-12; docs/specs/pay-in-3.md).
const payin3 = {
  ...newProposal({
    customer,
    items: [newItem('Roofline C9 lights, installed (12" spacing)', 132, 'ft', 4.5), newItem('Two wrapped oaks', 2, '', 300)],
    discountPct: 10,
    season: '2026',
    tax: { ratePct: 8.25 },
  }),
  kind: 'lease',
  plan: 'payin3',
  status: 'sent',
  sentAt: '2026-10-12T15:00:00Z',
}
const payin3Terms = defaultTerms({ kind: 'lease', plan: 'payin3' })
export const DEMO_PAYIN3 = { ...payin3, terms: payin3Terms, termsTemplate: payin3Terms, termsText: fillTerms(payin3Terms, termVars(payin3, BIZ)) }
