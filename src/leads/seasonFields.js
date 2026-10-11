// The per-season fields staff edit, shared by the customer detail (Customers
// tab) and the Accounts page: [path, label, options].
import { BLANK_LABEL, FIRST_CONTACT, INSTALL_STATUSES, INVOICE_STATUSES, PAID, PAYMENT_TYPES, TAKEDOWN_STATUSES } from '../lib/customers'

export const SEASON = [
  ['installStatus', 'Install status', { options: INSTALL_STATUSES, blankLabel: BLANK_LABEL.installStatus }],
  ['firstContact', 'Wants lights?', { options: FIRST_CONTACT }],
  ['timeframe', 'Timeframe'], ['weekOf', 'Week of'], ['day', 'Day'], ['plannedDate', 'Planned date'],
  ['schedulingNotes', 'Scheduling notes', { rows: 3, wide: true }], ['addOn', 'Add-on / modification', { wide: true }],
  ['takedownStatus', 'Takedown status', { options: TAKEDOWN_STATUSES, blankLabel: BLANK_LABEL.takedownStatus }],
  ['takedownResponse', 'Takedown response'],
]

export const BILLING = {
  install: [['rate', 'Rate'], ['discount', 'Discount'], ['discountReason', 'Discount reason'], ['total', 'Total due'],
    ['invoice', 'Invoice', { options: INVOICE_STATUSES }], ['paid', 'Paid', { options: PAID }],
    ['paymentType', 'Paid by', { options: PAYMENT_TYPES }], ['paymentDate', 'Payment date']],
  takedown: [['rate', 'Rate'], ['invoice', 'Invoice', { options: INVOICE_STATUSES }], ['paid', 'Paid', { options: PAID }],
    ['paymentType', 'Paid by', { options: PAYMENT_TYPES }], ['paymentDate', 'Payment date']],
}
