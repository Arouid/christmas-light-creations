import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADS, conversionTarget } from '../src/lib/ads.js'

test('conversion target is only built when both the tag and the label are set', () => {
  assert.equal(conversionTarget('estimate', { tagId: '', labels: { estimate: 'x' } }), null)
  assert.equal(conversionTarget('estimate', { tagId: 'AW-1', labels: { estimate: '' } }), null)
  assert.equal(conversionTarget('estimate', { tagId: 'AW-1', labels: { estimate: 'abc' } }), 'AW-1/abc')
  assert.equal(conversionTarget('nothing', { tagId: 'AW-1', labels: { estimate: 'abc' } }), null)
})

test('the committed config has the shape the page expects', () => {
  assert.ok('tagId' in ADS && 'estimate' in ADS.labels)
})
