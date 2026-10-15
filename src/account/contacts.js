// The phones and emails on the greeting card of /account/ (owner 2026-10-14:
// "whatever email or phone number they're logged in with, if they have
// multiple, just make it glow"; it replaced the "Signed in as …" line): the
// record's phones, then its emails, plus the one they signed in with when the
// record doesn't list it. `me` marks that one. Pure, tested.
import { prettyPhone } from './phoneSignIn.js'

const digits = (p) => String(p ?? '').replace(/\D/g, '').slice(-10)

// "Hi, Scott" from a record that says "SCOTT MEDEL" (imported names are often
// all capitals; owner 2026-10-14). Mixed case is left as typed ("McCloud").
export function firstName(name) {
  const first = String(name ?? '').trim().split(/\s+/)[0] ?? ''
  if (!first || first !== first.toUpperCase() || first === first.toLowerCase()) return first
  return first.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (m, sep, letter) => sep + letter.toUpperCase())
}

export function accountContacts(customer, { email = '', phone = '' } = {}) {
  const mail = String(email ?? '').trim().toLowerCase()
  const tel = mail ? '' : digits(phone) // an email sign-in wins, as the page always said
  const list = [
    ...(customer?.phones ?? []).map((p) => ({ text: prettyPhone(p), me: Boolean(tel) && digits(p) === tel })),
    ...(customer?.emails ?? []).map((e) => ({ text: e, me: Boolean(mail) && String(e).trim().toLowerCase() === mail })),
  ]
  if ((mail || tel) && !list.some((c) => c.me)) list.push({ text: mail || prettyPhone(phone), me: true })
  return list
}
