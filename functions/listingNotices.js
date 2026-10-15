// Nextdoor's and Yelp's notice emails to info@ (both accounts are on info@,
// owner 2026-10-15) -> one 💬 item each, instead of being dropped as service
// mail (owner: "have nextdoor messages appear in our notifications", then
// "yelp and nextdoor are connected to info@"). Only notices from a person to
// the business are kept: on Nextdoor a neighbor's message, a recommendation, a
// comment on our post, a mention; on Yelp a customer's message or a Request a
// Quote. Digests, stats, tips, upsells and everything else from those domains
// stay dropped, as before. Pure: no Firebase. Spec: docs/specs/listing-notices.md.
// Tested in tests/listingNotices.test.mjs.
//
// The wording is each site's usual notice wording; no real notice had reached
// info@ when this was written, so an unknown shape is dropped (as before) and
// the owner's test messages are the live check (docs/test-checklist.md #170).

export const NOTICE_MAX = 600

const types = (list) => list.map(([type, word, re]) => ({ type, word, re }))
const ANYONE = '(?:you|your business|your page|christmas light creations)'

// Per site: where to answer, who sends, the name for someone unnamed, what we keep, what is never a person.
export const PLATFORMS = {
  nextdoor: {
    label: 'Nextdoor', icon: '🏘️', url: 'https://nextdoor.com/', someone: 'A neighbor',
    domain: /@(?:[a-z0-9-]+\.)*nextdoor\.com$/i,
    types: types([
      ['message', 'New message', new RegExp(`\\b(?:sent ${ANYONE} a (?:private |direct )?message|(?:you have )?(?:a )?new (?:private |direct )?message|messaged ${ANYONE}|replied to your message|wrote to ${ANYONE})\\b`, 'i')],
      ['recommendation', 'New recommendation', new RegExp(`\\b(?:recommended ${ANYONE}|new recommendation|(?:left|wrote|gave) ${ANYONE} a recommendation|(?:left|wrote|gave) a recommendation for ${ANYONE}|recommendation for ${ANYONE})\\b`, 'i')],
      ['comment', 'Comment on your post', new RegExp(`\\b(?:commented on (?:your|${ANYONE}'s?) (?:post|ad|update|deal)|replied to (?:your|you in a) (?:post|comment|update)|new (?:comments?|repl(?:y|ies)) on your (?:post|ad|update|deal))\\b`, 'i')],
      ['mention', 'Mentioned you', new RegExp(`\\b(?:mentioned ${ANYONE}|tagged ${ANYONE})\\b`, 'i')],
    ]),
    // Mail about the neighborhood, not to us: never kept, even if a post title in it says "new message".
    never: /\b(?:digest|today'?s top|top posts?|trending|this week (?:on|in)|weekly|daily|near you|in your (?:neighborhood|area)|neighbors near|popular|you might like|suggested|events? (?:this|near))\b/i,
  },
  yelp: {
    label: 'Yelp', icon: '📍', url: 'https://biz.yelp.com/', someone: 'A Yelp customer',
    domain: /@(?:[a-z0-9-]+\.)*yelp\.com$/i,
    types: types([
      ['quote', 'Quote request', /\b(?:request(?:ed)? a quote|quote request|request for (?:a )?quote|wants a quote|new (?:project|job) request|new lead from|you have a new lead|new request from)\b/i],
      ['message', 'New message', new RegExp(`\\b(?:sent ${ANYONE} a (?:new )?message|(?:you have )?(?:a )?new message|messaged ${ANYONE}|replied to your message|new reply from)\\b`, 'i')],
    ]),
    // Yelp's own mail to business owners: stats, tips, ads and upsells, reviews of the page (never asked for, Yelp's rules).
    never: /\b(?:weekly|monthly|your stats|performance|report|tips?\b|advertis|upgrade|grow your|insights|survey|webinar|free trial|page views|missed (?:\d+ )?(?:leads?|opportunit)|special offer|yelp ads|sponsored|wrote a review|new review|reviewed your)\b/i,
  },
}

// Where a notice's own words end: buttons, footers, legal lines.
const FOOTER = /^(?:(?:reply|respond|view|see|open|read)(?: to)?(?: it| now| the| this| all| more)?(?: on| in)? ?(?:nextdoor|yelp|message|conversation|the app|post|comment|recommendation|request|quote|lead|full)|unsubscribe|manage (?:your )?(?:email|notification)|(?:notification|email) (?:settings|preferences)|nextdoor,? inc|yelp,? inc|this (?:message|email) was (?:sent|intended)|you('re| are) receiving|you received this|download the (?:nextdoor |yelp )?app|get the (?:nextdoor |yelp )?app|privacy policy|help center|©)/i
const URL = /<?https?:\/\/\S+>?/g

export const platformOf = (address) => {
  const a = String(address ?? '').trim()
  return Object.keys(PLATFORMS).find((p) => PLATFORMS[p].domain.test(a)) ?? ''
}

// '"Jane D. via Nextdoor" <reply@rs.email.nextdoor.com>' -> 'Jane D.'; "Nextdoor" or "Yelp" alone -> ''.
function displayName(fromHeader) {
  const m = String(fromHeader ?? '').match(/^\s*"?([^"<]+?)"?\s*</)
  const name = (m?.[1] ?? '').replace(/\s+(?:via|on|from)\s+(?:nextdoor|yelp).*$/i, '').trim()
  return /^(?:nextdoor|yelp)\b/i.test(name) || /@/.test(name) ? '' : name
}

// "Jane D. sent you a message" / "New message from Jane D." -> "Jane D."
function nameFromSubject(subject) {
  const s = String(subject ?? '').trim()
  const lead = s.match(/^(.{2,40}?)\s+(?:sent|messaged|recommended|commented|replied|mentioned|tagged|left|wrote|gave|requested|wants)\b/i)?.[1]?.trim() ?? ''
  if (lead && !/^(?:you|new|a|someone|your)\b/i.test(lead)) return lead
  return s.match(/\bfrom\s+([^,!?:;]{2,40}?)(?:\s+on\s+(?:nextdoor|yelp))?\s*!?$/i)?.[1]?.trim() ?? ''
}

// The person's words: the body without links, buttons and footers, capped.
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
  return text.length > NOTICE_MAX ? `${text.slice(0, NOTICE_MAX - 1)}…` : text
}

// One collected email ({ from, subject, body }) -> { platform, type, word, who, text }, or null to leave it to the junk rules.
export function listingNotice(item) {
  const fromAddress = (String(item?.from ?? '').match(/[^\s<>,;"']+@[^\s<>,;"']+/) ?? [''])[0]
  const platform = platformOf(fromAddress)
  if (!platform) return null
  const site = PLATFORMS[platform]
  const subject = String(item?.subject ?? '').trim()
  if (!subject || site.never.test(subject)) return null
  const hit = site.types.find(({ re }) => re.test(subject))
  if (!hit) return null
  return { platform, type: hit.type, word: hit.word, who: displayName(item.from) || nameFromSubject(subject), text: noticeText(item.body, subject) }
}
