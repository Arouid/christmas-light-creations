import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACCOUNT_URL, FROM_ADDRESS, LOGO_URL, OPT_OUT_LINE, SPAM_LINE, brandText, branded, textFooter } from '../functions/brand.js'
import { GFCI_TIP, TREE_NOTICE, TREE_SHORT, WIND_TIP } from '../functions/notices.js'
import { ACK_GAP_MS, ACK_TEMPLATE, ackAddress, ackEmail, ackOn, ackedRecently } from '../functions/ack.js'
import { NUDGE_GAP_MS, WAIT_MS, claimed, nudgeDue, nudgeKey, nudgeMessage, waiting } from '../functions/nudge.js'
import {
  LOOKAHEAD_DAYS, TIPS_GAP_DAYS, badDays, concerns, forecastDays, lightsHeadsUp, lightsUp, noticesOn, pruneSent, routeHeadsUp, sentKey, staffWeather, tipsOk, weatherLine,
} from '../functions/weather.js'
import { invoiceEmail } from '../functions/invoices.js'
import { HELP, searchHelp } from '../src/data/help.js'
import { loginLine } from '../src/lib/customerLogins.js'
import { STOCK_TEMPLATES } from '../src/lib/emailTemplates.js'
import { DEFAULT_TERMS, SEASONAL_TERMS } from '../src/proposals/terms.js'
import { systemPrompt } from '../functions/assistant/prompt.js'
import knowledge from '../functions/assistant/knowledge.json' with { type: 'json' }

const H = 60 * 60 * 1000

test('branding: every shell has the logo, the phone, the privacy link and the spam line; optional emails add the opt-out line', () => {
  const html = branded({ heading: 'Hi', paragraphs: ['One'], button: { href: 'https://x.y/z?a=1&b=2', label: 'Go' }, rows: [['Lights', '$1.00', true]] })
  for (const must of [LOGO_URL, '281-819-0163', '/privacy/', 'Not spam', FROM_ADDRESS, 'Lights', '$1.00', 'https://x.y/z?a=1&amp;b=2']) assert.ok(html.includes(must), must)
  assert.ok(!html.includes(ACCOUNT_URL), 'no opt-out line on a critical email')
  const optional = branded({ heading: 'Weather', paragraphs: ['x'], optional: true })
  assert.ok(optional.includes(ACCOUNT_URL) && optional.includes('optional'), 'optional emails say where to turn them off')
  assert.ok(SPAM_LINE.includes('Not spam') && OPT_OUT_LINE.includes('cannot') === false && OPT_OUT_LINE.includes('always come through'))
})

test('brandText: paragraphs, line breaks and links from plain text; escaped; our own text footer dropped from the HTML', () => {
  const text = `Hi Pat,\n\nLine one\nLine two <b>\n\nSee https://christmas-light-creations.com/account/ now${textFooter(true)}`
  const html = brandText({ heading: 'Test', text, optional: true })
  assert.ok(html.includes('Line one<br>Line two &lt;b&gt;'))
  assert.ok(html.includes('<a href="https://christmas-light-creations.com/account/"'))
  assert.equal((html.match(/Not spam/g) || []).length, 1, 'the spam line once (the shell), not twice')
  assert.ok(textFooter().includes(SPAM_LINE) && !textFooter().includes(OPT_OUT_LINE) && textFooter(true).includes(OPT_OUT_LINE))
  assert.ok(invoiceEmail({ inv: { number: 'CLC-2026-0001', kind: 'install', season: '2026', customer: { name: 'Pat Sample' }, items: [{ id: 'a', description: 'Re-install', cents: 10000 }], dueDate: '2026-11-01', sentAt: 1 }, link: 'https://x', today: '2026-10-20' }).html.includes(LOGO_URL), 'invoices use the same shell')
})

test('"Got your request": who gets it, what it says, and the double-tap guard', () => {
  assert.equal(ackAddress({ email: ' Pat@Example.com ' }), 'pat@example.com')
  assert.equal(ackAddress({ email: 'nope' }), '')
  assert.ok(ackOn({}) && ackOn({ ackRequests: true }) && !ackOn({ ackRequests: false }))
  const m = ackEmail({ firstName: 'Pat', address: '123 Main St', city: 'Pearland' })
  assert.ok(m.subject.startsWith('Got your request'))
  for (const must of ['Hi Pat', '123 Main St', 'one exact price', "don't quote over the phone", '/design/', 'pay in 3', 'early-install discount', '281-819-0163', SPAM_LINE]) assert.ok(m.text.includes(must), must)
  assert.ok(m.html.includes('Design your lights (free)') && m.html.includes(LOGO_URL))
  const withDesign = ackEmail({ firstName: 'Pat' }, { designAttached: true })
  assert.ok(withDesign.text.includes('design you drew') && !withDesign.html.includes('Design your lights (free)'))
  assert.ok(ackEmail({}).text.includes('Hi there') && ackEmail({}).text.includes('your home'))
  const now = Date.now()
  assert.ok(ackedRecently([{ ackSentAt: new Date(now - H) }], now))
  assert.ok(!ackedRecently([{ ackSentAt: new Date(now - ACK_GAP_MS - 1) }, {}], now))
  assert.equal(ACK_TEMPLATE, 'request-ack')
})

test('still waiting: what counts, the 2-hour wait, claims, and the 4-hour repeat', () => {
  const now = Date.parse('2026-10-20T15:00:00Z')
  const iso = (hoursAgo) => new Date(now - hoursAgo * H).toISOString()
  const messages = [
    { id: 'old-text', kind: 'text', direction: 'in', at: iso(3), syncedAt: now - 3 * H, customerId: 'pat', text: 'Can you come Thursday?' },
    { id: 'fresh-text', kind: 'text', direction: 'in', at: iso(1), syncedAt: now - 1 * H, customerId: 'sam', text: 'Hi' },
    { id: 'ours', kind: 'email', direction: 'out', at: iso(5), syncedAt: now - 5 * H, customerId: 'pat' },
    { id: 'dismissed', kind: 'missed', direction: 'in', at: iso(6), syncedAt: now - 6 * H, dismissed: true, phone: '2815550000' },
    { id: 'taken', kind: 'voicemail', direction: 'in', at: iso(8), syncedAt: now - 8 * H, customerId: 'lee', text: 'call me' },
  ]
  const leads = [
    { id: 'L1', firstName: 'New', status: 'new', createdAt: now - 4 * H, city: 'Pearland', message: 'Roofline?' },
    { id: 'L2', firstName: 'Done', status: 'contacted', createdAt: now - 4 * H },
    { id: 'L3', firstName: 'Spam', status: 'spam', createdAt: now - 4 * H },
  ]
  const calls = [
    { id: 'C1', source: 'customer', customerId: 'pat', status: 'Open', reportedAt: now - 3 * H, issue: 'Section out' },
    { id: 'C2', source: 'customer', customerId: 'sam', status: 'Done', reportedAt: now - 3 * H },
    { id: 'C3', source: 'staff', customerId: 'sam', status: 'Open', reportedAt: now - 3 * H },
  ]
  const activity = [{ action: 'handling', by: 'a@b.c', target: { id: 'taken' } }, { action: 'email', target: { id: 'old-text' } }]
  assert.deepEqual([...claimed(activity)], ['taken'])
  const list = waiting({ messages, leads, calls, activity, now })
  assert.deepEqual(list.map((m) => m.id), ['old-text', 'report-C1', 'request-L1'], 'oldest-than-2h, untaken, incoming only; newest first')
  assert.equal(WAIT_MS, 2 * H)

  assert.equal(nudgeDue(undefined, [], now), false, 'nothing waiting, nothing sent')
  assert.ok(nudgeDue(undefined, list, now), 'first time')
  const key = nudgeKey(list)
  assert.ok(!nudgeDue({ at: now - H, key }, list, now), 'same list an hour later: quiet')
  assert.ok(nudgeDue({ at: now - NUDGE_GAP_MS, key }, list, now), 'same list 4 hours later: again')
  assert.ok(nudgeDue({ at: now - H, key: 'other' }, list, now), 'the list changed: at once')

  const names = { 'customer:pat': 'Pat Sample', 'lead:L1': 'New Lead' }
  const msg = nudgeMessage(list, names, now)
  assert.equal(msg.push.title, 'Still waiting: 3 customers need a reply')
  assert.ok(msg.push.body.includes('Pat Sample') && msg.push.body.includes('New Lead') && msg.push.link === '#messages')
  assert.ok(msg.text.includes('• Text from Pat Sample, 3 h ago: Can you come Thursday?') && msg.text.includes('Problem report from Pat Sample') && msg.text.includes('Estimate request from New Lead'))
  assert.ok(msg.text.includes('/leads/#messages'))
  const one = nudgeMessage(list.slice(0, 1), names, now)
  assert.equal(one.push.title, 'Still waiting: Text from Pat Sample')
  assert.equal(one.push.link, '#accounts/customer/pat')
})

const periods = [
  { startTime: '2026-10-13T06:00:00-05:00', temperature: 88, probabilityOfPrecipitation: { value: 80 }, windSpeed: '15 to 25 mph', shortForecast: 'Showers And Thunderstorms Likely' },
  { startTime: '2026-10-13T18:00:00-05:00', temperature: 70, probabilityOfPrecipitation: { value: 60 }, windSpeed: '10 mph', shortForecast: 'Chance Showers' },
  { startTime: '2026-10-14T06:00:00-05:00', temperature: 75, probabilityOfPrecipitation: { value: 10 }, windSpeed: '5 mph', shortForecast: 'Sunny' },
  { startTime: '2026-10-14T18:00:00-05:00', temperature: 30, probabilityOfPrecipitation: { value: null }, windSpeed: '5 mph', shortForecast: 'Clear' },
  { startTime: '2026-10-15T06:00:00-05:00', temperature: 60, probabilityOfPrecipitation: { value: 20 }, windSpeed: '20 to 30 mph', windGust: '40 mph', shortForecast: 'Windy' },
  { startTime: '2026-10-16T06:00:00-05:00', temperature: 70, probabilityOfPrecipitation: { value: 90 }, windSpeed: '5 mph', shortForecast: 'Rain' },
  { startTime: '2026-10-12T18:00:00-05:00', temperature: 80, probabilityOfPrecipitation: { value: 100 }, windSpeed: '5 mph', shortForecast: 'Tonight: storms (today, ignored)' },
]

test('weather: the next 3 days from NWS periods, the worse of day and night, and what counts as bad', () => {
  const days = forecastDays(periods, '2026-10-12')
  assert.deepEqual(days.map((d) => d.day), ['2026-10-13', '2026-10-14', '2026-10-15'], `${LOOKAHEAD_DAYS} days after today; today and later days ignored`)
  const [storm, freeze, wind] = days
  assert.equal(storm.rainPct, 80); assert.equal(storm.windMph, 25); assert.ok(storm.storms); assert.equal(storm.hi, 88); assert.equal(storm.lo, 70)
  assert.deepEqual(concerns(storm), ['storms', 'wind'])
  assert.deepEqual(concerns(freeze), ['freeze'])
  assert.deepEqual(concerns(wind), ['wind'])
  assert.deepEqual(concerns({ rainPct: 50, windMph: 10, gustMph: 0, storms: false, ice: false, lo: 50 }), [], 'a 50% chance of showers is not news in Houston')
  assert.deepEqual(concerns({ rainPct: 65, windMph: 10, gustMph: 0, storms: false, ice: false, lo: 50 }), ['rain'])
  const bad = badDays(periods, '2026-10-12')
  assert.equal(bad.length, 3)
  assert.equal(weatherLine(bad[0]), 'Tuesday, Oct 13: thunderstorms (80% chance), wind to 25 mph')
  assert.equal(weatherLine(bad[1]), 'Wednesday, Oct 14: low 30°F')
  assert.equal(weatherLine(bad[2]), 'Thursday, Oct 15: wind to 40 mph')
  assert.deepEqual(badDays(periods, '2026-10-20'), [], 'no periods ahead: nothing')
})

test('weather emails: the route heads-up always, the storm tips optional, each with the right advice', () => {
  const [storm, , wind] = badDays(periods, '2026-10-12')
  const r = routeHeadsUp({ name: 'Pat Sample', day: storm, kind: 'install' })
  assert.equal(r.subject, 'Weather heads-up for your install Tuesday')
  assert.ok(r.text.includes('Hi Pat') && r.text.includes('thunderstorms and strong wind') && r.text.includes('your date may move') && r.text.includes('we will text you'))
  assert.ok(r.text.includes(TREE_SHORT), 'wind on an install day: trim the branches')
  assert.ok(!r.text.includes(OPT_OUT_LINE), 'scheduling email: not optional')
  assert.ok(!routeHeadsUp({ name: 'Pat', day: storm, kind: 'takedown' }).text.includes(TREE_SHORT))
  const tips = lightsHeadsUp({ name: 'Pat Sample', days: [storm, wind] })
  assert.ok(tips.subject.includes('thunderstorms, strong wind') && tips.subject.includes('this week'))
  assert.ok(tips.text.includes(GFCI_TIP) && tips.text.includes(WIND_TIP) && !tips.text.includes('freeze is fine'))
  assert.ok(tips.text.includes(OPT_OUT_LINE) && tips.html.includes(ACCOUNT_URL), 'tips are optional')
  assert.ok(tips.html.includes(LOGO_URL))
  assert.ok(lightsUp({ seasons: { 2026: { installStatus: 'Install Completed' } } }, '2026') && !lightsUp({ seasons: { 2026: { installStatus: 'Install Scheduled' } } }, '2026'))
  assert.ok(noticesOn({}) && noticesOn({ emailNotices: true }) && !noticesOn({ emailNotices: false }))
})

test('weather throttle: once per bad day, one every 5 days, pruned after 14', () => {
  const now = Date.parse('2026-10-12T21:30:00Z')
  const D = 24 * H
  assert.ok(tipsOk({}, 'pat', '2026-10-13', now))
  assert.ok(!tipsOk({ [sentKey('pat', '2026-10-13')]: now }, 'pat', '2026-10-13', now), 'already told about that day')
  assert.ok(!tipsOk({ [sentKey('pat', '2026-10-10')]: now - 2 * D }, 'pat', '2026-10-13', now), 'told 2 days ago: wait')
  assert.ok(tipsOk({ [sentKey('pat', '2026-10-05')]: now - TIPS_GAP_DAYS * D }, 'pat', '2026-10-13', now))
  assert.ok(tipsOk({ [sentKey('sam', '2026-10-13')]: now }, 'pat', '2026-10-13', now), 'other customers do not count')
  const pruned = pruneSent({ a: now - 15 * D, b: now - 13 * D, c: 'junk' }, now)
  assert.deepEqual(Object.keys(pruned), ['b'])
})

test('weather: the staff note says what the forecast is and who was told', () => {
  const days = badDays(periods, '2026-10-12')
  const s = staffWeather({ days, routeStops: [{ day: '2026-10-13', names: ['Pat Sample', 'Sam Test'] }], told: 12, skipped: 3 })
  assert.equal(s.push.title, 'Weather: Tue thunderstorms/strong wind, Wed a freeze, Thu strong wind')
  assert.equal(s.push.body, '2 route stops may move')
  assert.ok(s.text.includes('Tuesday, Oct 13: Pat Sample, Sam Test (2 stops)') && s.text.includes('12 (3 skipped'))
  assert.equal(staffWeather({ days, routeStops: [], told: 0, skipped: 0 }).push.body, 'No route stops on those days')
})

test('trees: told plainly everywhere (owner 2026-10-12), not only in the agreement', () => {
  for (const must of ['not covered', 'paid service call', 'trim them back', 'after our booked installs']) assert.ok(TREE_NOTICE.includes(must), must)
  for (const t of [DEFAULT_TERMS, SEASONAL_TERMS]) {
    assert.ok(t.includes('tree branches, vines or anything') && t.includes('paid service call'), 'the warranty exclusion')
    assert.ok(t.includes('branches touching or hanging over the roofline'), 'the duty to tell us')
    assert.ok(t.includes('PULLED DOWN, BROKEN OR SHORTED BY TREES, BRANCHES OR VINES'), 'the capitalized limit')
    assert.ok(t.includes('other customers are not delayed'), 'why the re-hang waits')
  }
  const reminder = STOCK_TEMPLATES.find((t) => t.id === 'install-reminder')
  const done = STOCK_TEMPLATES.find((t) => t.id === 'install-done')
  assert.ok(reminder.body.includes(TREE_SHORT) && done.body.includes(TREE_SHORT))
  const p = systemPrompt(knowledge, '')
  assert.ok(p.includes('Trees: lights pulled down') && p.includes('paid service call that we schedule after booked installs'))
  assert.ok(p.includes('Weather:') && p.includes('"Got your request"') && p.includes('Help box'))
})

test('help: the answers cover the questions people actually have, and the search ranks by the question', () => {
  for (const id of ['sign-in', 'no-link', 'pay', 'payin3', 'lights-out', 'trees', 'dates', 'weather', 'email-prefs', 'details', 'boxes', 'hoa', 'cancel', 'price', 'app', 'contact']) assert.ok(HELP.some((h) => h.id === id), id)
  assert.equal(searchHelp('').length, HELP.length)
  assert.equal(searchHelp('lights out')[0].id, 'lights-out')
  assert.equal(searchHelp('gate code')[0].id, 'details')
  assert.equal(searchHelp('spam')[0].id, 'no-link')
  assert.equal(searchHelp('tree')[0].id, 'trees')
  assert.equal(searchHelp('unsubscribe')[0].id, 'email-prefs')
  assert.deepEqual(searchHelp('zzzz qqqq'), [])
  assert.ok(HELP.find((h) => h.id === 'app').a.includes('only work from the installed app'))
  assert.ok(HELP.find((h) => h.id === 'contact').a.includes('no separate tech support'))
})

test('who has the app: the staff login line', () => {
  const lastAt = new Date('2026-10-12T14:40:00')
  assert.equal(loginLine({ firstAt: lastAt, lastAt, provider: 'Google', app: null }), 'Customer login: last signed in Oct 12, 2:40 PM (Google)')
  assert.ok(loginLine({ firstAt: lastAt, lastAt, provider: 'Google', app: { device: 'iPhone', at: new Date('2026-10-11T10:00:00') } }).endsWith('(Google) · 📱 has the app (iPhone, since Oct 11)'))
  assert.ok(loginLine({ lastAt, app: { device: '', at: null } }).endsWith('· 📱 has the app'))
})

test('lifetime warranty (owner 2026-10-12): in both agreements, the FAQ, Help and the assistant; a replacement while they stay a customer, never a refund', async () => {
  assert.ok(DEFAULT_TERMS.includes('Lifetime replacement: when we install your lights, you are covered from that install until your next install with us') && DEFAULT_TERMS.includes('never a cash refund'))
  assert.ok(SEASONAL_TERMS.includes('covered from that install until your next install with us') && SEASONAL_TERMS.includes('never a cash refund'))
  for (const t of [DEFAULT_TERMS, SEASONAL_TERMS]) assert.ok(t.includes('If you choose not to have us install the next season'), 'when it ends (owner: choosing not to use us breaks the relationship)')
  const { faq, included } = await import('../src/data/content.js')
  assert.ok(faq.some((g) => g.items.some(([q, a]) => q.includes('warranty') && a.includes('never charged a cent'))))
  assert.ok(included.some((i) => i.startsWith('Lifetime warranty')))
  const { heroHighlights, lifetimeWarranty, customerPerks } = await import('../src/data/content.js')
  assert.ok(heroHighlights.some((h) => h.title === 'Lifetime warranty' && h.href === '#warranty'), 'highlighted in the hero')
  assert.ok(lifetimeWarranty.body.includes('never charged a cent') && customerPerks.items.some(([, t]) => t === 'Lifetime warranty'))
  assert.ok(HELP.find((h) => h.id === 'warranty').a.includes('brand new at no charge'))
  assert.ok(systemPrompt(knowledge, '').includes('Lifetime warranty (a fact you may state)'))
})
