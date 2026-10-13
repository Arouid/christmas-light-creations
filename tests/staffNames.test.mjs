import { test } from 'node:test'
import assert from 'node:assert/strict'
import { firstNameOf, fromHeader, staffName, staffNamesMap } from '../functions/staffNames.js'

test('the From header names the sender, keeps the info@ address, and falls back to the business', () => {
  const addr = 'info@christmas-light-creations.com'
  assert.equal(fromHeader('Katie P.', addr), '"Katie at Christmas Light Creations" <info@christmas-light-creations.com>')
  assert.equal(fromHeader('Scott M.', addr), '"Scott at Christmas Light Creations" <info@christmas-light-creations.com>')
  assert.equal(fromHeader('', addr), '"Christmas Light Creations" <info@christmas-light-creations.com>')
  assert.equal(fromHeader('Someone', addr), '"Christmas Light Creations" <info@christmas-light-creations.com>')
  assert.equal(fromHeader('Website', addr), '"Christmas Light Creations" <info@christmas-light-creations.com>')
  assert.equal(firstNameOf('  Lacie M. '), 'Lacie')
  const names = staffNamesMap([{ id: 'x@y.z', name: 'Xavier Q.' }], [{ email: 'Pat@Example.com', name: 'Pat H.' }])
  assert.equal(staffName('pat@example.com', names), 'Pat H.')
  assert.equal(fromHeader(staffName('katiep.lights@gmail.com'), addr), '"Katie at Christmas Light Creations" <info@christmas-light-creations.com>')
})
