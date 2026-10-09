// Sample proposal for previewing /proposal/?demo in development. Not a real customer.
import { itemsFromDesign, newProposal } from '../proposals/model.js'

export const DEMO_PROPOSAL = {
  ...newProposal({
    customer: { name: 'Pat Sample', email: 'pat@example.com', phone: '555-0101', address: '123 Example St, Pearland, TX 77581' },
    items: itemsFromDesign({ feet: 132, pricePerFoot: 4.5 }),
    discountPct: 10,
    depositPct: 50,
    season: '2026',
  }),
  status: 'sent',
  sentAt: '2026-10-09T15:00:00Z',
  termsText: '1. The work. Christmas Light Creations will install the lighting described above.\n\n2. Price and payment. Sample terms for preview only.',
  terms: 'Sample terms',
}
