import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import { areas } from '../src/data/areas.js'
import { privacy } from '../src/data/content.js'
import {
  ADS, ADS_CONTACT_KEY, adsLoaderScript, conversionTarget, hashedUserData, keepContactForAds,
  normalizeContact, takeContactForAds, usPhoneE164, validUserData,
} from '../src/lib/ads.js'
import { areaPage } from '../scripts/build-areas.mjs'

const sha = (s) => createHash('sha256').update(s).digest('hex')
const fakeStore = () => {
  const data = {}
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) }, removeItem: (k) => { delete data[k] } }
}

test('conversion target is only built when both the tag and the label are set', () => {
  assert.equal(conversionTarget('estimate', { tagId: '', labels: { estimate: 'x' } }), null)
  assert.equal(conversionTarget('estimate', { tagId: 'AW-1', labels: { estimate: '' } }), null)
  assert.equal(conversionTarget('estimate', { tagId: 'AW-1', labels: { estimate: 'abc' } }), 'AW-1/abc')
  assert.equal(conversionTarget('nothing', { tagId: 'AW-1', labels: { estimate: 'abc' } }), null)
})

test('the committed config has the shape the page expects', () => {
  assert.ok('tagId' in ADS && 'estimate' in ADS.labels)
})

// Enhanced conversions: Google's rules for data hashed by the site
// (support.google.com/google-ads/answer/13258081, read 2026-10-15).
test('US phone numbers become E.164; anything else is left out', () => {
  for (const p of ['281-819-0163', '(281) 819-0163', '281.819.0163', ' 2818190163 ', '+1 281 819 0163', '1-281-819-0163']) {
    assert.equal(usPhoneE164(p), '+12818190163', p)
  }
  for (const p of ['', null, undefined, '819-0163', '123-456-7890', '+44 20 7946 0958', '281-819-0163 ext 2']) {
    assert.equal(usPhoneE164(p), null, String(p))
  }
})

test('email is trimmed and lowercased, gmail dots go, empty fields are left out', () => {
  assert.deepEqual(normalizeContact({ email: '  Jane.Doe@Example.COM ', phone: '(281) 819-0163' }), { email: 'jane.doe@example.com', phone_number: '+12818190163' })
  assert.deepEqual(normalizeContact({ email: 'J.A.Ne@Gmail.com' }), { email: 'jane@gmail.com' })
  assert.deepEqual(normalizeContact({ email: 'j.ane@googlemail.com', phone: '' }), { email: 'jane@googlemail.com' })
  assert.deepEqual(normalizeContact({ email: 'jane@example.com', phone: 'none' }), { email: 'jane@example.com' })
  // No usable email: nothing at all (the phone only goes with an email).
  for (const email of ['', null, 'jane', '@example.com', 'jane@example', 'ja ne@example.com']) {
    assert.equal(normalizeContact({ email, phone: '281-819-0163' }), null, String(email))
  }
  assert.equal(normalizeContact(), null)
})

test('only SHA-256 hashes of the normalized values are handed on, never the values', async () => {
  const data = await hashedUserData({ email: ' Jane@Example.com', phone: '281-819-0163' })
  assert.deepEqual(data, { sha256_email_address: sha('jane@example.com'), sha256_phone_number: sha('+12818190163') })
  assert.deepEqual(await hashedUserData({ email: 'jane@example.com' }), { sha256_email_address: sha('jane@example.com') })
  assert.equal(await hashedUserData({ email: '', phone: '281-819-0163' }), null)
})

test('the form hands the hash to /thanks/ once: taken and cleared at once, so a reload sends none', async () => {
  const store = fakeStore()
  assert.equal(await keepContactForAds({ email: 'jane@example.com', phone: '2818190163' }, { store: () => store }), true)
  const kept = store.data[ADS_CONTACT_KEY]
  assert.doesNotMatch(kept, /jane|example|281/, 'storage holds hashes only')
  assert.deepEqual(takeContactForAds(() => store), { sha256_email_address: sha('jane@example.com'), sha256_phone_number: sha('+12818190163') })
  assert.equal(ADS_CONTACT_KEY in store.data, false)
  assert.equal(takeContactForAds(() => store), null, 'a reload of /thanks/ finds nothing')
})

test('tag off, blocked storage or junk in storage: nothing kept, nothing sent, nothing thrown', async () => {
  const store = fakeStore()
  assert.equal(await keepContactForAds({ email: 'jane@example.com' }, { ads: { tagId: '' }, store: () => store }), false)
  assert.deepEqual(store.data, {})
  const blocked = () => { throw new Error('SecurityError') }
  assert.equal(await keepContactForAds({ email: 'jane@example.com' }, { store: blocked }), false)
  assert.equal(takeContactForAds(blocked), null)
  const full = { ...fakeStore(), setItem: () => { throw new Error('QuotaExceededError') } }
  assert.equal(await keepContactForAds({ email: 'jane@example.com' }, { store: () => full }), false)
  for (const raw of ['not json', '{"email":"jane@example.com"}', '{"sha256_email_address":"abc"}', 'null']) {
    const s = fakeStore()
    s.data[ADS_CONTACT_KEY] = raw
    assert.equal(takeContactForAds(() => s), null, raw)
    assert.deepEqual(s.data, {}, `${raw} is cleared too`)
  }
  assert.deepEqual(validUserData({ sha256_email_address: sha('a@b.co'), sha256_phone_number: 'junk', email: 'a@b.co' }), { sha256_email_address: sha('a@b.co') })
})

test('the privacy page says what is sent: a hash of the email and phone, for measuring ads only', () => {
  const text = privacy.sections.flatMap((s) => s.items).join(' ')
  assert.match(text, /\*\*Google Ads:\*\*[^']*scrambled code[^']*hash[^']*only to measure our ads/)
  assert.doesNotMatch(text, /doesn’t see what you type into the form/)
})

// The area pages: no bundle, only the tag's loader, after the page has settled.
const fakePage = () => {
  const timers = []
  let observer = null
  const head = []
  const win = {}
  const sandbox = {
    window: win,
    document: { createElement: (tag) => ({ tag }), head: { append: (el) => head.push(el) } },
    setTimeout: (fn, ms = 0) => timers.push({ fn, ms }),
    PerformanceObserver: class { constructor(cb) { observer = { cb, po: this } } observe() {} disconnect() {} },
    encodeURIComponent, JSON, Date,
  }
  const run = (ms) => { // runs the timers due within `ms`, in order
    for (let t; (t = timers.findIndex((x) => x.ms <= ms)) >= 0;) timers.splice(t, 1)[0].fn()
  }
  return { sandbox, win, head, timers, run, paint: () => observer.cb({ getEntries: () => [{ name: 'first-contentful-paint' }] }, observer.po) }
}

test('an area page carries the tag loader and keeps every head tag', () => {
  const html = areaPage(areas[0], ['/assets/index.css'])
  const head = html.slice(0, html.indexOf('</head>'))
  assert.match(head, /<meta name="robots" content="noai, noimageai" \/>/)
  assert.match(head, /<link rel="canonical" href="https:\/\/christmas-light-creations\.com\/christmas-light-installation\//)
  assert.match(head, /<script type="application\/ld\+json">/)
  assert.match(head, /<link rel="stylesheet" href="\/assets\/index\.css" \/>/)
  const scripts = [...html.matchAll(/<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  assert.deepEqual(scripts, [adsLoaderScript()], 'one inline script, the loader; no bundle')
  assert.doesNotMatch(html, /<script[^>]+src=/, 'nothing loads before the page has settled')
})

test('the loader adds gtag.js 1.5 s after first paint, once, with the account tag', () => {
  const p = fakePage()
  vm.runInNewContext(adsLoaderScript(), p.sandbox)
  assert.equal(p.head.length, 0, 'nothing before first paint')
  p.paint()
  p.run(0)
  assert.equal(p.head.length, 0, 'not straight after first paint')
  p.run(1500)
  assert.equal(p.head.length, 1, 'once, even with the fallback timer due too')
  assert.equal(p.head[0].src, `https://www.googletagmanager.com/gtag/js?id=${ADS.tagId}`)
  assert.equal(p.head[0].async, true)
  assert.deepEqual([...p.win.dataLayer].map((a) => a[0]), ['js', 'config'])
  assert.equal(p.win.dataLayer[1][1], ADS.tagId)
})

test('the loader still runs in a browser without paint timing; nothing at all when the tag is off', () => {
  const p = fakePage()
  p.sandbox.PerformanceObserver = undefined
  vm.runInNewContext(adsLoaderScript(), p.sandbox)
  p.run(1500)
  assert.equal(p.head.length, 1)
  assert.equal(adsLoaderScript({ tagId: '' }), '')
})
