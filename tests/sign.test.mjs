import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signLabel, signSource } from '../src/lib/sign.js'

test('sign codes read nicely on the lead and fit the 60-char rule', () => {
  assert.equal(signLabel('broadway-288'), 'Broadway 288')
  assert.equal(signSource('broadway-288'), 'Road sign (Broadway 288)')
  assert.equal(signSource('typed'), 'Road sign (typed the web address)')
  assert.ok(signSource('a'.repeat(40)).length <= 60)
})
