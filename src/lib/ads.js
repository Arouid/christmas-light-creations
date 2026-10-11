// Google Ads conversion tag (owner decision 2026-10-11: ads bring leads; let
// Google see which clicks turn into estimate requests). This is the ONLY
// third-party script on the public site: it runs on the public pages (home,
// area pages, /design/, /thanks/), never on /leads/, /proposal/, /account/ or
// /invoice/. Empty tagId = nothing loads. Disclosed on /privacy/.
export const ADS = {
  tagId: 'AW-18506316066', // Google Ads account tag (campaign created 2026-10-11)
  labels: { estimate: '' }, // conversion label for "estimate request sent" (/thanks/)
}

export const adsOn = () => Boolean(ADS.tagId)

// "AW-123/abcDEF" for gtag's send_to, or null when not set up.
export const conversionTarget = (kind, ads = ADS) => (ads.tagId && ads.labels?.[kind] ? `${ads.tagId}/${ads.labels[kind]}` : null)

let loading
// Loads gtag.js once, after the page has settled (it's for attribution, not the page).
export function loadAdsTag() {
  if (!adsOn() || typeof document === 'undefined') return Promise.resolve(false)
  loading ??= new Promise((resolve) => {
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments) } // eslint-disable-line prefer-rest-params
    window.gtag('js', new Date())
    window.gtag('config', ADS.tagId)
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ADS.tagId)}`
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.append(s)
  })
  return loading
}

// Tell Google a conversion happened (e.g. the estimate request landed on /thanks/).
export async function reportConversion(kind) {
  const target = conversionTarget(kind)
  if (!target) return false
  await loadAdsTag()
  window.gtag?.('event', 'conversion', { send_to: target })
  return true
}
