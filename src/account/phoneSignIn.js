// Sign in with your phone number (docs/specs/phone-sign-in.md): the pure
// parts of the screen. Firebase sends and checks the code; this turns what
// the customer typed into the number Firebase wants and its error codes
// into plain words. Tested in tests/phoneSignIn.test.mjs.
import { phoneKey, prettyPhone } from '../../functions/phone.js'

export { prettyPhone }

// What they typed -> E.164, or '' when it isn't a US mobile-looking number.
export const phoneInput = (raw) => phoneKey(raw)

// The 6-digit code, digits only (phones paste "123 456" or "123-456"), or ''.
export function codeInput(raw) {
  const d = String(raw ?? '').replace(/\D/g, '')
  return d.length === 6 ? d : ''
}

export const CODE_LENGTH = 6
export const NOT_A_NUMBER = 'Enter the 10-digit mobile number we have for you.'
export const NOT_A_CODE = 'Type the 6 digits from the text.'

// Firebase Auth error codes -> what the screen says (fallback: a generic line
// with the code, so a call to us can be answered).
const ERRORS = {
  'auth/invalid-phone-number': NOT_A_NUMBER,
  'auth/missing-phone-number': NOT_A_NUMBER,
  'auth/too-many-requests': 'Too many tries from this phone. Wait a while, or sign in with the email link below.',
  'auth/quota-exceeded': 'We can’t text codes right now. Use the email link below, or call us.',
  'auth/operation-not-allowed': 'Phone sign-in isn’t switched on yet. Use Google or the email link.',
  'auth/captcha-check-failed': 'The robot check didn’t pass. Reload the page and try again.',
  'auth/network-request-failed': 'No connection. Check your signal and try again.',
  'auth/invalid-verification-code': 'That code isn’t right. Check the text and try again.',
  'auth/missing-verification-code': NOT_A_CODE,
  'auth/code-expired': 'That code has expired. Tap “Send again” for a new one.',
  'auth/session-expired': 'That code has expired. Tap “Send again” for a new one.',
  'auth/invalid-app-credential': 'The robot check didn’t pass. Reload the page and try again.',
}
export function phoneError(err, fallback = 'Something went wrong. Please try again, or call us.') {
  const code = typeof err === 'string' ? err : err?.code
  return ERRORS[code] ?? (code ? `${fallback} (${code})` : fallback)
}

// Demo mode (/account/?demo=signin): no Firebase, nothing sent; any 6 digits sign in.
export const demoPhoneStep = (phone) => (phoneInput(phone) ? { ok: true, phone: phoneInput(phone) } : { error: NOT_A_NUMBER })
export const demoCodeStep = (code) => (codeInput(code) ? { ok: true } : { error: NOT_A_CODE })
