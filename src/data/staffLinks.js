// Links staff may need (Reports → Links, docs/specs/staff-links.md; owner
// 2026-10-15: "make me a list of important links the staff may need", "and
// email its tied to", "put them with reports"). The repo is public, so the
// login each account is tied to is NOT here: staff fill it in on the report
// and it is kept in settings/app.logins. The only address in this file is
// info@, the business's public one; a test refuses any other.
import { BUSINESS_EMAIL } from '../lib/messages.js'

// login: fixed words when nobody needs to fill it in (no email in them);
// default: shown until someone saves a login; fromSetting: a settings/app
// field that already holds the login (Google Voice's account).
export const LINK_GROUPS = [
  {
    title: 'Website and staff app',
    links: [
      { id: 'staff-app', name: 'Staff app', url: 'https://christmas-light-creations.com/leads/', what: 'This app: leads, customers, season, invoices, messages', login: 'Your own Google account (on the staff list)' },
      { id: 'accounts', name: 'Customer accounts', url: 'https://christmas-light-creations.com/account/', what: 'What customers see and pay; staff use 👁 View their account', login: 'The customer’s own sign-in' },
      { id: 'firebase', name: 'Firebase', url: 'https://console.firebase.google.com/project/clc-leads-site/overview', what: 'Customer data, sign-ins, function logs, job photos, database rules' },
      { id: 'cloud', name: 'Google Cloud', url: 'https://console.cloud.google.com/billing?project=clc-leads-site', what: 'Billing, the Maps key (APIs → Credentials), spend data in BigQuery' },
      { id: 'github', name: 'GitHub', url: 'https://github.com/Arouid/christmas-light-creations', what: 'The site’s code; the Actions tab shows each deploy', note: 'User Arouid' },
      { id: 'godaddy', name: 'GoDaddy', url: 'https://account.godaddy.com/products', what: 'Domain and DNS (renews Jul 23, 2027, paid through PayPal)' },
      { id: 'anthropic', name: 'Anthropic (Claude)', url: 'https://console.anthropic.com', what: 'Claude behind Suggest a reply and Ask Claude ($150 a month cap)' },
    ],
  },
  {
    title: 'Google and email',
    links: [
      { id: 'gmail', name: 'Gmail (info@)', url: `https://mail.google.com/mail/u/${BUSINESS_EMAIL}/`, what: 'The business inbox; the app’s emails go out from it', default: BUSINESS_EMAIL },
      { id: 'calendar', name: 'Calendar (info@)', url: `https://calendar.google.com/calendar/r?authuser=${BUSINESS_EMAIL}`, what: 'The business calendar', default: BUSINESS_EMAIL },
      { id: 'workspace', name: 'Google Workspace admin', url: 'https://admin.google.com', what: 'Mailboxes, passwords, app passwords' },
      { id: 'voice', name: 'Google Voice', url: 'https://voice.google.com', what: '281-819-0163: texts, calls, voicemail', fromSetting: 'voiceAccount' },
      { id: 'apps-script', name: 'Apps Script (message sync)', url: 'https://script.google.com', what: 'Brings new mail and texts into the app every 5 minutes', default: BUSINESS_EMAIL },
      { id: 'youtube', name: 'YouTube', url: 'https://studio.youtube.com', what: 'The ad videos (unlisted)', default: BUSINESS_EMAIL },
      { id: 'ads', name: 'Google Ads', url: 'https://ads.google.com', what: 'Ads, budget, what people searched', note: 'Account 926-884-6031 (a second account there can’t be read)' },
      { id: 'profile', name: 'Google Business Profile', url: 'https://business.google.com', what: 'The Google listing: posts, photos, reviews', note: 'Two profiles exist; Google support is merging them' },
      { id: 'review', name: 'Google review link', url: 'https://g.page/r/CWKRhzePqUvIEAI/review', what: 'Send to customers to leave a review', login: 'None: a public link' },
      { id: 'search-console', name: 'Search Console', url: 'https://search.google.com/search-console', what: 'How the site shows up on Google' },
      { id: 'bing', name: 'Bing Webmaster Tools', url: 'https://www.bing.com/webmasters', what: 'How the site shows up on Bing (and ChatGPT, which searches Bing)' },
      { id: 'bing-places', name: 'Bing Places', url: 'https://www.bingplaces.com', what: 'The Bing listing; Sync copies the Google profile' },
      { id: 'play', name: 'Google Play Console', url: 'https://play.google.com/console', what: 'The customer app (the /account/ page)', note: 'Not created yet' },
    ],
  },
  {
    title: 'Money',
    links: [
      { id: 'paypal', name: 'PayPal', url: 'https://www.paypal.com/myaccount/summary', what: 'Customer payments' },
      { id: 'square', name: 'Square', url: 'https://squareup.com/dashboard', what: 'Card payments (older seasons)' },
    ],
  },
  {
    title: 'Listings and social',
    links: [
      { id: 'nextdoor', name: 'Nextdoor', url: 'https://business.nextdoor.com', what: 'The business page and neighbors’ messages', default: BUSINESS_EMAIL },
      { id: 'yelp', name: 'Yelp', url: 'https://biz.yelp.com', what: 'The free listing and quote requests', note: 'Its notices go to info@' },
      { id: 'facebook', name: 'Facebook page', url: 'https://business.facebook.com', what: 'Posts', note: 'Being recovered' },
      { id: 'thumbtack', name: 'Thumbtack', url: 'https://www.thumbtack.com/pro', what: 'Directory listing', note: 'Not set up yet' },
    ],
  },
  {
    title: 'Tools and stock',
    links: [
      { id: 'adcopilot', name: 'AdCopilot', url: 'https://adcopilot.cloud', what: 'Claude’s Google Ads and Search Console reader' },
      { id: 'posty', name: 'Posty', url: null, where: 'claude.ai → Customize → Connectors → Posty', what: 'Post scheduling for Claude (parked)', note: 'Through Scott’s Claude account' },
      { id: 'envato', name: 'Envato Elements', url: 'https://elements.envato.com', what: 'Music, video and graphics (one download per project)' },
      { id: 'vecteezy', name: 'Vecteezy', url: 'https://www.vecteezy.com', what: 'Stock graphics' },
    ],
  },
]

export const ALL_LINKS = LINK_GROUPS.flatMap((g) => g.links)

export const LOGIN_MAX = 120
export const NOT_RECORDED = 'Not recorded: ask Scott'

// Rows staff can fill in (the ones without fixed words).
export const editable = (link) => !link.login

// What the Login line says: fixed words, the saved login, a login already in
// settings, the default, or "ask Scott". known = something real to show.
export function loginFor(link, settings) {
  if (link.login) return { text: link.login, known: true }
  const saved = String(settings?.logins?.[link.id] ?? '').trim()
  const set = link.fromSetting ? String(settings?.[link.fromSetting] ?? '').trim() : ''
  const text = saved || set || link.default || ''
  return text ? { text, known: true } : { text: NOT_RECORDED, known: false }
}

// The draft as typed → what settings/app.logins stores: every editable id,
// trimmed and capped; a blank stays '' (the save merges, so a removed key
// would come back).
export function cleanLogins(draft) {
  return Object.fromEntries(ALL_LINKS.filter(editable)
    .map((l) => [l.id, String(draft?.[l.id] ?? '').trim().slice(0, LOGIN_MAX)]))
}

// The draft the editor opens with: only what was saved. A box left blank
// shows (and keeps) the default or Voice's setting as its hint.
export function loginDraft(settings) {
  return Object.fromEntries(ALL_LINKS.filter(editable)
    .map((l) => [l.id, String(settings?.logins?.[l.id] ?? '').trim()]))
}

// The hint in a blank box: what shows when nothing is saved.
export function loginHint(link, settings) {
  const shown = loginFor(link, { ...settings, logins: {} })
  return shown.known ? shown.text : 'Email or username'
}
