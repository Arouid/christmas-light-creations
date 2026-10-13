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
    message: 'Want the front and the walkway done before Thanksgiving. And about 20 gifts wrapped, if you do that.',
    status: 'called', notes: 'Left voicemail, try again Thursday.', createdAt: daysAgo(2), source: 'Road sign', service: 'Both',
  },
  {
    id: 'demo-3', firstName: 'Example', lastName: 'Homeowner', email: 'example@example.com', phone: '',
    address: '789 Placeholder Dr', city: 'Manvel', zip: '77578', contactMethod: 'Email',
    message: 'Returning customer, same as last year please.',
    status: 'booked', notes: 'Install Nov 3, morning.', createdAt: daysAgo(6),
  },
  {
    // Filed by the website (functions/pitch.js, docs/specs/spam-filters.md).
    id: 'demo-4', firstName: 'Rick', lastName: 'Example', email: 'rick@example.com', phone: '555-0104',
    address: '15810 Office Park Pl', city: 'Houston', zip: '77084', contactMethod: 'Phone',
    message: 'I work in Webster and help many local companies. I was hoping I could come by and offer a complimentary cleaning bid?\n\nRick Example\nVP, General Manager\n\nRespond with stop to optout',
    status: 'spam', notes: '', createdAt: daysAgo(1), source: 'Google search', spamReason: 'Looks like a sales pitch: an opt-out line, sells a service to businesses, offers a free bid', updatedBy: 'website',
  },
]
