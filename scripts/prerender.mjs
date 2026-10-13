// After `vite build`: draws the home page and /design/ into their HTML, so a
// phone shows the page before the JavaScript has arrived; React then takes
// it over (src/main.jsx, src/design/main.jsx). Things only the visitor's
// browser knows are drawn as the build sees them (src/lib/prerendered.js).
// Run by `npm run build`.
import { readFile, writeFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

// absent: what the built HTML must never carry (gift wrapping is drawn only
// after the page asks the server whether it is switched on, lib/giftWrapping.js).
const PAGES = [
  { html: 'index.html', module: '/src/App.jsx', expect: 'Holiday lights', absent: 'ift wrapping' },
  { html: 'design/index.html', module: '/src/design/DesignPage.jsx', expect: 'sample-design.webp', absent: 'ift wrapping' },
]
const EMPTY = '<div id="root"></div>'
const dist = new URL('../dist/', import.meta.url)

const vite = await createServer({ logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false } })
try {
  const { BuildDay, localDay } = await vite.ssrLoadModule('/src/lib/prerendered.js')
  const day = localDay()
  for (const p of PAGES) {
    const { default: Page } = await vite.ssrLoadModule(p.module)
    const body = renderToString(createElement(BuildDay, { value: day }, createElement(Page)))
    if (!body.includes(p.expect)) throw new Error(`${p.html}: prerendered page is missing "${p.expect}"`)
    if (p.absent && body.includes(p.absent)) throw new Error(`${p.html}: prerendered page must not carry "${p.absent}" (it is behind a switch)`)
    const file = new URL(p.html, dist)
    const html = await readFile(file, 'utf8')
    if (!html.includes(EMPTY)) throw new Error(`${p.html}: no empty ${EMPTY}`)
    await writeFile(file, html.replace(EMPTY, `<div id="root" data-day="${day}">${body}</div>`))
    console.log(`prerendered ${p.html}: ${Math.round(body.length / 1024)} KB`)
  }
} finally {
  await vite.close()
}
