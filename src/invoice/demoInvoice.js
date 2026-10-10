// Sample invoice for previewing /invoice/?demo in development. Not a real customer.
// ?demo (due today), ?demo=overdue, ?demo=paid, ?demo=draft, ?demo=void
import { addDays } from '../lib/invoices'
import { todayISO } from '../lib/customers'

const base = {
  status: 'open', number: 'CLC-2026-0007', customerId: 'pat-sample', season: '2026', kind: 'install', terms: 'receipt',
  customer: { name: 'Pat Sample', email: 'pat@example.com', phone: '555-0101', address: '123 Example St, Pearland, TX 77581' },
  items: [
    { id: 'l1', description: 'Re-install of your Christmas lights, 2026 season', cents: 45000 },
    { id: 'l2', description: 'Early install discount (10%)', cents: -4500 },
    { id: 'l3', description: 'Add-on: Arch over the driveway (new this season)', cents: 30000 },
  ],
  note: 'Thank you for being a customer since 2021!',
}

export function demoInvoice(kind) {
  const today = todayISO()
  const sent = (day) => ({ sentAt: `${day}T15:00:00Z`, dueDate: day })
  if (kind === 'overdue') return { ...base, ...sent(addDays(today, -15)) }
  if (kind === 'paid') return { ...base, ...sent(addDays(today, -2)), status: 'paid', payment: { status: 'paid', cents: 70500, source: 'venmo', env: 'sandbox', paidAt: `${addDays(today, -1)}T18:00:00Z` } }
  if (kind === 'draft') return { ...base, status: 'draft', number: '', dueDate: '' }
  if (kind === 'void') return { ...base, ...sent(addDays(today, -5)), status: 'void' }
  return { ...base, ...sent(today) }
}
