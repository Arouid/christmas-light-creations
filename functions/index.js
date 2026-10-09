// Emails staff the moment a new estimate request is saved, so a lead never
// waits for someone to open the staff app (the old site lost requests when
// its notification emails broke).
//
// Sends from info@ through Google Workspace SMTP using an app password kept
// as the Firebase secret SMTP_PASSWORD. Recipients come from settings/app
// (staff app ⚙ Settings → New-request alerts), not from code.
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import nodemailer from 'nodemailer'
import { alertRecipients, leadEmail } from './leadEmail.js'

initializeApp()
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD')
const FROM = 'info@christmas-light-creations.com'

export const newLeadAlert = onDocumentCreated(
  { document: 'leads/{leadId}', secrets: [SMTP_PASSWORD], region: 'us-central1' },
  async (event) => {
    const lead = event.data?.data()
    if (!lead) return
    const settings = (await getFirestore().doc('settings/app').get()).data()
    const to = alertRecipients(settings)
    if (!to.length) {
      logger.warn('New lead but no alert emails set (staff app → Settings → New-request alerts)')
      return
    }
    const mail = leadEmail(lead)
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: FROM, pass: SMTP_PASSWORD.value() },
    })
    await transport.sendMail({ from: `"CLC Website" <${FROM}>`, to, ...mail })
    await event.data.ref.update({ alertSentAt: new Date() })
    logger.info(`Lead alert sent to ${to.length} staff`)
  },
)
