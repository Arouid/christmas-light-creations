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
    await fb.signInWithPopup(auth, provider)
  } catch (err) {
    if (FALLBACK.includes(err?.code)) return fb.signInWithRedirect(auth, provider)
    if (!CANCELLED.includes(err?.code)) throw err
  }
}

// After a same-page sign-in returns: surface a failure instead of silently
// showing the sign-in button again. Resolves to an error message or null.
export async function redirectError(fb, auth) {
  try {
    await fb.getRedirectResult(auth)
    return null
  } catch (err) {
    return err?.code === 'auth/unauthorized-domain' || err?.code === 'auth/invalid-continue-uri'
      ? 'Sign-in isn’t set up for this address yet. Tell Scott.'
      : `Sign-in didn’t finish (${err?.code ?? err?.message ?? 'unknown'}). Try again.`
  }
}
