// Payment checks for createDepositOrder / captureDepositOrder, pure so tests
// can run them without Firebase or PayPal. Each returns null when fine, or
// [HttpsError code, message] when the payment must be refused.
import { PARTS, partCents, paymentOf } from './proposalMath.js'

export const PART_LABEL = { deposit: 'Deposit', balance: 'Install balance', takedown: 'Takedown' }
export const customIdFor = (token, part) => (part === 'deposit' ? token : `${token}:${part}`)

// The deposit is payable once signed; the balance and takedown only after
// staff ask for them (requests.<part> set in the staff app).
export function payableProblem(p, part) {
  if (!PARTS.includes(part)) return ['invalid-argument', 'Unknown payment']
  if (!p) return ['not-found', 'Proposal not found']
  if (!['signed', 'countersigned'].includes(p.status)) return ['failed-precondition', 'Sign the proposal first']
  if (part !== 'deposit' && p.requests?.[part] !== true) return ['failed-precondition', 'This payment isn’t due yet']
  if (paymentOf(p, part)?.status === 'paid') return ['already-exists', `${PART_LABEL[part]} already paid`]
  if (partCents(p, part) <= 0) return ['failed-precondition', 'Nothing due']
  return null
}

// PayPal's capture answer must be a completed capture, in US dollars, for
// this proposal and part, for the full amount. The currency matters: an order
// made with our public client ID could say "500.00" in a cheaper currency.
export function captureProblem(result, { customId, amount }) {
  const unit = result?.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  const paidCents = Math.round(Number(capture?.amount?.value ?? 0) * 100)
  const ok = result?.status === 'COMPLETED' && capture?.status === 'COMPLETED'
    && unit?.custom_id === customId && capture?.amount?.currency_code === 'USD' && paidCents === amount
  return ok ? null : { paidCents, currency: capture?.amount?.currency_code ?? null }
}

// PayPal order ids are short upper-case letters and digits.
export const validOrderId = (id) => typeof id === 'string' && /^[A-Z0-9]{8,40}$/.test(id)

// Checked BEFORE capturing, so a wrong order is refused without taking the
// money: approved by the payer, one purchase, this proposal and part, US
// dollars, the full amount.
export function orderProblem(order, { customId, amount }) {
  const units = order?.purchase_units ?? []
  const unit = units[0]
  const cents = Math.round(Number(unit?.amount?.value ?? 0) * 100)
  const ok = order?.status === 'APPROVED' && (order?.intent ?? 'CAPTURE') === 'CAPTURE' && units.length === 1
    && unit?.custom_id === customId && unit?.amount?.currency_code === 'USD' && cents === amount
  return ok ? null : { status: order?.status ?? null, customId: unit?.custom_id ?? null, currency: unit?.amount?.currency_code ?? null, cents }
}

// One capture at a time per payment: a lock (proposal paymentLocks.<part>)
// is taken in a transaction before capturing and released after. A lock
// older than LOCK_MS is treated as abandoned.
export const LOCK_MS = 2 * 60 * 1000
export function lockProblem(lock, orderId, now) {
  if (!lock?.orderId || lock.orderId === orderId) return null
  if (now - Number(lock.at ?? 0) > LOCK_MS) return null
  return ['aborted', 'A payment for this is already going through. Please wait a minute and refresh.']
}
