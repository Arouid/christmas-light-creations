// Server code for the CLC site (Firebase Cloud Functions, region us-south1,
// same as the Firestore database).
//
// - newLeadAlert: emails staff (and phones with notifications on) the moment
//   a website estimate request arrives
//   (the old site lost requests when its notification emails broke).
// - createDepositOrder / captureDepositOrder: PayPal deposit for a signed
//   proposal. The amount comes from the stored proposal, never the browser,
//   and only this code can mark a deposit paid.
// - proposalChanged: emails the customer their signed agreement link and
//   tells staff when a proposal is signed or a deposit is paid.
// - sendAccountLink / myAccount: customer accounts at /account/ (Google,
//   email-link or phone sign-in; the account lists proposals and invoices
//   whose emailKeys / phoneKeys hold that verified email or phone, plus this
//   season's schedule and any open service call; docs/specs/phone-sign-in.md).
// - reportProblem: "Report a problem" on /account/ becomes a service call on
//   the customer's record, like staff's Log call, and alerts staff
//   (docs/specs/account-service.md).
// - sendAccountMessage / replyToCustomer: the account chat. Customers write
//   from /account/ (staff phones buzz, 💬 lists it), staff answer from the
//   customer's account (the customer gets a branded email). Only this code
//   writes conversations/{customerId} (docs/specs/account-chat.md).
// - createInvoiceOrder / captureInvoiceOrder / invoiceChanged /
//   invoiceReminders: our own invoices (docs/specs/invoices.md), paid like
//   proposals; numbers, emails, season billing and reminders done here.
// - messageSync: receives Google Voice notification emails and customer
//   emails from the Apps Script in info@ (scripts/apps-script/messageSync.gs)
//   and files them in customer history (docs/specs/message-sync.md), then
//   sends staff a phone notification (docs/specs/staff-alerts.md).
// - sendTestPush: a test notification to the calling staff member's devices.
// - leadDesignCreated / cleanupLeadDesigns: designs sent from /design/ are
//   re-encoded and rebuilt on arrival, and deleted after 30 days.
// - sendStaffEmail: staff email a customer from info@ without leaving the
//   staff app; filed in their history at once (docs/specs/staff-email.md).
// - scheduleStaffEmail / sendScheduledEmails: "Send later": staff schedule,
//   edit or cancel; every 5 minutes the due ones go out like a Send
//   (docs/specs/scheduled-email.md).
// - draftReply: the sales assistant. Staff press "Suggest a reply" on a
//   customer thread; Claude drafts one from their history and record, staff
//   edit and send it themselves (docs/specs/sales-assistant.md).
// - askClaude: "Ask Claude" in the staff app. Staff ask a question about
//   customers, leads, invoices, routes or messages; Claude answers with
//   read-only tools (docs/specs/ask-claude.md). Nothing is written or sent.
//
// Secrets (set with `firebase functions:secrets:set`, never in code):
//   SMTP_PASSWORD  app password for info@ (Google Workspace SMTP)
// - proposeSchedule: "Plan with Claude" on the Season tab. Claude proposes an
//   install day per customer; staff adjust and Apply in the app
//   (docs/specs/schedule-assistant.md). Nothing is written by the server.
//   PAYPAL_SECRET  PayPal app secret (sandbox or live, matching PAYPAL_ENV)
//   MESSAGE_SYNC_KEY  shared key with the info@ Apps Script (Script Properties)
//   ANTHROPIC_API_KEY  Claude API key for the sales assistant (draftReply, askClaude, proposeSchedule)
// Plain settings in functions/.env: PAYPAL_CLIENT_ID, PAYPAL_ENV.
import { getApp, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldPath, FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import nodemailer from 'nodemailer'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { alertRecipients, leadEmail } from './leadEmail.js'
import { dailyReport, incidentEmail, missedLeadAlerts, shouldMail, syncStale } from './health.js'
import { SEASON, bookedByDay, bookingSeason, capacity, openDays } from './availability.js'
import { captureOrder, createOrder, getOrder } from './paypal.js'
import { claudeIncrement, monthKey, paypalFeeCents, paypalIncrement } from './usage.js'
import { adsQuery, adsSpend, billingQuery, googleSpend as googleSpendOf, isMissingTable, previousMonth, termsQuery, topTerms } from './googleBilling.js'
import { PARTS, dollars, partCents, paymentOf } from './proposalMath.js'
import { captureProblem, customIdFor, lockProblem, orderProblem, partLabel, payableProblem, validOrderId } from './payments.js'
import { centralDayOf, dueText, payIn3Due, payIn3Reminder } from './payIn3.js'
import { detailsChanged, detailsRequest, detailsSummary } from './propertyDetails.js'
import { rebookEmail, rebookPatch, rebookPush, rebookRequest } from './rebook.js'
import { brandText, textFooter } from './brand.js'
import { fromHeader, staffName, staffNamesMap } from './staffNames.js'
import { TREE_NOTICE, TREE_TITLE } from './notices.js'
import { ACK_TEMPLATE, ackAddress, ackEmail, ackOn, ackedRecently } from './ack.js'
import { pitchFilterOn, pitchReason } from './pitch.js'
import { blockedReason } from './blocklist.js'
import { giftWrappingOn } from './giftWrapping.js'
import { NUDGE_HOURS, listSince, nudgeDue, nudgeKey, nudgeMessage, waiting } from './nudge.js'
import { NWS_POINTS_URL, NWS_USER_AGENT, WATCH_SCHEDULE, badDays, lightsHeadsUp, lightsUp, noticesOn, pruneSent, routeHeadsUp, sentKey, staffWeather, tipsOk, weatherLine } from './weather.js'
import { ASK_SCHEDULE, DONE_STATUS, askEmail, replied, reminderEmail, reviewAsksOn, reviewPlan, seasonOf } from './reviewAsk.js'
import { appSentKeys, badBatch, buildDirectory, docsFor, dryRunSummary } from './messageSync.js'
import { bounceFields, bounceIncident, bouncePush, bounceSummary, parseSyncItem, pickBounced, recordsOf } from './bounces.js'
import { historyEntry, recipientsOf, sendAllowed, staffEmailRequest } from './staffEmail.js'
import {
  GMAIL_ERROR, STUCK_ERROR, cancelIds, cancelOutcome, claimOutcome, collOf, dayRoomProblem, dueOnes, editRequest, markPath,
  requestOf, scheduledDoc, scheduledEmailRequest, sendAtProblem, stuckOnes,
} from './scheduledEmail.js'
import { TEST_PUSH, devicesOf, deviceGone, fcmMessage, pushFor, requestPush } from './staffPush.js'
import { MAX_SIDE, cleanDesign, cutoff, jpegBytes } from './leadDesigns.js'
import { MODEL, draftAllowed, draftRequest } from './assistant/prompt.js'
import { DraftError, PRESENCE_ID, draftFor, threadFor } from './assistant/draft.js'
import { askAllowed, askRequest } from './assistant/askPrompt.js'
import { AskError, askFor } from './assistant/ask.js'
import sharp from 'sharp'
import { accountIdentity, accountQueries, accountSummary, accountUrl, addOnFromProposal, byNewest, customerEmailKeys, customerForAccount, customerPhoneKeys, EMAIL_RE, loginRecord, normEmail, proposalEmailKeys, proposalPhoneKeys, providerName, sameKeys, shownInAccount } from './account.js'
import { SERVICE_DAYS, openMessage, openReport, openSummary, reportCall, reportEmail, reportPush, reportRequest, scheduleFor } from './service.js'
import { LIMITS as CHAT_LIMITS, appendMessage, chatAlertEmail, chatAllowed, chatPush, chatRequest, customerView, previewText, recipientFor, replyEmail } from './chat.js'
import {
  centralDay, emailOk, invoiceCents, invoiceCustomId, invoiceEmail, invoiceNumber, invoiceState, invoiceSummary, KIND_SHORT, paidInfo,
  payableInvoiceProblem, receiptEmail, reminderDue, seasonFillsOnPaid, seasonFillsOnSend, shownInvoice, staffPaidEmail, toMs, validToken,
} from './invoices.js'

import { scheduleAllowed, scheduleRequest } from './assistant/schedulePrompt.js'
import { ScheduleError, gatherSchedule, proposeFor } from './assistant/schedule.js'
initializeApp()
const REGION = 'us-south1'
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD')
const PAYPAL_SECRET = defineSecret('PAYPAL_SECRET')
const MESSAGE_SYNC_KEY = defineSecret('MESSAGE_SYNC_KEY')
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
// The sales assistant's model (docs/specs/sales-assistant.md): change in functions/.env and redeploy.
const AI_MODEL = defineString('AI_MODEL', { default: MODEL })

// "Spent this month" on Home (docs/specs/spend.md): add to usage/{YYYY-MM}.
// increments: { 'claude.draft.calls': 1, … } (field paths → amounts). Never
// blocks or fails the call that made the spend.
function recordUsage(increments) {
  const doc = {}
  for (const [path, n] of Object.entries(increments)) {
    const keys = path.split('.')
    let at = doc
    for (const k of keys.slice(0, -1)) at = at[k] ??= {}
    at[keys.at(-1)] = FieldValue.increment(n)
  }
  return getFirestore().doc(`usage/${monthKey()}`).set({ ...doc, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    .catch((e) => logger.warn('usage not recorded', e.message))
}

// Google Cloud and Google Ads spend for Home (docs/specs/spend.md): every 6
// hours, read this and last month's net cost per service from the Cloud
// Billing export in BigQuery (dataset `billing`, owner enabled it 2026-10-11)
// and the Ads cost per campaign from the Google Ads transfer (same dataset),
// and write them as usage/{YYYY-MM}.google and .ads, leaving the Claude and
// PayPal counters alone. A source whose table isn't there yet is skipped
// (Home keeps saying it isn't connected); the other one still updates.
// The functions service account needs BigQuery Job User (project) and
// BigQuery Data Viewer (dataset billing); a refusal is logged, nothing else breaks.
export const googleSpend = onSchedule({ schedule: '20 */6 * * *', timeZone: 'America/Chicago', region: REGION, timeoutSeconds: 120, retryCount: 1 }, async () => {
  const { BigQuery } = await import('@google-cloud/bigquery')
  const bq = new BigQuery()
  const months = [monthKey(), previousMonth(monthKey())]
  const db = getFirestore()
  const sources = { google: [billingQuery, googleSpendOf], ads: [adsQuery, adsSpend] }
  const log = {}
  // A query whose table isn't there yet → null (logged); anything else throws.
  const rowsOf = async (field, query) => {
    try { return (await bq.query(query))[0] } catch (e) {
      if (isMissingTable(e)) { log[field] = `no table yet: ${String(e.message).slice(0, 200)}`; return null }
      throw e
    }
  }
  for (const [field, [queryOf, sumOf]] of Object.entries(sources)) {
    const rows = await rowsOf(field, queryOf(months))
    if (!rows) continue
    const spend = sumOf(rows, months)
    if (field === 'ads') {
      // Search terms for the Google Ads panel (docs/specs/ads-stats.md): a
      // separate transfer table, so missing on its own leaves topTerms empty.
      const termRows = await rowsOf('terms', termsQuery(months))
      if (termRows) for (const [month, list] of Object.entries(topTerms(termRows, months))) spend[month].topTerms = list
    }
    for (const [month, value] of Object.entries(spend)) {
      await db.doc(`usage/${month}`).set({ [field]: value, updatedAt: FieldValue.serverTimestamp() }, { mergeFields: [field, 'updatedAt'] })
    }
    log[field] = Object.fromEntries(months.map((m) => [m, { cents: spend[m].totalCents, lines: Object.keys(spend[m].byService ?? spend[m].byCampaign).length, clicks: spend[m].clicks, through: spend[m].lastExportAt ?? spend[m].lastDay }]))
  }
  logger.info('googleSpend', log)
})
const PAYPAL_CLIENT_ID = defineString('PAYPAL_CLIENT_ID')
const PAYPAL_ENV = defineString('PAYPAL_ENV', { default: 'sandbox' })
const FROM = 'info@christmas-light-creations.com'
const PHONE = '281-819-0163'
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

// Recent activity on the staff app's Home (docs/specs/dashboard.md): what a
// customer did on the website, or what the server did for a staff member (a
// scheduled email went out). Never throws (it's a nice-to-have).
const logWebsite = (action, target, text = '') => logActivity('website', action, target, text)
async function logActivity(by, action, target, text = '') {
  try {
    await getFirestore().collection('activity').add({
      at: FieldValue.serverTimestamp(), by, action, text: String(text ?? '').slice(0, 300),
      target: { type: target.type, id: String(target.id ?? ''), name: String(target.name ?? '').slice(0, 200) },
    })
  } catch (e) { logger.warn('activity not logged', e.message) }
}
const proposalTarget = (p, name) => ({ type: p.ownerType === 'lead' ? 'lead' : 'customer', id: p.ownerId, name })

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
    const who = `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || 'someone'
    // A cold sales pitch through the form (functions/pitch.js, docs/specs/spam-filters.md):
    // filed under Spam / test with the reason, nobody alerted, no "Got your request".
    const pitch = pitchReason(lead)
    if (pitch && pitchFilterOn((await getFirestore().doc('settings/app').get()).data())) {
      await event.data.ref.update({ status: 'spam', spamReason: pitch, updatedAt: FieldValue.serverTimestamp(), updatedBy: 'website' })
      await logWebsite('spam-filed', { type: 'lead', id: event.params.leadId, name: who }, pitch)
      logger.info('request filed as a sales pitch', { leadId: event.params.leadId, reason: pitch })
      return
    }
    // Phone notification first (staff-alerts.md): never throws, and doesn't wait on the email.
    await alertStaff(requestPush(lead, event.params.leadId))
    const to = await staffEmails()
    if (!to.length) {
      await reportIncident('lead-alert', `New request from ${who}, but nobody is on the alert list (staff app → ⚙ Settings → New-request alerts).`)
    } else {
      try {
        await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, ...leadEmail(lead) })
        await event.data.ref.update({ alertSentAt: new Date() })
        logger.info(`Lead alert sent to ${to.length} staff`)
      } catch (e) {
        await reportIncident('lead-alert', `New request from ${who} (${lead.phone || lead.email || ''}) is in the staff app, but the alert email failed: ${e.message}`, { leadId: event.params.leadId })
      }
    }
    // Then the customer's "Got your request" (never before the staff alert).
    await acknowledgeRequest(event.data.ref, lead, event.params.leadId)
      .catch((e) => reportIncident('email', `The "Got your request" email to ${who} didn't go out: ${e.message}`, { leadId: event.params.leadId }))
  },
)

// "Got your request" (functions/ack.js, docs/specs/auto-emails.md): one plain
// email to the customer saying what happens next, filed in the lead's history
// like an email from the staff app. Skipped when the same email got one in
// the last day, and when ⚙ Settings → Automatic emails turns it off.
async function acknowledgeRequest(ref, lead, leadId) {
  const to = ackAddress(lead)
  if (!to) return
  const db = getFirestore()
  const settings = (await db.doc('settings/app').get()).data() ?? {}
  if (!ackOn(settings)) return
  const earlier = (await db.collection('leads').where('email', '==', lead.email).select('ackSentAt').get()).docs.filter((d) => d.id !== leadId).map((d) => d.data())
  if (ackedRecently(earlier)) { logger.info('ack skipped: same email acknowledged in the last day'); return }
  const message = ackEmail(lead, { designAttached: Boolean(lead.designId) })
  const messageId = `<${randomUUID()}@christmas-light-creations.com>`
  await mailer().sendMail({ from: `"Christmas Light Creations" <${FROM}>`, to, replyTo: FROM, messageId, ...message })
  await ref.update({ ackSentAt: new Date() })
  const req = { to, subject: message.subject, text: message.text, template: ACK_TEMPLATE, target: { field: 'leadId', coll: 'leads', id: leadId } }
  const { id, data } = historyEntry({ req, record: lead, messageId, staff: 'website', at: new Date().toISOString() })
  await db.doc(`messages/${id}`).set(data, { merge: true }).catch((e) => logger.warn('ack history not saved', e.message))
  logger.info('ack sent')
}

// ---- Payments (deposit, install balance, takedown) --------------------------

// Payable rules (signed, requested, not yet paid, something due) live in payments.js.
async function payableProposal(token, part = 'deposit') {
  if (typeof token !== 'string' || token.length < 16 || token.includes('/')) throw new HttpsError('invalid-argument', 'Bad link')
  if (!PARTS.includes(part)) throw new HttpsError('invalid-argument', 'Unknown payment')
  const ref = getFirestore().doc(`proposals/${token}`)
  const p = (await ref.get()).data()
  const problem = payableProblem(p, part, centralDay())
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
      description: `${partLabel(p, part)}: ${p.title ?? 'Christmas lighting'} for ${p.customer?.address ?? ''}`,
    })
    return { orderId: order.id }
  } catch (e) {
    // Unhandled errors reach the page only as "internal"; pass PayPal's reason on.
    await reportIncident('paypal', `${p.customer?.name ?? 'A customer'} tried to start their ${partLabel(p, part).toLowerCase()} payment and PayPal refused: ${e.message}`, { token: req.data.token, part })
    throw new HttpsError('unavailable', e.message)
  }
})

export const captureDepositOrder = onCall({ region: REGION, invoker: 'public', secrets: [PAYPAL_SECRET, SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const token = req.data?.token
  const part = req.data?.part ?? 'deposit'
  const orderId = String(req.data?.orderId ?? '')
  if (!validOrderId(orderId)) throw new HttpsError('invalid-argument', 'Bad payment reference')
  const { ref, p, amount } = await payableProposal(token, part)
  const customId = customIdFor(token, part)
  const cfg = paypalCfg()

  // 1. Look at the order first: a wrong one is refused before any money moves.
  const order = await getOrder(cfg, orderId).catch(async (e) => {
    await reportIncident('paypal', `Couldn't check a ${partLabel(p, part).toLowerCase()} payment with PayPal (nothing charged): ${e.message}`, { token, part, orderId })
    throw new HttpsError('unavailable', 'PayPal didn’t answer. Please try again.')
  })
  const wrong = orderProblem(order, { customId, amount })
  if (wrong) {
    await reportIncident('payment', `A ${partLabel(p, part).toLowerCase()} payment was refused before charging because the PayPal order didn't match (nothing charged).`, { token, part, orderId, ...wrong, amount })
    throw new HttpsError('failed-precondition', 'This payment doesn’t match what’s due. Nothing was charged. Please refresh and try again, or call us.')
  }

  // 2. One capture at a time per payment (a double click, two phones).
  const db = getFirestore()
  const lockPath = `paymentLocks.${part}`
  await db.runTransaction(async (tx) => {
    const p = (await tx.get(ref)).data()
    const problem = payableProblem(p, part, centralDay()) ?? lockProblem(p?.paymentLocks?.[part], orderId, Date.now())
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
    await reportIncident('payment', `PayPal couldn't complete a ${partLabel(p, part).toLowerCase()} payment (the customer was told to try again): ${e.message}`, { token, part, orderId })
    throw new HttpsError('unavailable', 'PayPal couldn’t complete the payment. Please try again, or call us.')
  }
  const capture = result.purchase_units?.[0]?.payments?.captures?.[0]
  const mismatch = captureProblem(result, { customId, amount })
  if (mismatch) {
    await unlock()
    await reportIncident('payment', `IMPORTANT: PayPal took a ${partLabel(p, part).toLowerCase()} payment but it didn't match what's due, so it wasn't recorded. Check PayPal order ${orderId}, then refund it or record it by hand.`, { token, part, orderId, status: result.status, ...mismatch, amount })
    throw new HttpsError('failed-precondition', 'Payment could not be confirmed. Please call us.')
  }

  // 4. Record it and release the lock together.
  const record = {
    status: 'paid', amount, orderId: result.id, captureId: capture.id, feeCents: paypalFeeCents(capture),
    payerEmail: result.payer?.email_address ?? null, env: PAYPAL_ENV.value(), paidAt: FieldValue.serverTimestamp(),
  }
  await ref.update({ ...(part === 'deposit' ? { deposit: record } : { [`payments.${part}`]: record }), [lockPath]: FieldValue.delete() })
  await recordUsage(paypalIncrement(capture, amount))
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
    await logWebsite('proposal-signed', proposalTarget(after, name), after.title ?? '')
    const first = name.split(' ')[0] || 'there'
    if (after.customer?.email) {
      const text = `Hi ${first},\n\nThank you for choosing Christmas Light Creations! Your signed agreement is here any time (save or print it as a PDF):\n${link}\n\nAll your agreements and payments are also in your account (sign in with this email, no password): ${SITE}/account/\n\nWe'll be in touch to confirm your install date.\n\n${TREE_TITLE}: ${TREE_NOTICE}\n\nThank you,\nChristmas Light Creations\n281-819-0163${textFooter()}`
      await mail.sendMail({
        from: `"Christmas Light Creations" <${FROM}>`, to: after.customer.email, replyTo: FROM,
        subject: 'Your signed Christmas light agreement',
        text, html: brandText({ heading: 'Your signed agreement', text, button: { href: link, label: 'Open your agreement' } }),
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
    if (was?.status === 'paid' || now?.status !== 'paid') continue
    await logWebsite('proposal-paid', proposalTarget(after, name), `${partLabel(after, part)} · ${dollars(now.amount)}${now.env === 'sandbox' ? ' (test)' : ''}`)
    if (!staff.length) continue
    await mail.sendMail({ from: `"CLC Website" <${FROM}>`, to: staff, subject: `${partLabel(after, part)} paid: ${name} ($${dollars(now.amount)})`, text: `${name} paid the $${dollars(now.amount)} ${partLabel(after, part).toLowerCase()} by PayPal${now.env === 'sandbox' ? ' (TEST payment, sandbox)' : ''}.\nPayPal order ${now.orderId}.\n\nCustomer view: ${link}` })
  }
}

// ---- Invoices (docs/specs/invoices.md) ------------------------------------
// Staff create, edit and send invoices in the staff app (firestore.rules).
// Only this code gives the number, sends the emails, takes the online
// payment, fills the season billing and sends reminders. Payment safety is
// the same as proposals: the amount comes from the stored invoice, the order
// is checked before capture, one capture at a time.
const invoiceLink = (token) => `${SITE}/invoice/?t=${token}`
const payCall = { region: REGION, invoker: 'public', secrets: [PAYPAL_SECRET, SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }

async function payableInvoice(token) {
  if (!validToken(token)) throw new HttpsError('invalid-argument', 'Bad link')
  const ref = getFirestore().doc(`invoices/${token}`)
  const inv = (await ref.get()).data()
  const problem = payableInvoiceProblem(inv)
  if (problem) throw new HttpsError(...problem)
  return { ref, inv, amount: invoiceCents(inv) }
}

export const createInvoiceOrder = onCall(payCall, async (req) => {
  const token = req.data?.token
  const { inv, amount } = await payableInvoice(token)
  const busy = lockProblem(inv.paymentLock, null, Date.now())
  if (busy) throw new HttpsError(...busy)
  try {
    const order = await createOrder(paypalCfg(), {
      token, customId: invoiceCustomId(token), amount: dollars(amount),
      description: `Invoice ${inv.number}: ${KIND_SHORT[inv.kind] ?? 'Christmas lighting'} for ${inv.customer?.address ?? ''}`,
    })
    return { orderId: order.id }
  } catch (e) {
    await reportIncident('paypal', `${inv.customer?.name ?? 'A customer'} tried to pay invoice ${inv.number} and PayPal refused: ${e.message}`, { invoice: token })
    throw new HttpsError('unavailable', e.message)
  }
})

export const captureInvoiceOrder = onCall(payCall, async (req) => {
  const token = req.data?.token
  const orderId = String(req.data?.orderId ?? '')
  if (!validOrderId(orderId)) throw new HttpsError('invalid-argument', 'Bad payment reference')
  const { ref, inv, amount } = await payableInvoice(token)
  const customId = invoiceCustomId(token)
  const cfg = paypalCfg()
  const label = `invoice ${inv.number}`

  // 1. Look at the order first: a wrong one is refused before any money moves.
  const order = await getOrder(cfg, orderId).catch(async (e) => {
    await reportIncident('paypal', `Couldn't check a payment for ${label} with PayPal (nothing charged): ${e.message}`, { invoice: token, orderId })
    throw new HttpsError('unavailable', 'PayPal didn’t answer. Please try again.')
  })
  const wrong = orderProblem(order, { customId, amount })
  if (wrong) {
    await reportIncident('payment', `A payment for ${label} was refused before charging because the PayPal order didn't match (nothing charged).`, { invoice: token, orderId, ...wrong, amount })
    throw new HttpsError('failed-precondition', 'This payment doesn’t match what’s due. Nothing was charged. Please refresh and try again, or call us.')
  }

  // 2. One capture at a time per invoice, and the invoice must not have changed.
  const db = getFirestore()
  await db.runTransaction(async (tx) => {
    const cur = (await tx.get(ref)).data()
    const problem = payableInvoiceProblem(cur) ?? lockProblem(cur?.paymentLock, orderId, Date.now())
    if (problem) throw new HttpsError(...problem)
    if (invoiceCents(cur) !== amount) throw new HttpsError('failed-precondition', 'This invoice just changed. Nothing was charged. Please refresh and try again.')
    tx.update(ref, { paymentLock: { orderId, at: Date.now() } })
  })
  const unlock = () => ref.update({ paymentLock: FieldValue.delete() }).catch((e) => logger.error('unlock', e))

  // 3. Take the money, then check PayPal's answer once more.
  let result
  try {
    result = await captureOrder(cfg, orderId)
  } catch (e) {
    await unlock()
    await reportIncident('payment', `PayPal couldn't complete a payment for ${label} (the customer was told to try again): ${e.message}`, { invoice: token, orderId })
    throw new HttpsError('unavailable', 'PayPal couldn’t complete the payment. Please try again, or call us.')
  }
  const capture = result.purchase_units?.[0]?.payments?.captures?.[0]
  const mismatch = captureProblem(result, { customId, amount })
  if (mismatch) {
    await unlock()
    await reportIncident('payment', `IMPORTANT: PayPal took a payment for ${label} but it didn't match what's due, so it wasn't recorded. Check PayPal order ${orderId}, then refund it or mark the invoice paid by hand.`, { invoice: token, orderId, status: result.status, ...mismatch, amount })
    throw new HttpsError('failed-precondition', 'Payment could not be confirmed. Please call us.')
  }

  // 4. Money moved: always record it, and release the lock with it. If staff
  // marked it paid or voided it in the meantime, say so (paid twice?).
  const record = {
    status: 'paid', cents: amount, orderId: result.id, captureId: capture.id, source: Object.keys(result.payment_source ?? {})[0] ?? 'paypal',
    feeCents: paypalFeeCents(capture),
    payerEmail: result.payer?.email_address ?? null, env: PAYPAL_ENV.value(), paidAt: FieldValue.serverTimestamp(),
  }
  const before = await db.runTransaction(async (tx) => {
    const cur = (await tx.get(ref)).data()
    tx.update(ref, { payment: record, status: 'paid', paymentLock: FieldValue.delete() })
    return cur
  })
  await recordUsage(paypalIncrement(capture, amount))
  if (before.status !== 'open' || invoiceCents(before) !== amount) {
    const what = before.status === 'paid' ? `marked paid by staff (${before.offline?.method ?? 'offline'})` : before.status === 'void' ? 'voided' : 'changed'
    await reportIncident('payment', `IMPORTANT: ${before.customer?.name ?? 'A customer'} paid ${label} online ($${dollars(amount)}) just after it was ${what}. Check whether they paid twice; refund in PayPal if so (order ${result.id}).`, { invoice: token, orderId: result.id })
  }
  return { paid: true }
})

// A one-time step for an invoice (an email, a season fill). The claim is
// written in a transaction before it runs, so two runs of the trigger at the
// same moment can't both send it. Steps report their own failures and return
// { failed }, which stays on the invoice (no retry loop).
async function once(ref, inv, map, key, run) {
  if (inv[map]?.[key]) return
  const claimed = await getFirestore().runTransaction(async (tx) => {
    if ((await tx.get(ref)).data()?.[map]?.[key]) return false
    tx.update(ref, { [`${map}.${key}`]: { at: Date.now() } })
    return true
  })
  if (!claimed) return
  const extra = await run()
  if (extra && Object.keys(extra).length) await ref.update({ [`${map}.${key}`]: { at: Date.now(), ...extra } })
}

async function mailInvoiceCustomer(token, inv, message, what) {
  const to = inv.customer.email.trim()
  try {
    await mailer().sendMail({ from: `"Christmas Light Creations" <${FROM}>`, to, replyTo: FROM, ...message })
    return { to }
  } catch (e) {
    await reportIncident('email', `${what} to ${inv.customer?.name ?? 'a customer'} (${to}) didn't go out: ${e.message}. Text them the link instead: ${invoiceLink(token)}`, { invoice: token })
    return { to, failed: String(e.message).slice(0, 200) }
  }
}

// Writes the season billing boxes worked out by fillsOf(invoice, customer)
// (only empty ones; functions/invoices.js), stamped like a staff edit.
async function fillCustomerSeason(inv, fillsOf, what) {
  if (!inv.customerId || inv.customerId.includes('/')) return { skipped: 'no customer' }
  const db = getFirestore()
  const ref = db.doc(`customers/${inv.customerId}`)
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists) return { skipped: 'customer not found' }
      const fills = fillsOf(inv, snap.data())
      if (fills.length) tx.update(ref, { ...Object.fromEntries(fills.map((f) => [f.path, f.value])), updatedAt: FieldValue.serverTimestamp(), updatedBy: `website (invoice ${inv.number})` })
      return { filled: fills.length }
    })
  } catch (e) {
    await reportIncident('other', `Invoice ${inv.number} (${inv.customer?.name ?? ''}): couldn't ${what} on their ${inv.season} season billing. Fill it in by hand (Edit details): ${e.message}`, { invoice: inv.number })
    return { failed: String(e.message).slice(0, 200) }
  }
}

// CLC-2026-0001: the year it's sent (Central) + a count kept in
// serverState/invoiceNumbers (no client rule matches serverState).
async function assignInvoiceNumber(ref) {
  const db = getFirestore()
  const counter = db.doc('serverState/invoiceNumbers')
  return db.runTransaction(async (tx) => {
    const [snap, count] = await Promise.all([tx.get(ref), tx.get(counter)])
    const inv = snap.data()
    if (inv.number) return inv
    const year = centralDay().slice(0, 4)
    const n = (Number(count.data()?.[year]) || 0) + 1
    const number = invoiceNumber(year, n)
    tx.set(counter, { [year]: n }, { merge: true })
    tx.update(ref, { number, sentAt: FieldValue.serverTimestamp() })
    return { ...inv, number, sentAt: new Date() }
  })
}

// Every write to an invoice: keep its email key (for /account/), then do what
// its state calls for. Each step runs once, so this is safe to run again.
export const invoiceChanged = onDocumentWritten({ document: 'invoices/{token}', secrets: [SMTP_PASSWORD], region: REGION }, async (event) => {
  if (!event.data?.after?.exists) return
  try {
    await invoiceSteps(event.data.after.ref, event.params.token)
  } catch (e) {
    await reportIncident('other', `Something went wrong after an invoice changed (link ${event.params.token.slice(0, 6)}…): ${e.message}`, { invoice: event.params.token })
  }
})

async function invoiceSteps(ref, token) {
  let inv = (await ref.get()).data()
  if (!inv) return
  const keyPatch = keysPatch(inv, PROPOSAL_KEYS) // same shape as a proposal: customer.email / customer.phone
  if (keyPatch) await ref.update(keyPatch)
  if (inv.status !== 'open' && inv.status !== 'paid') return
  if (!inv.number) inv = await assignInvoiceNumber(ref)
  const link = invoiceLink(token)
  const today = centralDay()
  const canMail = emailOk(inv.customer?.email)

  if (inv.status === 'open') {
    await once(ref, inv, 'done', 'invoiceBox', () => fillCustomerSeason(inv, seasonFillsOnSend, 'mark the invoice as sent'))
    if (canMail) {
      // Also covers an email added later to an invoice sent without one.
      await once(ref, inv, 'sent', 'invoice', () => mailInvoiceCustomer(token, inv, invoiceEmail({ inv, link, today }), `Invoice ${inv.number}`))
      const again = toMs(inv.emailAgainAt)
      if (inv.sent?.invoice && Number.isFinite(again)) await once(ref, inv, 'sent', `again_${again}`, () => mailInvoiceCustomer(token, inv, invoiceEmail({ inv, link, today, type: 'again' }), `Invoice ${inv.number} (sent again)`))
    }
  }

  const paid = paidInfo(inv)
  if (inv.status === 'paid' && paid) {
    await once(ref, inv, 'done', `season_${paid.id}`, () => fillCustomerSeason(inv, (i, c) => seasonFillsOnPaid(i, c, paid), 'mark it paid'))
    // Paid online: a Recent activity entry (staff log their own Mark paid).
    if (paid.online) {
      await once(ref, inv, 'done', `activity_${paid.id}`, async () => {
        await logWebsite('invoice-paid-online', { type: 'customer', id: inv.customerId, name: inv.customer?.name }, `${inv.number} · ${dollars(paid.cents ?? invoiceCents(inv))}${paid.sandbox ? ' (test)' : ''}`)
        return {}
      })
    }
    await once(ref, inv, 'done', `staff_${paid.id}`, async () => {
      const to = await staffEmails()
      if (!to.length) return { skipped: 'no alert list' }
      try {
        await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, ...staffPaidEmail({ inv, link, paid }) })
        return {}
      } catch (e) {
        await reportIncident('email', `The "invoice paid" email for ${inv.number} (${inv.customer?.name ?? ''}) didn't go out: ${e.message}`, { invoice: inv.number })
        return { failed: String(e.message).slice(0, 200) }
      }
    })
    if (canMail) await once(ref, inv, 'sent', `receipt_${paid.id}`, () => mailInvoiceCustomer(token, inv, receiptEmail({ inv, link, paid }), `The receipt for invoice ${inv.number}`))
  }
}

// Reminders (9 am Central): 7 and 14 days past due, then stop (owner
// 2026-10-09). Rules in reminderDue (functions/invoices.js).
export const invoiceReminders = onSchedule({ schedule: '0 9 * * *', timeZone: 'America/Chicago', region: REGION, secrets: [SMTP_PASSWORD] }, async () => {
  const snap = await getFirestore().collection('invoices').where('status', '==', 'open').get()
  const today = centralDay()
  const now = Date.now()
  let sent = 0
  for (const d of snap.docs) {
    const inv = d.data()
    const day = reminderDue(inv, today, now)
    if (!day) continue
    try {
      await once(d.ref, inv, 'sent', `reminder_${day}`, () => mailInvoiceCustomer(d.id, inv, invoiceEmail({ inv, link: invoiceLink(d.id), today, type: 'reminder', day }), `A reminder for invoice ${inv.number}`))
      sent++
    } catch (e) {
      await reportIncident('other', `A reminder for invoice ${inv.number} failed: ${e.message}`, { invoice: inv.number })
    }
  }
  logger.info('invoiceReminders', { open: snap.size, sent })
})

// Pay in 3 (functions/payIn3.js, docs/specs/pay-in-3.md): the morning a
// payment falls due (the customer's 1st or 15th) and a week later if still
// unpaid, email them the Pay link; staff see nothing unless the email fails.
// Auto-draft through a PayPal subscription waits for the attorney (switch
// planned in Settings; off).
export const payIn3Reminders = onSchedule({ schedule: '5 9 * * *', timeZone: 'America/Chicago', region: REGION, secrets: [SMTP_PASSWORD] }, async () => {
  const snap = await getFirestore().collection('proposals').where('plan', '==', 'payin3').get()
  const today = centralDay()
  let sent = 0
  for (const d of snap.docs) {
    const p = d.data()
    if (!['signed', 'countersigned'].includes(p.status)) continue
    const dues = payIn3Due(centralDayOf(p.signedAt), p.payDay)
    if (!dues) continue
    for (const part of ['balance', 'takedown']) {
      if (paymentOf(p, part)?.status === 'paid' || partCents(p, part) <= 0) continue
      const kind = payIn3Reminder(dues[part], today)
      if (!kind) continue
      const to = String(p.customer?.email ?? '').trim()
      try {
        await once(d.ref, p, 'reminders', `${part}_${kind}`, async () => {
          if (!emailOk(to)) return { skipped: 'no email' }
          const label = partLabel(p, part)
          const amount = `$${dollars(partCents(p, part))}`
          const first = String(p.customer?.name ?? '').trim().split(/\s+/)[0] || 'there'
          const link = `${SITE}/proposal/?t=${d.id}`
          const when = kind === 'due' ? 'is due today' : `was due ${dueText(dues[part])} and is still open`
          const text = `Hi ${first},

${label} for your Christmas lights, ${amount}, ${when}. Pay online here (PayPal, Venmo or a card):
${link}

Zelle, check or cash work too: just reply or call ${PHONE}.

Thank you!
Christmas Light Creations
${PHONE}${textFooter()}`
          await mailer().sendMail({
            from: `"Christmas Light Creations" <${FROM}>`, to, replyTo: FROM,
            subject: `${label} ${kind === 'due' ? 'is due today' : 'is a week past due'}: Christmas Light Creations`,
            text, html: brandText({ heading: `${label} ${kind === 'due' ? 'is due today' : 'is past due'}`, text, button: { href: link, label: 'Pay online' } }),
          })
          sent++
          return { to }
        })
      } catch (e) {
        await reportIncident('email', `A Pay-in-3 reminder to ${p.customer?.name ?? 'a customer'} (${to}) didn't go out: ${e.message}. Text them the link: ${SITE}/proposal/?t=${d.id}`, { proposal: d.id })
      }
    }
  }
  logger.info('payIn3Reminders', { proposals: snap.size, sent })
})

// "Your property details" on /account/ (functions/propertyDetails.js, owner
// 2026-10-12): the customer fills in their gate code, HOA and its deadline,
// things to avoid in the yard and pets; written onto every customer record
// under their email, shown to staff under Edit details and in Recent activity.
export const updateMyDetails = onCall({ region: REGION, invoker: 'public', cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const who = signedInCustomer(req)
  const email = who.key
  const r = detailsRequest(req.data)
  if (r.error) throw new HttpsError(...r.error)
  const db = getFirestore()
  const ids = await customersFor(who)
  if (!ids.length) throw new HttpsError('failed-precondition', `${NO_RECORD(who)} and we’ll take care of it.`)
  let changed = []
  let name = ''
  for (const id of ids) {
    const ref = db.doc(`customers/${id}`)
    const before = (await ref.get()).data() ?? {}
    name = name || before.fullName || ''
    const diff = detailsChanged(before, r.details)
    if (!diff.length) continue
    changed = [...new Set([...changed, ...diff])]
    await ref.update({ ...r.details, updatedAt: FieldValue.serverTimestamp(), updatedBy: `customer:${email}` })
  }
  if (changed.length) await logWebsite('details-updated', { type: 'customer', id: ids[0], name }, changed.join(', '))
  logger.info('updateMyDetails', { changed: changed.length })
  return { saved: true, changed }
})

// "Yes, put my lights back up" on /account/ (functions/rebook.js, owner
// 2026-10-13): marks this season Confirmed on the customer's records, keeps
// the week they'd like and a note, alerts staff, shows in Recent activity.
export const rebookMe = onCall({ region: REGION, invoker: 'public', secrets: [SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const who = signedInCustomer(req)
  const email = who.key
  const r = rebookRequest(req.data)
  if (r.error) throw new HttpsError(...r.error)
  const db = getFirestore()
  const ids = await customersFor(who)
  if (!ids.length) throw new HttpsError('failed-precondition', `${NO_RECORD(who)} and we’ll book you.`)
  const now = new Date()
  const season = String(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1)
  let customer = null
  let already = null
  let changed = 0
  for (const id of ids) {
    const ref = db.doc(`customers/${id}`)
    const c = (await ref.get()).data() ?? {}
    customer ??= { id, ...c }
    const result = rebookPatch(c.seasons?.[season], r, now)
    if (result.already) { already ??= result.already; continue }
    const patch = Object.fromEntries(Object.entries(result.patch).map(([k, v]) => [`seasons.${season}.${k}`, v]))
    await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp(), updatedBy: `customer:${email}` })
    changed++
  }
  if (!changed) { logger.info('rebookMe: already on the list'); return { already: already || 'on the list' } }
  await logWebsite('rebooked', { type: 'customer', id: customer.id, name: customer.fullName }, [r.week, r.note].filter(Boolean).join(' · '))
  await alertStaff(rebookPush(customer, customer.id, r))
  const to = await staffEmails()
  if (to.length) {
    try {
      await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, ...rebookEmail(customer, customer.id, r, season) })
    } catch (e) { await reportIncident('email', `${customer.fullName || 'A customer'} tapped "put my lights back up", but the staff email didn't go out: ${e.message}`) }
  }
  logger.info('rebookMe', { season, changed })
  return { booked: true, season }
})

// ---- Customer accounts (/account/) ------------------------------------------

// Who is calling an account function: the verified email and/or the phone
// from the sign-in token (functions/account.js accountIdentity), or
// "sign in again". `key` (email, else phone) is what records name them by.
function signedInCustomer(req) {
  const who = accountIdentity(req.auth?.token)
  if (!who) throw new HttpsError('unauthenticated', 'Please sign in again')
  return who
}
const NO_RECORD = (who) => `We couldn’t find your customer record under this ${who.email ? 'email' : 'phone number'}. Please call or text us at 281-819-0163`

// emailKeys / phoneKeys: lowercase emails and E.164 phones on each proposal,
// customer and invoice, written only by the server (triggers below), so a
// lookup is one query per key instead of reading every record. The first
// lookup after a new index version went live fills in records saved before
// it (serverState/emailIndex; no client rule matches serverState). Version 2
// added phoneKeys (docs/specs/phone-sign-in.md).
const PROPOSAL_KEYS = { emailKeys: proposalEmailKeys, phoneKeys: proposalPhoneKeys }
const CUSTOMER_KEYS = { emailKeys: customerEmailKeys, phoneKeys: customerPhoneKeys }
// The fields whose stored keys differ from what the record says, or null.
function keysPatch(data, keysOf) {
  const patch = Object.fromEntries(Object.entries(keysOf).map(([field, of]) => [field, of(data)]).filter(([field, keys]) => !sameKeys(keys, data?.[field])))
  return Object.keys(patch).length ? patch : null
}
const INDEX_VERSION = 2
async function ensureAccountIndex() {
  const db = getFirestore()
  const flag = db.doc('serverState/emailIndex')
  if ((await flag.get()).data()?.version === INDEX_VERSION) return
  const [props, custs, invs] = await Promise.all([
    db.collection('proposals').select('customer.email', 'customer.phone', 'emailKeys', 'phoneKeys').get(),
    db.collection('customers').select('email', 'otherEmails', 'phone', 'otherPhones', 'emailKeys', 'phoneKeys').get(),
    db.collection('invoices').select('customer.email', 'customer.phone', 'emailKeys', 'phoneKeys').get(),
  ])
  const writes = [
    ...props.docs.map((d) => [d.ref, keysPatch(d.data(), PROPOSAL_KEYS)]),
    ...custs.docs.map((d) => [d.ref, keysPatch(d.data(), CUSTOMER_KEYS)]),
    ...invs.docs.map((d) => [d.ref, keysPatch(d.data(), PROPOSAL_KEYS)]),
  ].filter(([, patch]) => patch)
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch()
    writes.slice(i, i + 400).forEach(([ref, patch]) => batch.update(ref, patch))
    await batch.commit()
  }
  await flag.set({ version: INDEX_VERSION, at: new Date(), filled: writes.length })
  logger.info(`Account index v${INDEX_VERSION} filled for ${writes.length} records`)
}

// Ids of the documents in `name` whose keys hold any of this person's keys
// (emailKeys for the email, phoneKeys for the phone), unique, in query order.
async function accountDocsFor(name, who, select = true) {
  const col = getFirestore().collection(name)
  const seen = new Map()
  for (const [field, value] of accountQueries(who)) {
    const q = col.where(field, 'array-contains', value)
    const snap = select ? await q.select().get() : await q.get()
    for (const d of snap.docs) if (!seen.has(d.id)) seen.set(d.id, d)
  }
  return [...seen.values()]
}

// Tokens of proposals sent to this person (email in any letter case, or phone).
async function proposalTokensFor(who) {
  await ensureAccountIndex()
  return (await accountDocsFor('proposals', who)).map((d) => d.id)
}

// Sent invoices to this person (their keys are set by invoiceChanged).
async function invoicesFor(who) {
  return (await accountDocsFor('invoices', who, false)).filter((d) => shownInvoice(d.data()))
}

// Customer records (old sheet + staff app) listing this person, incl. linked other emails and phones.
async function customersFor(who) {
  await ensureAccountIndex()
  return (await accountDocsFor('customers', who)).map((d) => d.id)
}

// Keep emailKeys and phoneKeys right whenever a proposal or customer is saved
// (writes only when they changed, so it doesn't loop).
const keepKeys = (keysOf) => async (event) => {
  const after = event.data?.after
  if (!after?.exists) return
  const patch = keysPatch(after.data(), keysOf)
  if (patch) await after.ref.update(patch)
}
export const proposalEmails = onDocumentWritten({ document: 'proposals/{token}', region: REGION }, keepKeys(PROPOSAL_KEYS))
export const customerEmails = onDocumentWritten({ document: 'customers/{id}', region: REGION }, keepKeys(CUSTOMER_KEYS))

// Emails a one-time sign-in link from info@, but only to an email that has a
// proposal or a customer record. The answer is the same either way, so nobody can test whether an
// address is a customer. At most one link a minute, 5 a day, per email.
export const sendAccountLink = onCall({ region: REGION, invoker: 'public', secrets: [SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const email = normEmail(req.data?.email)
  if (!EMAIL_RE.test(email) || email.length > 200) throw new HttpsError('invalid-argument', 'Please enter a valid email')
  const who = { email, phone: '', key: email }
  const [tokens, customerIds, invoices] = await Promise.all([proposalTokensFor(who), customersFor(who), invoicesFor(who)])
  if (!tokens.length && !customerIds.length && !invoices.length) { logger.info('Account link asked for an unknown email'); return { ok: true } }

  // Server-only bookkeeping (no client rule matches accountLinks, so browsers can't read it).
  const limitRef = getFirestore().doc(`accountLinks/${encodeURIComponent(email)}`)
  const now = Date.now()
  const day = new Date(now).toISOString().slice(0, 10)
  const prev = (await limitRef.get()).data() ?? {}
  const today = prev.day === day ? prev.count ?? 0 : 0
  if (now - (prev.lastAt ?? 0) < 60_000 || today >= 5) { logger.warn('Account link rate-limited'); return { ok: true } }
  await limitRef.set({ lastAt: now, day, count: today + 1 })

  const link = await getAuth().generateSignInWithEmailLink(email, { url: accountUrl(req.data?.origin), handleCodeInApp: true })
  const text = `Hi,

Tap this link to open your account (your agreements, what's paid, and anything due):
${link}

The link works once. If you didn't ask for it, just ignore this email.

Thank you,
Christmas Light Creations
281-819-0163${textFooter()}`
  await sendOrReport(email, {
    from: `"Christmas Light Creations" <${FROM}>`, to: email, replyTo: FROM,
    subject: 'Your Christmas Light Creations sign-in link',
    text, html: brandText({ heading: 'Your sign-in link', text, button: { href: link, label: 'Open your account' } }),
  })
  return { ok: true }
})

// For staff (Accounts page): first and last sign-in per email, or per phone
// for phone sign-ins (customerLogins/{key}). Times are stored as Firestore
// timestamps; compared as milliseconds.
// `app`: the device name when the page runs as the installed app (owner
// 2026-10-12: "can we see who has chosen to install the app"), kept once set.
async function recordLogin(db, who, token, app = '') {
  if (who.key.includes('/')) return
  const ref = db.doc(`customerLogins/${who.key}`)
  await db.runTransaction(async (tx) => {
    const prev = (await tx.get(ref)).data()
    const ms = (t) => (t?.toMillis ? t.toMillis() : null)
    const rec = loginRecord(prev && { firstAt: ms(prev.firstAt), lastAt: ms(prev.lastAt), provider: prev.provider },
      { email: who.email, phone: who.phone, authTime: Number(token.auth_time) * 1000, provider: providerName(token.firebase?.sign_in_provider) })
    tx.set(ref, { ...rec, firstAt: new Date(rec.firstAt), lastAt: new Date(rec.lastAt), ...(app ? { app: { device: app, at: new Date() } } : {}) }, { merge: true })
  })
}

// The signed-in customer's proposals with what's paid and what's due. Only
// for a verified email (email-link sign-in always is) or a phone sign-in;
// payment amounts come from the stored proposals, same as the payment functions.
export const myAccount = onCall({ region: REGION, invoker: 'public', cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const who = signedInCustomer(req)
  const db = getFirestore()
  await recordLogin(db, who, req.auth.token, String(req.data?.app ?? '').slice(0, 40)).catch((e) => logger.warn('recordLogin', e))
  const tokens = await proposalTokensFor(who)
  const docs = tokens.length ? await db.getAll(...tokens.map((t) => db.doc(`proposals/${t}`)), { fieldMask: ['status', 'title', 'season', 'customer', 'items', 'discountPct', 'depositPct', 'deposit', 'payments', 'requests', 'sentAt', 'signedAt'] }) : []
  const proposals = docs.filter((d) => shownInAccount(d.data())).map((d) => accountSummary(d.id, d.data(), centralDay())).sort(byNewest)
  // Yearly price breakdown from their customer record, once staff allow it.
  const ids = await customersFor(who)
  const recs = ids.length ? await db.getAll(...ids.map((id) => db.doc(`customers/${id}`)), { fieldMask: ['fullName', 'address', 'since', 'originalRate', 'addOns', 'priceShown', 'seasons'] }) : []
  const rec = recs.map((d) => d.data()).find(Boolean)
  const now = new Date()
  const season = String(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1) // same as src/lib/customers.js seasonYear (server clock is UTC; fine for a July 1 cutover)
  const price = recs.map((d) => customerForAccount(d.data(), season)).find(Boolean) ?? null
  // Their invoices (sent or paid; never drafts or voided ones), newest first.
  const today = centralDay()
  const invoices = (await invoicesFor(who)).map((d) => invoiceSummary(d.id, d.data(), today)).sort((a, b) => String(b.sentDay).localeCompare(String(a.sentDay)) || b.number.localeCompare(a.number))
  // This season's schedule and any open service call (docs/specs/account-service.md).
  const schedule = rec ? scheduleFor(rec.seasons, season) : null
  const service = ids.length ? { days: SERVICE_DAYS, open: await openCallFor(db, ids) } : null
  // Property details the customer may fill in themselves (functions/propertyDetails.js).
  const details = rec ? detailsSummary(rec) : null
  // Chat with us (docs/specs/account-chat.md): the thread on their first record, staff emails stripped.
  const chat = ids.length ? customerView((await db.doc(`conversations/${ids[0]}`).get()).data()) : null
  return { email: who.email, phone: who.phone, proposals, invoices, price, schedule, service, details, chat, customer: rec ? { name: rec.fullName ?? '', address: rec.address ?? '' } : null }
})

// The newest Open / Scheduled service call on any of these customer records,
// as the customer may see it (no staff notes), or null.
async function openCallFor(db, ids, tx = null) {
  const q = db.collection('serviceCalls').where('customerId', 'in', ids.slice(0, 30))
  const snap = tx ? await tx.get(q) : await q.get()
  const open = openReport(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  return open ? openSummary(open.id, open) : null
}

// "Report a problem" on /account/ (docs/specs/account-service.md): the report
// becomes a service call on the customer's record with the same fields staff's
// Log call writes (plus where it came from), is logged in Recent activity, and
// staff get the phone notification and the alert email like for a new estimate
// request. One open call per customer: the check and the write share a
// transaction, so two taps can't make two. Logs carry no note text.
export const reportProblem = onCall({ region: REGION, invoker: 'public', secrets: [SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const who = signedInCustomer(req)
  const email = who.key
  const r = reportRequest(req.data)
  if (r.error) throw new HttpsError(...r.error)
  const db = getFirestore()
  const ids = await customersFor(who)
  if (!ids.length) throw new HttpsError('failed-precondition', `${NO_RECORD(who)} and we’ll take care of it.`)
  const ref = db.collection('serviceCalls').doc()
  const day = centralDay()
  const result = await db.runTransaction(async (tx) => {
    const open = await openCallFor(db, ids, tx)
    if (open) return { open }
    const snap = await tx.get(db.doc(`customers/${ids[0]}`))
    const customer = { id: snap.id, ...snap.data() }
    const call = reportCall({ customer, issue: r.issue, details: r.details, email, day })
    const now = FieldValue.serverTimestamp()
    tx.create(ref, { ...call, reportedAt: now, createdAt: now, updatedAt: now })
    return { call, customer }
  })
  if (result.open) throw new HttpsError('already-exists', openMessage(result.open))
  const { call, customer } = result
  await logWebsite('service-reported', { type: 'customer', id: customer.id, name: customer.fullName }, call.issue)
  await alertStaff(reportPush(call, customer.id))
  const name = customer.fullName || 'A customer'
  const to = await staffEmails()
  if (!to.length) {
    await reportIncident('service-alert', `${name} reported a problem from their account (it’s on the Service tab), but nobody is on the alert list (staff app → ⚙ Settings → New-request alerts).`)
  } else {
    try {
      await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, ...reportEmail(call, customer) })
    } catch (e) {
      await reportIncident('service-alert', `${name} reported a problem from their account (it’s on the Service tab), but the alert email failed: ${e.message}`, { callId: ref.id })
    }
  }
  logger.info('reportProblem', { issue: call.issue, note: Boolean(call.details), emailed: to.length })
  return { ok: true, days: SERVICE_DAYS, open: openSummary(ref.id, call) }
})

// ---- Account chat (functions/chat.js, docs/specs/account-chat.md) -----------
// One document per customer, conversations/{customerId}, with the messages in
// an array (200 kept). Each append runs in a transaction with the rate-limit
// check (serverState/chat: per person and day). Logs carry no message text.

async function appendChat(db, customerId, msg, who, limits, by) {
  const ref = db.doc(`conversations/${customerId}`)
  const gate = db.doc('serverState/chat')
  return db.runTransaction(async (tx) => {
    const [conv, state, cust] = await Promise.all([tx.get(ref), tx.get(gate), tx.get(db.doc(`customers/${customerId}`))])
    if (!cust.exists) throw new HttpsError('not-found', 'That customer record is gone. Refresh and try again.')
    const allowed = chatAllowed(state.data(), who, limits, Date.now(), centralDay())
    if (allowed.problem) throw new HttpsError(...allowed.problem)
    tx.set(gate, allowed.next)
    const prev = conv.data() ?? null
    const customer = { id: cust.id, ...cust.data() }
    const next = appendMessage(prev, msg, customer, new Date())
    tx.set(ref, { ...next, updatedAt: FieldValue.serverTimestamp(), updatedBy: by })
    return { prev, next, customer }
  })
}

// The customer wrote from their account: save it, show it in 💬, buzz staff
// phones, and email the alert list when it starts a new unanswered thread.
export const sendAccountMessage = onCall({ region: REGION, invoker: 'public', secrets: [SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const who = signedInCustomer(req)
  const email = who.key // a phone for phone sign-ins: the chat's `by`; the reply email goes to the record's email (recipientFor)
  const r = chatRequest(req.data)
  if (r.error) throw new HttpsError(...r.error)
  const db = getFirestore()
  const ids = await customersFor(who)
  if (!ids.length) throw new HttpsError('failed-precondition', `${NO_RECORD(who)} and we’ll take care of it.`)
  const { prev, next, customer } = await appendChat(db, ids[0], { from: 'customer', by: email, text: r.text }, email, CHAT_LIMITS.customer, 'website')
  await logWebsite('chat-message', { type: 'customer', id: customer.id, name: customer.fullName }, previewText(r.text))
  await alertStaff(chatPush(customer.id, customer.fullName ?? '', r.text))
  const newThread = !prev?.waitingSince
  let emailed = 0
  if (newThread) {
    const to = await staffEmails()
    if (to.length) {
      try {
        await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, ...chatAlertEmail({ customer, text: r.text, email }) })
        emailed = to.length
      } catch (e) {
        await reportIncident('other', `${customer.fullName || 'A customer'} wrote from their account (it’s in 💬 and on their account), but the alert email failed: ${e.message}`)
      }
    }
  }
  logger.info('sendAccountMessage', { newThread, emailed, messages: next.messages.length })
  return { ok: true, chat: customerView(next) }
})

// Staff reply from the Chat box: save it, log it, email the customer (critical
// mail, through the branded shell; never optional).
export const replyToCustomer = onCall({ region: REGION, invoker: 'public', secrets: [SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in again.')
  if (!(await isStaffToken(req.auth.token))) throw new HttpsError('permission-denied', 'Staff only.')
  const staff = normEmail(req.auth.token.email)
  const r = chatRequest(req.data)
  if (r.error) throw new HttpsError(...r.error)
  const customerId = String(req.data?.customerId ?? '')
  if (!/^(?!__)[^/]{1,200}$/.test(customerId)) throw new HttpsError('invalid-argument', 'Unknown customer')
  const db = getFirestore()
  const { next, customer } = await appendChat(db, customerId, { from: 'staff', by: staff, text: r.text }, staff, CHAT_LIMITS.staff, staff)
  await logActivity(staff, 'chat-reply', { type: 'customer', id: customer.id, name: customer.fullName }, previewText(r.text))
  const to = recipientFor(next, customer)
  if (!to) {
    logger.info('replyToCustomer', { emailed: false, reason: 'no-email' })
    return { ok: true, emailed: false, note: 'Saved. No email on file: they’ll see it when they open their account.' }
  }
  try {
    await mailer().sendMail({ from: await senderFrom(db, staff), to, replyTo: FROM, ...replyEmail({ text: r.text }) })
  } catch (e) {
    await reportIncident('email', `A chat reply to ${customer.fullName || 'a customer'} (by ${staff}) is saved on their account, but the email telling them didn’t go out: ${e.message}`)
    return { ok: true, emailed: false, note: 'Saved on their account, but the email didn’t go out (Gmail didn’t take it). Text them to look, or try again in a minute.' }
  }
  logger.info('replyToCustomer', { emailed: true, messages: next.messages.length })
  return { ok: true, emailed: true, note: 'Sent. They get an email with your reply and see it in their account.' }
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
  const events = req.body.items.map(parseSyncItem)
  const needDir = events.some((e) => !e.skip)
  const [cust, leads] = needDir
    ? await Promise.all([db.collection('customers').select('phone', 'email', 'fullName').get(), db.collection('leads').select('phone', 'email', 'customerId', 'firstName', 'lastName').get()])
    : [{ docs: [] }, { docs: [] }]
  const dir = buildDirectory(cust.docs.map((d) => ({ id: d.id, ...d.data() })), leads.docs.map((d) => ({ id: d.id, ...d.data() })))
  const fromApp = await sentFromApp(db, events)
  // Blocked senders (🚫 Spam in the staff app, functions/blocklist.js): dropped before anything is stored.
  const blockedSenders = needDir ? ((await db.doc('settings/app').get()).data() ?? {}).blockedSenders : []

  const count = { saved: 0, duplicate: 0, skipped: 0, unmatched: 0, dropped: 0, bounced: 0 }
  const results = []
  const saved = [] // new history entries, for the staff phone notification
  const bounced = [] // our emails just marked bounced (docs/specs/email-bounces.md)
  for (const [i, event] of events.entries()) {
    const gmailId = String(req.body.items[i]?.gmailId ?? '')
    if (event.bounce) {
      if (req.body.dryRun === true) { results.push({ gmailId, ...bounceSummary(event, pickBounced(event, await bounceCandidates(db, event)).length) }); continue }
      const r = await markBounce(db, event)
      count[r.status]++
      bounced.push(...r.marked)
      results.push({ gmailId, status: r.status, ...(r.reason ? { reason: r.reason } : {}) })
      continue
    }
    const docs = event.skip ? [] : docsFor(event, dir)
    if (req.body.dryRun === true) { results.push({ gmailId, ...dryRunSummary(event, docs) }); continue }
    if (event.skip) { count.skipped++; results.push({ gmailId, status: 'skipped', reason: event.skip }); continue }
    if (blockedReason(event, blockedSenders)) { count.dropped++; results.push({ gmailId, status: 'dropped', reason: 'blocked' }); continue }
    const ours = fromApp(event)
    if (ours.length) {
      count.duplicate++
      results.push({ gmailId, status: 'duplicate', reason: 'sent-from-app' })
      await confirmSeen(db, ours).catch((e) => logger.warn('gmailSeenAt not saved', e.message))
      continue
    }
    if (!docs.length) { count.dropped++; results.push({ gmailId, status: 'dropped', reason: event.junk ? `junk-${event.junk}` : 'no-match' }); continue }
    let status = 'duplicate'
    for (const { id, data } of docs) {
      try {
        await db.doc(`messages/${id}`).create({ ...data, syncedAt: FieldValue.serverTimestamp() })
        status = 'saved'
        saved.push(data)
        if (data.unmatched) count.unmatched++
      } catch (e) {
        if (e.code !== 6) throw e // 6 = ALREADY_EXISTS
      }
    }
    count[status]++
    results.push({ gmailId, status })
  }
  logger.info('messageSync', { items: events.length, dryRun: req.body.dryRun === true, ...count, reasons: events.filter((e) => e.skip).map((e) => e.skip) })
  // Before answering: Cloud Run may pause the instance once the answer is sent.
  const names = namesOf(cust.docs, leads.docs)
  if (saved.length) await alertStaff(pushFor(saved, names))
  if (bounced.length) {
    for (const m of bounced) await reportIncident('bounce', bounceIncident(m, names), { messageId: m.id })
    await alertStaff(bouncePush(bounced, names))
  }
  res.json({ ok: true, ...count, results })
}

// ---- Bounces: our emails that came back undelivered (docs/specs/email-bounces.md)

// History entries a bounce may be about: by the original's Message-ID (the
// entry ids start with it), else by the failed address.
async function bounceCandidates(db, bounce) {
  const all = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const byRef = []
  for (const base of bounce.refs) {
    byRef.push(...all(await db.collection('messages').where(FieldPath.documentId(), '>=', `${base}-`).where(FieldPath.documentId(), '<', `${base}-`).get()))
  }
  if (pickBounced(bounce, { byRef }).length) return { byRef }
  const byEmail = []
  for (const email of bounce.emails) byEmail.push(...all(await db.collection('messages').where('email', '==', email).get()))
  return { byRef, byEmail }
}

// Marks the bounced email(s) once (the sync re-sends the same notice) and
// flags the address on their record. -> { status, reason?, marked: [entries] }
async function markBounce(db, bounce) {
  const picked = pickBounced(bounce, await bounceCandidates(db, bounce))
  if (!picked.length) return { status: 'dropped', reason: 'bounce-no-match', marked: [] }
  const marked = []
  for (const { id } of picked) {
    const ref = db.doc(`messages/${id}`)
    const entry = await db.runTransaction(async (tx) => {
      const cur = (await tx.get(ref)).data()
      if (!cur || cur.bouncedAt) return null
      const fields = bounceFields(bounce)
      tx.update(ref, fields)
      return { id, ...cur, ...fields }
    })
    if (!entry) continue
    marked.push(entry)
    for (const path of entry.email ? recordsOf(entry) : []) {
      // Gone record (code 5): nothing to flag. The log names the collection only.
      await db.doc(path).update(new FieldPath('bouncedEmails', entry.email), { at: bounce.at, reason: bounce.reason, entryId: id })
        .catch((e) => logger.warn('bounce flag not saved', { record: path.split('/')[0], code: e.code ?? 'unknown' }))
    }
  }
  return marked.length ? { status: 'bounced', marked } : { status: 'duplicate', reason: 'already-bounced', marked }
}

// ---- Staff alerts: phone notifications (docs/specs/staff-alerts.md) ---------
// Each staff member turns them on per device (staff app → 💬); the device ids
// (Firebase Installation IDs) are in staffPrefs/{email}.pushDevices. Sent with
// the FCM HTTP v1 API directly: firebase-admin 13 can't target an FID.

const namesOf = (custDocs, leadDocs) => Object.fromEntries([
  ...custDocs.map((d) => [`customer:${d.id}`, d.get('fullName') ?? '']),
  ...leadDocs.map((d) => [`lead:${d.id}`, `${d.get('firstName') ?? ''} ${d.get('lastName') ?? ''}`.trim()]),
])

// One notification to the given staffPrefs docs' devices; devices FCM says are
// gone are removed. Logs counts only, never the text.
async function pushToDevices(push, prefDocs) {
  const devices = devicesOf(prefDocs.filter((d) => d.exists).map((d) => ({ email: d.id, ...d.data() })))
  if (!push || !devices.length) return { devices: devices.length, sent: 0, gone: 0, failed: 0 }
  const { access_token: token } = await getApp().options.credential.getAccessToken()
  const url = `https://fcm.googleapis.com/v1/projects/${process.env.GCLOUD_PROJECT || getApp().options.projectId}/messages:send`
  const results = await Promise.all(devices.map(async (d) => {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(fcmMessage(d.fid, push)) })
    if (r.ok) return { ok: true }
    const body = await r.json().catch(() => null)
    return { ok: false, gone: deviceGone(body), d, status: r.status, code: body?.error?.status }
  }))
  const gone = results.filter((x) => x.gone)
  const db = getFirestore()
  await Promise.all(gone.map(({ d }) => db.doc(`staffPrefs/${d.email}`).update(new FieldPath('pushDevices', d.fid), FieldValue.delete()).catch((e) => logger.warn('drop device', e.message))))
  const failed = results.filter((x) => !x.ok && !x.gone)
  const out = { devices: devices.length, sent: results.filter((x) => x.ok).length, gone: gone.length, failed: failed.length }
  logger.info('staffPush', { ...out, errors: failed.map((x) => `${x.status} ${x.code ?? ''}`.trim()) })
  if (failed.length && !out.sent) throw new Error(`FCM refused all ${failed.length} (${failed[0].status} ${failed[0].code ?? ''})`)
  return out
}

// After a sync: tell every staff device. Never throws (the messages are saved
// either way); a failure is reported at most every 6 hours.
async function alertStaff(push) {
  if (!push) return
  try {
    await pushToDevices(push, (await getFirestore().collection('staffPrefs').get()).docs)
  } catch (e) {
    logger.error('staffPush failed', e.message)
    try {
      const gate = getFirestore().doc('serverState/pushProblem')
      if (Date.now() - ((await gate.get()).data()?.at ?? 0) < 6 * 60 * 60 * 1000) return
      await gate.set({ at: Date.now() })
      await reportIncident('push', `Phone notifications for new customer messages didn't go out (the messages are in the app): ${e.message}`)
    } catch (e2) { logger.error('push problem report failed', e2) }
  }
}

// "Send a test" in the staff app: a test notification to the caller's own devices.
export const sendTestPush = onCall({ region: REGION, invoker: 'public', cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in again.')
  if (!(await isStaffToken(req.auth.token))) throw new HttpsError('permission-denied', 'Staff only.')
  const ref = getFirestore().doc(`staffPrefs/${normEmail(req.auth.token.email)}`)
  try {
    return await pushToDevices(TEST_PUSH, [await ref.get()])
  } catch (e) {
    throw new HttpsError('unavailable', `The notification service refused it: ${e.message}`)
  }
})

// Emails sent from the staff app are already in history (sendStaffEmail):
// returns a lookup giving the app's own entries for a copy in info@'s Sent
// folder, found by Message-ID or by the recipient/subject/text print (`in`
// takes 30 values). Empty = not from the app.
async function sentFromApp(db, events) {
  const keys = events.map(appSentKeys).filter(Boolean)
  const found = new Map() // key value -> [{ id, scheduledId, seen }]
  for (const field of ['mailId', 'mailPrint']) {
    const values = [...new Set(keys.map((k) => k[field]))]
    for (let i = 0; i < values.length; i += 30) {
      const snap = await db.collection('messages').where(field, 'in', values.slice(i, i + 30)).select(field, 'scheduledId', 'gmailSeenAt').get()
      snap.docs.forEach((d) => {
        const v = d.get(field)
        found.set(v, [...(found.get(v) ?? []), { id: d.id, scheduledId: d.get('scheduledId') ?? null, seen: Boolean(d.get('gmailSeenAt')) }])
      })
    }
  }
  return (event) => {
    const k = found.size ? appSentKeys(event) : null
    return k ? [...(found.get(k.mailId) ?? []), ...(found.get(k.mailPrint) ?? [])] : []
  }
}

// Gmail's Sent folder has the app's email: stamp the history entry (and the
// scheduled email it came from) so Home's "Outgoing email" light can go green.
async function confirmSeen(db, entries) {
  const done = new Set()
  for (const e of entries) {
    if (e.seen || done.has(e.id)) continue
    done.add(e.id)
    await db.doc(`messages/${e.id}`).update({ gmailSeenAt: FieldValue.serverTimestamp() })
    if (e.scheduledId) await db.doc(`scheduledEmails/${e.scheduledId}`).update({ gmailSeenAt: FieldValue.serverTimestamp() }).catch(() => {})
  }
}

// ---- Staff email from the app (docs/specs/staff-email.md) -------------------
// Staff send one plain email from info@ to an address on the person's record.
// It goes in their history at once; the sync skips its Sent copy. Limited to
// 300 a day and one a second per staff member (serverState/staffEmail: no
// client rule matches it). Logs and problem reports carry no customer
// address or message text.
// "Katie at Christmas Light Creations" <info@…>: the From header for an email a
// staff member sends (owner 2026-10-13). Names from ⚙ Settings → Staff names
// or the staff list doc; unknown -> the business alone. Never throws.
async function senderFrom(db, staffEmail) {
  try {
    const [settings, doc] = await Promise.all([db.doc('settings/app').get(), db.doc(`staff/${staffEmail}`).get()])
    const names = staffNamesMap([{ id: staffEmail, name: doc.data()?.name }], settings.data()?.staffNames)
    return fromHeader(staffName(staffEmail, names), FROM)
  } catch (e) {
    logger.warn('senderFrom', e.message)
    return fromHeader('', FROM)
  }
}

async function isStaffToken(token) {
  if (token?.email_verified !== true || token.firebase?.sign_in_provider !== 'google.com' || !token.email) return false
  return (await getFirestore().doc(`staff/${normEmail(token.email)}`).get()).exists
}

export const sendStaffEmail = onCall({ region: REGION, invoker: 'public', secrets: [SMTP_PASSWORD], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in again.')
  if (!(await isStaffToken(req.auth.token))) throw new HttpsError('permission-denied', 'Only staff can send email from the app.')
  const staff = normEmail(req.auth.token.email)
  const r = staffEmailRequest(req.data)
  if (r.problem) throw new HttpsError(...r.problem)

  const db = getFirestore()
  const record = (await db.doc(`${r.target.coll}/${r.target.id}`).get()).data()
  if (!record) throw new HttpsError('not-found', 'That record is gone. Refresh and try again.')
  if (!recipientsOf(record).includes(r.to)) throw new HttpsError('failed-precondition', 'That email isn’t on their record. Fix it there first, or use Open in Gmail.')
  const name = record.fullName || `${record.firstName ?? ''} ${record.lastName ?? ''}`.trim() || 'a customer'

  const gate = db.doc('serverState/staffEmail')
  await db.runTransaction(async (tx) => {
    const allowed = sendAllowed((await tx.get(gate)).data(), staff, Date.now(), centralDay())
    if (allowed.problem) throw new HttpsError(...allowed.problem)
    tx.set(gate, allowed.next)
  })

  // Our own Message-ID, so the history entry gets the id the sync would give the Sent copy.
  const messageId = `<${randomUUID()}@christmas-light-creations.com>`
  try {
    await mailer().sendMail({ from: await senderFrom(db, staff), to: r.to, replyTo: FROM, subject: r.subject, text: r.text, html: brandText({ text: r.text }), messageId })
  } catch (e) {
    await reportIncident('email', `An email from the staff app to ${name} (sent by ${staff}) didn't go out: ${e.message}`)
    throw new HttpsError('unavailable', 'The email didn’t go out (Gmail didn’t take it). Try again in a minute, or use Open in Gmail.')
  }

  const { id, data } = historyEntry({ req: r, record, messageId, staff, at: new Date().toISOString() })
  try {
    await db.doc(`messages/${id}`).set(data, { merge: true })
  } catch (e) {
    await reportIncident('other', `An email from the staff app to ${name} went out, but saving it to their history failed (the text sync should add it within minutes): ${e.message}`)
  }
  logger.info('sendStaffEmail', { record: r.target.coll, template: r.template || 'none' })
  return { ok: true, id }
})

// ---- Scheduled email: "Send later" (docs/specs/scheduled-email.md) ------------
// scheduleStaffEmail: staff schedule, edit or cancel, with the same checks as
// sendStaffEmail (staff, address on the record, lengths), so only this code
// writes scheduledEmails (rules: staff read only). sendScheduledEmails: every
// 5 minutes, the due ones go out like a Send (history, Recent activity, the
// shared daily count). Each is claimed in a transaction before sending, so two
// runs can't both send it, and nothing is retried on its own: a failure stays
// as "Didn't go" for staff and is reported. Logs carry no addresses or text.
const SCHEDULED = 'scheduledEmails'
const openScheduled = async (db) => (await db.collection(SCHEDULED).where('open', '==', true).get()).docs.map((d) => ({ id: d.id, ...d.data() }))
const SCHEDULED_ID = /^[A-Za-z0-9_-]{1,100}$/

export const scheduleStaffEmail = onCall({ region: REGION, invoker: 'public', cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in again.')
  if (!(await isStaffToken(req.auth.token))) throw new HttpsError('permission-denied', 'Only staff can schedule email from the app.')
  const staff = normEmail(req.auth.token.email)
  const db = getFirestore()
  const action = req.data?.action
  if (action === 'schedule') return scheduleEmails(db, staff, req.data)
  if (action === 'edit') return editScheduled(db, staff, req.data)
  if (action === 'cancel') return cancelScheduled(db, staff, req.data)
  throw new HttpsError('invalid-argument', 'Unknown request')
})

async function scheduleEmails(db, staff, data) {
  const r = scheduledEmailRequest(data, Date.now())
  if (r.problem) throw new HttpsError(...r.problem)
  const pathOf = (e) => `${e.target.coll}/${e.target.id}`
  const refs = [...new Set(r.emails.map(pathOf))].map((p) => db.doc(p))
  const records = new Map((await db.getAll(...refs)).map((s) => [s.ref.path, s.data()]))
  for (const [i, e] of r.emails.entries()) {
    const record = records.get(pathOf(e))
    const which = r.emails.length > 1 ? `Email ${i + 1}${record ? ` (${record.fullName || record.firstName || ''})` : ''}: ` : ''
    if (!record) throw new HttpsError('not-found', `${which}That record is gone. Refresh and try again.`)
    if (!recipientsOf(record).includes(e.to)) throw new HttpsError('failed-precondition', `${which}That email isn’t on their record. Fix it there first, or use Open in Gmail.`)
  }
  const room = dayRoomProblem(await openScheduled(db), r.sendAt, r.emails.length)
  if (room) throw new HttpsError(...room)

  const batch = db.batch()
  const ids = r.emails.map((e) => {
    const ref = db.collection(SCHEDULED).doc()
    const doc = scheduledDoc({ req: e, record: records.get(pathOf(e)), sendAt: r.sendAt, staff, batch: r.batch })
    batch.set(ref, { ...doc, sendAt: Timestamp.fromMillis(doc.sendAt), at: FieldValue.serverTimestamp() })
    return ref.id
  })
  await batch.commit()
  logger.info('scheduleStaffEmail', { count: ids.length, list: Boolean(r.batch) })
  return { ok: true, ids }
}

async function editScheduled(db, staff, data) {
  const id = typeof data?.id === 'string' && SCHEDULED_ID.test(data.id) ? data.id : ''
  if (!id) throw new HttpsError('invalid-argument', 'Which email?')
  const when = sendAtProblem(Number(data.sendAt))
  if (when) throw new HttpsError('invalid-argument', when)
  const room = dayRoomProblem((await openScheduled(db)).filter((x) => x.id !== id), Number(data.sendAt), 1)
  if (room) throw new HttpsError(...room)
  const ref = db.doc(`${SCHEDULED}/${id}`)
  await db.runTransaction(async (tx) => {
    const e = editRequest((await tx.get(ref)).data(), data, Date.now())
    if (e.problem) throw new HttpsError(...e.problem)
    tx.update(ref, { ...e.update, sendAt: Timestamp.fromMillis(e.update.sendAt), error: FieldValue.delete(), updatedBy: staff, updatedAt: FieldValue.serverTimestamp() })
  })
  logger.info('scheduleStaffEmail edit')
  return { ok: true }
}

async function cancelScheduled(db, staff, data) {
  const c = cancelIds(data)
  if (c.problem) throw new HttpsError(...c.problem)
  const outcomes = await Promise.all(c.ids.map((id) => db.runTransaction(async (tx) => {
    const ref = db.doc(`${SCHEDULED}/${id}`)
    const o = cancelOutcome((await tx.get(ref)).data())
    if (o === 'cancel') tx.update(ref, { status: 'cancelled', open: false, cancelledBy: staff, cancelledAt: FieldValue.serverTimestamp() })
    return o
  })))
  const count = (o) => outcomes.filter((x) => x === o).length
  logger.info('scheduleStaffEmail cancel', { cancelled: count('cancel'), tooLate: count('too-late') })
  return { ok: true, cancelled: count('cancel'), tooLate: count('too-late') }
}

// Recent activity target, as the app logs a Send (src/leads/sendEmail.js).
const ACTIVITY_TYPE = { customerId: 'customer', leadId: 'lead', pastRequestId: 'past' }

// One due email: claim it, send it, file it. -> { sent } | { failed, error, gmail? } | {} (skipped)
async function sendScheduled(db, id) {
  const ref = db.doc(`${SCHEDULED}/${id}`)
  const gate = db.doc('serverState/staffEmail')
  const messageId = `<${randomUUID()}@christmas-light-creations.com>`
  let doc, record
  const claim = await db.runTransaction(async (tx) => {
    doc = (await tx.get(ref)).data()
    const readable = doc && !requestOf(doc).problem
    const [recSnap, gateSnap] = await Promise.all([readable ? tx.get(db.doc(`${collOf(doc)}/${doc.target.id}`)) : null, tx.get(gate)])
    record = recSnap?.data()
    const c = claimOutcome({ doc, record, gate: gateSnap.data(), now: Date.now(), day: centralDay() })
    if (c.outcome === 'fail') tx.update(ref, { status: 'failed', open: true, error: c.error, failedAt: FieldValue.serverTimestamp() })
    if (c.outcome === 'go') {
      tx.set(gate, c.gate)
      tx.update(ref, { status: 'sending', claimedAt: FieldValue.serverTimestamp(), messageId })
    }
    return c
  })
  if (claim.outcome === 'skip') return {}
  if (claim.outcome === 'fail') return { failed: true, error: claim.error }

  const r = claim.req
  try {
    await mailer().sendMail({ from: await senderFrom(db, doc.by), to: r.to, replyTo: FROM, subject: r.subject, text: r.text, html: brandText({ text: r.text }), messageId })
  } catch (e) {
    // Left as "sending" if this write fails too: the stuck check reports it in 15 minutes.
    await ref.update({ status: 'failed', open: true, error: GMAIL_ERROR, failedAt: FieldValue.serverTimestamp() }).catch((e2) => logger.error('scheduled email: marking failed failed', e2.message))
    return { failed: true, gmail: true, error: `${GMAIL_ERROR} (${e.message})` }
  }

  const { id: historyId, data } = historyEntry({ req: r, record, messageId, staff: doc.by, at: new Date().toISOString() })
  await ref.update({ status: 'sent', open: false, sentAt: FieldValue.serverTimestamp(), historyId }).catch((e) => logger.error('scheduled email sent, but not marked sent', e.message))
  try {
    await db.doc(`messages/${historyId}`).set({ ...data, scheduledId: id }, { merge: true })
  } catch (e) {
    await reportIncident('other', `A scheduled email to ${doc.name} went out, but saving it to their history failed (the text sync should add it within minutes): ${e.message}`)
  }
  await logActivity(doc.by, 'email', { type: ACTIVITY_TYPE[doc.target.field], id: doc.target.id, name: doc.name }, r.subject)
  if (doc.mark && ['customerId', 'pastRequestId'].includes(doc.target.field)) {
    await db.doc(`${collOf(doc)}/${doc.target.id}`)
      .update({ [markPath(doc.mark, doc.template)]: centralDay(), updatedAt: FieldValue.serverTimestamp(), updatedBy: doc.by })
      .catch((e) => logger.warn('scheduled email: season mark not saved', e.message))
  }
  return { sent: true }
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const sendScheduledEmails = onSchedule({ schedule: '*/5 * * * *', timeZone: 'America/Chicago', region: REGION, secrets: [SMTP_PASSWORD], timeoutSeconds: 300, maxInstances: 1, retryCount: 0 }, async () => {
  const db = getFirestore()
  const open = await openScheduled(db)
  const failed = []

  // Claimed by a run that died: it may have gone out, so never send it again on our own.
  for (const d of stuckOnes(open, Date.now())) {
    const ref = db.doc(`${SCHEDULED}/${d.id}`)
    const marked = await db.runTransaction(async (tx) => {
      const fresh = (await tx.get(ref)).data()
      if (!fresh || !stuckOnes([fresh], Date.now()).length) return false
      tx.update(ref, { status: 'failed', open: true, error: STUCK_ERROR, failedAt: FieldValue.serverTimestamp() })
      return true
    })
    if (marked) failed.push({ name: d.name, error: STUCK_ERROR })
  }

  // One a second; each is tried once. Three Gmail refusals in a row: stop,
  // the rest wait for the next run.
  const due = dueOnes(open, Date.now())
  let sent = 0
  let refusedInARow = 0
  for (const [i, d] of due.entries()) {
    let r
    try {
      r = await sendScheduled(db, d.id)
    } catch (e) {
      r = { failed: true, error: `Something went wrong before sending (it will be tried again in 5 minutes if it’s still waiting): ${e.message}` }
    }
    if (r.failed) failed.push({ name: d.name, error: r.error })
    if (r.sent) sent++
    refusedInARow = r.gmail ? refusedInARow + 1 : 0
    if (refusedInARow >= 3) break
    if (r.sent && i + 1 < due.length) await pause(1000)
  }

  if (failed.length) {
    const names = failed.slice(0, 3).map((f) => f.name).join(', ') + (failed.length > 3 ? ` and ${failed.length - 3} more` : '')
    await reportIncident('email', `${failed.length} scheduled email${failed.length === 1 ? '' : 's'} didn’t go out (${names}): ${failed[0].error} They show as “Didn’t go” in Home → Scheduled emails: give them a new time, or remove them.`)
  }
  if (due.length || failed.length) logger.info('sendScheduledEmails', { due: due.length, sent, failed: failed.length })
})

// ---- Sales assistant: draft a reply (docs/specs/sales-assistant.md) ----------
// Staff only. The brain lives in functions/assistant/ (thread, prompt, the
// Claude call, checks); this only gates the call, counts it, and reports.
// Nothing is sent or stored; staff edit and send through the normal Email /
// Text flow. Limited to 150 drafts a day (serverState/aiDraft). Logs carry
// token counts and cost, never customer text.
export const draftReply = onCall({ region: REGION, invoker: 'public', secrets: [ANTHROPIC_API_KEY], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 90 }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in again.')
  if (!(await isStaffToken(req.auth.token))) throw new HttpsError('permission-denied', 'Staff only.')
  const staff = normEmail(req.auth.token.email)
  const r = draftRequest(req.data)
  if (r.problem) throw new HttpsError(...r.problem)

  const db = getFirestore()
  const thread = await threadFor(db, r.target)
  if (!thread) throw new HttpsError('not-found', 'That record is gone. Refresh and try again.')

  const gate = db.doc('serverState/aiDraft')
  await db.runTransaction(async (tx) => {
    const allowed = draftAllowed((await tx.get(gate)).data(), staff, Date.now(), centralDay())
    if (allowed.problem) throw new HttpsError(...allowed.problem)
    tx.set(gate, allowed.next)
  })

  const today = centralDay()
  // The owner's own facts for the assistant (⚙ Settings → What the sales assistant knows).
  const notes = String((await db.doc('settings/app').get()).data()?.assistantNotes ?? '')
  let result
  try {
    result = await draftFor({
      apiKey: ANTHROPIC_API_KEY.value(), model: AI_MODEL.value() || MODEL, thread, coll: r.target.coll, today, season: bookingSeason(today), notes, log: logger,
      onKeyRefused: () => reportIncident('other', 'The sales assistant’s Claude API key was refused (ANTHROPIC_API_KEY). Set it again and redeploy draftReply.'),
    })
  } catch (e) {
    if (e instanceof DraftError) throw new HttpsError(e.code, e.message)
    throw e
  }
  // Who's on (Home): Claude shows as a team member with when it last drafted.
  db.doc(`presence/${PRESENCE_ID}`).set({ lastSeen: FieldValue.serverTimestamp(), device: `drafted a reply for ${staff.split('@')[0]}` }).catch((e) => logger.warn('presence not written', e.message))
  await recordUsage(claudeIncrement('draft', result.usage, result.model))
  return { ...result.draft, contact: thread.contact, model: result.model, cost: result.cost }
})

// ---- Ask Claude (docs/specs/ask-claude.md) ------------------------------------
// Staff only. The tools and the loop live in functions/assistant/ask.js; this
// gates the call (staff list, kill switch settings/app.askClaude, 100 a day in
// serverState/askClaude), counts it and reports. Read-only: nothing is written
// or sent. Logs carry token counts and cost, never the question or answer.
export const askClaude = onCall({ region: REGION, invoker: 'public', secrets: [ANTHROPIC_API_KEY], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 120 }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in again.')
  if (!(await isStaffToken(req.auth.token))) throw new HttpsError('permission-denied', 'Staff only.')
  const staff = normEmail(req.auth.token.email)
  const r = askRequest(req.data)
  if (r.problem) throw new HttpsError(...r.problem)

  const db = getFirestore()
  const settings = (await db.doc('settings/app').get()).data() ?? {}
  if (settings.askClaude === false) throw new HttpsError('failed-precondition', 'Ask Claude is turned off (⚙ Settings → Ask Claude).')

  const gate = db.doc('serverState/askClaude')
  await db.runTransaction(async (tx) => {
    const allowed = askAllowed((await tx.get(gate)).data(), staff, Date.now(), centralDay())
    if (allowed.problem) throw new HttpsError(...allowed.problem)
    tx.set(gate, allowed.next)
  })

  const today = centralDay()
  let out
  try {
    out = await askFor({
      apiKey: ANTHROPIC_API_KEY.value(), model: AI_MODEL.value() || MODEL, question: r.question, history: r.history, today, season: bookingSeason(today), db, log: logger,
      helpers: { invoiceState, invoiceCents, paidInfo, alertRecipients },
      onKeyRefused: () => reportIncident('other', 'Ask Claude’s API key was refused (ANTHROPIC_API_KEY). Set it again and redeploy askClaude.'),
    })
  } catch (e) {
    if (e instanceof AskError) throw new HttpsError(e.code, e.message)
    throw e
  }
  db.doc(`presence/${PRESENCE_ID}`).set({ lastSeen: FieldValue.serverTimestamp(), device: `answered a question for ${staff.split('@')[0]}` }).catch((e) => logger.warn('presence not written', e.message))
  await recordUsage(claudeIncrement('ask', out.usage, out.model))
  return { ...out.result, model: out.model, cost: out.cost }
})

// ---- Daily check (7:30 am Central) ------------------------------------------
// Catches what fails silently: request alerts that never went out, the text
// sync stopping, problems nobody has marked as seen. Emails only when there's
// a problem, plus an "all OK" on Mondays so a missing email is itself a sign.
const tsMs = (t) => (t?.toMillis ? t.toMillis() : Number(t) || 0)
export const dailyHealth = onSchedule({ schedule: '30 7 * * *', timeZone: 'America/Chicago', region: REGION, secrets: [SMTP_PASSWORD] }, async () => {
  const db = getFirestore()
  const now = Date.now()
  const WEEK = 7 * 24 * 60 * 60 * 1000
  const [leadsSnap, lastMsg, openSnap, propSnap, invSnap] = await Promise.all([
    db.collection('leads').where('createdAt', '>=', new Date(now - WEEK)).get(),
    db.collection('messages').orderBy('syncedAt', 'desc').limit(1).get(),
    db.collection('incidents').where('open', '==', true).get(),
    db.collection('proposals').select('deposit', 'payments').get(),
    db.collection('invoices').where('status', '==', 'paid').select('payment').get(),
  ])
  const leads = leadsSnap.docs.map((d) => d.data())
  const pitches = leads.filter((l) => l.spamReason).length // filed by the website (docs/specs/spam-filters.md)
  const lastSync = lastMsg.docs[0]?.get('syncedAt') ?? null
  const problems = []
  const stale = await loadWaiting(db, now).catch((e) => { logger.warn('waiting list', e.message); return [] })
  if (stale.length) problems.push(`• ${stale.length} customer message${stale.length === 1 ? '' : 's'} or request${stale.length === 1 ? '' : 's'} ${stale.length === 1 ? 'has' : 'have'} waited 2+ hours with nobody tapping I've got it (💬 in the staff app).`)
  const missed = missedLeadAlerts(leads, now)
  if (missed.length) problems.push(`• ${missed.length} website request${missed.length === 1 ? '' : 's'} from the last day never got an alert email (${missed.map((l) => `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim()).join(', ')}). They're in the staff app under Leads.`)
  if (syncStale(lastSync, now)) problems.push('• No texts or emails have synced into customer history for 3+ days. If customers have been texting, the sync (Apps Script in info@) may have stopped.')
  const payments = [...propSnap.docs.flatMap((d) => PARTS.map((part) => paymentOf(d.data(), part))), ...invSnap.docs.map((d) => d.get('payment'))]
    .filter((x) => x?.status === 'paid' && now - tsMs(x.paidAt) < WEEK).length
  const monday = new Date(now).toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short' }) === 'Mon'
  const openIncidents = openSnap.docs.map((d) => d.data()).sort((a, b) => tsMs(b.at) - tsMs(a.at)).slice(0, 10)
  const report = dailyReport({ problems, openIncidents, monday, stats: { leads: leads.length - pitches, pitches, payments, lastSync: lastSync?.toDate?.() ?? null } })
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

// ---- Designs sent from /design/ (docs/specs/public-designer.md) ------------
// The page already redraws photos in the browser, but anyone can write to
// leadDesigns directly, so the server checks each one as it arrives: both
// pictures re-encoded as real JPEGs (no hidden data, at most 1280 px), the
// design rebuilt from known fields. Anything that fails is deleted. Uploads
// are deleted after 30 days; a copy staff saved into the lead's designs stays.

// A JPEG data URL -> the same picture re-encoded (metadata dropped), or null.
async function cleanJpeg(dataUrl) {
  const bytes = jpegBytes(dataUrl)
  if (!bytes) return null
  try {
    const img = sharp(bytes, { limitInputPixels: 40e6, failOn: 'error' })
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    // Never bigger than what arrived (the document must stay under 1 MB).
    let out
    for (const quality of [80, 70, 60, 50, 40]) {
      out = await img.clone().jpeg({ quality, mozjpeg: true }).toBuffer()
      if (out.length <= bytes.length) break
    }
    return `data:image/jpeg;base64,${out.toString('base64')}`
  } catch {
    return null
  }
}

export const leadDesignCreated = onDocumentCreated({ document: 'leadDesigns/{id}', region: REGION, memory: '512MiB' }, async (event) => {
  const d = event.data?.data()
  if (!d) return
  const design = cleanDesign(d.design)
  const image = await cleanJpeg(d.image)
  const photo = d.photo === 'sample' ? 'sample' : await cleanJpeg(d.photo)
  if (!design || !image || !photo) {
    await event.data.ref.delete()
    logger.warn('leadDesign refused', { id: event.params.id, design: Boolean(design), image: Boolean(image), photo: Boolean(photo) })
    return
  }
  await event.data.ref.update({ design, image, photo, checkedAt: FieldValue.serverTimestamp() })
  logger.info('leadDesign checked', { id: event.params.id, sample: photo === 'sample' })
})

// ---- "Still waiting" nudge (functions/nudge.js, docs/specs/auto-emails.md) ----
// Customer texts, voicemails, missed calls, emails, website requests, problem
// reports and account chats nobody has taken for 2+ hours: one phone notification and
// one email to the alert list, every hour 8 am to 8 pm Central, again when
// the list changes or after 4 hours. Off in ⚙ Settings → Automatic emails
// (settings/app.staffNudges false). Logs carry counts only.
async function loadWaiting(db, now) {
  const since = new Date(listSince(now))
  const all = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const [msgs, leads, calls, chats, acts] = await Promise.all([
    db.collection('messages').where('syncedAt', '>=', since).get(),
    db.collection('leads').where('createdAt', '>=', since).get(),
    db.collection('serviceCalls').where('source', '==', 'customer').get(),
    db.collection('conversations').where('lastAt', '>=', since).get(),
    db.collection('activity').where('at', '>=', since).select('action', 'target').get(),
  ])
  return waiting({ messages: all(msgs), leads: all(leads), calls: all(calls), conversations: all(chats), activity: all(acts), now })
}

// { 'customer:<id>': name, 'lead:<id>': name } for the people in the list.
async function namesFor(db, items) {
  const names = {}
  const cust = [...new Set(items.map((m) => m.customerId).filter(Boolean))].slice(0, 50)
  const leads = [...new Set(items.filter((m) => !m.customerId).map((m) => m.leadId).filter(Boolean))].slice(0, 50)
  const refs = [...cust.map((id) => db.doc(`customers/${id}`)), ...leads.map((id) => db.doc(`leads/${id}`))]
  if (!refs.length) return names
  const docs = await db.getAll(...refs, { fieldMask: ['fullName', 'firstName', 'lastName'] }).catch(() => [])
  for (const d of docs) {
    const x = d.data()
    const name = x && (x.fullName || `${x.firstName ?? ''} ${x.lastName ?? ''}`.trim())
    if (name) names[`${d.ref.parent.id === 'customers' ? 'customer' : 'lead'}:${d.id}`] = name
  }
  return names
}

export const staffNudge = onSchedule({ schedule: NUDGE_HOURS, timeZone: 'America/Chicago', region: REGION, secrets: [SMTP_PASSWORD] }, async () => {
  const db = getFirestore()
  const settings = (await db.doc('settings/app').get()).data() ?? {}
  if (settings.staffNudges === false) return
  const now = Date.now()
  const items = await loadWaiting(db, now)
  const gate = db.doc('serverState/staffNudge')
  const state = (await gate.get()).data()
  if (!nudgeDue(state, items, now)) { logger.info('staffNudge', { waiting: items.length, sent: false }); return }
  const msg = nudgeMessage(items, await namesFor(db, items), now)
  await gate.set({ at: now, key: nudgeKey(items), count: items.length })
  await alertStaff(msg.push)
  const to = await staffEmails()
  if (to.length) {
    try {
      await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, subject: msg.subject, text: msg.text })
    } catch (e) {
      await reportIncident('other', `The "still waiting" reminder email didn't go out: ${e.message}`)
    }
  }
  logger.info('staffNudge', { waiting: items.length, sent: true })
})

// ---- Weather heads-ups (functions/weather.js, docs/specs/auto-emails.md) ----
// 4:30 pm Central: the National Weather Service forecast for Pearland (free,
// no key). On a bad day ahead: customers with a route stop that day get the
// "your date may move" email; customers with lights up get the storm tips
// (unless turned off on their account page, at most one per bad day and one
// every 5 days); staff get one notification and one email. Off in ⚙ Settings
// → Automatic emails (settings/app.weatherEmails false). Logs carry counts.
async function nwsForecast() {
  const headers = { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' }
  const point = await (await fetch(NWS_POINTS_URL, { headers })).json()
  const url = point?.properties?.forecast
  if (!url) throw new Error('no forecast link for Pearland')
  const fc = await (await fetch(url, { headers })).json()
  return fc?.properties?.periods ?? []
}

export const weatherWatch = onSchedule({ schedule: WATCH_SCHEDULE, timeZone: 'America/Chicago', region: REGION, secrets: [SMTP_PASSWORD], timeoutSeconds: 540, retryCount: 1 }, async () => {
  const db = getFirestore()
  const settings = (await db.doc('settings/app').get()).data() ?? {}
  if (settings.weatherEmails === false) return
  const today = centralDay()
  let periods
  try {
    periods = await nwsForecast()
  } catch (e) {
    await reportIncident('other', `The weather check couldn't read the National Weather Service forecast: ${e.message}`)
    return
  }
  const days = badDays(periods, today)
  const stateRef = db.doc('serverState/weather')
  const state = (await stateRef.get()).data() ?? {}
  const now = Date.now()
  const sent = pruneSent(state.sent, now)
  if (!days.length) {
    await stateRef.set({ sent, checkedAt: now, days: [], staffKey: state.staffKey ?? '' })
    logger.info('weatherWatch', { bad: 0 })
    return
  }
  const byDay = Object.fromEntries(days.map((d) => [d.day, d]))
  const from = `"Christmas Light Creations" <${FROM}>`

  // 1. Route stops on those days: the scheduling heads-up (part of their service).
  const routes = (await db.collection('routes').where('day', 'in', days.map((d) => d.day)).get()).docs.map((d) => ({ id: d.id, ...d.data() }))
  const routeStops = []
  let toldRoute = 0
  for (const r of routes) {
    const names = []
    for (const stop of r.stops ?? []) {
      if (!stop.customerId) continue
      names.push(stop.name || 'a customer')
      const key = sentKey(`route-${stop.customerId}`, r.day)
      if (sent[key]) continue
      const c = (await db.doc(`customers/${stop.customerId}`).get()).data()
      const to = recipientsOf(c ?? {})[0]
      if (!to) continue
      try {
        await mailer().sendMail({ from, to, replyTo: FROM, ...routeHeadsUp({ name: c.fullName, day: byDay[r.day], kind: stop.kind }) })
        sent[key] = now
        toldRoute++
      } catch (e) { logger.warn('weather route email failed', e.message) }
    }
    if (names.length) routeStops.push({ day: r.day, names })
  }

  // 2. Lights up this season: the storm tips (optional).
  const season = String(new Date(now).getMonth() >= 6 ? new Date(now).getFullYear() : new Date(now).getFullYear() - 1)
  const up = await db.collection('customers').where(`seasons.${season}.installStatus`, '==', 'Install Completed')
    .select('fullName', 'email', 'otherEmails', 'emailNotices', `seasons.${season}.installStatus`).get()
  let told = 0
  let skipped = 0
  for (const d of up.docs) {
    const c = d.data()
    if (!lightsUp(c, season)) continue
    if (!noticesOn(c) || !tipsOk(sent, d.id, days[0].day, now)) { skipped++; continue }
    const to = recipientsOf(c)[0]
    if (!to) continue
    try {
      await mailer().sendMail({ from, to, replyTo: FROM, ...lightsHeadsUp({ name: c.fullName, days }) })
      sent[sentKey(d.id, days[0].day)] = now
      told++
    } catch (e) { logger.warn('weather tips email failed', e.message) }
  }

  // 3. Staff: once per set of bad days.
  const staffKey = days.map((d) => `${d.day}:${d.concerns.join('+')}`).join(',')
  if (staffKey !== state.staffKey) {
    const msg = staffWeather({ days, routeStops, told, skipped })
    await alertStaff(msg.push)
    const to = await staffEmails()
    if (to.length) {
      try {
        await mailer().sendMail({ from: `"CLC Website" <${FROM}>`, to, subject: msg.subject, text: msg.text })
      } catch (e) { await reportIncident('other', `The weather heads-up email to staff didn't go out: ${e.message}`) }
    }
  }
  await stateRef.set({ sent, checkedAt: now, days: days.map(weatherLine), staffKey })
  logger.info('weatherWatch', { bad: days.length, routeStops: routeStops.length, toldRoute, told, skipped })
})

// ---- Google review request (functions/reviewAsk.js, docs/specs/review-ask.md) ----
// 4:00 pm Central. This season's customers marked Install Completed: the
// first sight starts a clock (seasons.<y>.reviewAsk.seenAt); two days later
// one ask by email (branded, optional) and, for people who prefer texts, a
// "Review text to send" item for a person (the server never texts); four
// days after an email ask one reminder, unless they wrote back or staff
// tapped They reviewed. Never with an open service call, never to anyone who
// turned optional emails off, never more than one ask + one reminder. Off in
// ⚙ Settings → Automatic emails (settings/app.reviewAsks false). Logs carry counts.
export const reviewAsks = onSchedule({ schedule: ASK_SCHEDULE, timeZone: 'America/Chicago', region: REGION, secrets: [SMTP_PASSWORD], timeoutSeconds: 540, retryCount: 0 }, async () => {
  const db = getFirestore()
  const settings = (await db.doc('settings/app').get()).data() ?? {}
  if (!reviewAsksOn(settings)) return
  const now = Date.now()
  const season = seasonOf(centralDay())
  const [up, calls] = await Promise.all([
    db.collection('customers').where(`seasons.${season}.installStatus`, '==', DONE_STATUS).get(),
    db.collection('serviceCalls').where('status', 'in', ['Open', 'Scheduled']).select('customerId').get(),
  ])
  const customers = up.docs.map((d) => ({ id: d.id, ...d.data() }))
  const openCalls = new Set(calls.docs.map((d) => d.data().customerId).filter(Boolean))
  const plan = reviewPlan(customers, { season, now, openCalls })
  const field = (k) => `seasons.${season}.reviewAsk.${k}`
  const stamp = { updatedAt: FieldValue.serverTimestamp(), updatedBy: 'website' }
  const from = `"Christmas Light Creations" <${FROM}>`

  // 1. First sight: start the clock.
  for (let i = 0; i < plan.seen.length; i += 400) {
    const batch = db.batch()
    for (const id of plan.seen.slice(i, i + 400)) batch.update(db.doc(`customers/${id}`), { [field('seenAt')]: now, [field('by')]: 'website', ...stamp })
    await batch.commit()
  }

  // 2. The ask: the email, and/or the queued text (just the record; 💬 reads it).
  let asked = 0
  let queued = 0
  let failed = 0
  for (const a of plan.ask) {
    if (a.email) {
      try {
        await mailer().sendMail({ from, to: a.email, replyTo: FROM, ...askEmail({ name: a.customer.fullName }) })
      } catch (e) {
        failed++
        logger.warn('review ask email failed', e.message)
        continue // tomorrow again; nothing recorded
      }
    }
    await db.doc(`customers/${a.id}`).update({ [field('askedAt')]: now, [field('channel')]: a.channel, [field('by')]: 'website', ...stamp })
    if (a.email) asked++
    if (a.channel.includes('text')) queued++
    await logWebsite('review-asked', { type: 'customer', id: a.id, name: a.customer.fullName }, a.channel === 'email+text' ? 'email · text queued for a person' : a.channel === 'text' ? 'text queued for a person' : 'email')
  }

  // 3. The one reminder, unless they wrote back since the ask.
  let reminded = 0
  let answered = 0
  for (const r of plan.remind) {
    const [msgs, conv] = await Promise.all([
      db.collection('messages').where('customerId', '==', r.id).select('direction', 'at', 'syncedAt').get(),
      db.doc(`conversations/${r.id}`).get(),
    ])
    if (replied({ messages: msgs.docs.map((d) => d.data()), conversation: conv.data() ?? null, askedAt: r.askedAt })) {
      answered++
      await db.doc(`customers/${r.id}`).update({ [field('remindedAt')]: now, [field('replied')]: true, ...stamp }) // closed: no reminder, ever
      continue
    }
    try {
      await mailer().sendMail({ from, to: r.email, replyTo: FROM, ...reminderEmail({ name: r.customer.fullName }) })
    } catch (e) {
      failed++
      logger.warn('review reminder email failed', e.message)
      continue
    }
    await db.doc(`customers/${r.id}`).update({ [field('remindedAt')]: now, ...stamp })
    reminded++
    await logWebsite('review-reminded', { type: 'customer', id: r.id, name: r.customer.fullName }, 'email')
  }
  if (failed && !asked && !reminded) await reportIncident('email', `The Google review request emails didn't go out (${failed} failed, none sent). They will be tried again tomorrow at 4 pm.`)
  logger.info('reviewAsks', { season, installed: customers.length, seen: plan.seen.length, asked, queued, reminded, answered, failed, skipped: plan.skipped })
})

// 3:15 am Central: delete uploads older than 30 days (owner, 2026-10-10).
export const cleanupLeadDesigns = onSchedule({ schedule: '15 3 * * *', timeZone: 'America/Chicago', region: REGION }, async () => {
  const db = getFirestore()
  const old = await db.collection('leadDesigns').where('createdAt', '<', cutoff()).select().get()
  for (let i = 0; i < old.docs.length; i += 400) {
    const batch = db.batch()
    old.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
  }
  logger.info('cleanupLeadDesigns', { deleted: old.size })
})

// ---- Booking info for the home page ----------------------------------------
// One small public endpoint (no Firebase on the home page): the staff's "how
// booked we are" line (⚙ Settings, hidden by the page after 14 days without an
// update) and the next real open install days (functions/availability.js).
// Only dates leave the server, never customer details. The open days are
// worked out at most every 10 minutes (serverState/availability). Also the
// gift-wrapping switch (functions/giftWrapping.js): the page shows that
// section only when this says so.
export const booking = onRequest({ region: REGION, invoker: 'public', maxInstances: 3, cors: [SITE, 'http://localhost:5173'] }, async (req, res) => {
  if (req.method !== 'GET') { res.status(405).end(); return }
  const db = getFirestore()
  const settings = (await db.doc('settings/app').get()).data() ?? {}
  const s = settings.bookingStatus ?? {}
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const cacheRef = db.doc('serverState/availability')
  const cached = (await cacheRef.get()).data()
  let days = cached && cached.today === today && Date.now() - cached.at < 10 * 60 * 1000 ? cached.days : null
  if (!days) {
    const season = bookingSeason(today)
    const [cust, routes] = await Promise.all([
      db.collection('customers').select(`seasons.${season}.plannedDate`).get(),
      db.collection('routes').where('day', '>', today).select('day', 'stops').get(),
    ])
    const booked = bookedByDay({ customers: cust.docs.map((d) => ({ id: d.id, ...d.data() })), routes: routes.docs.map((d) => ({ id: d.id, ...d.data() })), season })
    days = openDays({ today, booked, settings: settings.availability ?? {} })
    await cacheRef.set({ today, at: Date.now(), days })
  }
  res.set('Cache-Control', 'public, max-age=300')
  res.json({ status: { text: String(s.text ?? '').slice(0, 120), updatedAt: s.updatedAt ?? null }, openDays: days, giftWrapping: giftWrappingOn(settings) })
})
// ---- Plan with Claude (docs/specs/schedule-assistant.md) ---------------------
// Staff only. The browser says which customers and which days; the server
// gathers their records, recent incoming messages, booked days and capacity
// (functions/availability.js) and asks Claude for one checked day plan.
// A re-plan sends the plan as it stands (with people staff removed) and an
// optional instruction ("move Alice to the 20th"); Claude revises it and
// fills freed spots from the people not placed. Nothing is written here: staff adjust and
// Apply in the Season tab (client writes). Same off switch as Ask Claude; 20 plans a day (serverState/aiSchedule).
// Logs carry counts, tokens and cost, never customer text.
export const proposeSchedule = onCall({ region: REGION, invoker: 'public', secrets: [ANTHROPIC_API_KEY], cors: [SITE, 'http://localhost:5173'], enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 180 }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in again.')
  if (!(await isStaffToken(req.auth.token))) throw new HttpsError('permission-denied', 'Staff only.')
  const staff = normEmail(req.auth.token.email)
  const today = centralDay()
  const season = bookingSeason(today)
  const r = scheduleRequest(req.data, { season, bounds: SEASON })
  if (r.problem) throw new HttpsError(...r.problem)

  const db = getFirestore()
  const settings = (await db.doc('settings/app').get()).data() ?? {}
  if (settings.askClaude === false) throw new HttpsError('failed-precondition', 'The in-app Claude is turned off (⚙ Settings → Ask Claude).')

  const gate = db.doc('serverState/aiSchedule')
  await db.runTransaction(async (tx) => {
    const allowed = scheduleAllowed((await tx.get(gate)).data(), staff, Date.now(), today)
    if (allowed.problem) throw new HttpsError(...allowed.problem)
    tx.set(gate, allowed.next)
  })

  const input = await gatherSchedule(db, { season, from: r.from, to: r.to, customerIds: r.customerIds }, { bookedByDay, capacity })
  if (!input) throw new HttpsError('not-found', 'None of those customers exist any more. Refresh and try again.')
  let out
  try {
    out = await proposeFor({
      apiKey: ANTHROPIC_API_KEY.value(), model: AI_MODEL.value() || MODEL, input, today, season, current: r.current, instruction: r.instruction, log: logger,
      onKeyRefused: () => reportIncident('other', 'Plan with Claude’s API key was refused (ANTHROPIC_API_KEY). Set it again and redeploy proposeSchedule.'),
    })
  } catch (e) {
    if (e instanceof ScheduleError) throw new HttpsError(e.code, e.message)
    throw e
  }
  db.doc(`presence/${PRESENCE_ID}`).set({ lastSeen: FieldValue.serverTimestamp(), device: `planned install days for ${staff.split('@')[0]}` }).catch((e) => logger.warn('presence not written', e.message))
  await recordUsage(claudeIncrement('plan', out.usage, out.model))
  return { ...out.plan, days: input.days, customers: input.customers, deadline: input.deadline, model: out.model, cost: out.cost }
})

