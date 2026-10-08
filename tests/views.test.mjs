import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchesView, viewSeason, describeView } from '../src/lib/views.js'

const c = (status, area, type, weekOf, td) => ({
  locationBlock: area, installType: type,
  seasons: { 2026: { installStatus: status, takedownStatus: td, weekOf } },
})

test('empty view matches everyone', () => {
  assert.equal(matchesView(c('', 'A'), {}, '2026'), true)
  assert.equal(matchesView({}, {}, '2026'), true)
})

test('status, area, type and week all have to match', () => {
  const v = { statuses: ['Install Scheduled'], areas: ['A', 'B'], installType: 'Early Install', weekOf: 'Nov 16-22' }
  assert.equal(matchesView(c('Install Scheduled', 'B', 'Early Install', 'Nov 16-22'), v, '2026'), true)
  assert.equal(matchesView(c('Install Completed', 'B', 'Early Install', 'Nov 16-22'), v, '2026'), false)
  assert.equal(matchesView(c('Install Scheduled', 'C', 'Early Install', 'Nov 16-22'), v, '2026'), false)
  assert.equal(matchesView(c('Install Scheduled', 'B', 'Regular Install', 'Nov 16-22'), v, '2026'), false)
  assert.equal(matchesView(c('Install Scheduled', 'B', 'Early Install', 'Oct 11-17'), v, '2026'), false)
})

test('blank status means not contacted; takedown mode reads takedown status', () => {
  assert.equal(matchesView(c(undefined, 'A'), { statuses: [''] }, '2026'), true)
  assert.equal(matchesView(c('Install Completed', 'A', '', '', 'No Takedown'), { mode: 'takedown', statuses: ['No Takedown'] }, '2026'), true)
  assert.equal(matchesView(c('Install Completed', 'A'), { mode: 'takedown', statuses: ['No Takedown'] }, '2026'), false)
})

test('"current" season follows the calendar; summary reads naturally', () => {
  assert.equal(viewSeason({}, '2027'), '2027')
  assert.equal(viewSeason({ season: '2025' }, '2027'), '2025')
  assert.equal(describeView({ statuses: ['', 'Not Confirmed'], areas: ['Galveston'] }, 'Not contacted'),
    'Installs · Not contacted or Not Confirmed · Galveston')
})
