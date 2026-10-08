import { test } from 'node:test'
import assert from 'node:assert/strict'
import { milesBetween, planRoute, directionsLinks, formatMiles } from '../src/lib/geo.js'

// Real public places, approximate: Pearland City Hall area, Friendswood, League City, Galveston.
const pearland = { lat: 29.5636, lng: -95.2860 }
const friendswood = { lat: 29.5294, lng: -95.2010 }
const leagueCity = { lat: 29.5075, lng: -95.0949 }
const galveston = { lat: 29.3013, lng: -94.7977 }

test('distance in miles is about right', () => {
  const m = milesBetween(pearland, galveston)
  assert.ok(m > 32 && m < 38, `Pearland–Galveston straight line ≈ 34.5 mi, got ${m}`)
  assert.equal(milesBetween(pearland, pearland), 0)
  assert.equal(milesBetween(null, pearland), null)
  assert.equal(formatMiles(3.456), '3.5 mi')
  assert.equal(formatMiles(37.2), '37 mi')
})

test('route visits nearest next stop and skips unlocated ones', () => {
  const stops = [
    { id: 'gal', geo: galveston }, { id: 'lc', geo: leagueCity }, { id: 'nogeo' }, { id: 'fw', geo: friendswood },
  ]
  const { order, totalMiles } = planRoute(pearland, stops)
  assert.deepEqual(order.map((o) => o.stop.id), ['fw', 'lc', 'gal'])
  assert.ok(totalMiles > 30 && totalMiles < 45)
  assert.equal(stops.length, 4, 'input not modified')
})

test('route without a start begins at the first stop', () => {
  const { order } = planRoute(null, [{ id: 'a', geo: galveston }, { id: 'b', geo: leagueCity }])
  assert.equal(order[0].legMiles, 0)
})

test('directions links: 9 waypoints max per link, legs chain together', () => {
  const ordered = Array.from({ length: 23 }, (_, i) => ({ geo: { lat: 29 + i / 100, lng: -95 } }))
  const links = directionsLinks(pearland, ordered)
  assert.deepEqual(links.map((l) => [l.from, l.to]), [[1, 10], [11, 20], [21, 23]])
  const first = new URL(links[0].url).searchParams
  assert.equal(first.get('waypoints').split('|').length, 9)
  assert.equal(first.get('origin'), '29.5636,-95.286')
  const second = new URL(links[1].url).searchParams
  assert.equal(second.get('origin'), first.get('destination'), 'next leg starts where the last ended')
})
