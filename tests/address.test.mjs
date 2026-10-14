import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addressEdit, addressParts, addressSave, joinAddress, sameAddress, splitAddress } from '../src/lib/address.js'

const parts = (street, city, state, zip) => ({ street, city, state, zip })

test('one address line → street, city, state, ZIP, in the ways the records spell it', () => {
  assert.deepEqual(splitAddress('1138 Rymers Switch Lane, Friendswood TX 77546'), parts('1138 Rymers Switch Lane', 'Friendswood', 'TX', '77546'))
  assert.deepEqual(splitAddress('123 Example St, Pearland, TX 77581'), parts('123 Example St', 'Pearland', 'TX', '77581'))
  assert.deepEqual(splitAddress('123 Example St, Pearland, Texas 77581-1234, USA'), parts('123 Example St', 'Pearland', 'TX', '77581-1234'))
  assert.deepEqual(splitAddress('  123  Example St ,  Pearland ,TX  '), parts('123 Example St', 'Pearland', 'TX', ''))
  assert.deepEqual(splitAddress('123 Example St, Pearland 77581'), parts('123 Example St', 'Pearland', '', '77581'))
  assert.deepEqual(splitAddress('12 Main St, Apt 4, Pearland, TX 77581'), parts('12 Main St, Apt 4', 'Pearland', 'TX', '77581'))
  assert.deepEqual(splitAddress('500 Elm Ave, Tulsa, OK 74101'), parts('500 Elm Ave', 'Tulsa', 'OK', '74101'))
})

test('street only: the record’s City fills in; no commas: City splits it; a street word is never a state', () => {
  assert.deepEqual(splitAddress('1138 Rymers Switch Lane', 'Friendswood'), parts('1138 Rymers Switch Lane', 'Friendswood', '', ''))
  assert.deepEqual(splitAddress('1138 Rymers Switch Lane Friendswood TX 77546', 'Friendswood'), parts('1138 Rymers Switch Lane', 'Friendswood', 'TX', '77546'))
  assert.deepEqual(splitAddress('123 Example St Pearland, TX 77581', 'Pearland'), parts('123 Example St', 'Pearland', 'TX', '77581')) // the sheet's way
  assert.deepEqual(splitAddress('77 Oak Ct 77581', 'Pearland'), parts('77 Oak Ct', 'Pearland', '', '77581')) // Ct isn't Connecticut
  assert.deepEqual(splitAddress('12 Main St, Apt 4', 'Pearland'), parts('12 Main St, Apt 4', 'Pearland', '', '')) // a unit isn't a city
  assert.deepEqual(splitAddress('Pearland, TX 77584', 'Pearland'), parts('', 'Pearland', 'TX', '77584')) // only the town on file
  assert.deepEqual(splitAddress('', ''), parts('', '', '', ''))
  assert.deepEqual(splitAddress(undefined, 'Pearland'), parts('', 'Pearland', '', ''))
})

test('the line is written back whole, in one format', () => {
  assert.equal(joinAddress(parts('1138 Rymers Switch Lane', 'Friendswood', 'TX', '77546')), '1138 Rymers Switch Lane, Friendswood, TX 77546')
  assert.equal(joinAddress(parts('123 Example St', 'Pearland', 'TX', '')), '123 Example St, Pearland, TX')
  assert.equal(joinAddress(parts('123 Example St', '', '', '')), '123 Example St')
  assert.equal(joinAddress(parts('', '', 'TX', '')), '') // a state alone is no address
  assert.equal(joinAddress(), '')
  // Splitting what we wrote gives the same parts back.
  const p = parts('12 Main St, Apt 4', 'League City', 'TX', '77573')
  assert.deepEqual(splitAddress(joinAddress(p)), p)
})

test('the boxes on the card: State shows TX until changed; empty record, empty boxes', () => {
  assert.deepEqual(addressParts({ address: '1138 Rymers Switch Lane', city: 'Friendswood' }), parts('1138 Rymers Switch Lane', 'Friendswood', 'TX', ''))
  assert.deepEqual(addressParts({ address: '500 Elm Ave, Tulsa, OK 74101' }), parts('500 Elm Ave', 'Tulsa', 'OK', '74101'))
  assert.deepEqual(addressParts({}), parts('', '', '', ''))
  assert.deepEqual(addressParts(undefined), parts('', '', '', ''))
})

test('editing one box saves the whole line, and City only when it changes', () => {
  const c = { address: '1138 Rymers Switch Lane', city: 'Friendswood' }
  assert.deepEqual(addressEdit(c, 'zip', ' 77546 '), { address: '1138 Rymers Switch Lane, Friendswood, TX 77546' })
  assert.deepEqual(addressEdit(c, 'city', 'Pearland'), { address: '1138 Rymers Switch Lane, Pearland, TX', city: 'Pearland' })
  assert.deepEqual(addressEdit(c, 'state', 'texas'), { address: '1138 Rymers Switch Lane, Friendswood, TX' })
  assert.deepEqual(addressEdit(c, 'state', 'ok'), { address: '1138 Rymers Switch Lane, Friendswood, OK' })
  assert.deepEqual(addressEdit({ address: '9 Bay St, Kemah, TX 77565' }, 'street', '11 Bay St'), { address: '11 Bay St, Kemah, TX 77565', city: 'Kemah' }) // fills an empty City
  // "Save full address": the line from the boxes.
  assert.deepEqual(addressSave(c), { address: '1138 Rymers Switch Lane, Friendswood, TX' })
})

test('same address: commas, spaces and case aside', () => {
  assert.equal(sameAddress('1138 Rymers Switch Lane, Friendswood TX 77546', '1138 rymers switch lane, Friendswood, TX 77546'), true)
  assert.equal(sameAddress('1138 Rymers Switch Lane', '1138 Rymers Switch Lane, Friendswood, TX'), false)
})
