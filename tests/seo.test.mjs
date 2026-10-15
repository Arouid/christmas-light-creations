// Search basics the SEO audit of 2026-10-14 fixed, kept from sliding back: every public page's
// <head> (canonical, a description that fits in results, the noai meta, a share picture), the
// home page's business data (service areas = the Google Business Profile's, no star rating until
// the reviews are back), the FAQ structured data, and the gallery's phone-size copies.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { areas } from '../src/data/areas.js'
import { business, faq, gallery, serviceAreaGroups } from '../src/data/content.js'
import { faqSchema } from '../src/lib/costGuide.js'
import { LINK } from '../src/lib/rich.js'
import { gallerySrcSet, thumb } from '../src/lib/thumb.js'
import { BUSINESS_ID, PRERENDERED, SITE, areaDescription } from '../scripts/pages.mjs'

const repo = (rel) => readFile(new URL(`../${rel}`, import.meta.url), 'utf8')
const meta = (html, attr, name) => (html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`)) || [])[1]
// Google cuts descriptions off around 155–160 characters; ours end with the phone number.
const MAX_DESCRIPTION = 160

const PUBLIC = [
  { html: 'index.html', path: '/', share: true },
  { html: 'design/index.html', path: '/design/', share: true },
  { html: 'cost/index.html', path: '/cost/', share: true },
  { html: 'privacy/index.html', path: '/privacy/' },
  { html: 'terms/index.html', path: '/terms/' },
]

test('every public page: canonical, a title, a description that fits, the noai meta, drawn at build', async () => {
  for (const p of PUBLIC) {
    const html = await repo(p.html)
    assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}${p.path}" />`), `${p.html}: canonical`)
    assert.match(html, /<title>[^<]{10,}<\/title>/, `${p.html}: title`)
    const description = meta(html, 'name', 'description')
    assert.ok(description && description.length <= MAX_DESCRIPTION, `${p.html}: description of ${description?.length} characters`)
    assert.match(meta(html, 'name', 'robots'), /noai, noimageai/, `${p.html}: noai meta`)
    assert.ok(PRERENDERED.some((r) => r.html === p.html), `${p.html} is drawn at build time (pages.mjs), so crawlers without JavaScript read it`)
    if (p.share) {
      assert.match(meta(html, 'property', 'og:image') ?? '', new RegExp(`^${SITE}/images/`), `${p.html}: share picture`)
      assert.equal(meta(html, 'property', 'og:url'), `${SITE}${p.path}`, `${p.html}: og:url`)
      assert.equal(meta(html, 'name', 'twitter:card'), 'summary_large_image', `${p.html}: large share card`)
    }
  }
})

test('area page descriptions fit in search results and name the area', () => {
  for (const a of areas) {
    const d = areaDescription(a, business)
    assert.ok(d.length <= MAX_DESCRIPTION, `${a.slug}: ${d.length} characters: ${d}`)
    assert.ok(d.includes(a.towns[0]) && d.endsWith(`${business.phone}.`), `${a.slug}: ${d}`)
  }
})

const homeBusiness = async () => {
  const html = await repo('index.html')
  const [, json] = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  return { html, data: JSON.parse(json) }
}

test('home business data: the Google profile’s service areas, one id for the area pages, real pictures', async () => {
  const { data } = await homeBusiness()
  assert.equal(data['@type'], 'HomeAndConstructionBusiness')
  assert.equal(data['@id'], BUSINESS_ID)
  // CLAUDE.md: areaServed must match serviceAreaGroups and the Google Business Profile exactly.
  const towns = serviceAreaGroups.flatMap((g) => g.towns)
  assert.deepEqual(data.areaServed.map((p) => p.name.replace(/, TX$/, '').replace(/, Houston$/, '')), towns)
  assert.equal(data.telephone, `+1-${business.phone}`)
  for (const src of [data.logo, ...data.image]) {
    assert.ok(src.startsWith(`${SITE}/images/`), src)
    await readFile(new URL(`../public${src.slice(SITE.length)}`, import.meta.url))
  }
})

test('no star rating or review count anywhere until the Google reviews are back (about 10)', async () => {
  for (const f of ['index.html', 'scripts/build-areas.mjs', 'src/lib/costGuide.js', 'design/index.html', 'cost/index.html']) {
    assert.doesNotMatch(await repo(f), /aggregateRating|ratingValue|reviewCount/, f)
  }
})

test('home FAQ structured data: every standing question, answers without markup', () => {
  const items = faq.flatMap((g) => g.items)
  const schema = faqSchema(items)
  assert.equal(schema.mainEntity.length, items.length)
  for (const q of schema.mainEntity) {
    assert.ok(!q.acceptedAnswer.text.includes('**') && !LINK.test(q.acceptedAnswer.text), q.name)
    LINK.lastIndex = 0
    assert.doesNotMatch(q.acceptedAnswer.text, /ift wrapping/, 'gift wrapping is behind a switch, never in the standing FAQ')
  }
})

test('every gallery photo has its 800 px phone copy, and no copy is left over', async () => {
  const copies = (await readdir(new URL('../public/images/gallery/800/', import.meta.url))).filter((f) => f.endsWith('.jpg'))
  const photos = gallery.map((g) => g.src.slice(g.src.lastIndexOf('/') + 1))
  assert.deepEqual(copies.sort(), [...new Set(photos)].sort(), 'run node scripts/gallery-thumbs.mjs')
  assert.equal(thumb('/images/gallery/silverlake-pearland.jpg'), '/images/gallery/800/silverlake-pearland.jpg')
  assert.equal(gallerySrcSet('/images/gallery/a.jpg'), '/images/gallery/800/a.jpg 800w, /images/gallery/a.jpg 1600w')
})
