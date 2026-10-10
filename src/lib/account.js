// Customer accounts (/account/): Google or email-link sign-in (no passwords)
// and the account data from the server function myAccount (functions/index.js).
// Signing in here never makes anyone staff: staff access is decided only by
// the `staff` list in Firestore.
// Firebase loads only on this page, by dynamic import.
import { callDeposit } from './paypal.js'
import { getFirebaseApp } from './firebase.js'
import { signInWithGoogle } from './googleSignIn.js'

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

export const loadAccount = () => callDeposit('myAccount', {})
