import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALL_TABS, GROUPS, LABEL, NAME, SHORTCUTS, SHORTCUTS_HEADING, groupOf, searchFromHash, searchHash } from '../src/lib/staffMenu.js'

test('phone menu: every section is reachable exactly once (shortcut or group), with a plain name', () => {
  const inMenu = [...SHORTCUTS, ...GROUPS.flatMap(([, keys]) => keys)]
  const keys = ALL_TABS.map(([k]) => k)
  assert.deepEqual([...inMenu].sort(), [...keys].sort())
  assert.equal(new Set(inMenu).size, inMenu.length)
  for (const k of keys) {
    assert.ok(LABEL[k], `${k} has a tab label`)
    assert.ok(NAME[k] && !/\p{Extended_Pictographic}/u.test(NAME[k]), `${k} has a plain drawer name: ${NAME[k]}`)
  }
  assert.equal(NAME.ask, 'Ask Claude')
  assert.equal(NAME.past, 'Past requests')
})

test('phone menu: every heading has one of our line icons; rows are words only', () => {
  const icons = readFileSync(new URL('../src/components/Icon.jsx', import.meta.url), 'utf8')
  for (const [name, , icon] of [[SHORTCUTS_HEADING[0], [], SHORTCUTS_HEADING[1]], ...GROUPS]) {
    assert.ok(icon && (icons.includes(`\n  ${icon}: '`) || icons.includes(`\n  '${icon}': '`)), `${name}: icon ${icon} is in Icon.jsx`)
  }
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

test('Marketing, Reports and Notes: buttons on Home, not in the computer tab row; still in the phone menu', async () => {
  const { BEFORE, MORE, ON_HOME } = await import('../src/lib/staffMenu.js')
  const row = [...BEFORE, ...MORE].map(([k]) => k)
  for (const k of ON_HOME) {
    assert.ok(!row.includes(k), `${k} is not in the tab row`)
    assert.ok(LABEL[k], `${k} is still a section`)
    assert.ok(groupOf(k), `${k} is in a phone menu group`)
  }
  const home = readFileSync(new URL('../src/leads/HomeView.jsx', import.meta.url), 'utf8')
  for (const k of ON_HOME) assert.ok(home.includes(`href="#${k}"`), `Home links to #${k}`)
})
