// Nextdoor's notice emails to info@ (the business page's account, since
// 2026-10-15) -> one 💬 item each, instead of being dropped as service mail
// (owner: "have nextdoor messages appear in our notifications"). Only notices
// addressed to the business are kept: a neighbor's message, a recommendation,
// a comment on our post, a mention. Digests, "near you" mail and everything
// else from nextdoor.com stay dropped, as before. Pure: no Firebase. Spec:
// docs/specs/nextdoor-notices.md. Tested in tests/nextdoor.test.mjs.
//
// The wording is Nextdoor's usual notice wording; no real notice had reached
// info@ when this was written, so an unknown shape is dropped (as before) and
// the owner's test message is the live check (docs/test-checklist.md).

export const NEXTDOOR_URL = 'https://nextdoor.com/'
export const NEXTDOOR_MAX = 600

// What each kept notice is called in 💬 (stored as the item's subject).
export const NOTICE_WORD = { message: 'New message', recommendation: 'New recommendation', comment: 'Comment on your post', mention: 'Mentioned you' }

const BIZ = '(?:you|your business|your page|christmas light creations)'
const TYPES = [
  ['message', new RegExp(`\\b(?:sent ${BIZ} a (?:private |direct )?message|(?:you have )?(?:a )?new (?:private |direct )?message|messaged ${BIZ}|replied to your message|wrote to ${BIZ})\\b`, 'i')],
  ['recommendation', new RegExp(`\\b(?:recommended ${BIZ}|new recommendation|(?:left|wrote|gave) ${BIZ} a recommendation|(?:left|wrote|gave) a recommendation for ${BIZ}|recommendation for ${BIZ})\\b`, 'i')],
  ['comment', new RegExp(`\\b(?:commented on (?:your|${BIZ}'s?) (?:post|ad|update|deal)|replied to (?:your|you in a) (?:post|comment|update)|new (?:comments?|repl(?:y|ies)) on your (?:post|ad|update|deal))\\b`, 'i')],
  ['mention', new RegExp(`\\b(?:mentioned ${BIZ}|tagged ${BIZ})\\b`, 'i')],
]
// Mail about the neighborhood, not to us: never kept, even if a post title in it says "new message".
const DIGEST = /\b(?:digest|today'?s top|top posts?|trending|this week (?:on|in)|weekly|daily|near you|in your (?:neighborhood|area)|neighbors near|popular|you might like|suggested|events? (?:this|near))\b/i
// Where the notice's own words end: buttons, footers, legal lines.
const FOOTER = /^(?:(?:reply|respond|view|see|open|read)(?: it| now| the| this| all| more)?(?: on| in)? ?(?:nextdoor|message|conversation|the app|post|comment|recommendation|full)|unsubscribe|manage (?:your )?(?:email|notification)|(?:notification|email) (?:settings|preferences)|nextdoor,? inc|this (?:message|email) was (?:sent|intended)|you('re| are) receiving|you received this|download the (?:nextdoor )?app|get the (?:nextdoor )?app|privacy policy|help center|©)/i
const URL = /<?https?:\/\/\S+>?/g

export const isNextdoor = (address) => /@(?:[a-z0-9-]+\.)*nextdoor\.com$/i.test(String(address ?? '').trim())

// '"Jane D. via Nextdoor" <reply@rs.email.nextdoor.com>' -> 'Jane D.'; "Nextdoor" alone -> ''.
function displayName(fromHeader) {
  const m = String(fromHeader ?? '').match(/^\s*"?([^"<]+?)"?\s*</)
  const name = (m?.[1] ?? '').replace(/\s+(?:via|on|from)\s+nextdoor.*$/i, '').trim()
  return /^nextdoor\b/i.test(name) || /@/.test(name) ? '' : name
}

// "Jane D. sent you a message" -> "Jane D."
function nameFromSubject(subject) {
  const m = String(subject ?? '').match(/^(.{2,40}?)\s+(?:sent|messaged|recommended|commented|replied|mentioned|tagged|left|wrote|gave)\b/i)
  const name = (m?.[1] ?? '').trim()
  return !name || /^(?:you|new|a|someone|your)\b/i.test(name) ? '' : name
}

// The neighbor's words: the body without links, buttons and footers, capped.
export function noticeText(body, subject = '') {
  const lines = []
  const subj = String(subject).trim().toLowerCase()
  for (const raw of String(body ?? '').replace(/\r/g, '').split('\n')) {
    const line = raw.replace(URL, '').replace(/\s+/g, ' ').trim()
    if (FOOTER.test(line)) break
    if (!line || line.toLowerCase() === subj) continue
    lines.push(line)
  }
  const text = lines.join('\n').trim()
  return text.length > NEXTDOOR_MAX ? `${text.slice(0, NEXTDOOR_MAX - 1)}…` : text
}

// One collected email ({ from, subject, body }) -> { type, word, who, text }, or null to leave it to the junk rules.
export function nextdoorNotice(item) {
  const fromAddress = (String(item?.from ?? '').match(/[^\s<>,;"']+@[^\s<>,;"']+/) ?? [''])[0]
  if (!isNextdoor(fromAddress)) return null
  const subject = String(item?.subject ?? '').trim()
  if (!subject || DIGEST.test(subject)) return null
  const type = TYPES.find(([, re]) => re.test(subject))?.[0]
  if (!type) return null
  return { type, word: NOTICE_WORD[type], who: displayName(item.from) || nameFromSubject(subject), text: noticeText(item.body, subject) }
}
