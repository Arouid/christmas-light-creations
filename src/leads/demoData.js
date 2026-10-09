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
      firstAsked: '2019-11-05', lastAsked: '2019-11-05', year: '2019', requests: [{ date: '2019-11-05', message: 'Estimate for Christmas lights on our home.' }] },
  ]),
  messages: byId([
    { id: 'demo-msg-1', customerId: 'sample-customer', phone: '+15550101', kind: 'text', direction: 'out', at: '2025-11-18T17:05:00Z', text: 'Hi! This is Christmas Light Creations. We can install Thursday Nov 20 in the evening. Does that work?' },
    { id: 'demo-msg-2', customerId: 'sample-customer', phone: '+15550101', kind: 'text', direction: 'in', at: '2025-11-18T17:12:00Z', text: 'Thursday works, gate code is the same as last year.' },
    { id: 'demo-msg-3', customerId: 'sample-customer', phone: '+15550101', kind: 'voicemail', direction: 'in', at: '2025-12-12T01:40:00Z', text: 'Hey, the left side of the garage went out tonight.', duration: '0:21' },
  ]),
  views: byId([
    { id: 'demo-view-1', name: 'Needs scheduling', order: 1, mode: 'install', statuses: ['Confirmed - Needs to be Scheduled'],
      columns: ['name', 'area', 'phone', 'timeframe', 'status'] },
  ]),
  gateCodes: byId([
    { id: 'example-lakes', neighborhood: 'Example Lakes', code: '#2468' },
    { id: 'sample-meadow', neighborhood: 'Sample Meadow', code: '1875#', notes: 'Code, then hit green button' },
  ]),
}
