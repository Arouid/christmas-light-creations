import { afterFirstPaint } from './afterFirstPaint.js'

// Google Ads conversion tag (owner decision 2026-10-11: ads bring leads; let
// Google see which clicks turn into estimate requests). This is the ONLY
// third-party script on the public site: it runs on the public pages (home,
// /design/, /cost/, /thanks/, and the area pages through adsLoaderScript),
// never on /leads/, /proposal/, /account/ or /invoice/. Empty tagId = nothing
// loads. Disclosed on /privacy/.
export const ADS = {
  tagId: 'AW-18506316066', // Google Ads account tag (campaign created 2026-10-11)
  labels: { estimate: '7UM3CJ-e45gdEKLyv_hE' }, // "Submit lead form" conversion (fires on /thanks/)
}

export const adsOn = () => Boolean(ADS.tagId)

// "AW-123/abcDEF" for gtag's send_to, or null when not set up.
export const conversionTarget = (kind, ads = ADS) => (ads.tagId && ads.labels?.[kind] ? `${ads.tagId}/${ads.labels[kind]}` : null)

// Puts the tag on a page: gtag()'s queue, its config, then gtag.js itself.
// Self-contained: the area pages inline its source (adsLoaderScript), so it
// may use nothing from outside its arguments. Returns the <script>.
export function addGtag(tagId, win, doc) {
  win.dataLayer = win.dataLayer || []
  win.gtag = win.gtag || function gtag() { win.dataLayer.push(arguments) } // eslint-disable-line prefer-rest-params
  win.gtag('js', new Date())
  win.gtag('config', tagId)
  const s = doc.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`
  doc.head.append(s)
  return s
}

let loading
// Loads gtag.js once, after the page has settled (it's for attribution, not the page).
export function loadAdsTag() {
  if (!adsOn() || typeof document === 'undefined') return Promise.resolve(false)
  loading ??= new Promise((resolve) => {
    const s = addGtag(ADS.tagId, window, document)
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
  })
  return loading
}

// The area pages (scripts/build-areas.mjs) ship no JavaScript bundle, only this
// <script> body: the tag, loaded like on the other public pages (first paint,
// then 1.5 s, as src/main.jsx does), so an ad click that lands on a town page
// keeps Google's click id until the estimate request. '' when the tag is off.
export const adsLoaderScript = (ads = ADS) => (ads.tagId
  ? `(${afterFirstPaint})(function(){setTimeout(function(){(${addGtag})(${JSON.stringify(ads.tagId).replace(/</g, '\\u003c')},window,document)},1500)})`
  : '')

// Enhanced conversions (docs/decisions.md 2026-10-15): with the estimate
// request, Google gets a SHA-256 hash of the email and phone the person typed,
// so it can match the request to the ad click. Hashed here in the browser:
// the email and phone themselves never reach Google, nor the tab's storage.
// Google's rules for data you hash yourself (support.google.com/google-ads/answer/13258081):
// email trimmed and lowercased, without the dots before @gmail.com or
// @googlemail.com; phone in E.164 (+1XXXXXXXXXX). A field we don't have is
// left out, never sent blank; the phone only goes with an email.

// A US number as E.164, or null (an area code never starts with 0 or 1).
export function usPhoneE164(phone) {
  const d = String(phone ?? '').replace(/\D/g, '')
  const ten = d.length === 11 && d[0] === '1' ? d.slice(1) : d
  return ten.length === 10 && /^[2-9]/.test(ten) ? `+1${ten}` : null
}

// { email, phone_number } normalized for hashing, or null without a usable email.
export function normalizeContact({ email, phone } = {}) {
  const e = String(email ?? '').trim().toLowerCase()
  const at = e.lastIndexOf('@')
  if (at < 1 || !/^[^\s@]+\.[^\s@]+$/.test(e.slice(at + 1)) || /\s/.test(e)) return null
  const domain = e.slice(at + 1)
  const name = domain === 'gmail.com' || domain === 'googlemail.com' ? e.slice(0, at).replace(/\./g, '') : e.slice(0, at)
  const phoneNumber = usPhoneE164(phone)
  return { email: `${name}@${domain}`, ...(phoneNumber && { phone_number: phoneNumber }) }
}

const sha256 = async (text) => [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
  .map((b) => b.toString(16).padStart(2, '0')).join('')

// gtag's user_data with hashed fields only, or null (no email, or no Web Crypto).
export async function hashedUserData(contact) {
  const c = normalizeContact(contact)
  if (!c || !globalThis.crypto?.subtle) return null
  return {
    sha256_email_address: await sha256(c.email),
    ...(c.phone_number && { sha256_phone_number: await sha256(c.phone_number) }),
  }
}

// Keeps only well-formed hashed fields (what /thanks/ reads came from storage).
export function validUserData(data) {
  const out = {}
  for (const k of ['sha256_email_address', 'sha256_phone_number']) {
    if (typeof data?.[k] === 'string' && /^[0-9a-f]{64}$/.test(data[k])) out[k] = data[k]
  }
  return out.sha256_email_address ? out : null
}

export const ADS_CONTACT_KEY = 'clc-ads-contact'

// The estimate form, after a successful send: hand the hash to /thanks/ in
// this tab's sessionStorage (never the URL, never localStorage). Never throws:
// blocked storage only means the conversion counts without it.
export async function keepContactForAds(contact, { ads = ADS, store = () => window.sessionStorage } = {}) {
  if (!ads.tagId) return false
  try {
    const data = await hashedUserData(contact)
    if (!data) return false
    store().setItem(ADS_CONTACT_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

// /thanks/: takes the hash once and clears it at once, so a reload can't send it again.
export function takeContactForAds(store = () => window.sessionStorage) {
  try {
    const s = store()
    const raw = s.getItem(ADS_CONTACT_KEY)
    s.removeItem(ADS_CONTACT_KEY)
    return raw ? validUserData(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

// Tell Google a conversion happened (e.g. the estimate request landed on /thanks/).
// userData (enhanced conversions) goes first, as Google asks.
export async function reportConversion(kind, userData = null) {
  const target = conversionTarget(kind)
  if (!target) return false
  await loadAdsTag()
  if (userData) window.gtag?.('set', 'user_data', userData)
  window.gtag?.('event', 'conversion', { send_to: target })
  return true
}
