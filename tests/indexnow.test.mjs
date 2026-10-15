import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import {
  ENDPOINT, MAX_URLS, MEANINGS, SITE, changedPages, countdowns, indexNowBody, keyOfFile, lastmods, pageText,
  sitemapDates, sitemapUrls, validKey, withLastmods,
} from '../scripts/indexnow.mjs'
import { urgency } from '../src/data/content.js'
import { topBar } from '../src/lib/urgency.js'

const KEY = '3bcc247f6ab0920d551117209063808d'

// The shape scripts/build-areas.mjs writes, plus the things a sitemap may do: whitespace in <loc>, entities, a repeat.
const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://christmas-light-creations.com/</loc><lastmod>2026-10-13</lastmod></url>
  <url><loc>https://christmas-light-creations.com/design/</loc><lastmod>2026-10-13</lastmod></url>
  <url><loc>
    https://christmas-light-creations.com/christmas-light-installation/pearland/
  </loc></url>
  <url><loc>https://christmas-light-creations.com/design/</loc></url>
  <url><loc>https://christmas-light-creations.com/?a=1&amp;b=2</loc></url>
</urlset>`

test('every <loc> of the sitemap, in order, trimmed, decoded, without duplicates', () => {
  assert.deepEqual(sitemapUrls(SITEMAP), [
    'https://christmas-light-creations.com/',
    'https://christmas-light-creations.com/design/',
    'https://christmas-light-creations.com/christmas-light-installation/pearland/',
    'https://christmas-light-creations.com/?a=1&b=2',
  ])
  assert.deepEqual(sitemapUrls(''), [])
  assert.deepEqual(sitemapUrls('<urlset></urlset>'), [])
})

test('the body has the four IndexNow fields, the host and the key file at the site root', () => {
  const body = indexNowBody({ key: KEY, urls: sitemapUrls(SITEMAP) })
  assert.deepEqual(Object.keys(body), ['host', 'key', 'keyLocation', 'urlList'])
  assert.equal(body.host, 'christmas-light-creations.com')
  assert.equal(body.key, KEY)
  assert.equal(body.keyLocation, `https://christmas-light-creations.com/${KEY}.txt`)
  assert.equal(body.urlList.length, 4)
  assert.equal(body.urlList[0], 'https://christmas-light-creations.com/')
  assert.equal(SITE, 'https://christmas-light-creations.com')
  assert.equal(ENDPOINT, 'https://api.indexnow.org/indexnow')
})

test("only this host's URLs are sent, at most 10,000", () => {
  const urls = ['https://christmas-light-creations.com/privacy/', 'https://example.com/', 'not a url', 'https://www.christmas-light-creations.com/']
  assert.deepEqual(indexNowBody({ key: KEY, urls }).urlList, ['https://christmas-light-creations.com/privacy/'])
  const many = Array.from({ length: MAX_URLS + 5 }, (_, i) => `https://christmas-light-creations.com/p/${i}/`)
  assert.equal(indexNowBody({ key: KEY, urls: many }).urlList.length, MAX_URLS)
})

test('a key is 8 to 128 letters, digits or dashes; anything else is refused before it is sent', () => {
  assert.ok(validKey(KEY))
  assert.ok(validKey('abc-DEF-12'))
  assert.ok(!validKey('short'))
  assert.ok(!validKey('a'.repeat(129)))
  assert.ok(!validKey('has space 1'))
  assert.throws(() => indexNowBody({ key: 'short', urls: [] }), /8 to 128/)
})

test('the key file is <key>.txt whose body is the key; robots.txt and ai.txt are not keys', () => {
  assert.equal(keyOfFile(`${KEY}.txt`, KEY), KEY)
  assert.equal(keyOfFile(`${KEY}.txt`, `${KEY}\n`), KEY)
  assert.equal(keyOfFile(`${KEY}.txt`, 'something else'), '')
  assert.equal(keyOfFile('robots.txt', 'User-agent: *'), '')
  assert.equal(keyOfFile('ai.txt', 'ai.txt'), '')
  assert.equal(keyOfFile(`${KEY}.json`, KEY), '')
})

test('public/ holds exactly one IndexNow key file, and it is the committed key', async () => {
  const dir = new URL('../public/', import.meta.url)
  const keys = []
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.txt')) continue
    const key = keyOfFile(name, await readFile(new URL(name, dir), 'utf8'))
    if (key) keys.push(key)
  }
  assert.deepEqual(keys, [KEY])
})

test('the answers the protocol documents each have a meaning for the log line', () => {
  assert.deepEqual(Object.keys(MEANINGS).map(Number), [200, 202, 400, 403, 422, 429])
})

// A built page as prerender.mjs writes it: hashed assets, the build day on #root, the hero-photo
// script, a stylesheet, an icon, Tailwind classes, JSON-LD.
const page = ({ hash = 'D-BI5gSR', day = '2026-10-14', words = 'Holiday lights, done for you.', cls = 'text-glow-300', badge = 'Booking now', description = 'Free estimates.', ld = 'Christmas Light Creations' } = {}) => `<!doctype html>
<html lang="en">
  <head>
    <script>(function(){var p=${JSON.stringify(hash)}})()</script>
    <meta name="description" content="${description}" />
    <link rel="modulepreload" crossorigin href="/assets/preload-helper-${hash}.js">
    <link rel="stylesheet" crossorigin href="/assets/src-${hash}.css">
    <style>.x{color:red}</style>
    <script type="module" crossorigin src="/assets/App-${hash}.js"></script>
    <script type="application/ld+json">{"name":"${ld}"}</script>
  </head>
  <body>
    <div id="root" data-day="${day}"><span class="twinkle ${cls}"><!-- -->${badge}</span>
      <h1 class="${cls}">${words}</h1><svg viewBox="0 0 24 24"><path d="M5 4h4"/></svg>
      <img src="/assets/sample-design-${hash}.webp" alt="A sample house" style="--hero:url(x)" />
    </div>
  </body>
</html>`

test('two builds of the same content read the same: hashes, build day, scripts, styles, classes, icons, whitespace', () => {
  const a = pageText(page())
  assert.equal(pageText(page({ hash: 'Xy_9-AbC', day: '2026-10-21', cls: 'text-berry-400 md:text-6xl' })), a)
  assert.equal(pageText(page().replace(/\n\s*/g, '\r\n      ')), a)
  assert.ok(!a.includes('data-day') && !a.includes('class=') && !a.includes('<svg') && !a.includes('src-'), a)
  assert.ok(a.includes('/assets/sample-design.webp') && a.includes('alt="A sample house"'))
  assert.equal(pageText('<a href="/assets/Designer-DX-buP5-.js">x</a>'), '<a href="/assets/Designer.js">x</a>')
})

test('a change a search engine reads is a change: words, description, image alt, structured data', () => {
  const a = pageText(page())
  assert.notEqual(pageText(page({ words: 'Holiday lights, installed for you.' })), a)
  assert.notEqual(pageText(page({ description: 'Free estimates, no need to be home.' })), a)
  assert.notEqual(pageText(page().replace('A sample house', 'Our sample house')), a)
  assert.notEqual(pageText(page({ ld: 'Christmas Light Creations LLC' })), a)
})

test("the days-left countdowns from content.js don't make the home page change every day", () => {
  const templates = countdowns(urgency)
  assert.deepEqual(templates, [urgency.topBar.countdown])
  // Two days of the early-install countdown, as the home page's top bar draws them.
  const on = (date) => {
    const d = new Date(`${date}T12:00:00`)
    return page({ badge: topBar(d).text, day: date })
  }
  assert.notEqual(on('2026-10-16'), on('2026-10-20'))
  assert.equal(pageText(on('2026-10-16'), templates), pageText(on('2026-10-20'), templates))
  // Moving from one wording to the next (countdown → last day) is a real change.
  assert.notEqual(pageText(on('2026-10-30'), templates), pageText(on('2026-10-31'), templates))
  assert.deepEqual(countdowns({ a: 'no number', b: { c: '{n} left', d: ['x {n}'] } }), ['{n} left', 'x {n}'])
})

const HOME = `${SITE}/`
const COST = `${SITE}/cost/`
const PEARLAND = `${SITE}/christmas-light-installation/pearland/`

test('only pages whose text changed, the missing or unreadable ones, and the ones the sitemap dropped', () => {
  const urls = [HOME, COST, PEARLAND]
  const built = { [HOME]: page({ words: 'New words' }), [COST]: page({ hash: 'newHash1' }), [PEARLAND]: page() }
  const live = { [HOME]: page(), [COST]: page(), [PEARLAND]: null }
  assert.deepEqual(changedPages({ urls, built, live, liveUrls: [HOME, COST, `${SITE}/old-page/`] }), {
    changed: [HOME, PEARLAND],
    unchanged: [COST],
    removed: [`${SITE}/old-page/`],
  })
  // No network: every page counts as changed, so the ping falls back to all of them.
  assert.deepEqual(changedPages({ urls, built, live: {} }).changed, urls)
  const same = { [HOME]: page(), [COST]: page(), [PEARLAND]: page() }
  assert.deepEqual(changedPages({ urls, built: same, live: same }), { changed: [], unchanged: urls, removed: [] })
})

test('<lastmod>: today for a changed page, the live date for an unchanged one, today when that date is unknown or odd', () => {
  const urls = [HOME, COST, PEARLAND, `${SITE}/terms/`]
  const live = { [HOME]: '2026-10-01', [COST]: '2026-10-02', [`${SITE}/terms/`]: '2026-12-25' }
  assert.deepEqual(lastmods({ urls, changed: [HOME], live, today: '2026-10-15' }), {
    [HOME]: '2026-10-15',
    [COST]: '2026-10-02',
    [PEARLAND]: '2026-10-15',
    [`${SITE}/terms/`]: '2026-10-15',
  })
  assert.equal(lastmods({ urls: [COST], changed: [], live: { [COST]: '2026-10-02T09:00:00Z' }, today: '2026-10-15' })[COST], '2026-10-15')
})

test('the dates go into the sitemap the build wrote, and read back the same', () => {
  const dates = { [`${SITE}/`]: '2026-10-01', [`${SITE}/design/`]: '2026-10-15', [`${SITE}/?a=1&b=2`]: '2026-10-03' }
  const xml = withLastmods(SITEMAP, dates)
  assert.deepEqual(sitemapUrls(xml), sitemapUrls(SITEMAP))
  assert.match(xml, /<url><loc>https:\/\/christmas-light-creations\.com\/<\/loc><lastmod>2026-10-01<\/lastmod><\/url>/)
  assert.match(xml, /<loc>https:\/\/christmas-light-creations\.com\/\?a=1&amp;b=2<\/loc><lastmod>2026-10-03<\/lastmod>/)
  assert.equal(sitemapDates(xml)[`${SITE}/`], '2026-10-01')
  assert.equal(sitemapDates(xml)[`${SITE}/design/`], '2026-10-15')
  // A URL without a date keeps its block as it was (Pearland has no <lastmod> in SITEMAP).
  assert.equal(sitemapDates(xml)[PEARLAND], undefined)
  assert.equal((xml.match(/<lastmod>/g) || []).length, 4)
  assert.deepEqual(sitemapDates(SITEMAP), { [`${SITE}/`]: '2026-10-13', [`${SITE}/design/`]: '2026-10-13' })
})
