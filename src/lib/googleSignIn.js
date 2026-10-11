// Google sign-in for the staff app and customer accounts.
//
// iPhones and iPads (and any home-screen app) handle the popup badly: it opens
// in a separate Safari tab, and when it closes Safari shows whatever tab was
// open before, so the page never learns it signed in (owner report 2026-10-10:
// Katie "dumped back at Walmart"). There, sign in on the same page instead.
// That needs Google's sign-in helper on OUR domain (public/__/auth, authDomain
// in firebase.js), or Safari blocks the hand-off and it loops.

export function prefersRedirect() {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  const homeScreen = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
  return ios || homeScreen
}

const FALLBACK = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported']
const CANCELLED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

// fb = the 'firebase/auth' module.
export async function signInWithGoogle(fb, auth) {
  const provider = new fb.GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  if (prefersRedirect()) return fb.signInWithRedirect(auth, provider)
  try {
    return await fb.signInWithPopup(auth, provider)
  } catch (err) {
    if (FALLBACK.includes(err?.code)) return fb.signInWithRedirect(auth, provider)
    if (!CANCELLED.includes(err?.code)) throw err
  }
}

// After a same-page sign-in returns: { user } if it just signed someone in,
// { message, code } if it failed (instead of silently showing the button
// again), or {} when the page wasn't coming back from a sign-in.
export async function redirectOutcome(fb, auth) {
  try {
    const cred = await fb.getRedirectResult(auth)
    return cred?.user ? { user: cred.user } : {}
  } catch (err) {
    const code = err?.code ?? err?.message ?? 'unknown'
    const message = code === 'auth/unauthorized-domain' || code === 'auth/invalid-continue-uri'
      ? 'Sign-in isn’t set up for this address yet. Tell Scott.'
      : `Sign-in didn’t finish (${code}). Try again.`
    return { message, code }
  }
}
