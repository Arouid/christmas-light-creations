// Gallery places and area-page photos: every photo carries the place the
// owner named on 2026-10-13 (content.js `gallery`), the area pages caption
// from that list (never from a file name), and fillers never claim a town
// they are not in.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { gallery } from '../src/data/content.js'
import { areas } from '../src/data/areas.js'

const file = (src) => src.slice(src.lastIndexOf('/') + 1)
const files = await readdir(new URL('../public/images/gallery/', import.meta.url))

test('every gallery entry has a place and an alt text that ends with it', () => {
  for (const g of gallery) {
    assert.equal(typeof g.place, 'string', file(g.src))
    assert.ok(g.place.trim().length > 0, `${file(g.src)} has no place`)
    assert.ok(g.alt.toLowerCase().endsWith(g.place.toLowerCase()), `${file(g.src)}: alt "${g.alt}" should end with "${g.place}"`)
  }
})

test('the gallery and public/images/gallery hold the same photos', () => {
  assert.deepEqual([...new Set(gallery.map((g) => file(g.src)))].sort(), files.filter((f) => f.endsWith('.jpg')).sort())
})

test('the pearland-highland-glen-* files are Stonebridge and Cobblestone, not Highland Glen (owner, 2026-10-13)', () => {
  const wrong = gallery.filter((g) => file(g.src).startsWith('pearland-highland-glen-'))
  assert.equal(wrong.length, 5)
  for (const g of wrong) {
    assert.ok(!/highland glen/i.test(g.alt), `${file(g.src)}: ${g.alt}`)
    assert.ok(!/highland glen/i.test(g.place), `${file(g.src)}: ${g.place}`)
    assert.ok(/^(Stonebridge|Cobblestone), Pearland$/.test(g.place), `${file(g.src)}: ${g.place}`)
  }
})

test('every area photo exists, takes its caption and alt from the gallery, and pages show 3 or 5 of them', () => {
  for (const a of areas) {
    assert.ok([3, 5].includes(a.photos.length), `${a.slug}: ${a.photos.length} photos (the first spans two columns, so 3 or 5 fill the rows)`)
    for (const p of a.photos) {
      assert.ok(files.includes(p.file), `${a.slug}: ${p.file} is not in public/images/gallery`)
      const g = gallery.find((e) => file(e.src) === p.file)
      assert.ok(g, `${a.slug}: ${p.file} is not in the gallery`)
      assert.equal(p.place, g.place)
      assert.equal(p.alt, g.alt)
    }
    assert.equal(new Set(a.photos.map((p) => p.file)).size, a.photos.length, `${a.slug}: a photo twice`)
  }
})

// A page's own town, as a caption would spell it.
const own = { pearland: ['Pearland'], 'league-city': ['League City'], manvel: ['Manvel', 'Iowa Colony'], friendswood: ['Friendswood'], 'clear-lake-bay-area': ['Clear Lake'], 'alvin-galveston-county': ['Alvin', 'Santa Fe', 'Texas City', 'La Marque', 'Dickinson', 'Bacliff', 'San Leon', 'Galveston'] }
const claims = (p, towns) => towns.some((t) => p.place.includes(t))

test('each page with local photos leads with one; fillers keep their true place and the page says so', () => {
  for (const a of areas) {
    const towns = own[a.slug]
    assert.ok(towns, `no towns listed for ${a.slug} in this test`)
    const local = a.photos.filter((p) => claims(p, towns))
    if (a.slug === 'alvin-galveston-county') {
      assert.equal(local.length, 0, 'Alvin has no local photos yet: fillers only (owner: "use some of our others with filler")')
    } else {
      assert.ok(claims(a.photos[0], towns), `${a.slug} should lead with a local photo, not ${a.photos[0].place}`)
    }
    if (local.length < a.photos.length) {
      assert.equal(typeof a.photosNote, 'string', `${a.slug} shows fillers, so it needs a photosNote`)
      assert.match(a.photosNote, /same crew/)
    } else {
      assert.equal(a.photosNote, undefined, `${a.slug} has only local photos, no note needed`)
    }
  }
})

test('the named neighborhoods are in the area town lists (the Google profile lists stay as they are)', () => {
  const towns = Object.fromEntries(areas.map((a) => [a.slug, a.towns]))
  for (const t of ['Cabot Cove', 'Towne Lake Estates', 'Stonebridge', 'Cobblestone', 'Southwyck', 'Green Tee']) assert.ok(towns.pearland.includes(t), t)
  for (const t of ['The Lakefront Preserve', 'Westover Park', 'Victory Lakes']) assert.ok(towns['league-city'].includes(t), t)
  assert.ok(towns.friendswood.includes('The Forest of Friendswood'))
  // The meta description takes the first four: the town and the big neighborhoods first.
  assert.deepEqual(towns.pearland.slice(0, 4), ['Pearland', 'Shadow Creek Ranch', 'Silverlake', 'Lakes of Highland Glen'])
})
