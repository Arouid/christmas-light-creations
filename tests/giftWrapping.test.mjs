// Gift wrapping behind a switch (docs/specs/gift-wrapping.md): the switch,
// what the form sends when off vs on, the staff words, and that nothing
// public mentions it while off.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SERVICES, giftWrappingOn, leadService, navLinks, serviceLabel, serviceWords, wantsGiftWrapping } from '../src/lib/giftWrapping.js'
import { parseBooking } from '../src/lib/urgency.js'
import { faq, giftWrapping, nav } from '../src/data/content.js'
import { salesKnowledge } from '../src/assistant/lib/knowledge.js'

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8')

test('the switch is off unless settings/app.giftWrapping is exactly true', () => {
  assert.equal(giftWrappingOn(undefined), false)
  assert.equal(giftWrappingOn({}), false)
  assert.equal(giftWrappingOn({ giftWrapping: 'yes' }), false)
  assert.equal(giftWrappingOn({ giftWrapping: 1 }), false)
  assert.equal(giftWrappingOn({ giftWrapping: true }), true)
})

test('the page reads the switch from the booking answer, false when missing or odd', () => {
  assert.equal(parseBooking({}).giftWrapping, false)
  assert.equal(parseBooking({ giftWrapping: 'true' }).giftWrapping, false)
  const on = parseBooking({ giftWrapping: true, openDays: ['2026-10-20'], status: { text: 'Booked up', updatedAt: new Date().toISOString() } })
  assert.deepEqual(on, { status: 'Booked up', openDays: ['2026-10-20'], giftWrapping: true })
})

test('what the form sends: nothing while off (no field), the choice when on, never anything else', () => {
  assert.equal(leadService(null), null, 'off: the form has no "What do you need?"')
  assert.equal(leadService(''), null)
  assert.equal(leadService('Cookies'), null)
  assert.equal(leadService(' Both '), 'Both')
  for (const s of SERVICES) assert.equal(leadService(s), s)
  assert.deepEqual(SERVICES, ['Christmas lights', 'Gift wrapping', 'Both'])
})

test('the rules and the lead fields accept exactly those choices', async () => {
  const rules = await read('firestore.rules')
  const create = rules.slice(rules.indexOf('match /leads/'), rules.indexOf('allow read', rules.indexOf('match /leads/')))
  assert.ok(create.includes("'service'"), 'service is an allowed key')
  for (const s of SERVICES) assert.ok(create.includes(`'${s}'`), s)
  assert.match(await read('src/lib/firebase.js'), /LEAD_FIELDS = \[[^\]]*'service'/)
})

test('staff words: a tag only when wrapping is asked for', () => {
  assert.equal(serviceLabel({ service: 'Gift wrapping' }), '🎁 Gift wrapping (no lights)')
  assert.equal(serviceLabel({ service: 'Both' }), '🎁 Lights + gift wrapping')
  assert.equal(serviceLabel({ service: 'Christmas lights' }), '')
  assert.equal(serviceLabel({}), '')
  assert.equal(serviceWords({}), '')
  assert.ok(wantsGiftWrapping({ service: 'Both' }) && !wantsGiftWrapping({ service: 'Christmas lights' }) && !wantsGiftWrapping(undefined))
})

test('the menu: the Gift wrapping link right after Photos when on, the plain menu when off', () => {
  assert.equal(navLinks(nav, false), nav)
  const on = navLinks(nav, true)
  assert.equal(on.length, nav.length + 1)
  assert.equal(on[on.findIndex((n) => n.href === '#gallery') + 1].href, '#gift-wrapping')
  assert.equal(on.at(-1).href, '#faq')
})

test('while off, nothing public mentions gift wrapping: the main copy, the prerendered menu/FAQ, the sales assistant', () => {
  const says = (x) => JSON.stringify(x).toLowerCase().includes('gift wrap')
  assert.ok(!says(nav) && !says(faq), 'nav and faq (drawn into the built HTML) stay clean')
  assert.ok(!says(salesKnowledge()), 'the assistant learns about it only once the owner turns it on')
  assert.ok(says(giftWrapping) && giftWrapping.faq.items.length >= 3 && giftWrapping.steps.length === 3)
  // No promises the owner hasn't made yet (prices, dates, supplies): docs/specs/gift-wrapping.md.
  assert.doesNotMatch(JSON.stringify(giftWrapping), /\$\d|per gift|December \d/i)
})
