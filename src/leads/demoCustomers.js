// Made-up customers for previewing the staff app (?demo in development).
export const demoCustomers = [
  {
    id: 'sample-customer', fullName: 'Sample Customer', firstName: 'Sample', lastName: 'Customer',
    phone: '555-0101', email: 'sample@example.com', address: '123 Example St Pearland, TX 77581', city: 'Pearland',
    neighborhood: 'Example Lakes', gateCode: '1234', locationBlock: 'Pearland - East side of 35', installType: 'Early Install',
    lightColor: 'Warm white', takedownNotes: 'Left side windows: 2 zip ties.\nRight side: 3 zip ties.',
    since: '2016', normalPaymentMethod: 'PayPal', priceNotes: 'Added 8 windows in 2023.',
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
    phone: '555-0102', address: '456 Sample Ln League City, TX 77573', city: 'League City',
    locationBlock: 'League City - East side of 45', installType: 'Regular Install',
    seasons: { 2026: { installStatus: '' }, 2025: { installStatus: 'Install Completed' } },
  },
  {
    id: 'example-family', fullName: 'Example Family', firstName: 'Example', lastName: 'Family',
    phone: '555-0103', address: '789 Placeholder Dr Manvel, TX 77578', city: 'Manvel',
    locationBlock: 'Shadow Creek - West side of 288', installType: 'Early Install',
    seasons: { 2026: { installStatus: 'Confirmed - Needs to be Scheduled', firstContact: 'Confirmed', timeframe: 'first week of Nov' } },
  },
]
