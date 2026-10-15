import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALL_LINKS, LINK_GROUPS, LOGIN_MAX, NOT_RECORDED, cleanLogins, editable, loginDraft, loginFor, loginHint } from '../src/data/staffLinks.js'
import { BUSINESS_EMAIL } from '../src/lib/messages.js'

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g

test('links: unique ids, a name, a what-for, and an https link or a where', () => {
  const ids = ALL_LINKS.map((l) => l.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(LINK_GROUPS.every((g) => g.title && g.links.length))
  for (const l of ALL_LINKS) {
    assert.ok(l.name && l.what, l.id)
    if (l.url) assert.match(l.url, /^https:\/\//, l.id)
    else assert.ok(l.where, `${l.id}: no link and no where`)
  }
})

test('links: the public repo holds no login but the business’s own info@', () => {
  // The list as data and as source text: any other address belongs in settings/app.logins.
  const found = [...JSON.stringify(LINK_GROUPS).matchAll(EMAIL), ...readFileSync('src/data/staffLinks.js', 'utf8').matchAll(EMAIL)].map((m) => m[0])
  assert.ok(found.length > 0)
  assert.deepEqual([...new Set(found)], [BUSINESS_EMAIL])
  // Fixed words never name an account.
  assert.ok(ALL_LINKS.filter((l) => l.login).every((l) => !new RegExp(EMAIL.source).test(l.login)))
})

test('login line: saved wins, then Voice’s setting, then the default, else ask Scott; fixed words stay', () => {
  const by = (id) => ALL_LINKS.find((l) => l.id === id)
  assert.deepEqual(loginFor(by('ads'), {}), { text: NOT_RECORDED, known: false })
  assert.deepEqual(loginFor(by('ads'), { logins: { ads: '  owner@example.com ' } }), { text: 'owner@example.com', known: true })
  assert.equal(loginFor(by('gmail'), {}).text, BUSINESS_EMAIL)
  assert.equal(loginFor(by('voice'), { voiceAccount: 'voice@example.com' }).text, 'voice@example.com')
  assert.equal(loginFor(by('voice'), { voiceAccount: 'voice@example.com', logins: { voice: 'other@example.com' } }).text, 'other@example.com')
  assert.equal(loginFor(by('voice'), { logins: { voice: '   ' } }).known, false, 'blank is not a login')
  assert.equal(loginFor(by('review'), { logins: { review: 'x@example.com' } }).text, 'None: a public link')
  assert.equal(editable(by('review')), false)
  assert.equal(loginHint(by('gmail'), { logins: { gmail: 'x@example.com' } }), BUSINESS_EMAIL)
  assert.equal(loginHint(by('ads'), {}), 'Email or username')
})

test('saving logins: every fillable id, trimmed, capped, blanks kept, nothing else stored', () => {
  const out = cleanLogins({ ads: '  a@example.com ', review: 'nope', made_up: 'x', godaddy: 'g'.repeat(500) })
  assert.deepEqual(Object.keys(out).sort(), ALL_LINKS.filter(editable).map((l) => l.id).sort())
  assert.equal(out.ads, 'a@example.com')
  assert.equal(out.godaddy.length, LOGIN_MAX)
  assert.equal(out.paypal, '')
  assert.equal('review' in out || 'made_up' in out, false)
  // The editor opens with only what was saved (defaults stay hints, not saved values).
  const draft = loginDraft({ logins: { ads: ' a@example.com ' }, voiceAccount: 'voice@example.com' })
  assert.equal(draft.ads, 'a@example.com')
  assert.equal(draft.voice, '')
  assert.equal(draft.gmail, '')
})
