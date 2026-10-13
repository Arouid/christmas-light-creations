// One look for every email we send a customer (owner 2026-10-12: "company
// branding in every email"): the cottage logo on the navy header, the body,
// a gold button when there is one, and a footer with the phone, the website,
// the privacy page, the "found us in spam?" line (owner) and, on optional
// emails (weather heads-ups, tips), where to turn them off: the account page
// (owner: "critical account communication cannot be" opted out of).
// `branded()` builds a rich email from parts (invoices, receipts);
// `brandText()` wraps a plain-text message (what staff type, the reminders)
// in the same shell, turning blank lines into paragraphs and links into
// links. Every email keeps its plain-text twin. Pure: no Firebase.
// Spec: docs/specs/auto-emails.md.
export const BIZ = 'Christmas Light Creations'
export const PHONE = '281-819-0163'
export const FROM_ADDRESS = 'info@christmas-light-creations.com'
export const SITE_URL = 'https://christmas-light-creations.com'
export const LOGO_URL = `${SITE_URL}/images/clc-logo-wide.png`
export const ACCOUNT_URL = `${SITE_URL}/account/`
// The Google review page (one place: the site copy, the staff templates and
// the automatic review ask all import it; docs/specs/review-ask.md).
export const REVIEW_URL = 'https://g.page/r/CWKRhzePqUvIEAI/review'

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))

// Found in spam: Gmail and Outlook learn from "Not spam" (owner 2026-10-12).
export const SPAM_LINE = `If this landed in your spam or promotions folder, please mark it "Not spam" (or add ${FROM_ADDRESS} to your contacts) so you don't miss your install day or a bill.`
// Optional emails only: how to stop them (the account page, Email preferences).
export const OPT_OUT_LINE = `Weather heads-ups and seasonal tips are optional: turn them off any time on your account page, ${ACCOUNT_URL} (agreements, bills, payment reminders and scheduling always come through).`

const header = `<div style="background:#050b1a;padding:18px 24px"><a href="${SITE_URL}" style="text-decoration:none"><img src="${LOGO_URL}" alt="${BIZ}" width="200" height="65" style="display:block;height:auto;max-width:200px;border:0"></a></div>`
const footerStd = (optional) => `${BIZ} · Pearland, TX · <a href="tel:+12818190163" style="color:#050b1a">${PHONE}</a> · <a href="${SITE_URL}" style="color:#050b1a">christmas-light-creations.com</a><br><span style="color:#6b7280">Reply to this email any time. ${esc(SPAM_LINE)}${optional ? ` ${esc(OPT_OUT_LINE).replace(esc(ACCOUNT_URL), `<a href="${ACCOUNT_URL}" style="color:#6b7280">${ACCOUNT_URL}</a>`)}` : ''} How we handle your details: <a href="${SITE_URL}/privacy/" style="color:#6b7280">privacy</a>.</span>`
export const FOOTER_TEXT = `${BIZ} · ${PHONE} · christmas-light-creations.com`

// The plain-text twin's footer, for emails this code writes (not staff's own text).
export const textFooter = (optional = false) => `\n\n--\n${FOOTER_TEXT}\n${SPAM_LINE}${optional ? `\n${OPT_OUT_LINE}` : ''}`

// Branded HTML (navy header with the logo, gold button) from parts.
// rows: [[label, value, strong?]]; footer: extra HTML above the standard footer;
// optional: true on emails the customer may turn off (adds the opt-out line).
export function branded({ heading, paragraphs = [], button, rows, footer, optional = false }) {
  const p = (t) => `<p style="margin:0 0 14px">${t}</p>`
  const table = rows?.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;font-size:15px">${rows.map(([a, b, strong]) => `<tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb${strong ? ';font-weight:700' : ''}">${esc(a)}</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap${strong ? ';font-weight:700' : ''}">${esc(b)}</td></tr>`).join('')}</table>`
    : ''
  const btn = button ? `<p style="margin:22px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#ffcf4d;color:#050b1a;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px">${esc(button.label)}</a></p>` : ''
  return `<div style="background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
${header}
<div style="padding:24px">
${heading ? `<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;color:#050b1a">${esc(heading)}</h1>` : ''}
${paragraphs.map((x) => p(x)).join('\n')}
${table}${btn}
${footer ? `<p style="margin:18px 0 0;color:#4b5563;font-size:14px">${footer}</p>` : ''}
<p style="margin:18px 0 0;padding-top:14px;border-top:1px solid #e5e7eb;color:#4b5563;font-size:13px">${footerStd(optional)}</p>
</div></div></div>`
}

// A plain-text message -> the same shell: blank lines become paragraphs,
// single line breaks stay, web links become links, text is escaped. A text
// footer this code added (textFooter) is dropped: the shell has its own.
const linkify = (t) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#050b1a">${u}</a>`)
export function brandText({ heading = '', text = '', button, optional = false } = {}) {
  const body = String(text ?? '').replace(/\r\n/g, '\n').replace(/\n\n--\n[^]*$/, '').trim()
  const paragraphs = body.split(/\n{2,}/).map((para) => linkify(para).replace(/\n/g, '<br>'))
  return branded({ heading, paragraphs, button, optional })
}
