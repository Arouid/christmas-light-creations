// Sample data shown on /leads/ until Firebase is configured. Not real people.
const daysAgo = (n) => new Date(Date.now() - n * 86400000)

export const demoLeads = [
  {
    id: 'demo-1', firstName: 'Sample', lastName: 'Customer', email: 'sample@example.com', phone: '555-0101',
    address: '123 Example St', city: 'Pearland', zip: '77581', contactMethod: 'Text',
    message: 'Roofline and two oak trees in front, warm white. Two-story house.',
    status: 'new', notes: '', createdAt: daysAgo(0), source: 'Road sign (Broadway 288)', designId: 'demo-design',
  },
  {
    id: 'demo-2', firstName: 'Test', lastName: 'Lead', email: 'test@example.com', phone: '555-0102',
    address: '456 Sample Ln', city: 'Friendswood', zip: '77546', contactMethod: 'Phone',
    message: 'Want the front and the walkway done before Thanksgiving.',
    status: 'called', notes: 'Left voicemail, try again Thursday.', createdAt: daysAgo(2), source: 'Road sign',
  },
  {
    id: 'demo-3', firstName: 'Example', lastName: 'Homeowner', email: 'example@example.com', phone: '',
    address: '789 Placeholder Dr', city: 'Manvel', zip: '77578', contactMethod: 'Email',
    message: 'Returning customer, same as last year please.',
    status: 'booked', notes: 'Install Nov 3, morning.', createdAt: daysAgo(6),
  },
]
