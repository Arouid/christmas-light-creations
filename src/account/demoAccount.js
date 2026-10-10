// Sample account for previewing /account/?demo in development. Not a real customer.
const customer = { name: 'Pat Sample', address: '123 Example St, Pearland, TX 77581', phone: '555-0101' }
const part = (p, amount, state, paid = 0) => ({ part: p, amount, state, paid, paidAt: null, sandbox: true })

export const DEMO_ACCOUNT = {
  email: 'pat@example.com',
  customer: { name: customer.name, address: customer.address },
  price: { originalRate: '$900.00', since: '2021', addOns: [{ season: '2023', what: 'Arch over the driveway', price: 300 }, { season: '2024', what: 'Front tree wrap', price: 240 }],
    history: [
      { season: '2025', install: { amount: 64800, state: 'paid', by: 'PayPal', date: '11/26/2025' }, takedown: { amount: 15000, state: 'paid', by: 'PayPal', date: '1/12/2026' } },
      { season: '2024', install: { amount: 54000, state: 'paid', by: 'Zelle', date: '11/30/2024' }, takedown: { amount: 0, state: 'free', by: '', date: '' } },
    ] },
  invoices: [
    { token: 'demoInvoiceOpen0000001', number: 'CLC-2026-0012', state: 'open', kind: 'takedown', season: '2025', cents: 15000, dueDate: '2026-10-09', sentDay: '2026-10-09', customer: { name: customer.name, address: customer.address }, paid: null },
    { token: 'demoInvoicePaid0000002', number: 'CLC-2026-0003', state: 'paid', kind: 'addon', season: '2026', cents: 30000, dueDate: '2026-10-02', sentDay: '2026-10-02', customer: { name: customer.name, address: customer.address }, paid: { method: 'Check', date: '2026-10-04', cents: 30000, sandbox: false } },
  ],
  proposals: [
    { token: 'demo-2026', status: 'countersigned', title: 'Christmas lighting proposal', season: '2026', customer, sentAt: '2026-10-09T15:00:00Z', signedAt: '2026-10-09T16:00:00Z',
      parts: [part('deposit', 26730, 'paid', 26730), part('balance', 26730, 'due'), part('takedown', 0, 'free')] },
    { token: 'demo-2025', status: 'countersigned', title: 'Christmas lighting proposal', season: '2025', customer, sentAt: '2025-10-01T15:00:00Z', signedAt: '2025-10-02T15:00:00Z',
      parts: [part('deposit', 25000, 'paid', 25000), part('balance', 25000, 'paid', 25000), part('takedown', 15000, 'paid', 15000)] },
  ],
}
