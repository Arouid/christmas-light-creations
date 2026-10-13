import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DETAIL_FIELDS, detailsChanged, detailsRequest, detailsSummary } from '../functions/propertyDetails.js'

test('property details from the account page: every field is text, trimmed, capped; blanks clear; junk refused', () => {
  assert.deepEqual(DETAIL_FIELDS.map(([k]) => k), ['gateCode', 'hoa', 'lightsDownBy', 'hazards', 'pets'])
  const r = detailsRequest({ gateCode: ' 1234 ', hoa: 'Shadow Creek Ranch  HOA', lightsDownBy: 'Jan 10', hazards: 'Sprinkler heads along the\nfront bed', pets: '' })
  assert.deepEqual(r.details, { gateCode: '1234', hoa: 'Shadow Creek Ranch HOA', lightsDownBy: 'Jan 10', hazards: 'Sprinkler heads along the front bed', pets: '' })
  assert.equal(detailsRequest({ pets: 'Two dogs' }).details.gateCode, '', 'a field left out counts as blank')
  assert.equal(detailsRequest({ gateCode: 12 }).error[0], 'invalid-argument')
  assert.equal(detailsRequest({ hazards: 'x'.repeat(601) }).error[0], 'invalid-argument')
  assert.equal(detailsRequest({ other: 'thing' }).error[1], 'Nothing to save')
  assert.equal(detailsRequest(null).error[1], 'Nothing to save')
})

test('summary and change list', () => {
  const c = { gateCode: '#9876', hoa: '', pets: 'Cat (indoor)', fullName: 'Pat' }
  assert.deepEqual(detailsSummary(c), { gateCode: '#9876', hoa: '', lightsDownBy: '', hazards: '', pets: 'Cat (indoor)', emailNotices: true })
  assert.deepEqual(detailsChanged(c, { ...c, hoa: 'Silverlake HOA', pets: 'Cat (indoor)' }), ['HOA (name, rules)'])
  assert.deepEqual(detailsChanged(c, detailsSummary(c)), [])
})

test('email preferences (owner 2026-10-12): the one switch, alone or with the text fields; critical email has no switch', () => {
  assert.deepEqual(detailsRequest({ emailNotices: false }).details, { emailNotices: false }, 'alone: the text fields are left as they are')
  assert.equal(detailsRequest({ emailNotices: 'no' }).error[0], 'invalid-argument')
  const both = detailsRequest({ gateCode: '1', emailNotices: true }).details
  assert.equal(both.emailNotices, true); assert.equal(both.pets, '')
  assert.equal(detailsSummary({ emailNotices: false }).emailNotices, false)
  assert.deepEqual(detailsChanged({ gateCode: '1' }, { emailNotices: false }), ['Weather and tips emails off'])
  assert.deepEqual(detailsChanged({ emailNotices: false }, { emailNotices: true }), ['Weather and tips emails on'])
  assert.deepEqual(detailsChanged({ gateCode: '1', emailNotices: false }, { emailNotices: false }), [])
})
