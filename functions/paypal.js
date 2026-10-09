// PayPal Orders API (v2), server side. The secret never leaves Firebase.
// PAYPAL_ENV: 'sandbox' (test money) or 'live'.
const api = (env) => (env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com')

async function accessToken(env, clientId, secret) {
  const res = await fetch(`${api(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`)
  return (await res.json()).access_token
}

async function call(env, clientId, secret, path, body) {
  const token = await accessToken(env, clientId, secret)
  const res = await fetch(`${api(env)}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`PayPal ${path} failed (${res.status}): ${json.message ?? ''}`)
  return json
}

// One deposit order for one proposal (custom_id ties the payment to it).
export const createOrder = (cfg, { token, amount, description }) => call(cfg.env, cfg.clientId, cfg.secret, '/v2/checkout/orders', {
  intent: 'CAPTURE',
  purchase_units: [{ reference_id: token, custom_id: token, description: description.slice(0, 120), amount: { currency_code: 'USD', value: amount } }],
  // No payment_source: the PayPal buttons on the page offer PayPal, Venmo and cards.
  application_context: { brand_name: 'Christmas Light Creations', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
})

export const captureOrder = (cfg, orderId) => call(cfg.env, cfg.clientId, cfg.secret, `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`)
