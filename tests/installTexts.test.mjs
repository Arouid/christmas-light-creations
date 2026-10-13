import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVITY_TEXT, MAX_TEXT, OPT_OUT, STOCK_TEXTS, TEXT_LABELS, etaText, historyEntry, jobWord, mergeTexts, reminderRows, reminderTime,
  routeTimed, stopExtras, stopText, templateId, textOptions, toldText, visitDayText, windowText,
} from '../src/lib/installTexts.js'
import { fillTemplate, missingPlaceholders } from '../src/lib/messages.js'
import { STOCK_TEMPLATES } from '../src/lib/emailTemplates.js'
import { timeline } from '../src/lib/router.js'

// Sample people and a route (no real data).
const pat = { id: 'pat-sample', fullName: 'Pat Sample', firstName: 'Pat', phone: '(281) 555-0101', email: 'Pat.Sample@Example.com', address: '12 Sample St, Pearland' }
const lee = { id: 'lee-example', fullName: 'Lee Example', firstName: 'Lee', phone: '281-555-0102' }
const noWay = { id: 'no-way', fullName: 'No Way', firstName: 'No', phone: '281-555-0103', textOptOut: 'Yes' }
const stops = [
  { id: 's-1', customerId: 'pat-sample', name: 'Pat Sample', phone: '(281) 555-0101', kind: 'install', minutes: 135, status: 'todo', driveMin: 22 },
  { id: 's-2', customerId: 'lee-example', name: 'Lee Example', phone: '', kind: 'takedown', minutes: 25, status: 'todo', driveMin: 15 },
  { id: 's-3', customerId: 'no-way', name: 'No Way', phone: '281-555-0103', kind: 'install', minutes: 135, status: 'todo', driveMin: 10 },
  { id: 's-4', customerId: null, name: '1 Any St', phone: '', kind: 'other', minutes: 15, status: 'todo', driveMin: 5 },
  { id: 's-5', customerId: 'pat-sample', name: 'Pat Sample', phone: '', kind: 'service', minutes: 20, status: 'done', driveMin: 9 },
]
const route = { id: 'r1', day: '2026-10-15', startTime: '08:00', stops, legsKey: stops.map((s) => s.id).join(','), backMin: 20 }
const customers = new Map([[pat.id, pat], [lee.id, lee], [noWay.id, noWay]])
const NOW = Date.parse('2026-10-14T15:00:00Z') // Wed Oct 14, 10:00 am Central
const user = { email: 'scott@example.com' }

test('arrival window: on the hour, half an hour before the ETA, three hours wide', () => {
  assert.equal(windowText(10 * 60 + 40), 'between 10 am and 1 pm')
  assert.equal(windowText(8 * 60 + 5), 'between 7 am and 10 am')
  assert.equal(windowText(8 * 60 + 30), 'between 8 am and 11 am')
  assert.equal(windowText(12 * 60), 'between 11 am and 2 pm')
  assert.equal(windowText(0), 'between 12 am and 3 am')
  assert.equal(windowText(null), 'during the day')
  assert.equal(windowText('soon'), 'during the day')
})

test('minutes away in round words', () => {
  assert.equal(etaText(3), 'just a few minutes away')
  assert.equal(etaText(22), 'about 20 minutes away')
  assert.equal(etaText(8), 'about 10 minutes away')
  assert.equal(etaText(47), 'about 45 minutes away')
  assert.equal(etaText(70), 'about an hour away')
  assert.equal(etaText(95), 'about 1.5 hours away')
  assert.equal(etaText(0), 'we should be there shortly')
  assert.equal(etaText(undefined), 'we should be there shortly')
})

test('day and job words', () => {
  assert.equal(visitDayText('2026-10-15'), 'Thursday, Oct 15')
  assert.equal(visitDayText('nope'), '')
  assert.equal(jobWord('install'), 'install')
  assert.equal(jobWord('takedown'), 'takedown')
  assert.equal(jobWord('service'), 'service call')
  assert.equal(jobWord('other'), 'visit')
})

test('default reminder time: 6 pm Central the evening before, else 10 minutes from now, none for today', () => {
  assert.equal(new Date(reminderTime('2026-10-15', NOW)).toISOString(), '2026-10-14T23:00:00.000Z') // CDT
  assert.equal(new Date(reminderTime('2026-12-10', NOW)).toISOString(), '2026-12-10T00:00:00.000Z') // Dec 9, 6 pm CST
  const late = Date.parse('2026-10-15T01:30:00Z') // Oct 14, 8:30 pm Central: 6 pm has passed
  assert.equal(reminderTime('2026-10-15', late), late + 10 * 60_000)
  assert.equal(reminderTime('2026-10-14', NOW), null)
  assert.equal(reminderTime('2026-10-01', NOW), null)
  assert.equal(reminderTime('', NOW), null)
})

test('a route has real times only after optimize, until its stops change', () => {
  assert.equal(routeTimed(route), true)
  assert.equal(routeTimed({ ...route, legsKey: 's-1,s-2' }), false)
  assert.equal(routeTimed({ ...route, stops: stops.map((s) => { const copy = { ...s }; delete copy.driveMin; return copy }) }), false)
  assert.equal(routeTimed({ ...route, stops: [] }), false)
})

test('stock texts: every placeholder fills, under the length cap, STOP line at the end', () => {
  const rows = timeline(stops, route.startTime, route.backMin).rows
  const long = { ...pat, firstName: 'Bartholomew-Alexander' }
  for (const [key] of TEXT_LABELS) {
    const text = fillTemplate(STOCK_TEXTS[key], long, '2026', stopExtras(rows[0], route))
    assert.ok(!/\{\w+\}/.test(text), `${key}: ${text}`)
    assert.ok(text.endsWith(OPT_OUT), `${key} ends with the opt-out line`)
    assert.ok(text.length <= MAX_TEXT, `${key} is ${text.length} chars`)
    assert.match(text, /^Hi Bartholomew-Alexander,/)
  }
  assert.deepEqual(Object.keys(STOCK_TEXTS).sort(), TEXT_LABELS.map(([k]) => k).sort())
})

test('the filled texts say the window, the day, the job and the minutes', () => {
  const rows = timeline(stops, route.startTime, route.backMin).rows // first stop: 8:22 arrival
  assert.equal(rows[0].eta, 8 * 60 + 22)
  const reminder = stopText('reminder', { stop: rows[0], route, customer: pat, season: '2026' })
  assert.match(reminder, /coming tomorrow \(Thursday, Oct 15\) between 7 am and 10 am for your install\./)
  assert.match(stopText('onway', { stop: rows[0], route, customer: pat, season: '2026' }), /on our way to you now, about 20 minutes away\./)
  assert.match(stopText('done', { stop: rows[0], route, customer: pat, season: '2026' }), /your lights are up!/)
  assert.match(stopText('done', { stop: rows[1], route, customer: lee, season: '2026' }), /^Hi Lee, your lights are down/)
  // Not optimized: no made-up times.
  const rough = { ...route, legsKey: 'stale' }
  assert.match(stopText('reminder', { stop: rows[0], route: rough, customer: pat, season: '2026' }), /tomorrow \(Thursday, Oct 15\) during the day for your install/)
  assert.match(stopText('onway', { stop: rows[0], route: rough, customer: pat, season: '2026' }), /you now, we should be there shortly\./)
  // Owner's wording wins; a blank edit falls back to stock.
  const mine = mergeTexts({ onway: 'Hi {first}, {eta}!', done: '  ', bogus: 'x' })
  assert.equal(stopText('onway', { stop: rows[0], route, customer: pat, season: '2026', templates: mine }), 'Hi Pat, about 20 minutes away!')
  assert.equal(mine.done, STOCK_TEXTS.done)
  assert.equal('bogus' in mine, false)
})

test('the reminder emails fill from the stop too, and warn when sent from anywhere else', () => {
  const rows = timeline(stops, route.startTime, route.backMin).rows
  for (const id of ['install-reminder', 'takedown-reminder']) {
    const t = STOCK_TEMPLATES.find((x) => x.id === id)
    assert.ok(t, id)
    const body = fillTemplate(t.body, pat, '2026', stopExtras(rows[0], route))
    assert.match(body, /tomorrow, Thursday, Oct 15, between 7 am and 10 am/)
    assert.ok(!/\{\w+\}/.test(body))
    assert.deepEqual(missingPlaceholders(t.subject + t.body, pat, '2026'), ['Arrival window (from the route)', 'Visit day (from the route)', ...(id === 'install-reminder' ? ['Install / takedown (from the route)'] : [])])
  }
})

test('which text buttons a stop gets', () => {
  assert.deepEqual(textOptions(stops[0], pat), { onway: true, done: 'done' })
  assert.deepEqual(textOptions(stops[1], lee), { onway: true, done: 'doneTakedown' }) // phone from the customer record
  assert.deepEqual(textOptions(stops[2], noWay), { reason: 'asked us not to text' })
  assert.deepEqual(textOptions(stops[3], undefined), { reason: 'no customer on this stop' })
  assert.deepEqual(textOptions(stops[4], pat), { onway: true, done: null }) // service: no All done text
  assert.deepEqual(textOptions(stops[1], { ...lee, phone: '' }), { reason: 'no phone on file' })
})

test('told state and history template ids', () => {
  assert.equal(toldText({ at: '2026-10-15T15:42:00Z', by: 'scott@example.com' }), 'told 10:42 am')
  assert.equal(toldText(null), '')
  assert.equal(toldText({ at: 'yesterday' }), '')
  assert.equal(templateId('install', 'onway'), 'install-onway')
  assert.equal(templateId('takedown', 'done'), 'takedown-done')
  assert.equal(templateId('service', 'onway'), 'service-onway')
  assert.equal(templateId('other', 'reminder'), 'install-reminder')
  assert.deepEqual(Object.keys(ACTIVITY_TEXT), ['reminder', 'onway', 'done'])
})

test('a tap writes a text entry in the customer’s history, not an "app" email', () => {
  const { id, data } = historyEntry({ stop: stops[0], customer: pat, step: 'onway', text: 'Hi Pat, on our way', user, now: NOW })
  assert.equal(id, `tx-s-1-onway-${NOW.toString(36)}`)
  assert.deepEqual(data, {
    kind: 'text', direction: 'out', source: 'voice-app', at: '2026-10-14T15:00:00.000Z', phone: '+12815550101',
    text: 'Hi Pat, on our way', customerId: 'pat-sample', sentBy: 'scott@example.com', template: 'install-onway',
  })
  // Phone from the customer when the stop has none; long texts cut at history's cap.
  const other = historyEntry({ stop: stops[1], customer: lee, step: 'done', text: 'x'.repeat(5000), user, now: NOW })
  assert.equal(other.data.phone, '+12815550102')
  assert.equal(other.data.text.length, 4000)
  assert.equal(other.data.template, 'takedown-done')
})

test('reminder list: install and takedown stops to do, how each can be reached', () => {
  const rows = timeline(stops, route.startTime, route.backMin).rows
  const list = reminderRows(route, rows, customers)
  assert.deepEqual(list.map((r) => r.stop.id), ['s-1', 's-2', 's-3']) // no address-only stop, no done service stop
  assert.deepEqual(list.map((r) => r.via), ['email', 'text', null])
  assert.equal(list[0].email, 'pat.sample@example.com')
  assert.equal(list[1].phone, '+12815550102')
  assert.equal(list[2].reason, 'asked us not to text, and no email on file')
  assert.deepEqual(list.map((r) => r.when), ['between 7 am and 10 am', 'between 10 am and 1 pm', 'between 10 am and 1 pm']) // 8:22, 10:52, 11:27 arrivals
  assert.deepEqual(list.map((r) => r.mark), [null, null, null])
  // Already reminded: the mark comes back so the box can show it.
  const marked = reminderRows(route, rows.map((s) => (s.id === 's-1' ? { ...s, texts: { reminder: { at: '2026-10-14T23:00:00Z', by: 'k@example.com', via: 'email', scheduledId: 'abc' } } } : s)), customers)
  assert.equal(marked[0].mark.scheduledId, 'abc')
  // Unknown customer id, and a plain object instead of a Map.
  const gone = reminderRows(route, rows, { 'pat-sample': pat })
  assert.equal(gone[1].reason, 'customer record not found')
  assert.equal(gone[0].via, 'email')
  // Not optimized: "during the day" for everyone.
  assert.deepEqual(reminderRows({ ...route, legsKey: 'stale' }, rows, customers).map((r) => r.when), ['during the day', 'during the day', 'during the day'])
})

// Boxes on the porch (owner 2026-10-12): re-installs and takedowns get the line, a first-year install doesn't.
test('set your boxes out: returning re-install and every takedown, never a first-year install; texts stay under one segment', async () => {
  const { boxLine, isReturning } = await import('../src/lib/installTexts.js')
  const route = { day: '2026-11-12', startTime: '08:00', stops: [] }
  const returning = { firstName: 'Pat', seasons: { 2025: { installStatus: 'Install Completed' }, 2026: {} } }
  const first = { firstName: 'Sam', seasons: { 2026: {} } }
  assert.ok(isReturning(returning, 2026) && !isReturning(first, 2026) && isReturning({ since: '2021' }, 2026))
  assert.match(boxLine('install', returning, 2026), /boxes of lights out on the porch/)
  assert.match(boxLine('install', returning, 2026, true), /labeled boxes of lights out on the porch by the morning/)
  assert.equal(boxLine('install', first, 2026), '')
  assert.match(boxLine('takedown', first, 2026), /empty box out on the porch/)
  const re = stopText('reminder', { stop: { kind: 'install', customerId: 'r' }, route, customer: returning, season: 2026 })
  assert.ok(re.includes('boxes of lights out on the porch') && re.includes('Questions?') && re.length <= MAX_TEXT, `${re.length}: ${re}`)
  const fr = stopText('reminder', { stop: { kind: 'install', customerId: 'f' }, route, customer: first, season: 2026 })
  assert.ok(!fr.includes('box') && fr.includes('home. Questions?'))
  const td = stopText('reminder', { stop: { kind: 'takedown', customerId: 'f' }, route, customer: first, season: 2026 })
  assert.ok(td.includes('empty box out on the porch') && td.length <= MAX_TEXT, `${td.length}`)
  // The emails: a bullet on a re-install, nothing (and no stray blank line) on a first-year install.
  const inst = STOCK_TEMPLATES.find((t) => t.id === 'install-reminder').body
  const x = (c) => stopExtras({ kind: 'install' }, route, false, c, 2026)
  assert.ok(fillTemplate(inst, returning, 2026, x(returning)).includes('- Set your labeled boxes of lights out on the porch'))
  assert.ok(!fillTemplate(inst, first, 2026, x(first)).includes('box') && !fillTemplate(inst, first, 2026, x(first)).includes('\n\n\n'))
  const take = STOCK_TEMPLATES.find((t) => t.id === 'takedown-reminder').body
  assert.ok(fillTemplate(take, first, 2026, stopExtras({ kind: 'takedown' }, route, false, first, 2026)).includes('Please set your empty box out on the porch.'))
  assert.ok(fillTemplate(inst, returning, 2026, x(returning)).includes('reply if your gate code has changed'))
})
