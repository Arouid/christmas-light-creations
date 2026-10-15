// What the customer's account page (/account/) shows, built in one place for
// the customer (myAccount) and for staff seeing it as them (accountPreview,
// docs/specs/account-preview.md), so the two can't drift. Pure: index.js
// (accountFor) reads the records, asking Firestore for exactly the fields
// below, and passes them in. A field a summary starts reading goes in these
// lists too: tests/accountPreview.test.mjs builds a payload from records cut
// down to them.
import { accountSummary, byNewest, customerEmailKeys, customerForAccount, customerPhoneKeys, shownInAccount } from './account.js'
import { centralDay, invoiceSummary, shownInvoice } from './invoices.js'
import { SERVICE_DAYS, scheduleFor } from './service.js'
import { DETAIL_FIELDS, NOTICES_FIELD, detailsSummary } from './propertyDetails.js'
import { customerView } from './chat.js'
import { accountReview } from './reviewAsk.js'

// Proposal fields accountSummary reads (amounts with sales tax, Pay in 3).
export const PROPOSAL_FIELDS = ['status', 'title', 'season', 'kind', 'plan', 'payDay', 'customer', 'items', 'discountPct', 'depositPct', 'tax', 'deposit', 'payments', 'requests', 'sentAt', 'signedAt']
// Customer fields: name and address, the yearly price, seasons (schedule,
// what they paid, the review card), property details and the email switch,
// and the house photo (housePhoto + photos: read by index.js houseLink for
// the 1-hour link, never sent on; docs/specs/account-house-photo.md), and the
// emails and phones that open the account (shown under their address).
export const CUSTOMER_FIELDS = ['fullName', 'address', 'since', 'originalRate', 'reinstallBase', 'addOns', 'priceShown', 'seasons', ...DETAIL_FIELDS.map(([k]) => k), NOTICES_FIELD, 'housePhoto', 'photos', 'email', 'otherEmails', 'phone', 'otherPhones']

// The season the page talks about: same as src/lib/customers.js seasonYear
// (the server clock is UTC; fine for a July 1 cutover).
export const accountSeason = (now = new Date()) => String(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1)

const newestInvoice = (a, b) => String(b.sentDay).localeCompare(String(a.sentDay)) || b.number.localeCompare(a.number)

// who: { email, phone } ("Signed in as"). proposals, invoices, customers:
// [{ id, data }] (data undefined = gone since the lookup); customers in lookup
// order, the first one is theirs (name, schedule, details, chat). openCall:
// the open service call as openSummary gives it, or null. conversation: the
// chat document of the first customer record, or null.
export function accountPayload({ who, proposals = [], invoices = [], customers = [], openCall = null, conversation = null, now = new Date() }) {
  const today = centralDay(now)
  const season = accountSeason(now)
  const rec = customers.map((c) => c.data).find(Boolean) ?? null
  const onRecord = customers.length > 0
  return {
    email: who?.email ?? '',
    phone: who?.phone ?? '',
    proposals: proposals.filter((p) => shownInAccount(p.data)).map((p) => accountSummary(p.id, p.data, today)).sort(byNewest),
    // Sent or paid; never drafts or voided ones. Newest first.
    invoices: invoices.filter((i) => shownInvoice(i.data)).map((i) => invoiceSummary(i.id, i.data, today)).sort(newestInvoice),
    // The yearly price breakdown, once staff tick "Customer can see this".
    price: customers.map((c) => customerForAccount(c.data, season)).find(Boolean) ?? null,
    // This season's schedule and any open service call (docs/specs/account-service.md).
    schedule: rec ? scheduleFor(rec.seasons, season) : null,
    service: onRecord ? { days: SERVICE_DAYS, open: openCall ?? null } : null,
    // What they may fill in themselves (functions/propertyDetails.js).
    details: rec ? detailsSummary(rec) : null,
    // Chat with us (docs/specs/account-chat.md), staff emails stripped.
    chat: onRecord ? customerView(conversation ?? undefined) : null,
    // The ★ Google review card for past customers (functions/reviewAsk.js).
    review: rec ? accountReview(rec, season) : null,
    // Linked to the account (owner 2026-10-14: show the linked phone and email):
    // exactly the emails and phones (E.164) any of which signs them in here.
    customer: rec ? { name: rec.fullName ?? '', address: rec.address ?? '', emails: customerEmailKeys(rec), phones: customerPhoneKeys(rec) } : null,
  }
}
