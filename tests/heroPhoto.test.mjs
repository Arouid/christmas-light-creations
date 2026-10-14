// The home page's hero photo: a different one of `heroPhotos` on every visit,
// picked before any photo downloads (src/lib/heroPhoto.js, put in the built
// page's <head> by scripts/prerender.mjs). Owner 2026-10-14: "can it just load
// a new photo per visit?"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import vm from 'node:vm'
import { gallery, heroPhotos, privacy } from '../src/data/content.js'
import { HERO_KEY, HERO_VAR, heroBackground, heroScript, showHero } from '../src/lib/heroPhoto.js'

// A stand-in for the page: <html>'s style, <head> and created <link>s.
const fakeDoc = () => {
  const vars = {}
  const links = []
  return {
    vars, links,
    documentElement: { style: { setProperty: (k, v) => { vars[k] = v } } },
    head: { appendChild: (el) => links.push(el) },
    createElement: (tag) => ({ tag }),
  }
}
const fakeStore = (start) => {
  const data = start === undefined ? {} : { [HERO_KEY]: String(start) }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) } }
}
const photos = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg']

test('never the same photo twice running, and every photo comes up', () => {
  const store = fakeStore()
  let last = -1
  const seen = new Set()
  for (let n = 0; n < 400; n++) {
    const i = showHero(photos, HERO_KEY, HERO_VAR, fakeDoc(), () => store, Math.random)
    assert.notEqual(i, last, `visit ${n} repeated photo ${i}`)
    assert.equal(store.data[HERO_KEY], String(i))
    seen.add(i)
    last = i
  }
  assert.equal(seen.size, photos.length)
})

test('the pick after a given photo skips it, at both ends of the random range', () => {
  for (let last = 0; last < photos.length; last++) {
    for (const r of [0, 0.4999, 0.9999]) {
      const i = showHero(photos, HERO_KEY, HERO_VAR, fakeDoc(), () => fakeStore(last), () => r)
      assert.ok(i >= 0 && i < photos.length && i !== last, `last ${last}, random ${r} -> ${i}`)
    }
  }
})

test('a first visit (or a stored value that makes no sense) can open on any photo', () => {
  for (const stored of [undefined, 'junk', '-1', '99']) {
    const got = new Set([0, 0.3, 0.6, 0.99].map((r) => showHero(photos, HERO_KEY, HERO_VAR, fakeDoc(), () => fakeStore(stored), () => r)))
    assert.deepEqual([...got].sort(), [0, 1, 2, 3], `stored ${stored}`)
  }
})

test('blocked or full storage still shows a photo', () => {
  const doc = fakeDoc()
  const i = showHero(photos, HERO_KEY, HERO_VAR, doc, () => { throw new Error('SecurityError') }, () => 0.5)
  assert.equal(doc.vars[HERO_VAR], `url("${photos[i]}")`)
  const full = { getItem: () => '1', setItem: () => { throw new Error('QuotaExceededError') } }
  const doc2 = fakeDoc()
  const j = showHero(photos, HERO_KEY, HERO_VAR, doc2, () => full, () => 0.5)
  assert.notEqual(j, 1)
  assert.equal(doc2.vars[HERO_VAR], `url("${photos[j]}")`)
})

test('shows the photo through the CSS variable and preloads just that one', () => {
  const doc = fakeDoc()
  const i = showHero(photos, HERO_KEY, HERO_VAR, doc, () => fakeStore(), () => 0.6)
  assert.equal(doc.vars[HERO_VAR], `url("${photos[i]}")`)
  assert.equal(doc.links.length, 1)
  assert.deepEqual(doc.links[0], { tag: 'link', rel: 'preload', as: 'image', href: photos[i], fetchPriority: 'high' })
})

test('the inlined script runs on its own in a page and sets the photo', () => {
  const doc = fakeDoc()
  const store = fakeStore(0)
  vm.runInNewContext(heroScript(heroPhotos), { document: doc, window: { localStorage: store }, Math })
  const shown = doc.vars[HERO_VAR]
  assert.match(shown, /^url\("\/images\/gallery\/[a-z0-9-]+\.jpg"\)$/)
  assert.notEqual(shown, `url("${heroPhotos[0]}")`, 'last visit showed the first photo, so this one must differ')
  assert.equal(store.data[HERO_KEY], String(heroPhotos.indexOf(shown.slice(5, -2))))
  // Without localStorage at all (old or locked-down browser): still a photo, no error.
  const doc2 = fakeDoc()
  vm.runInNewContext(heroScript(heroPhotos), { document: doc2, window: {}, Math })
  assert.match(doc2.vars[HERO_VAR], /^url\("/)
})

test('the hero falls back to the first photo when no script ran', () => {
  assert.deepEqual(heroBackground(heroPhotos), { backgroundImage: `var(${HERO_VAR}, url("${heroPhotos[0]}"))`, backgroundPosition: '65% center' })
})

test('every hero photo is a gallery photo whose file is in the repo', async () => {
  const files = new Set(await readdir(new URL('../public/images/gallery/', import.meta.url)))
  const srcs = new Set(gallery.map((g) => g.src))
  assert.ok(heroPhotos.length >= 2, 'a rotation needs at least two photos')
  assert.equal(new Set(heroPhotos).size, heroPhotos.length, 'no photo twice in the rotation')
  for (const src of heroPhotos) {
    assert.ok(srcs.has(src), `${src} is not in gallery`)
    assert.ok(files.has(src.slice(src.lastIndexOf('/') + 1)), `${src} has no file`)
  }
})

test('the privacy page says the browser keeps the last hero photo', () => {
  const keeps = JSON.stringify(privacy)
  assert.match(keeps, /remembers which of its photos it showed you last/)
})
