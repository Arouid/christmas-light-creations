// Gift wrapping behind a switch (docs/specs/gift-wrapping.md): the switch,
// what the form sends when off vs on, the staff words, its own page
// (/gift-wrapping/) and that nothing public mentions it while off.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SERVICES, giftPhrases, giftWrappingOn, leadService, navLinks, serviceLabel, serviceWords, wantsGiftWrapping } from '../src/lib/giftWrapping.js'
import { parseBooking } from '../src/lib/urgency.js'
import { faq, giftWrapping, nav } from '../src/data/content.js'
import { areas } from '../src/data/areas.js'
import { PRERENDERED, SITE, sitemapUrls } from '../scripts/pages.mjs'
import { salesKnowledge } from '../src/assistant/lib/knowledge.js'

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8')

test('the switch is off unless settings/app.giftWrapping is exactly true', () => {
  assert.equal(giftWrappingOn(undefined), false)
  assert.equal(giftWrappingOn({}), false)
  assert.equal(giftWrappingOn({ giftWrapping: 'yes' }), false)
  assert.equal(giftWrappingOn({ giftWrapping: 1 }), false)
  assert.equal(giftWrappingOn({ giftWrapping: true }), true)
})

test('the page reads the switch from the booking answer, false when missing or odd', () => {
  assert.equal(parseBooking({}).giftWrapping, false)
  assert.equal(parseBooking({ giftWrapping: 'true' }).giftWrapping, false)
  const on = parseBooking({ giftWrapping: true, openDays: ['2026-10-20'], status: { text: 'Booked up', updatedAt: new Date().toISOString() } })
  assert.deepEqual(on, { status: 'Booked up', openDays: ['2026-10-20'], giftWrapping: true })
})

test('what the form sends: nothing while off (no field), the choice when on, never anything else', () => {
  assert.equal(leadService(null), null, 'off: the form has no "What do you need?"')
  assert.equal(leadService(''), null)
  assert.equal(leadService('Cookies'), null)
  assert.equal(leadService(' Both '), 'Both')
  for (const s of SERVICES) assert.equal(leadService(s), s)
  assert.deepEqual(SERVICES, ['Christmas lights', 'Gift wrapping', 'Both'])
})

test('the rules and the lead fields accept exactly those choices', async () => {
  const rules = await read('firestore.rules')
  const create = rules.slice(rules.indexOf('match /leads/'), rules.indexOf('allow read', rules.indexOf('match /leads/')))
  assert.ok(create.includes("'service'"), 'service is an allowed key')
  for (const s of SERVICES) assert.ok(create.includes(`'${s}'`), s)
  assert.match(await read('src/lib/firebase.js'), /LEAD_FIELDS = \[[^\]]*'service'/)
})

test('staff words: a tag only when wrapping is asked for', () => {
  assert.equal(serviceLabel({ service: 'Gift wrapping' }), '🎁 Gift wrapping (no lights)')
  assert.equal(serviceLabel({ service: 'Both' }), '🎁 Lights + gift wrapping')
  assert.equal(serviceLabel({ service: 'Christmas lights' }), '')
  assert.equal(serviceLabel({}), '')
  assert.equal(serviceWords({}), '')
  assert.ok(wantsGiftWrapping({ service: 'Both' }) && !wantsGiftWrapping({ service: 'Christmas lights' }) && !wantsGiftWrapping(undefined))
})

test('the menu: the Gift wrapping link (to its own page) right after Photos when on, the plain menu when off', () => {
  assert.equal(navLinks(nav, false), nav)
  const on = navLinks(nav, true)
  assert.equal(on.length, nav.length + 1)
  assert.equal(on[on.findIndex((n) => n.href === '#gallery') + 1].href, '/gift-wrapping/')
  assert.equal(on.at(-1).href, '#faq')
})

test('its own page: built as an empty shell, kept out of search, never announced', async () => {
  const page = PRERENDERED.find((p) => p.html === 'gift-wrapping/index.html')
  assert.ok(page, 'prerender.mjs draws /gift-wrapping/ (its shell)')
  assert.equal(page.module, '/src/gift/GiftPage.jsx')
  assert.equal(page.absent, 'ift wrapping')
  assert.ok((await read('vite.config.js')).includes("'gift-wrapping/index.html'"), 'vite builds it')
  const html = await read('gift-wrapping/index.html')
  assert.ok(html.includes('<meta name="robots" content="noindex, noai, noimageai" />'), 'noindex, plus the AI meta every page carries')
  assert.doesNotMatch(html, /rel="canonical"|og:|name="description"/, 'no canonical, share card or description to find it by')
  assert.ok(html.includes('/src/gift/main.jsx'))
  assert.doesNotMatch(html.replace('/src/gift/main.jsx', ''), /gift|wrap/i, 'the shell names nothing')
  // The sitemap (and so IndexNow, which pings only sitemap pages) never lists it: the build can't see the switch.
  const urls = sitemapUrls(areas)
  assert.ok(!urls.includes(`${SITE}/gift-wrapping/`) && !urls.some((u) => u.includes('gift')), 'not in the sitemap')
  assert.ok(!(await read('public/robots.txt')).includes('gift'), 'not named in robots.txt either')
  // The page draws itself only on the server's yes, and sends visitors home on a no.
  const src = await read('src/gift/GiftPage.jsx')
  assert.ok(src.includes('useGiftWrappingAnswer()'))
  assert.ok(src.includes('if (on === false) window.location.replace(base)'))
  assert.ok(src.includes('{on ? <Content /> : <Waiting />}'))
  assert.equal(giftWrapping.nav.href, '/gift-wrapping/', 'the menu link and the teaser go to the page')
})

test('the Ask button lands on the form with Gift wrapping already picked', async () => {
  const src = await read('src/gift/GiftPage.jsx')
  assert.match(src, /href="#estimate"/)
  assert.match(src, /<Box id="estimate"/)
  assert.match(src, /<EstimateForm service="Gift wrapping"/)
  assert.ok(SERVICES.includes('Gift wrapping'))
  assert.ok((await read('src/components/EstimateForm.jsx')).includes('useState(SERVICES.includes(startService) ? startService : SERVICES[0])'))
})

test('the home page keeps only a small teaser: no section, no gift FAQ group', async () => {
  const app = await read('src/App.jsx')
  assert.ok(app.includes('<GiftTeaser />'))
  assert.ok(!app.includes('<GiftWrapping />'))
  assert.doesNotMatch(await read('src/components/Faq.jsx'), /giftWrapping/)
  const { teaser } = giftWrapping
  assert.ok(teaser.title.length <= 30 && teaser.body.length <= 60, 'a line, not a section')
})

test('while off, nothing public mentions gift wrapping: the main copy, the prerendered menu/FAQ, the sales assistant', () => {
  const says = (x) => JSON.stringify(x).toLowerCase().includes('gift wrap')
  assert.ok(!says(nav) && !says(faq), 'nav and faq (drawn into the built HTML) stay clean')
  // prerender.mjs refuses a built page with any of these phrases; none may be in the standing copy either.
  const phrases = giftPhrases()
  assert.ok(phrases.includes(giftWrapping.title) && phrases.includes(giftWrapping.teaser.title) && phrases.includes(giftWrapping.faq.items[0][0]))
  assert.ok(!phrases.includes(giftWrapping.nav.href), 'paths are not phrases')
  const standing = JSON.stringify({ nav, faq })
  assert.deepEqual(phrases.filter((p) => standing.includes(p)), [])
  assert.ok(!says(salesKnowledge()), 'the assistant learns about it only once the owner turns it on')
  assert.ok(says(giftWrapping) && giftWrapping.faq.items.length >= 3 && giftWrapping.steps.length === 3)
  // Only the promises the owner has made (docs/specs/gift-wrapping.md): his prices, 2026-10-15
  // ("do $15/$22/$30/$40 with the bow included"), and no dates or supplies yet.
  const words = JSON.stringify(giftWrapping)
  assert.deepEqual(giftWrapping.prices.rows.map((r) => r.price), ['$15', '$22', '$30', '$40'])
  assert.deepEqual([...new Set(words.match(/\$\d+(\.\d+)?/g))].sort(), ['$15', '$22', '$30', '$40'], 'no other amount anywhere')
  assert.match(giftWrapping.prices.intro, /bow is included/)
  // Owner 2026-10-15: "price plus tax", on the tag and in the price answer (the rate lives in settings, not the words).
  assert.match(giftWrapping.prices.intro, /plus sales tax/)
  assert.match(giftWrapping.faq.items.find(([q]) => /cost/.test(q))[1], /plus sales tax/)
  assert.doesNotMatch(words, /\d+(\.\d+)?\s*%/, 'no tax rate in the words')
  assert.doesNotMatch(words, /December \d|Dec\.? \d|\d+(st|nd|rd|th) of December/i)
})

test('the page: the prices on the tag, the bow and decoration pictures it draws are on disk', async () => {
  const src = await read('src/gift/GiftPage.jsx')
  assert.ok(src.includes('t.prices') && src.includes('<Tag />'))
  // Every decoration it names: decor('x.webp'), the step bows (src: 'x.webp'), the ornaments ['x.webp', …].
  const files = [...new Set(src.match(/'[\w-]+\.webp'/g).map((m) => m.slice(1, -1)))]
  assert.ok(files.length >= 10, `${files.length} pictures`)
  for (const f of files) await readFile(new URL(`../public/images/gift-wrap/decor/${f}`, import.meta.url))
  for (const f of (await read('src/components/GiftTeaser.jsx')).match(/[\w-]+\.webp/g)) {
    await readFile(new URL(`../public/images/gift-wrap/decor/${f}`, import.meta.url))
  }
})

test('the "Wrapped by us" photos: his own, on disk, alt texts that say the wrapping and no place', async () => {
  const { serviceAreas } = await import('../src/data/content.js')
  assert.ok(giftWrapping.photos.length >= 1)
  for (const p of giftWrapping.photos) {
    const file = p.src.replace(/^.*images\/gift-wrap\//, '')
    assert.match(file, /^[a-z0-9-]+\.jpg$/, p.src)
    await readFile(new URL(`../public/images/gift-wrap/${file}`, import.meta.url))
    assert.match(p.alt, /bow|ribbon|paper/i, p.src)
    for (const town of serviceAreas) assert.ok(!p.alt.includes(town), `${p.src}: no place names (${town})`)
  }
})
