// Customer accounts (/account/): Google, email-link or phone-number sign-in
// (no passwords) and the account data from the server function myAccount
// (functions/index.js). Signing in here never makes anyone staff: staff
// access is decided only by the `staff` list in Firestore.
// Firebase loads only on this page, by dynamic import.
import { standalone } from '../components/useInstall.js'
import { deviceName } from './staffAlerts.js'
import { callDeposit } from './paypal.js'
import { getFirebaseApp } from './firebase.js'
import { signInWithGoogle } from './googleSignIn.js'
import { phoneInput } from '../account/phoneSignIn.js'

const EMAIL_KEY = 'clcAccountEmail'
const remember = (e) => { try { localStorage.setItem(EMAIL_KEY, e) } catch { /* private mode */ } }
export const rememberedEmail = () => { try { return localStorage.getItem(EMAIL_KEY) ?? '' } catch { return '' } }

async function auth() {
  const [mod, app] = await Promise.all([import('firebase/auth'), getFirebaseApp()])
  return { ...mod, auth: mod.getAuth(app) }
}

// The server sends the link from info@ (only to emails that have a proposal).
export async function sendLink(email) {
  remember(email.trim())
  await callDeposit('sendAccountLink', { email: email.trim(), origin: window.location.origin })
}

// Google, like the staff app (src/lib/googleSignIn.js): popup on computers,
// same-page sign-in on iPhones and the home-screen app.
export async function signInGoogle() {
  const a = await auth()
  await signInWithGoogle(a, a.auth)
}

// Sign in with your phone number (docs/specs/phone-sign-in.md): Firebase
// texts a 6-digit code and checks it; we never see the code. Firebase needs
// a reCAPTCHA verifier for this: the invisible one, anchored to an empty div
// in the form (containerId), cleared after each try so "Send again" starts
// clean. The App Check reCAPTCHA (Enterprise) on the page is a separate
// script; the Auth SDK loads the classic one beside it.
let pending = null // { confirmation, verifier, phone } between the two steps
function clearPending() {
  try { pending?.verifier?.clear() } catch { /* already gone */ }
  pending = null
}
export async function sendPhoneCode(raw, containerId) {
  const phone = phoneInput(raw)
  if (!phone) throw Object.assign(new Error('Not a phone number'), { code: 'auth/invalid-phone-number' })
  const a = await auth()
  clearPending()
  const verifier = new a.RecaptchaVerifier(a.auth, containerId, { size: 'invisible' })
  try {
    const confirmation = await a.signInWithPhoneNumber(a.auth, phone, verifier)
    pending = { confirmation, verifier, phone }
    return phone
  } catch (err) {
    try { verifier.clear() } catch { /* fine */ }
    throw err
  }
}
export async function confirmPhoneCode(code) {
  if (!pending) throw Object.assign(new Error('No code was sent'), { code: 'auth/code-expired' })
  await pending.confirmation.confirm(code)
  clearPending()
}
export const cancelPhoneCode = clearPending

export async function isLinkInUrl() {
  const a = await auth()
  return a.isSignInWithEmailLink(a.auth, window.location.href)
}

// Finishes sign-in from the emailed link, then drops the one-time code from the address bar.
export async function finishLink(email) {
  const a = await auth()
  await a.signInWithEmailLink(a.auth, email.trim(), window.location.href)
  remember(email.trim())
  window.history.replaceState(null, '', window.location.pathname)
}

export async function watchUser(cb) {
  const a = await auth()
  return a.onAuthStateChanged(a.auth, cb)
}

export async function signOut() {
  const a = await auth()
  await a.signOut(a.auth)
}

// `app`: the device name when this runs as the installed app, so staff can see who has it (customerLogins).
export const loadAccount = () => callDeposit('myAccount', { app: standalone() ? deviceName(navigator.userAgent) : '' })
// Staff seeing a customer's account as they do (docs/specs/account-preview.md):
// the same answer as myAccount, for that customer record; staff only, and it
// never counts as the customer signing in.
export const loadPreview = (id) => callDeposit('accountPreview', { id })

// Report a problem with their lights (docs/specs/account-service.md): the
// server logs the service call and alerts staff; the browser never writes it.
export const reportProblem = (problem, note) => callDeposit('reportProblem', { problem, note })
// "Your property details": gate code, HOA, lights-down-by, things to avoid, pets (functions/propertyDetails.js).
export const updateMyDetails = (details) => callDeposit('updateMyDetails', details)
// Chat with us (docs/specs/account-chat.md): the server saves it on their
// thread and tells staff; answers { chat } as myAccount returns it.
export const sendAccountMessage = (text) => callDeposit('sendAccountMessage', { text })

// "Yes, put my lights back up": this season goes to Confirmed on their record (functions/rebook.js).
export const rebookMe = (week, note) => callDeposit('rebookMe', { week, note })
