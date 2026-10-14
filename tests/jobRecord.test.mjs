import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  amountText, canDeletePhoto, colorIn, findByHash, fitWithin, housePhotoOf, installedFromProposal, installedLine, installedSummary,
  latestSigned, photoDate, photoList, photoPaths, photosBySeason, storageProblem,
} from '../src/lib/jobRecord.js'
import { newItem, newProposal, takedownItem } from '../src/proposals/model.js'

test('fitWithin shrinks the long side to the limit and never enlarges', () => {
  assert.deepEqual(fitWithin(4032, 3024, 1600), { width: 1600, height: 1200 })
  assert.deepEqual(fitWithin(3024, 4032, 1600), { width: 1200, height: 1600 })
  assert.deepEqual(fitWithin(800, 600, 1600), { width: 800, height: 600 })
  assert.deepEqual(fitWithin(4032, 3024, 400), { width: 400, height: 300 })
})

test('photo paths follow customers/{id}/{season}/{photoId}', () => {
  assert.deepEqual(photoPaths('sample-customer', '2026', 'pabc'), {
    full: 'customers/sample-customer/2026/pabc.jpg', thumb: 'customers/sample-customer/2026/pabc-thumb.jpg',
  })
})

const photos = {
  a: { url: 'u1', thumbUrl: 't1', season: '2025', at: 1700000000000, by: 'katiep@example.com' },
  b: { url: 'u2', thumbUrl: 't2', season: '2026', at: 1760000000000, by: 'demo@example.com' },
  c: { url: 'u3', thumbUrl: 't3', season: '2025', at: 1710000000000, by: 'Demo@Example.com' },
  broken: { season: '2026', at: 1 },
}

test('photos list newest first, grouped by season newest first; entries without a file are skipped', () => {
  assert.deepEqual(photoList(photos).map((p) => p.id), ['b', 'c', 'a'])
  assert.deepEqual(photosBySeason(photos).map(([s, list]) => [s, list.map((p) => p.id)]), [['2026', ['b']], ['2025', ['c', 'a']]])
  assert.deepEqual(photoList(undefined), [])
  assert.deepEqual(photoList([{ id: 'x', url: 'u', at: 5 }]).map((p) => p.id), ['x'])
})

test('only the person who added a photo, or the owner, may remove it', () => {
  assert.equal(canDeletePhoto(photos.a, 'katiep@example.com'), true)
  assert.equal(canDeletePhoto(photos.a, 'demo@example.com'), false)
  assert.equal(canDeletePhoto(photos.c, 'demo@example.com'), true, 'email case does not matter')
  assert.equal(canDeletePhoto(photos.a, 'demo@example.com', true), true, 'owner')
  assert.equal(canDeletePhoto(photos.a, '', false), false)
})

test('photo dates show the year only when it is not this year', () => {
  const now = new Date(2026, 9, 12)
  assert.equal(photoDate(new Date(2026, 9, 12).getTime(), now), 'Oct 12')
  assert.equal(photoDate(new Date(2025, 10, 20).getTime(), now), 'Nov 20, 2025')
  assert.equal(photoDate(undefined, now), '')
})

test('storage errors become plain words; a missing bucket says Storage is not turned on', () => {
  assert.match(storageProblem({ code: 'storage/unauthorized' }), /signed in as staff/)
  assert.match(storageProblem({ code: 'storage/unknown' }), /turned on yet/i)
  assert.match(storageProblem({ code: 'storage/object-not-found' }), /turned on yet/i)
  assert.match(storageProblem({ code: 'storage/retry-limit-exceeded' }), /signal/)
  assert.match(storageProblem(new Error('boom')), /boom/)
})

test('an installed line reads like people say it', () => {
  assert.equal(installedLine({ what: 'Roofline C9', amount: '180 ft', color: 'warm white' }), 'Roofline C9 warm white 180 ft')
  assert.equal(installedLine({ what: 'wrapped oaks', amount: '2' }), '2 wrapped oaks')
  assert.equal(installedLine({ what: 'Wreath', amount: '36 in' }), 'Wreath 36 in')
  assert.equal(installedLine({ what: 'Arch over the walkway', amount: '1', color: 'multicolor' }), 'Arch over the walkway multicolor')
  assert.equal(installedLine({ what: '', amount: '', color: '' }), '')
  assert.equal(installedLine(null), '')
})

test('the summary joins the lines and cuts long ones', () => {
  const c = { installed: [{ what: 'Roofline C9', amount: '180 ft', color: 'warm white' }, { what: 'wrapped oaks', amount: '2' }, { what: '' }] }
  assert.equal(installedSummary(c), 'Roofline C9 warm white 180 ft · 2 wrapped oaks')
  assert.equal(installedSummary(c, 20), 'Roofline C9 warm wh…')
  assert.equal(installedSummary({}), '')
})

test('colour words are found in details or labels', () => {
  assert.equal(colorIn('Warm white C9, 12" spacing, timer'), 'warm white')
  assert.equal(colorIn('Multi mini lights'), 'multicolor')
  assert.equal(colorIn('Red & white candy cane'), 'red & white')
  assert.equal(colorIn('Whitehall Dr roofline'), '', 'not inside another word')
  assert.equal(colorIn(''), '')
})

test('amounts: qty × unit, a lone 1 says nothing', () => {
  assert.equal(amountText(180, 'ft'), '180 ft')
  assert.equal(amountText(2, ''), '2')
  assert.equal(amountText(1, ''), '')
  assert.equal(amountText(1, 'arch'), '1 arch')
  assert.equal(amountText(12.5, 'ft'), '12.5 ft')
  assert.equal(amountText(0, 'ft'), '')
})

test('a signed proposal prefills the list: install lines only, colour pulled out of the details', () => {
  const items = [
    newItem('Roofline C9 lights, installed (12" spacing)', 180, 'ft', 2.5, 'install', 'Warm white, commercial clips, timer'),
    newItem('Wrapped oaks', 2, '', 300, 'install', 'warm white mini lights'),
    newItem('Wreath 36 in', 1, '', 120, 'install', ''),
    takedownItem(90000),
  ]
  const p = newProposal({ items, season: '2026' })
  const list = installedFromProposal(p)
  assert.deepEqual(list.map(({ what, amount, color, notes }) => ({ what, amount, color, notes })), [
    { what: 'Roofline C9 lights, installed (12" spacing)', amount: '180 ft', color: 'warm white', notes: 'commercial clips, timer' },
    { what: 'Wrapped oaks', amount: '2', color: 'warm white', notes: 'mini lights' },
    { what: 'Wreath 36 in', amount: '', color: '', notes: '' },
  ])
  assert.ok(list.every((x) => x.id && x.id.startsWith('w')))
  assert.deepEqual(installedFromProposal(null), [])
  assert.deepEqual(installedFromProposal({ items: [{ label: '', qty: 0 }] }), [])
})

test('the newest signed or countersigned proposal wins; drafts and sent ones do not count', () => {
  const list = [
    { id: 'd', status: 'draft', savedAt: '2026-10-11T10:00:00Z' },
    { id: 's1', status: 'signed', signedAt: '2026-09-01T10:00:00Z' },
    { id: 'cs', status: 'countersigned', signedAt: '2026-10-01T10:00:00Z', countersignedAt: '2026-10-02T10:00:00Z' },
    { id: 'sent', status: 'sent', sentAt: '2026-10-10T10:00:00Z' },
  ]
  assert.equal(latestSigned(list).id, 'cs')
  assert.equal(latestSigned([list[0], list[3]]), null)
  assert.equal(latestSigned(undefined), null)
})

test('housePhotoOf: the picked photo stands for the house; none picked, or the photo gone, means Street View', () => {
  const photos = {
    a: { url: 'https://x/a.jpg', at: 1, season: '2025' },
    b: { url: 'https://x/b.jpg', at: 2, season: '2026' },
  }
  assert.equal(housePhotoOf({ photos, housePhoto: 'b' })?.url, 'https://x/b.jpg')
  assert.equal(housePhotoOf({ photos, housePhoto: 'b' })?.id, 'b')
  assert.equal(housePhotoOf({ photos }), null)
  assert.equal(housePhotoOf({ photos, housePhoto: 'gone' }), null)
  assert.equal(housePhotoOf({ housePhoto: 'b' }), null)
  assert.equal(housePhotoOf({ photos: { c: { at: 3 } }, housePhoto: 'c' }), null) // an entry with no file
  assert.equal(housePhotoOf(undefined), null)
})

test('findByHash: the same picked file is found again; old photos without a hash never match', () => {
  const photos = {
    old: { url: 'https://x/old.jpg', at: 1 },
    a: { url: 'https://x/a.jpg', at: 2, hash: 'abc123' },
  }
  assert.equal(findByHash(photos, 'abc123')?.id, 'a')
  assert.equal(findByHash(photos, 'zzz'), null)
  assert.equal(findByHash(photos, null), null)
  assert.equal(findByHash(photos, ''), null)
  assert.equal(findByHash(undefined, 'abc123'), null)
})
