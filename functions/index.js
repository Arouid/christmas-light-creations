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
//
// Secrets (set with `firebase functions:secrets:set`, never in code):
//   SMTP_PASSWORD  app password for info@ (Google Workspace SMTP)
//   PAYPAL_SECRET  PayPal app secret (sandbox or live, matching PAYPAL_ENV)
// Plain settings in functions/.env: PAYPAL_CLIENT_ID, PAYPAL_ENV.
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import nodemailer from 'nodemailer'
import { alertRecipients, leadEmail } from './leadEmail.js'
import { captureOrder, createOrder } from './paypal.js'
import { depositCents, dollars } from './proposalMath.js'

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

// ---- Deposits ---------------------------------------------------------------

async function payableProposal(token) {
  if (typeof token !== 'string' || token.length < 16) throw new HttpsError('invalid-argument', 'Bad link')
  const ref = getFirestore().doc(`proposals/${token}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Proposal not found')
  const p = snap.data()
  if (!['signed', 'countersigned'].includes(p.status)) throw new HttpsError('failed-precondition', 'Sign the proposal first')
  if (p.deposit?.status === 'paid') throw new HttpsError('already-exists', 'Deposit already paid')
  const amount = depositCents(p)
  if (amount <= 0) throw new HttpsError('failed-precondition', 'No deposit due')
  return { ref, p, amount }
}
const paypalCfg = () => ({ env: PAYPAL_ENV.value(), clientId: PAYPAL_CLIENT_ID.value(), secret: PAYPAL_SECRET.value() })

export const createDepositOrder = onCall({ region: REGION, secrets: [PAYPAL_SECRET], cors: [SITE, 'http://localhost:5173'] }, async (req) => {
  const { p, amount } = await payableProposal(req.data?.token)
  const order = await createOrder(paypalCfg(), {
    token: req.data.token,
    amount: dollars(amount),
    description: `Deposit: ${p.title ?? 'Christmas lighting'} for ${p.customer?.address ?? ''}`,
  })
  return { orderId: order.id }
})

export const captureDepositOrder = onCall({ region: REGION, secrets: [PAYPAL_SECRET], cors: [SITE, 'http://localhost:5173'] }, async (req) => {
  const token = req.data?.token
  const { ref, amount } = await payableProposal(token)
  const result = await captureOrder(paypalCfg(), String(req.data?.orderId ?? ''))
  const unit = result.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  const paidCents = Math.round(Number(capture?.amount?.value ?? 0) * 100)
  // Only accept a completed capture for this proposal and the full amount.
  if (result.status !== 'COMPLETED' || capture?.status !== 'COMPLETED' || unit?.custom_id !== token || paidCents !== amount) {
    logger.error('Deposit capture mismatch', { token, status: result.status, paidCents, amount })
    throw new HttpsError('failed-precondition', 'Payment could not be confirmed. Please call us.')
  }
  await ref.update({
    deposit: {
      status: 'paid', amount: paidCents, orderId: result.id, captureId: capture.id,
      payerEmail: result.payer?.email_address ?? null, env: PAYPAL_ENV.value(), paidAt: FieldValue.serverTimestamp(),
    },
  })
  return { paid: true }
})

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
    if (staff.length) await mail.sendMail({ from: `"CLC Website" <${FROM}>`, to: staff, subject: `Signed: ${name} accepted their proposal`, text: `${name} (${after.customer?.address ?? ''}) signed their proposal.\nCountersign it in the staff app: ${SITE}/leads/\n\nCustomer view: ${link}` })
  }

  if (before.deposit?.status !== 'paid' && after.deposit?.status === 'paid' && staff.length) {
    await mail.sendMail({ from: `"CLC Website" <${FROM}>`, to: staff, subject: `Deposit paid: ${name} ($${dollars(after.deposit.amount)})`, text: `${name} paid the $${dollars(after.deposit.amount)} deposit by PayPal${after.deposit.env === 'sandbox' ? ' (TEST payment, sandbox)' : ''}.\nPayPal order ${after.deposit.orderId}.\n\nCustomer view: ${link}` })
  }
})
