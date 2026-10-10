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
// - messageSync: receives Google Voice notification emails and customer
//   emails from the Apps Script in info@ (scripts/apps-script/messageSync.gs)
//   and files them in customer history (docs/specs/message-sync.md).
//
// Secrets (set with `firebase functions:secrets:set`, never in code):
//   SMTP_PASSWORD  app password for info@ (Google Workspace SMTP)
//   PAYPAL_SECRET  PayPal app secret (sandbox or live, matching PAYPAL_ENV)
//   MESSAGE_SYNC_KEY  shared key with the info@ Apps Script (Script Properties)
// Plain settings in functions/.env: PAYPAL_CLIENT_ID, PAYPAL_ENV.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import nodemailer from 'nodemailer'
import { createHash, timingSafeEqual } from 'node:crypto'
import { alertRecipients, leadEmail } from './leadEmail.js'
import { dailyReport, incidentEmail, missedLeadAlerts, shouldMail, syncStale } from './health.js'
import { captureOrder, createOrder, getOrder } from './paypal.js'
import { PARTS, dollars, partCents, paymentOf } from './proposalMath.js'
import { PART_LABEL, captureProblem, customIdFor, lockProblem, orderProblem, payableProblem, validOrderId } from './payments.js'
import { badBatch, buildDirectory, docsFor, dryRunSummary, parseItem } from './messageSync.js'
import { accountSummary, accountUrl, addOnFromProposal, byNewest, customerEmailKeys, customerForAccount, EMAIL_RE, loginRecord, normEmail, proposalEmailKeys, providerName, sameKeys, shownInAccount } from './account.js'

initializeApp()
const REGION = 'us-south1'
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD')
const PAYPAL_SECRET = defineSecret('PAYPAL_SECRET')
const MESSAGE_SYNC_KEY = defineSecret('MESSAGE_SYNC_KEY')
const PAYPAL_CLIENT_ID = defineString('PAYPAL_CLIENT_ID')
const PAYPAL_ENV = defineString('PAYPAL_ENV', { default: 'sandbox' })
const FROM = 'info@christmas-light-creations.com'
const SITE = 'https://christmas-light-creations.com'
// App Check (reCAPTCHA): refuse calls that don't come from our pages. Turn on
// only after the site has sent App Check tokens for a few days (Firebase
// console → App Check → APIs → metrics show ~100% verified), then deploy.
const ENFORCE_APP_CHECK = false

const mailer = () => nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: FROM, pass: SMTP_PASSWORD.value() } })
const staffEmails = async () => alertRecipients((await getFirestore().doc('settings/app').get()).data())

// Something broke: save it (red banner in the staff app, works even when
// email doesn't) and email the alert list, at most once an hour per kind.
// Never throws: reporting must not break the thing that called it.
async function reportIncident(kind, message, details = {}) {
  logger.error(`incident ${kind}: ${message}`, details)
  const db = getFirestore()
  try {
    await db.collection('incidents').add({ kind, message: String(message).slice(0, 500), details: JSON.parse(JSON.stringify(details)), at: FieldValue.serverTimestamp(), open: true })
  } catch (e) { logger.error('incident save failed', e) }
  try {
    const gate = db.doc('serverState/incidentMail')
    const now = Date.now()
    if (!shouldMail((await gate.get()).data()?.[kind], now)) return
    await gate.set({ [kind]: now }, { merge: true })
    const to = await staffEmails()
    if (to.length) await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, ...incidentEmail({ kind, message }) })
  } catch (e) { logger.error('incident email failed', e) }
}

// The sign-in link email: if it fails, report it and tell the customer.
async function sendOrReport(to, message) {
  try {
    await mailer().sendMail(message)
  } catch (e) {
    await reportIncident('email', `A customer's sign-in link email (${to}) didn't go out: ${e.message}`)
    throw new HttpsError('unavailable', 'We couldn’t send the email right now. Please try again later, or call us.')
  }
}

export const newLeadAlert = onDocumentCreated(
  { document: 'leads/{leadId}', secrets: [SMTP_PASSWORD], region: REGION },
  async (event) => {
    const lead = event.data?.data()
    if (!lead) return
    const to = await staffEmails()
    const who = `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || 'someone'
    if (!to.length) {
      await reportIncident('lead-alert', `New request from ${who}, but nobody is on the alert list (staff app → ⚙ Settings → New-request alerts).`)
      return
    }
    try {
      await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, ...leadEmail(lead) })
    } catch (e) {
      await reportIncident('lead-alert', `New request from ${who} (${lead.phone || lead.email || ''}) is in the staff app, but the alert email failed: ${e.message}`, { leadId: event.params.leadId })
      return
    }
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
export const createDepositOrder = onCall({ region: REGION, invoker: 'public', secrets: [PAYPAL_SECRET, SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const part = req.data?.part ?? 'deposit'
  const { p, amount } = await payableProposal(req.data?.token, part)
  const busy = lockProblem(p.paymentLocks?.[part], null, Date.now())
  if (busy) throw new HttpsError(...busy)
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
    await reportIncident('paypal', `${p.customer?.name ?? 'A customer'} tried to start their ${PART_LABEL[part].toLowerCase()} payment and PayPal refused: ${e.message}`, { token: req.data.token, part })
    throw new HttpsError('unavailable', e.message)
  }
})

export const captureDepositOrder = onCall({ region: REGION, invoker: 'public', secrets: [PAYPAL_SECRET, SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const token = req.data?.token
  const part = req.data?.part ?? 'deposit'
  const orderId = String(req.data?.orderId ?? '')
  if (!validOrderId(orderId)) throw new HttpsError('invalid-argument', 'Bad payment reference')
  const { ref, amount } = await payableProposal(token, part)
  const customId = customIdFor(token, part)
  const cfg = paypalCfg()

  // 1. Look at the order first: a wrong one is refused before any money moves.
  const order = await getOrder(cfg, orderId).catch(async (e) => {
    await reportIncident('paypal', `Couldn't check a ${PART_LABEL[part].toLowerCase()} payment with PayPal (nothing charged): ${e.message}`, { token, part, orderId })
    throw new HttpsError('unavailable', 'PayPal didn’t answer. Please try again.')
  })
  const wrong = orderProblem(order, { customId, amount })
  if (wrong) {
    await reportIncident('payment', `A ${PART_LABEL[part].toLowerCase()} payment was refused before charging because the PayPal order didn't match (nothing charged).`, { token, part, orderId, ...wrong, amount })
    throw new HttpsError('failed-precondition', 'This payment doesn’t match what’s due. Nothing was charged. Please refresh and try again, or call us.')
  }

  // 2. One capture at a time per payment (a double click, two phones).
  const db = getFirestore()
  const lockPath = `paymentLocks.${part}`
  await db.runTransaction(async (tx) => {
    const p = (await tx.get(ref)).data()
    const problem = payableProblem(p, part) ?? lockProblem(p?.paymentLocks?.[part], orderId, Date.now())
    if (problem) throw new HttpsError(...problem)
    tx.update(ref, { [lockPath]: { orderId, at: Date.now() } })
  })
  const unlock = () => ref.update({ [lockPath]: FieldValue.delete() }).catch((e) => logger.error('unlock', e))

  // 3. Take the money, then check PayPal's answer once more.
  let result
  try {
    result = await captureOrder(cfg, orderId)
  } catch (e) {
    await unlock()
    await reportIncident('payment', `PayPal couldn't complete a ${PART_LABEL[part].toLowerCase()} payment (the customer was told to try again): ${e.message}`, { token, part, orderId })
    throw new HttpsError('unavailable', 'PayPal couldn’t complete the payment. Please try again, or call us.')
  }
  const capture = result.purchase_units?.[0]?.payments?.captures?.[0]
  const mismatch = captureProblem(result, { customId, amount })
  if (mismatch) {
    await unlock()
    await reportIncident('payment', `IMPORTANT: PayPal took a ${PART_LABEL[part].toLowerCase()} payment but it didn't match what's due, so it wasn't recorded. Check PayPal order ${orderId}, then refund it or record it by hand.`, { token, part, orderId, status: result.status, ...mismatch, amount })
    throw new HttpsError('failed-precondition', 'Payment could not be confirmed. Please call us.')
  }

  // 4. Record it and release the lock together.
  const record = {
    status: 'paid', amount, orderId: result.id, captureId: capture.id,
    payerEmail: result.payer?.email_address ?? null, env: PAYPAL_ENV.value(), paidAt: FieldValue.serverTimestamp(),
  }
  await ref.update({ ...(part === 'deposit' ? { deposit: record } : { [`payments.${part}`]: record }), [lockPath]: FieldValue.delete() })
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
  try {
    await proposalChangeEmails(event)
  } catch (e) {
    await reportIncident('email', `A signed-agreement or payment email (proposal ${event.params.token.slice(0, 6)}…) didn't go out: ${e.message}`, { token: event.params.token })
  }
})

async function proposalChangeEmails(event) {
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
        text: `Hi ${first},\n\nThank you for choosing Christmas Light Creations! Your signed agreement is here any time (save or print it as a PDF):\n${link}\n\nAll your agreements and payments are also in your account (sign in with this email, no password): ${SITE}/account/\n\nWe'll be in touch to confirm your install date.\n\nThank you,\nChristmas Light Creations\n281-819-0163`,
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
}

// ---- Customer accounts (/account/) ------------------------------------------

// emailKeys: lowercase emails on each proposal and customer, written only by
// the server (triggers below), so a lookup is one query instead of reading
// every record. The first lookup after this went live fills in records saved
// before it (serverState/emailIndex; no client rule matches serverState).
const EMAIL_INDEX_VERSION = 1
async function ensureEmailIndex() {
  const db = getFirestore()
  const flag = db.doc('serverState/emailIndex')
  if ((await flag.get()).data()?.version === EMAIL_INDEX_VERSION) return
  const [props, custs] = await Promise.all([
    db.collection('proposals').select('customer.email', 'emailKeys').get(),
    db.collection('customers').select('email', 'otherEmails', 'emailKeys').get(),
  ])
  const writes = [
    ...props.docs.map((d) => [d.ref, proposalEmailKeys(d.data()), d.get('emailKeys')]),
    ...custs.docs.map((d) => [d.ref, customerEmailKeys(d.data()), d.get('emailKeys')]),
  ].filter(([, keys, had]) => !sameKeys(keys, had))
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch()
    writes.slice(i, i + 400).forEach(([ref, keys]) => batch.update(ref, { emailKeys: keys }))
    await batch.commit()
  }
  await flag.set({ version: EMAIL_INDEX_VERSION, at: new Date(), filled: writes.length })
  logger.info(`Email index filled for ${writes.length} records`)
}

// Tokens of proposals sent to this email (any letter case).
async function proposalTokensFor(email) {
  await ensureEmailIndex()
  const snap = await getFirestore().collection('proposals').where('emailKeys', 'array-contains', email).select().get()
  return snap.docs.map((d) => d.id)
}

// Customer records (old sheet + staff app) listing this email, incl. linked other emails.
async function customersFor(email) {
  await ensureEmailIndex()
  const snap = await getFirestore().collection('customers').where('emailKeys', 'array-contains', email).select().get()
  return snap.docs.map((d) => d.id)
}

// Keep emailKeys right whenever a proposal or customer is saved (writes only
// when the emails changed, so it doesn't loop).
const keepEmailKeys = (keysOf) => async (event) => {
  const after = event.data?.after
  if (!after?.exists) return
  const keys = keysOf(after.data())
  if (!sameKeys(keys, after.get('emailKeys'))) await after.ref.update({ emailKeys: keys })
}
export const proposalEmails = onDocumentWritten({ document: 'proposals/{token}', region: REGION }, keepEmailKeys(proposalEmailKeys))
export const customerEmails = onDocumentWritten({ document: 'customers/{id}', region: REGION }, keepEmailKeys(customerEmailKeys))

// Emails a one-time sign-in link from info@, but only to an email that has a
// proposal or a customer record. The answer is the same either way, so nobody can test whether an
// address is a customer. At most one link a minute, 5 a day, per email.
export const sendAccountLink = onCall({ region: REGION, invoker: 'public', secrets: [SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
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
  await sendOrReport(email, {
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
export const myAccount = onCall({ region: REGION, invoker: 'public', cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
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

// ---- Message sync (Voice notifications + customer emails → history) ---------

// Constant-time key check (hashing first makes the lengths equal).
const sameKey = (a, b) => {
  const h = (s) => createHash('sha256').update(String(s ?? '')).digest()
  return Boolean(a) && Boolean(b) && timingSafeEqual(h(a), h(b))
}

// Called every 5 minutes by the Apps Script in info@ with new emails. Entries
// are only created (fixed ids), so re-sends are harmless and never undo staff
// edits. Logs counts and reasons only: no message text, numbers or addresses.
export const messageSync = onRequest({ region: REGION, invoker: 'public', secrets: [MESSAGE_SYNC_KEY, SMTP_PASSWORD], maxInstances: 2, timeoutSeconds: 120 }, async (req, res) => {
  try {
    await syncBatch(req, res)
  } catch (e) {
    await reportIncident('sync', `Saving synced texts/emails failed: ${e.message}`)
    if (!res.headersSent) res.status(500).json({ ok: false })
  }
})

async function syncBatch(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return }
  if (!sameKey(req.get('x-clc-sync-key'), MESSAGE_SYNC_KEY.value())) {
    logger.warn('messageSync: wrong or missing key')
    res.status(401).end()
    return
  }
  const problem = badBatch(req.body)
  if (problem) { res.status(400).json({ ok: false, error: problem }); return }

  const db = getFirestore()
  const events = req.body.items.map(parseItem)
  const needDir = events.some((e) => !e.skip)
  const [cust, leads] = needDir
    ? await Promise.all([db.collection('customers').select('phone', 'email').get(), db.collection('leads').select('phone', 'email', 'customerId').get()])
    : [{ docs: [] }, { docs: [] }]
  const dir = buildDirectory(cust.docs.map((d) => ({ id: d.id, ...d.data() })), leads.docs.map((d) => ({ id: d.id, ...d.data() })))

  const count = { saved: 0, duplicate: 0, skipped: 0, unmatched: 0, dropped: 0 }
  const results = []
  for (const [i, event] of events.entries()) {
    const gmailId = String(req.body.items[i]?.gmailId ?? '')
    const docs = event.skip ? [] : docsFor(event, dir)
    if (req.body.dryRun === true) { results.push({ gmailId, ...dryRunSummary(event, docs) }); continue }
    if (event.skip) { count.skipped++; results.push({ gmailId, status: 'skipped', reason: event.skip }); continue }
    if (!docs.length) { count.dropped++; results.push({ gmailId, status: 'dropped', reason: 'no-match' }); continue }
    let status = 'duplicate'
    for (const { id, data } of docs) {
      try {
        await db.doc(`messages/${id}`).create({ ...data, syncedAt: FieldValue.serverTimestamp() })
        status = 'saved'
        if (data.unmatched) count.unmatched++
      } catch (e) {
        if (e.code !== 6) throw e // 6 = ALREADY_EXISTS
      }
    }
    count[status]++
    results.push({ gmailId, status })
  }
  logger.info('messageSync', { items: events.length, dryRun: req.body.dryRun === true, ...count, reasons: events.filter((e) => e.skip).map((e) => e.skip) })
  res.json({ ok: true, ...count, results })
}

// ---- Daily check (7:30 am Central) ------------------------------------------
// Catches what fails silently: request alerts that never went out, the text
// sync stopping, problems nobody has marked as seen. Emails only when there's
// a problem, plus an "all OK" on Mondays so a missing email is itself a sign.
const tsMs = (t) => (t?.toMillis ? t.toMillis() : Number(t) || 0)
export const dailyHealth = onSchedule({ schedule: '30 7 * * *', timeZone: 'America/Chicago', region: REGION, secrets: [SMTP_PASSWORD] }, async () => {
  const db = getFirestore()
  const now = Date.now()
  const WEEK = 7 * 24 * 60 * 60 * 1000
  const [leadsSnap, lastMsg, openSnap, propSnap] = await Promise.all([
    db.collection('leads').where('createdAt', '>=', new Date(now - WEEK)).get(),
    db.collection('messages').orderBy('syncedAt', 'desc').limit(1).get(),
    db.collection('incidents').where('open', '==', true).get(),
    db.collection('proposals').select('deposit', 'payments').get(),
  ])
  const leads = leadsSnap.docs.map((d) => d.data())
  const lastSync = lastMsg.docs[0]?.get('syncedAt') ?? null
  const problems = []
  const missed = missedLeadAlerts(leads, now)
  if (missed.length) problems.push(`• ${missed.length} website request${missed.length === 1 ? '' : 's'} from the last day never got an alert email (${missed.map((l) => `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim()).join(', ')}). They're in the staff app under Leads.`)
  if (syncStale(lastSync, now)) problems.push('• No texts or emails have synced into customer history for 3+ days. If customers have been texting, the sync (Apps Script in info@) may have stopped.')
  const payments = propSnap.docs.flatMap((d) => PARTS.map((part) => paymentOf(d.data(), part))).filter((x) => x?.status === 'paid' && now - tsMs(x.paidAt) < WEEK).length
  const monday = new Date(now).toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short' }) === 'Mon'
  const openIncidents = openSnap.docs.map((d) => d.data()).sort((a, b) => tsMs(b.at) - tsMs(a.at)).slice(0, 10)
  const report = dailyReport({ problems, openIncidents, monday, stats: { leads: leads.length, payments, lastSync: lastSync?.toDate?.() ?? null } })
  logger.info('dailyHealth', { problems: problems.length, open: openSnap.size, sent: Boolean(report) })
  if (!report) return
  const to = await staffEmails()
  if (!to.length) { await reportIncident('lead-alert', 'Nobody is on the alert list (staff app → ⚙ Settings → New-request alerts), so problem emails can’t go out.'); return }
  try {
    await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, ...report })
  } catch (e) {
    await reportIncident('other', `The daily check email couldn't be sent: ${e.message}`)
  }
})
