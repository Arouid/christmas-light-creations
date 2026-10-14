// The Google review card on the account page, on this device (owner
// 2026-10-14; who sees it at all is the server's call: myAccount → review,
// functions/reviewAsk.js accountReview). Tapping the review button hides it
// for good on this device; "Not now" hides it for LATER_DAYS. The privacy
// page says so ("What your browser keeps").
export const REVIEW_KEY = 'clcReviewCard'
export const LATER_DAYS = 30

// Stored value → hidden? 'done' = tapped the review button; 'later:<ms>' = Not now until then.
export function reviewCardOff(stored, now = Date.now()) {
  if (stored === 'done') return true
  const m = /^later:(\d+)$/.exec(String(stored ?? ''))
  return Boolean(m) && now < Number(m[1])
}

export const laterValue = (now = Date.now()) => `later:${now + LATER_DAYS * 86_400_000}`

export function readReviewCard() {
  try { return localStorage.getItem(REVIEW_KEY) ?? '' } catch { return '' }
}

export function saveReviewCard(value) {
  try { localStorage.setItem(REVIEW_KEY, value) } catch { /* storage blocked: it shows again next time */ }
}

export const reviewCardHidden = () => reviewCardOff(readReviewCard())
