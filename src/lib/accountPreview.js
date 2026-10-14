// Staff seeing a customer's account page exactly as the customer does
// (docs/specs/account-preview.md): 👁 View their account in the staff app
// opens /account/?preview=<customer id>; the page asks the server
// (accountPreview, staff only, reads only) and shows every action greyed out.
// The link lives only in the staff app, never on the public site.
export const PREVIEW_PARAM = 'preview'
export const PREVIEW_BUTTON = '👁 View their account'

// base: import.meta.env.BASE_URL. demo: the staff app's sample data (dev),
// so the account page shows its own sample data instead of asking the server.
export const accountPreviewLink = (id, { base = '/', demo = false } = {}) =>
  `${base}account/?${demo ? 'demo&' : ''}${PREVIEW_PARAM}=${encodeURIComponent(String(id ?? ''))}`

export function previewBanner(name) {
  const who = String(name ?? '').trim()
  return `Preview: you’re seeing ${who ? `${who}’s` : 'this customer’s'} account. Nothing you do here is sent.`
}
// The tooltip on every greyed-out control.
export const PREVIEW_OFF = 'Preview: nothing is sent'
export const PREVIEW_NO_SIGN_IN = 'There’s no email or phone number on their record yet, so they can’t sign in to this page.'

// Why the preview didn't load (the server's error code) → { title, text,
// signIn: offer Google sign-in again }.
export function previewProblem(err) {
  const code = String(err?.code ?? '').replace(/^functions\//, '')
  if (code === 'unauthenticated' || code === 'permission-denied') {
    return { title: 'Staff only', text: 'Sign in with the Google account you use for the staff app to see a customer’s account as they do.', signIn: true }
  }
  if (code === 'not-found' || code === 'invalid-argument') {
    return { title: 'That customer isn’t here', text: err?.message || 'Open the preview again from their account in the staff app.', signIn: false }
  }
  return { title: 'The preview didn’t load', text: 'Refresh this page, or open it again from their account in the staff app.', signIn: false }
}
