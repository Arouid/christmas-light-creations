// Made-up records for previewing the staff app (?demo in development).
const customers = [
  {
    id: 'sample-customer', fullName: 'Sample Customer', firstName: 'Sample', lastName: 'Customer',
    phone: '555-0101', email: 'sample@example.com', address: '123 Example St Pearland, TX 77581', city: 'Pearland',
    neighborhood: 'Example Lakes', gateCode: '1234', locationBlock: 'Pearland - East side of 35', installType: 'Early Install',
    lightColor: 'Warm white', takedownNotes: 'Left side windows: 2 zip ties.\nRight side: 3 zip ties.',
    since: '2016', normalPaymentMethod: 'PayPal', priceNotes: 'Added 8 windows in 2023.', originalRate: '$680.00',
    installHistory: 'Original install 2016 $680\n2023: 8 windows $240; 2025 small arch by the walkway',
    seasons: {
      2026: { installStatus: 'Install Scheduled', firstContact: 'Confirmed', weekOf: 'Oct 11-17', day: 'Thursday', plannedDate: 'Oct 15',
        install: { rate: '$460.00', discount: '10%', discountReason: 'Early Install', total: '$414.00' }, takedown: { rate: '150' } },
      2025: { installStatus: 'Install Completed', plannedDate: 'Nov 20',
        install: { invoice: 'PP Invoice Sent', paid: 'Yes', paymentType: 'PayPal', paymentDate: '11/26/2025' },
        takedown: { invoice: 'PayPal Invoice Sent', paid: 'Yes', paymentType: 'PayPal', paymentDate: '1/12/2026' } },
    },
  },
  {
    id: 'test-homeowner', fullName: 'Test Homeowner', firstName: 'Test', lastName: 'Homeowner',
    phone: '555-0102', email: 'test.homeowner@example.com', address: '456 Sample Ln League City, TX 77573', city: 'League City',
    locationBlock: 'League City - East side of 45', installType: 'Regular Install',
    seasons: { 2026: { installStatus: '' }, 2025: { installStatus: 'Install Completed' } },
  },
  {
    id: 'example-family', fullName: 'Example Family', firstName: 'Example', lastName: 'Family',
    phone: '555-0103', email: 'example.family@example.com', address: '789 Placeholder Dr Manvel, TX 77578', city: 'Manvel',
    locationBlock: 'Shadow Creek - West side of 288', installType: 'Early Install',
    seasons: { 2026: { installStatus: 'Confirmed - Needs to be Scheduled', firstContact: 'Confirmed', timeframe: 'first week of Nov' } },
  },
]

const demoGeo = { 'sample-customer': [29.5605, -95.2650], 'test-homeowner': [29.5075, -95.0949], 'example-family': [29.5450, -95.3770] }
customers.forEach((c) => { const g = demoGeo[c.id]; if (g) c.geo = { lat: g[0], lng: g[1], exact: true, address: c.address } })

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()
const byId = (list) => Object.fromEntries(list.map(({ id, ...d }) => [id, d]))
const minAgo = (m) => Date.now() - m * 60000
const localDay = () => new Date().toLocaleDateString('en-CA')

export const demoData = {
  customers: byId(customers),
  serviceCalls: byId([
    { id: 'demo-call-1', customerId: 'sample-customer', customerName: 'Sample Customer', issue: 'Burned-out bulbs',
      details: 'Left side of garage dark', received: '2026-12-02', status: 'Open' },
    { id: 'demo-call-2', customerId: 'example-family', customerName: 'Example Family', issue: 'Tripped GFCI',
      received: '2026-11-28', status: 'Done', completed: '2026-11-28' },
  ]),
  settings: { app: { homeBase: { address: 'Sample shop, Pearland TX', lat: 29.5636, lng: -95.2860 } } },
  signs: byId([
    { id: 'demo-sign-1', corner: 'Broadway & 288', code: 'broadway-288', lat: 29.5695, lng: -95.3864, placedAt: hoursAgo(30), cost: 10, updatedBy: 'demo@example.com' },
    { id: 'demo-sign-2', corner: 'Dixie Farm & 35', code: 'dixie-farm-35', lat: 29.5830, lng: -95.2520, placedAt: hoursAgo(60), cost: 10, removedAt: hoursAgo(40), updatedBy: 'demo@example.com' },
    { id: 'demo-sign-3', corner: 'Broadway & 288', code: 'broadway-288', lat: 29.5696, lng: -95.3862, placedAt: hoursAgo(200), cost: 10, updatedBy: 'demo@example.com' },
  ]),
  pastRequests: byId([
    { id: 'old-pat-sample-example-com', fullName: 'Pat Sample', firstName: 'Pat', lastName: 'Sample', email: 'pat.sample@example.com', phone: '555-010-0199',
      firstAsked: '2022-11-14', lastAsked: '2022-11-14', year: '2022', contactBy: 'Email, Text', missed: true,
      requests: [{ date: '2022-11-14', message: 'Would like warm white lights on the front roofline and two trees. One story home in Pearland.' }] },
    { id: 'old-jordan-example-example-com', fullName: 'Jordan Example', firstName: 'Jordan', lastName: 'Example', email: 'jordan@example.com', phone: '555-010-0142',
      firstAsked: '2020-10-08', lastAsked: '2021-11-02', year: '2021', contactBy: 'Phone',
      requests: [{ date: '2020-10-08', message: 'Quote for a two story house please.' }, { date: '2021-11-02', message: 'Asking again for this year.' }] },
    { id: 'old-sample-example-com', fullName: 'Sample Customer', firstName: 'Sample', lastName: 'Customer', email: 'sample@example.com', phone: '555-010-0101',
      firstAsked: '2019-11-05', lastAsked: '2019-11-05', year: '2019', requests: [{ date: '2019-11-05', message: 'Estimate for Christmas lights on our home.' }],
      payments: [{ date: '2023-11-30', via: 'PayPal', kind: 'payment', amount: 414, invoice: '0042', items: 'Christmas light install' }, { date: '2024-01-12', via: 'Square', kind: 'payment', amount: 150, invoice: '', items: '' }] },
  ]),
  messages: byId([
    { id: 'demo-msg-1', customerId: 'sample-customer', phone: '+15550101', kind: 'text', direction: 'out', at: '2025-11-18T17:05:00Z', text: 'Hi! This is Christmas Light Creations. We can install Thursday Nov 20 in the evening. Does that work?' },
    { id: 'demo-msg-2', customerId: 'sample-customer', phone: '+15550101', kind: 'text', direction: 'in', at: '2025-11-18T17:12:00Z', text: 'Thursday works, gate code is the same as last year.' },
    { id: 'demo-msg-3', customerId: 'sample-customer', phone: '+15550101', kind: 'voicemail', direction: 'in', at: '2025-12-12T01:40:00Z', text: 'Hey, the left side of the garage went out tonight.', duration: '0:21' },
    { id: 'em-demo-1-sample-customer', customerId: 'sample-customer', email: 'sample@example.com', kind: 'email', direction: 'in', source: 'gmail', at: hoursAgo(5), syncedAt: hoursAgo(4.95),
      subject: 'Re: Your 2026 install', text: 'Thursday evening is perfect, thanks! Same gate code as last year.\n\nAlso, could you add the small tree by the mailbox this year? We bought a new one and it is about six feet tall, right next to the driveway. Let me know what that would cost and whether you can do it the same day as the install. Thanks again for everything last season.' },
    { id: 'em-demo-2-sample-customer', customerId: 'sample-customer', email: 'sample@example.com', kind: 'email', direction: 'out', source: 'gmail', at: hoursAgo(3), syncedAt: hoursAgo(2.95),
      subject: 'Re: Your 2026 install', text: 'Hi Sample, yes we can add the tree the same day. It adds $45 this year.' },
    { id: 'gv-demo-lead', leadId: 'demo-2', phone: '+15550102', kind: 'text', direction: 'in', source: 'voice-email', at: hoursAgo(20), syncedAt: hoursAgo(19.95), text: 'Hi, I sent the form on your website. Do you do roofline only?' },
    { id: 'gv-demo-unmatched-1', unmatched: true, phone: '+15550100166', kind: 'text', direction: 'in', source: 'voice-email', at: hoursAgo(2), syncedAt: hoursAgo(1.95), text: 'Hi! Saw your sign on Broadway. How much for a one story house?' },
    { id: 'em-demo-new-unmatched', unmatched: true, email: 'pat.new@example.org', kind: 'email', direction: 'in', source: 'gmail', at: hoursAgo(1.2), syncedAt: hoursAgo(1.15),
      subject: 'Christmas lights quote', text: 'Hi, a neighbor recommended you. Could you give us a quote for our roofline? Two-story house in Shadow Creek Ranch.' },
    { id: 'gv-demo-missed', customerId: 'sample-customer', phone: '+15550101', kind: 'missed', direction: 'in', source: 'voice-email', at: hoursAgo(0.7), syncedAt: hoursAgo(0.65) },
    { id: 'gv-demo-unmatched-2', unmatched: true, phone: '+15550100177', kind: 'voicemail', direction: 'in', source: 'voice-email', at: hoursAgo(9), syncedAt: hoursAgo(8.95), text: 'Hi, this is about getting lights put up on our house in Silverlake. Please call me back.' },
  ]),
  // Home: recent staff activity and a route for today (docs/specs/dashboard.md).
  activity: byId([
    { id: 'demo-act-1', at: minAgo(4), by: 'katie@example.com', action: 'email', target: { type: 'customer', id: 'sample-customer', name: 'Sample Customer' }, text: 'Re: Your 2026 install' },
    { id: 'demo-act-2', at: minAgo(12), by: 'katie@example.com', action: 'handling', target: { type: 'message', id: 'gv-demo-unmatched-1', name: '(555) 010-0166' }, text: 'Text' },
    { id: 'demo-act-3', at: minAgo(35), by: 'website', action: 'proposal-signed', target: { type: 'customer', id: 'example-family', name: 'Example Family' }, text: '2026 lights' },
    { id: 'demo-act-4', at: minAgo(80), by: 'katie@example.com', action: 'invoice-sent', target: { type: 'customer', id: 'test-homeowner', name: 'Test Homeowner' }, text: '$150.00' },
    { id: 'demo-act-5', at: minAgo(140), by: 'demo@example.com', action: 'lead-status', target: { type: 'lead', id: 'demo-2', name: 'Test Lead' }, text: 'Called' },
    { id: 'demo-act-6', at: minAgo(200), by: 'katie@example.com', action: 'call', target: { type: 'customer', id: 'sample-customer', name: 'Sample Customer' }, text: '' },
    { id: 'demo-act-7', at: minAgo(26 * 60), by: 'demo@example.com', action: 'service-done', target: { type: 'customer', id: 'sample-customer', name: 'Sample Customer' }, text: 'Lights out on the left side' },
  ]),
  routes: byId([
    { id: 'demo-route-today', day: localDay(), name: 'Crew 1', status: 'sent', startTime: '08:00', stops: [
      { id: 's1', customerId: 'sample-customer', name: 'Sample Customer', address: '123 Example St Pearland, TX 77581', kind: 'install', minutes: 135, status: 'done' },
      { id: 's2', customerId: 'example-family', name: 'Example Family', address: '789 Placeholder Dr Manvel, TX 77578', kind: 'install', minutes: 135, status: 'skipped', skipReason: 'Gate locked' },
      { id: 's3', customerId: 'test-homeowner', name: 'Test Homeowner', address: '456 Sample Ln League City, TX 77573', kind: 'service', minutes: 20, status: 'todo' },
    ] },
  ]),
  incidents: byId([
    { id: 'demo-incident-1', kind: 'lead-alert', open: true, message: 'New request from Pat Sample (555-0101) is in the staff app, but the alert email failed: Invalid login (sample).' },
  ]),
  views: byId([
    { id: 'demo-view-1', name: 'Needs scheduling', order: 1, mode: 'install', statuses: ['Confirmed - Needs to be Scheduled'],
      columns: ['name', 'area', 'phone', 'timeframe', 'status'] },
  ]),
  gateCodes: byId([
    { id: 'example-lakes', neighborhood: 'Example Lakes', code: '#2468' },
    { id: 'sample-meadow', neighborhood: 'Sample Meadow', code: '1875#', notes: 'Code, then hit green button' },
  ]),
  // Invoices: one overdue (reminder sent), one paid by check, one draft.
  invoices: byId([
    { id: 'demoInvoiceOverdue0001', status: 'open', number: 'CLC-2026-0001', customerId: 'test-homeowner', season: '2025', kind: 'takedown', terms: 'receipt',
      customer: { name: 'Test Homeowner', email: 'test.homeowner@example.com', phone: '555-0102', address: '456 Sample Ln League City, TX 77573' },
      items: [{ id: 'l1', description: 'Takedown: taking down, labeling and boxing your lights (2025 season)', cents: 15000 }],
      sentAt: hoursAgo(24 * 9), dueDate: new Date(Date.now() - 9 * 86400000).toLocaleDateString('en-CA'), savedAt: hoursAgo(24 * 9),
      sent: { invoice: { at: Date.now() - 9 * 86400000, to: 'test.homeowner@example.com' }, reminder_7: { at: Date.now() - 2 * 86400000, to: 'test.homeowner@example.com' } },
      viewedAt: hoursAgo(24 * 8) },
    { id: 'demoInvoicePaid000002', status: 'paid', number: 'CLC-2026-0002', customerId: 'sample-customer', season: '2026', kind: 'addon', terms: 'receipt',
      customer: { name: 'Sample Customer', email: 'sample@example.com', phone: '555-0101', address: '123 Example St Pearland, TX 77581' },
      items: [{ id: 'l1', description: 'Add-on: Arch over the walkway', cents: 30000 }],
      sentAt: hoursAgo(24 * 3), dueDate: new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA'), savedAt: hoursAgo(24 * 3),
      offline: { method: 'Check', date: new Date(Date.now() - 86400000).toLocaleDateString('en-CA'), note: '#1043', by: 'demo@example.com', at: Date.now() - 86400000 },
      sent: { invoice: { at: Date.now() - 3 * 86400000, to: 'sample@example.com' } } },
    { id: 'demoInvoiceDraft00003', status: 'draft', customerId: 'example-family', season: '2026', kind: 'install', terms: 'receipt', dueDate: '',
      customer: { name: 'Example Family', email: 'example.family@example.com', phone: '555-0103', address: '789 Placeholder Dr Manvel, TX 77578' },
      items: [{ id: 'l1', description: 'Re-install of your Christmas lights, 2026 season', cents: 52000 }], note: '', savedAt: hoursAgo(1) },
  ]),
}
