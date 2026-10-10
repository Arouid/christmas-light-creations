import { useEffect, useRef, useState } from 'react'
import { PAYPAL, callDeposit, loadPayPal } from '../lib/paypal'

// Server functions for each kind of payment (functions/index.js).
const CALLS = {
  proposal: ['createDepositOrder', 'captureDepositOrder'],
  invoice: ['createInvoiceOrder', 'captureInvoiceOrder'],
}

// One payment on a signed proposal (deposit, install balance or takedown) or
// an invoice (of="invoice"): PayPal's own buttons (PayPal, Venmo, card). Our
// server creates the order for the exact amount and confirms it.
export default function DepositPanel({ token, part = 'deposit', of = 'proposal', title, note, amountLabel, onPaid }) {
  const box = useRef(null)
  const [msg, setMsg] = useState(null)
  const lastError = useRef(null)
  const paid = useRef(onPaid)
  useEffect(() => { paid.current = onPaid }, [onPaid])

  useEffect(() => {
    if (!PAYPAL.clientId) return
    let cancelled = false
    loadPayPal().then((paypal) => {
      if (cancelled || !box.current) return
      paypal.Buttons({
        style: { layout: 'vertical', shape: 'pill', label: 'pay' },
        createOrder: async () => {
          try {
            return (await callDeposit(CALLS[of][0], of === 'invoice' ? { token } : { token, part })).orderId
          } catch (e) {
            lastError.current = e.message
            throw e
          }
        },
        onApprove: async (data) => {
          setMsg('Confirming your payment…')
          try {
            await callDeposit(CALLS[of][1], of === 'invoice' ? { token, orderId: data.orderID } : { token, part, orderId: data.orderID })
            setMsg(null)
            paid.current?.()
          } catch (e) {
            setMsg(`${e.message || 'We couldn’t confirm the payment.'} If money left your account, call us and we’ll sort it out.`)
          }
        },
        // Show the reason (our server's message, or PayPal's) so it can be fixed.
        onError: (err) => setMsg(`PayPal had a problem (${lastError.current || err?.message || 'unknown'}). Please try again, or call us.`),
      }).render(box.current)
    }).catch(() => setMsg('PayPal didn’t load. Please refresh, or call us.'))
    return () => { cancelled = true }
  }, [token, part, of])

  if (!PAYPAL.clientId) return null
  return (
    <section className="space-y-3 rounded-3xl border border-glow-400/40 bg-night-900 p-5 print:hidden">
      <h2 className="font-display text-2xl font-extrabold">{title ?? 'Pay your deposit'}: {amountLabel}</h2>
      <p className="text-sm text-slate-300">{note ?? 'This holds your install date.'} Pay with PayPal, Venmo or a card. {PAYPAL.env === 'sandbox' && <strong className="text-glow-300">TEST MODE: no real money moves.</strong>}</p>
      {msg && <p className="text-sm text-glow-300" role="status">{msg}</p>}
      <div ref={box} className="rounded-2xl bg-white p-3" />
    </section>
  )
}
