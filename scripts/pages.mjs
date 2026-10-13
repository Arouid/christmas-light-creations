// The public pages the build knows about: which ones it draws into their
// HTML (prerender.mjs) and which go in the sitemap (build-areas.mjs). Pure,
// so tests/costGuide.test.mjs can check a page is in both without building.
export const SITE = 'https://christmas-light-creations.com'

export const pagePath = (a) => `christmas-light-installation/${a.slug}/`

// Drawn at build time; `expect` must be in the drawn HTML, `absent` must not
// (gift wrapping is drawn only after the page asks the server whether it is
// switched on, lib/giftWrapping.js).
export const PRERENDERED = [
  { html: 'index.html', module: '/src/App.jsx', expect: 'Holiday lights', absent: 'ift wrapping' },
  { html: 'design/index.html', module: '/src/design/DesignPage.jsx', expect: 'sample-design.webp', absent: 'ift wrapping' },
  { html: 'cost/index.html', module: '/src/cost/CostPage.jsx', expect: 'What sets the price' },
]

// sitemap.xml, in order: home, the designer, the cost guide, the area pages, the policies.
export const sitemapUrls = (areas) => [`${SITE}/`, `${SITE}/design/`, `${SITE}/cost/`, ...areas.map((a) => `${SITE}/${pagePath(a)}`), `${SITE}/privacy/`, `${SITE}/terms/`]
