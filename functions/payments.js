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
