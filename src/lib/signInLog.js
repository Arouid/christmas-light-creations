// Staff app sign-in attempts for the Home "Sign-ins" box: who signed in, or
// what went wrong and on which device. Written by the browser (firestore.rules
// `signInLog`: create only, tight fields; the email must be the signed-in
// person's own, or empty when the failure happened before Google said who).
import { getFirebaseApp } from './firebase.js'
import { deviceLabel } from './presence.js'

export const SIGNIN_REASON = {
  'not-staff': 'not on the staff list',
  'auth/popup-closed-by-user': 'closed the Google window',
  'auth/unauthorized-domain': 'sign-in not set up for this address',
  'auth/network-request-failed': 'no internet connection',
  'auth/web-storage-unsupported': 'browser blocks sign-in storage',
  'auth/operation-not-supported-in-this-environment': 'browser can’t sign in here',
}
export const reasonText = (code) => SIGNIN_REASON[code] ?? code ?? 'unknown'

export async function logSignIn({ ok, email = '', code = '' }) {
  try {
    const [fs, app] = await Promise.all([import('firebase/firestore'), getFirebaseApp()])
    const homeScreen = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
    await fs.addDoc(fs.collection(fs.getFirestore(app), 'signInLog'), {
      at: fs.serverTimestamp(),
      ok: Boolean(ok),
      email: String(email ?? '').toLowerCase().slice(0, 200),
      code: String(code ?? '').slice(0, 60),
      device: deviceLabel(navigator.userAgent, homeScreen),
    })
  } catch (e) {
    console.warn('Sign-in not logged', e.code ?? e.message) // rules not published yet
  }
}
