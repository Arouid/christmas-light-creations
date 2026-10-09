// Server code for the CLC site (Firebase Cloud Functions, region us-south1,
// same as the Firestore database).
//
// - newLeadAlert: emails staff the moment a website estimate request arrives
//   (the old site lost requests when its notification emails broke).
// - createDepositOrder / captureDepositOrder: PayPal deposit for a signed
//   proposal. The amount comes from the stored proposal, never the browser,
//   and only this code can mark a deposit paid.
// - proposalChanged: emails the customer their signed agreement link and
//   tells staff when a proposal is signed or a deposit is paid.
// - sendAccountLink / myAccount: customer accounts at /account/ (email-link
//   sign-in; the account lists proposals sent to that verified email).
//
// Secrets (set with `firebase functions:secrets:set`, never in code):
//   SMTP_PASSWORD  app password for info@ (Google Workspace SMTP)
//   PAYPAL_SECRET  PayPal app secret (sandbox or live, matching PAYPAL_ENV)
// Plain settings in functions/.env: PAYPAL_CLIENT_ID, PAYPAL_ENV.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import nodemailer from 'nodemailer'
import { alertRecipients, leadEmail } from './leadEmail.js'
import { captureOrder, createOrder } from './paypal.js'
import { PARTS, dollars, partCents, paymentOf } from './proposalMath.js'
import { PART_LABEL, captureProblem, customIdFor, payableProblem } from './payments.js'
import { EMAIL_RE, accountSummary, accountUrl, addOnFromProposal, byNewest, customerForAccount, emailsOf, loginRecord, normEmail, providerName, shownInAccount } from './account.js'

initializeApp()
const REGION = 'us-south1'
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD')
const PAYPAL_SECRET = defineSecret('PAYPAL_SECRET')
const PAYPAL_CLIENT_ID = defineString('PAYPAL_CLIENT_ID')
const PAYPAL_ENV = defineString('PAYPAL_ENV', { default: 'sandbox' })
const FROM = 'info@christmas-light-creations.com'
const SITE = 'https://christmas-light-creations.com'

const mailer = () => nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: FROM, pass: SMTP_PASSWORD.value() } })
const staffEmails = async () => alertRecipients((await getFirestore().doc('settings/app').get()).data())

export const newLeadAlert = onDocumentCreated(
  { document: 'leads/{leadId}', secrets: [SMTP_PASSWORD], region: REGION },
  async (event) => {
    const lead = event.data?.data()
    if (!lead) return
    const to = await staffEmails()
    if (!to.length) {
      logger.warn('New lead but no alert emails set (staff app → Settings → New-request alerts)')
      return
    }
    await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, ...leadEmail(lead) })
    await event.data.ref.update({ alertSentAt: new Date() })
    logger.info(`Lead alert sent to ${to.length} staff`)
  },
)

// ---- Payments (deposit, install balance, takedown) --------------------------

// Payable rules (signed, requested, not yet paid, something due) live in payments.js.
async function payableProposal(token, part = 'deposit') {
  if (typeof token !== 'string' || token.length < 16 || token.includes('/')) throw new HttpsError('invalid-argument', 'Bad link')
  if (!PARTS.includes(part)) throw new HttpsError('invalid-argument', 'Unknown payment')
  const ref = getFirestore().doc(`proposals/${token}`)
  const p = (await ref.get()).data()
  const problem = payableProblem(p, part)
  if (problem) throw new HttpsError(...problem)
  return { ref, p, amount: partCents(p, part) }
}
const paypalCfg = () => ({ env: PAYPAL_ENV.value(), clientId: PAYPAL_CLIENT_ID.value(), secret: PAYPAL_SECRET.value() })

// invoker 'public': customers aren't signed in; each call checks the proposal and amount itself.
// Names kept from when they only took deposits; `part` defaults to 'deposit'.
export const createDepositOrder = onCall({ region: REGION, invoker: 'public', secrets: [PAYPAL_SECRET], cors: [SITE, 'http://localhost:5173'] }, async (req) => {
  const part = req.data?.part ?? 'deposit'
  const { p, amount } = await payableProposal(req.data?.token, part)
  try {
    const order = await createOrder(paypalCfg(), {
      token: req.data.token,
      customId: customIdFor(req.data.token, part),
      amount: dollars(amount),
      description: `${PART_LABEL[part]}: ${p.title ?? 'Christmas lighting'} for ${p.customer?.address ?? ''}`,
    })
    return { orderId: order.id }
  } catch (e) {
    // Unhandled errors reach the page only as "internal"; pass PayPal's reason on.
    logger.error('createDepositOrder', e)
    throw new HttpsError('unavailable', e.message)
  }
})

export const captureDepositOrder = onCall({ region: REGION, invoker: 'public', secrets: [PAYPAL_SECRET], cors: [SITE, 'http://localhost:5173'] }, async (req) => {
  const token = req.data?.token
  const part = req.data?.part ?? 'deposit'
  const { ref, amount } = await payableProposal(token, part)
  const result = await captureOrder(paypalCfg(), String(req.data?.orderId ?? ''))
  const capture = result.purchase_units?.[0]?.payments?.captures?.[0]
  // Only accept a completed USD capture for this proposal, this part and the full amount.
  const mismatch = captureProblem(result, { customId: customIdFor(token, part), amount })
  if (mismatch) {
    logger.error('Payment capture mismatch', { token, part, status: result.status, ...mismatch, amount })
    throw new HttpsError('failed-precondition', 'Payment could not be confirmed. Please call us.')
  }
  const paidCents = amount
  const record = {
    status: 'paid', amount: paidCents, orderId: result.id, captureId: capture.id,
    payerEmail: result.payer?.email_address ?? null, env: PAYPAL_ENV.value(), paidAt: FieldValue.serverTimestamp(),
  }
  await ref.update(part === 'deposit' ? { deposit: record } : { [`payments.${part}`]: record })
  return { paid: true }
})

// Adds the signed add-on to customers/{id}.addOns once (by proposal token).
async function recordAddOn(customerId, token, p) {
  const db = getFirestore()
  const ref = db.doc(`customers/${customerId}`)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const list = snap.get('addOns') ?? []
    if (list.some((a) => a.token === token)) return
    tx.update(ref, { addOns: [...list, addOnFromProposal(token, p)], updatedAt: FieldValue.serverTimestamp(), updatedBy: 'website (signed add-on proposal)' })
  })
}

// ---- Emails when a proposal is signed or paid -------------------------------

export const proposalChanged = onDocumentUpdated({ document: 'proposals/{token}', secrets: [SMTP_PASSWORD], region: REGION }, async (event) => {
  const before = event.data.before.data()
  const after = event.data.after.data()
  const token = event.params.token
  const link = `${SITE}/proposal/?t=${token}`
  const name = after.customer?.name ?? 'Customer'
  const mail = mailer()
  const staff = await staffEmails()

  if (before.status !== 'signed' && after.status === 'signed') {
    const first = name.split(' ')[0] || 'there'
    if (after.customer?.email) {
      await mail.sendMail({
        from: `"Christmas Light Creations" <${FROM}>`, to: after.customer.email, replyTo: FROM,
        subject: 'Your signed Christmas light agreement',
        text: `Hi ${first},\n\nThank you for choosing Christmas Light Creations! Your signed agreement is here any time (save or print it as a PDF):\n${link}\n\nWe'll be in touch to confirm your install date.\n\nThank you,\nChristmas Light Creations\n281-819-0163`,
      })
    }
    // An add-on proposal raises the yearly price from next season: record it on the customer.
    if (after.kind === 'addon' && after.ownerType === 'customer' && after.ownerId) {
      await recordAddOn(after.ownerId, token, after).catch((e) => logger.error('recordAddOn', e))
    }
    if (staff.length) await mail.sendMail({ from: `"CLC Website" <${FROM}>`, to: staff, subject: `Signed: ${name} accepted their proposal`, text: `${name} (${after.customer?.address ?? ''}) signed their proposal.\nCountersign it in the staff app: ${SITE}/leads/\n\nCustomer view: ${link}` })
  }

  for (const part of PARTS) {
    const was = paymentOf(before, part)
    const now = paymentOf(after, part)
    if (was?.status === 'paid' || now?.status !== 'paid' || !staff.length) continue
    await mail.sendMail({ from: `"CLC Website" <${FROM}>`, to: staff, subject: `${PART_LABEL[part]} paid: ${name} ($${dollars(now.amount)})`, text: `${name} paid the $${dollars(now.amount)} ${PART_LABEL[part].toLowerCase()} by PayPal${now.env === 'sandbox' ? ' (TEST payment, sandbox)' : ''}.\nPayPal order ${now.orderId}.\n\nCustomer view: ${link}` })
  }
})

// ---- Customer accounts (/account/) ------------------------------------------

// Tokens of proposals sent to this email (any letter case). Reads only the
// email field of each proposal, not the large signature images.
async function proposalTokensFor(email) {
  const snap = await getFirestore().collection('proposals').select('customer.email').get()
  return snap.docs.filter((d) => normEmail(d.get('customer.email')) === email).map((d) => d.id)
}

// Customer records (old sheet + staff app) listing this email.
async function customersFor(email) {
  const snap = await getFirestore().collection('customers').select('email').get()
  return snap.docs.filter((d) => emailsOf(d.get('email')).includes(email)).map((d) => d.id)
}

// Emails a one-time sign-in link from info@, but only to an email that has a
// proposal or a customer record. The answer is the same either way, so nobody can test whether an
// address is a customer. At most one link a minute, 5 a day, per email.
export const sendAccountLink = onCall({ region: REGION, invoker: 'public', secrets: [SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'] }, async (req) => {
  const email = normEmail(req.data?.email)
  if (!EMAIL_RE.test(email) || email.length > 200) throw new HttpsError('invalid-argument', 'Please enter a valid email')
  const [tokens, customerIds] = await Promise.all([proposalTokensFor(email), customersFor(email)])
  if (!tokens.length && !customerIds.length) { logger.info('Account link asked for an unknown email'); return { ok: true } }

  // Server-only bookkeeping (no client rule matches accountLinks, so browsers can't read it).
  const limitRef = getFirestore().doc(`accountLinks/${encodeURIComponent(email)}`)
  const now = Date.now()
  const day = new Date(now).toISOString().slice(0, 10)
  const prev = (await limitRef.get()).data() ?? {}
  const today = prev.day === day ? prev.count ?? 0 : 0
  if (now - (prev.lastAt ?? 0) < 60_000 || today >= 5) { logger.warn('Account link rate-limited'); return { ok: true } }
  await limitRef.set({ lastAt: now, day, count: today + 1 })

  const link = await getAuth().generateSignInWithEmailLink(email, { url: accountUrl(req.data?.origin), handleCodeInApp: true })
  await mailer().sendMail({
    from: `"Christmas Light Creations" <${FROM}>`, to: email, replyTo: FROM,
    subject: 'Your Christmas Light Creations sign-in link',
    text: `Hi,

Tap this link to open your account (your agreements, what's paid, and anything due):
${link}

The link works once. If you didn't ask for it, just ignore this email.

Thank you,
Christmas Light Creations
281-819-0163`,
  })
  return { ok: true }
})

// For staff (Accounts page): first and last sign-in per email. Times are
// stored as Firestore timestamps; compared as milliseconds.
async function recordLogin(db, email, token) {
  if (email.includes('/')) return
  const ref = db.doc(`customerLogins/${email}`)
  await db.runTransaction(async (tx) => {
    const prev = (await tx.get(ref)).data()
    const ms = (t) => (t?.toMillis ? t.toMillis() : null)
    const rec = loginRecord(prev && { firstAt: ms(prev.firstAt), lastAt: ms(prev.lastAt), provider: prev.provider },
      { email, authTime: Number(token.auth_time) * 1000, provider: providerName(token.firebase?.sign_in_provider) })
    tx.set(ref, { ...rec, firstAt: new Date(rec.firstAt), lastAt: new Date(rec.lastAt) })
  })
}

// The signed-in customer's proposals with what's paid and what's due. Only
// for a verified email (email-link sign-in always is); payment amounts come
// from the stored proposals, same as the payment functions.
export const myAccount = onCall({ region: REGION, invoker: 'public', cors: [SITE, 'http://localhost:5173'] }, async (req) => {
  const email = normEmail(req.auth?.token?.email)
  if (!email || req.auth.token.email_verified !== true) throw new HttpsError('unauthenticated', 'Please sign in again')
  const db = getFirestore()
  await recordLogin(db, email, req.auth.token).catch((e) => logger.warn('recordLogin', e))
  const tokens = await proposalTokensFor(email)
  const docs = tokens.length ? await db.getAll(...tokens.map((t) => db.doc(`proposals/${t}`)), { fieldMask: ['status', 'title', 'season', 'customer', 'items', 'discountPct', 'depositPct', 'deposit', 'payments', 'requests', 'sentAt', 'signedAt'] }) : []
  const proposals = docs.filter((d) => shownInAccount(d.data())).map((d) => accountSummary(d.id, d.data())).sort(byNewest)
  // Yearly price breakdown from their customer record, once staff allow it.
  const ids = await customersFor(email)
  const recs = ids.length ? await db.getAll(...ids.map((id) => db.doc(`customers/${id}`)), { fieldMask: ['fullName', 'address', 'since', 'originalRate', 'addOns', 'priceShown', 'seasons'] }) : []
  const rec = recs.map((d) => d.data()).find(Boolean)
  const now = new Date()
  const season = String(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1) // same as src/lib/customers.js seasonYear (server clock is UTC; fine for a July 1 cutover)
  const price = recs.map((d) => customerForAccount(d.data(), season)).find(Boolean) ?? null
  return { email, proposals, price, customer: rec ? { name: rec.fullName ?? '', address: rec.address ?? '' } : null }
})
