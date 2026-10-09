// Visitors from a road sign arrive with ?sign=<corner code> (QR code) or via
// /sign (typed). Remember the code for this visit so the estimate form can
// tag the lead with the corner that brought it in.
const KEY = 'clcSign'

export function signCode() {
  let code = ''
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('sign')
    code = (fromUrl ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
    if (code) sessionStorage.setItem(KEY, code)
    else code = sessionStorage.getItem(KEY) ?? ''
  } catch { /* storage blocked: the URL code still works for this page */ }
  return code
}

// "broadway-288" -> "Broadway 288"; "typed" -> "typed the web address".
export const signLabel = (code) => (code === 'typed' ? 'typed the web address'
  : code.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))

// Source saved on the lead, within the 60-character limit in firestore.rules.
export const signSource = (code) => `Road sign (${signLabel(code)})`.slice(0, 60)
