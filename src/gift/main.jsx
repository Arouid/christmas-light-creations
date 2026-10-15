import '../index.css'
import { afterFirstPaint } from '../lib/afterFirstPaint.js'
import { loadAdsTag } from '../lib/ads.js'

// /gift-wrapping/ (docs/specs/gift-wrapping.md). The built page arrives
// already drawn (scripts/prerender.mjs: the header, an empty main and the
// footer while it asks whether gift wrapping is on), so React isn't needed to
// show it: once the browser has painted it, React loads and takes the page
// over (lib/mount.jsx).
afterFirstPaint(async () => {
  const [{ mount }, { default: GiftPage }] = await Promise.all([import('../lib/mount.jsx'), import('./GiftPage.jsx')])
  mount(GiftPage)
})

// Google Ads tag (only when set up in lib/ads.js), well after the page is usable.
afterFirstPaint(() => setTimeout(loadAdsTag, 1500))
