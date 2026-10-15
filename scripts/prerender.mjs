// After `vite build`: draws the home page, /design/, /cost/, /gift-wrapping/
// (only its empty shell: the page is behind a switch), /privacy/ and
// /terms/ (the list is PRERENDERED in pages.mjs) into their HTML, so a phone
// shows the page before the JavaScript has arrived and crawlers that don't run
// JavaScript read it; React then takes it over (src/main.jsx and each page's
// own main.jsx). Things only the visitor's browser
// knows are drawn as the build sees them (src/lib/prerendered.js). The home
// page also gets the hero-photo picker at the top of its <head>, before the
// stylesheet, so it runs at once and only the picked photo downloads
// (src/lib/heroPhoto.js).
// Run by `npm run build`.
import { readFile, writeFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'
import { PRERENDERED as PAGES } from './pages.mjs'

const EMPTY = '<div id="root"></div>'
const HERO_AT = '<meta name="theme-color"'
const dist = new URL('../dist/', import.meta.url)

const vite = await createServer({ logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false } })
try {
  const { BuildDay, localDay } = await vite.ssrLoadModule('/src/lib/prerendered.js')
  const day = localDay()
  const { heroPhotos } = await vite.ssrLoadModule('/src/data/content.js')
  const { heroScript } = await vite.ssrLoadModule('/src/lib/heroPhoto.js')
  // Gift wrapping is behind the owner's switch (docs/specs/gift-wrapping.md): not one of its
  // phrases may be in a built page, <head> included, as written or as React escapes it.
  const { giftPhrases } = await vite.ssrLoadModule('/src/lib/giftWrapping.js')
  const escaped = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
  const behindSwitch = giftPhrases().flatMap((w) => [w, escaped(w)])
  for (const p of PAGES) {
    const { default: Page } = await vite.ssrLoadModule(p.module)
    const body = renderToString(createElement(BuildDay, { value: day }, createElement(Page)))
    if (!body.includes(p.expect)) throw new Error(`${p.html}: prerendered page is missing "${p.expect}"`)
    if (p.absent && body.includes(p.absent)) throw new Error(`${p.html}: prerendered page must not carry "${p.absent}" (it is behind a switch)`)
    const file = new URL(p.html, dist)
    let html = await readFile(file, 'utf8')
    if (!html.includes(EMPTY)) throw new Error(`${p.html}: no empty ${EMPTY}`)
    if (p.hero) {
      if (!html.includes(HERO_AT)) throw new Error(`${p.html}: no ${HERO_AT} to put the hero-photo picker before`)
      html = html.replace(HERO_AT, `<script>${heroScript(heroPhotos)}</script>\n    ${HERO_AT}`)
    }
    html = html.replace(EMPTY, `<div id="root" data-day="${day}">${body}</div>`)
    const leak = behindSwitch.find((w) => html.includes(w))
    if (leak) throw new Error(`${p.html}: built page carries the gift-wrapping words "${leak}" (they are behind a switch)`)
    await writeFile(file, html)
    console.log(`prerendered ${p.html}: ${Math.round(body.length / 1024)} KB`)
  }
} finally {
  await vite.close()
}
