import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { areas } from '../src/data/areas.js'
import { costGuide, faq, footerLinks } from '../src/data/content.js'
import { dollarAmounts, faqSchema, jsonLd } from '../src/lib/costGuide.js'
import { LINK, plainText, textWithLinks } from '../src/lib/rich.js'
import { PRERENDERED, SITE, sitemapUrls } from '../scripts/pages.mjs'

const repo = (rel) => readFile(new URL(`../${rel}`, import.meta.url), 'utf8')

test('the guide covers what drives the price, in the owner’s own terms, with real answers', () => {
  const drivers = costGuide.drivers.items.map((d) => `${d.title} ${d.body}`.toLowerCase())
  for (const word of ['roofline', 'tree', 'pitch', 'lease', 'takedown']) assert.ok(drivers.some((d) => d.includes(word)), `a driver about ${word}`)
  assert.ok(costGuide.faq.items.length >= 5)
  for (const [q, a] of costGuide.faq.items) {
    assert.ok(q.endsWith('?') && a.length > 40, `a real question and answer: ${q}`)
  }
  for (const key of ['exact', 'pay', 'early', 'diy', 'closing']) assert.ok(costGuide[key].title, `${key} has a title`)
  assert.ok(costGuide.exact.steps.some((s) => s.includes('#estimate')), 'the exact-price steps link the estimate form')
  assert.ok(costGuide.diy.yourself.items.length >= 3 && costGuide.diy.hired.items.length >= 3)
})

test('no dollar amount anywhere on the page until the owner publishes ranges', () => {
  // Owner (2026-10-09): no prices that tie our hands. With `ranges.rows` empty
  // the page says we quote each home; a $ amount in any string is a mistake.
  if (costGuide.ranges.rows.length === 0) assert.deepEqual(dollarAmounts(costGuide), [])
  else for (const r of costGuide.ranges.rows) assert.ok(r.home && /\$\s?\d/.test(r.price), `a published range names a home and a $ price: ${JSON.stringify(r)}`)
  assert.deepEqual(dollarAmounts({ a: 'Pay $1,200', b: ['$ 95', 'free'], c: { d: '$950–$1,400' } }), ['Pay $1,200', '$ 95', '$950–$1,400'])
})

test('FAQPage structured data: the page’s own questions, the answers as plain text', () => {
  const schema = faqSchema(costGuide.faq.items)
  assert.equal(schema['@type'], 'FAQPage')
  assert.equal(schema.mainEntity.length, costGuide.faq.items.length)
  for (const [i, entity] of schema.mainEntity.entries()) {
    assert.equal(entity.name, costGuide.faq.items[i][0])
    assert.ok(!entity.acceptedAnswer.text.includes('**') && !LINK.test(entity.acceptedAnswer.text), 'no markup left in an answer')
    LINK.lastIndex = 0
  }
  assert.equal(plainText('See **[the guide](/cost/)** now'), 'See the guide now')
  assert.equal(textWithLinks('See **[the guide](/cost/)** or [Google](https://g.co)', 'https://x.com'), 'See the guide (https://x.com/cost/) or Google (https://g.co)')
  assert.ok(!jsonLd({ text: '</script><b>' }).includes('</script>'), 'a < in the data cannot close the script tag')
  assert.deepEqual(JSON.parse(jsonLd({ text: '</script>' })), { text: '</script>' })
})

test('the page is built, drawn at build time, in the sitemap, and linked from every footer and the FAQ', async () => {
  const page = PRERENDERED.find((p) => p.html === 'cost/index.html')
  assert.ok(page, 'prerender.mjs draws /cost/')
  assert.equal(page.module, '/src/cost/CostPage.jsx')
  assert.equal(page.expect, costGuide.drivers.title, 'the check word is a heading the page really shows')

  const urls = sitemapUrls(areas)
  assert.ok(urls.includes(`${SITE}/cost/`), 'the sitemap lists /cost/')
  assert.ok(urls.includes(`${SITE}/`) && urls.includes(`${SITE}/privacy/`) && urls.includes(`${SITE}/terms/`) && urls.includes(`${SITE}/design/`))
  assert.ok(areas.every((a) => urls.includes(`${SITE}/christmas-light-installation/${a.slug}/`)), 'and every area page')
  assert.equal(new Set(urls).size, urls.length, 'no duplicates')

  assert.ok((await repo('vite.config.js')).includes(`'cost/index.html'`), 'vite builds cost/index.html')
  const html = await repo('cost/index.html')
  assert.ok(html.includes('<meta name="robots" content="noai, noimageai" />'), 'the AI meta every page carries')
  assert.ok(html.includes(`<link rel="canonical" href="${SITE}/cost/" />`))
  assert.ok(html.includes('/src/cost/main.jsx'))

  // The home and designer footers map footerLinks; the area pages' footer and the home FAQ carry the link too.
  assert.ok(footerLinks.some((l) => l.href.endsWith('cost/')), 'a footer link to the guide')
  assert.ok((await repo('scripts/build-areas.mjs')).includes('footerLinks.map('), 'the area pages draw the same footer links')
  const pricing = faq.flatMap((g) => g.items).find(([q]) => q === 'How do you price it?')
  assert.ok(pricing && /\]\([^)]*cost\/\)/.test(pricing[1]), 'the FAQ pricing answer links the guide')
})
