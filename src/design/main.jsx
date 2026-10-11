import '../index.css'
import { afterFirstPaint } from '../lib/afterFirstPaint.js'
import { loadAdsTag } from '../lib/ads.js'

// The built page arrives already drawn (scripts/prerender.mjs), so React
// isn't needed to show it: once the browser has painted it, React loads and
// takes the page over (lib/mount.jsx).
afterFirstPaint(async () => {
  const [{ mount }, { default: DesignPage }] = await Promise.all([import('../lib/mount.jsx'), import('./DesignPage.jsx')])
  mount(DesignPage)
})

// Google Ads tag (only when set up in lib/ads.js), well after the page is usable.
afterFirstPaint(() => setTimeout(loadAdsTag, 1500))
