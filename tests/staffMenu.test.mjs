import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_TABS, GROUPS, ICON, LABEL, NAME, SHORTCUTS, groupOf, searchFromHash, searchHash } from '../src/lib/staffMenu.js'

test('phone menu: every section is reachable exactly once (shortcut or group), with a name and a picture', () => {
  const inMenu = [...SHORTCUTS, ...GROUPS.flatMap(([, keys]) => keys)]
  const keys = ALL_TABS.map(([k]) => k)
  assert.deepEqual([...inMenu].sort(), [...keys].sort())
  assert.equal(new Set(inMenu).size, inMenu.length)
  for (const k of keys) {
    assert.ok(LABEL[k], `${k} has a tab label`)
    assert.ok(NAME[k] && !/\p{Extended_Pictographic}/u.test(NAME[k]), `${k} has a plain drawer name: ${NAME[k]}`)
    assert.ok(ICON[k], `${k} has a picture`)
  }
  assert.equal(NAME.ask, 'Ask Claude')
  assert.equal(NAME.past, 'Past requests')
})

test('phone menu: groups', () => {
  assert.equal(groupOf('route'), 'Installs, takedowns & service')
  assert.equal(groupOf('home'), null)
  assert.equal(groupOf('nope'), null)
})

test('drawer search → Accounts: the term rides in the hash and comes back out', () => {
  assert.equal(searchHash('  Country White '), '#accounts?q=Country%20White')
  assert.equal(searchFromHash('#accounts?q=Country%20White'), 'Country White')
  assert.equal(searchFromHash('#accounts'), '')
  assert.equal(searchFromHash('#accounts/customer/x'), '')
  assert.equal(searchFromHash('#accounts?q=%E0%A4%A'), '') // bad encoding: no crash
})
