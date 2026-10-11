// What a failed Cloud Function call should say to staff. Our server's
// refusals (HttpsError) carry a sentence; a missing or crashed function only
// gives a code word ("internal", "not-found", "internal [0]"). Pure; tested
// in tests/askClaude.test.mjs.

// The server's own sentence, or '' when the message is just a code word.
export function serverSaid(message) {
  const m = String(message ?? '').trim()
  if (!m) return ''
  if (/^[a-z][a-z-]*(\s*\[[^\]]*\])?$/i.test(m)) return '' // "internal", "not-found", "internal [0]"
  const words = m.split(/\s+/).length
  return /[.!?…)]$/.test(m) || words >= 3 ? m : ''
}

export const callError = (err, fallback) => new Error(serverSaid(err?.message) || fallback, { cause: err })
