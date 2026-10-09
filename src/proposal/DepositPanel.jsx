import { useEffect, useRef, useState } from 'react'
import { PAYPAL, callDeposit, loadPayPal } from '../lib/paypal'

// "Pay deposit" on a signed proposal: PayPal's own buttons (PayPal, Venmo,
// card). Our server creates the order for the exact deposit and confirms it.
export default function DepositPanel({ token, amountLabel, onPaid }) {
  const box = useRef(null)
  const [msg, setMsg] = useState(null)
  const lastError = useRef(null)

  useEffect(() => {
    if (!PAYPAL.clientId) return
    let cancelled = false
    loadPayPal().then((paypal) => {
      if (cancelled || !box.current) return
      paypal.Buttons({
        style: { layout: 'vertical', shape: 'pill', label: 'pay' },
        createOrder: async () => {
          try {
            return (await callDeposit('createDepositOrder', { token })).orderId
          } catch (e) {
            lastError.current = e.message
            throw e
          }
        },
        onApprove: async (data) => {
          setMsg('Confirming your payment…')
          try {
            await callDeposit('captureDepositOrder', { token, orderId: data.orderID })
            setMsg(null)
            onPaid?.()
          } catch (e) {
            setMsg(`${e.message || 'We couldn’t confirm the payment.'} If money left your account, call us and we’ll sort it out.`)
          }
        },
        // Show the reason (our server's message, or PayPal's) so it can be fixed.
        onError: (err) => setMsg(`PayPal had a problem (${lastError.current || err?.message || 'unknown'}). Please try again, or call us.`),
      }).render(box.current)
    }).catch(() => setMsg('PayPal didn’t load. Please refresh, or call us.'))
    return () => { cancelled = true }
  }, [token, onPaid])

  if (!PAYPAL.clientId) return null
  return (
    <section className="space-y-3 rounded-3xl border border-glow-400/40 bg-night-900 p-5 print:hidden">
      <h2 className="font-display text-2xl font-extrabold">Pay your deposit: {amountLabel}</h2>
      <p className="text-sm text-slate-300">This holds your install date. Pay with PayPal, Venmo or a card. {PAYPAL.env === 'sandbox' && <strong className="text-glow-300">TEST MODE: no real money moves.</strong>}</p>
      {msg && <p className="text-sm text-glow-300" role="status">{msg}</p>}
      <div ref={box} className="rounded-2xl bg-white p-3" />
    </section>
  )
}
