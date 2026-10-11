import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

// Both installable apps (staff /leads/, customers /account/): the manifest has
// what Chrome and Safari need, every icon it names is in public/, and the
// service worker beside it exists.
for (const app of ['leads', 'account']) {
  test(`${app}: web app manifest is complete and its files exist`, () => {
    const m = JSON.parse(readFileSync(`public/${app}/manifest.webmanifest`, 'utf8'))
    assert.equal(m.id, `/${app}/`)
    assert.equal(m.start_url, `/${app}/`)
    assert.equal(m.scope, `/${app}/`)
    assert.ok(m.name && m.short_name, 'name and short_name')
    assert.ok(m.short_name.length <= 12, 'short_name fits under a home-screen icon')
    assert.equal(m.display, 'standalone')
    assert.match(m.theme_color, /^#[0-9a-f]{6}$/i)
    const have = m.icons.map((i) => `${i.sizes}:${i.purpose ?? 'any'}`)
    for (const need of ['192x192:any', '512x512:any', '512x512:maskable']) assert.ok(have.includes(need), need)
    for (const i of m.icons) assert.ok(existsSync(`public${i.src}`), i.src)
    assert.ok(existsSync(`public/${app}/sw.js`), 'service worker')
  })
}

test('account: the service worker has the offline page it falls back to', () => {
  assert.ok(existsSync('public/account/offline.html'))
  const sw = readFileSync('public/account/sw.js', 'utf8')
  assert.match(sw, /offline\.html/)
  assert.match(sw, /addEventListener\('fetch'/)
})
