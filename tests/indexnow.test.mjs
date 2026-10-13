import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { ENDPOINT, MAX_URLS, MEANINGS, SITE, indexNowBody, keyOfFile, sitemapUrls, validKey } from '../scripts/indexnow.mjs'

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
