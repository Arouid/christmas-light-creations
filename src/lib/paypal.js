// PayPal for deposits on the customer's proposal page. The client ID is public
// by design (it identifies the PayPal app; the secret stays in Firebase).
// env must match functions/.env PAYPAL_ENV. Empty client ID = no Pay button.
export const PAYPAL = {
  env: 'sandbox', // 'sandbox' while testing with fake money, then 'live'
  clientId: '',
}

let sdk
export function loadPayPal() {
  sdk ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://www.paypal.com/sdk/js?${new URLSearchParams({ 'client-id': PAYPAL.clientId, currency: 'USD', intent: 'capture', components: 'buttons', 'enable-funding': 'venmo' })}`
    s.onload = () => resolve(window.paypal)
    s.onerror = () => { sdk = undefined; reject(new Error('PayPal didn’t load')) }
    document.head.append(s)
  })
  return sdk
}

// Server functions (functions/index.js) that create and confirm the order.
export async function callDeposit(name, data) {
  const [{ getFunctions, httpsCallable }, { getFirebaseApp }] = await Promise.all([import('firebase/functions'), import('./firebase.js')])
  const fn = httpsCallable(getFunctions(await getFirebaseApp(), 'us-south1'), name)
  return (await fn(data)).data
}
