// The public pages the build knows about: which ones it draws into their
// HTML (prerender.mjs) and which go in the sitemap (build-areas.mjs). Pure,
// so tests/costGuide.test.mjs can check a page is in both without building.
export const SITE = 'https://christmas-light-creations.com'

export const pagePath = (a) => `christmas-light-installation/${a.slug}/`

// The business in structured data: the home page describes it (index.html) and every area page's
// Service names it as provider by this same id, so search engines read them as one business.
export const BUSINESS_ID = `${SITE}/#business`

// An area page's meta description: short enough (160 characters at most, tests/seo.test.mjs) that
// the phone number at the end isn't cut off in search results. Neighborhood notes in brackets
// ("Shadow Creek Ranch (west of 288)") are left out here and in the structured data.
export const townName = (t) => t.replace(/\s*\(.*\)$/, '')
export const areaDescription = (a, business) =>
  `Christmas light installation in ${townName(a.towns[0])} and ${townName(a.towns[1])}: free service calls, January removal, family-owned since ${business.since}. Free estimates: ${business.phone}.`

// Drawn at build time; `expect` must be in the drawn HTML, `absent` must not,
// nor any phrase of the gift-wrapping words on any page (gift wrapping is drawn
// only after the page asks the server whether it is switched on,
// lib/giftWrapping.js; its own page is built as an empty shell). `hero`: the
// page gets the hero-photo picker in its <head> (src/lib/heroPhoto.js), so
// each visit downloads one photo.
export const PRERENDERED = [
  { html: 'index.html', module: '/src/App.jsx', expect: 'Holiday lights', absent: 'ift wrapping', hero: true },
  { html: 'design/index.html', module: '/src/design/DesignPage.jsx', expect: 'sample-design.webp', absent: 'ift wrapping' },
  { html: 'cost/index.html', module: '/src/cost/CostPage.jsx', expect: 'What sets the price' },
  { html: 'gift-wrapping/index.html', module: '/src/gift/GiftPage.jsx', expect: 'data-behind-switch', absent: 'ift wrapping' },
  { html: 'privacy/index.html', module: '/src/privacy/PrivacyPage.jsx', expect: 'we never sell it' },
  { html: 'terms/index.html', module: '/src/terms/TermsPage.jsx', expect: 'installation agreement' },
]

// sitemap.xml, in order: home, the designer, the cost guide, the area pages, the policies.
// Never /gift-wrapping/: it is behind a switch the build can't see (docs/specs/gift-wrapping.md).
export const sitemapUrls = (areas) => [`${SITE}/`, `${SITE}/design/`, `${SITE}/cost/`, ...areas.map((a) => `${SITE}/${pagePath(a)}`), `${SITE}/privacy/`, `${SITE}/terms/`]
