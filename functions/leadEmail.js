// The staff alert email for a new estimate request. Pure, so tests can check
// it. The subject carries the key facts because that's what a phone's Gmail
// notification shows.

const STAFF_APP = 'https://christmas-light-creations.com/leads/'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

export function leadEmail(lead) {
  const name = oneLine(`${lead.firstName ?? ''} ${lead.lastName ?? ''}`) || 'Someone'
  const where = oneLine(lead.city) || oneLine(lead.zip)
  const source = oneLine(lead.source)
  const subject = `New estimate${lead.designId ? ' 🎨' : ''}: ${name}${where ? `, ${where}` : ''}${source ? ` (${source})` : ''}`.slice(0, 180)
  const address = oneLine([lead.address, lead.city, 'TX', lead.zip].filter(Boolean).join(', '))
  const phoneDigits = String(lead.phone ?? '').replace(/\D/g, '')
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  const rows = [
    ['Name', name],
    ['Phone', lead.phone, phoneDigits && `tel:${phoneDigits}`],
    ['Email', lead.email, lead.email && `mailto:${lead.email}`],
    ['Address', address, address && map],
    ['Prefers', lead.contactMethod],
    ['Heard from', source],
    // Made on /design/ (docs/specs/public-designer.md): open the lead to see it.
    ['Design', lead.designId ? 'They designed their lights on the website (in the staff app, on their lead)' : ''],
  ].filter(([, v]) => oneLine(v))

  const text = [
    `New estimate request from the website.`,
    '',
    ...rows.map(([k, v]) => `${k}: ${oneLine(v)}`),
    '',
    'Message:',
    String(lead.message ?? '').trim(),
    '',
    `Open the staff app: ${STAFF_APP}`,
  ].join('\n')

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p style="margin:0 0 12px"><strong>New estimate request from the website.</strong></p>
<table style="border-collapse:collapse">${rows.map(([k, v, href]) => `
<tr><td style="padding:2px 12px 2px 0;color:#666">${esc(k)}</td><td style="padding:2px 0">${href ? `<a href="${esc(href)}">${esc(oneLine(v))}</a>` : esc(oneLine(v))}</td></tr>`).join('')}
</table>
<p style="margin:16px 0 4px;color:#666">Message</p>
<p style="margin:0;white-space:pre-wrap">${esc(String(lead.message ?? '').trim())}</p>
<p style="margin:20px 0 0"><a href="${STAFF_APP}" style="background:#ffcf4d;color:#050b1a;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open the staff app</a></p>
</div>`

  return { subject, text, html, replyTo: lead.email || undefined }
}

// Alert recipients from settings/app.alertEmails (typed in the staff app).
export const alertRecipients = (settings = {}) =>
  [...new Set((settings.alertEmails ?? []).map((e) => String(e).trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))]
