import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanRow, mergePeople, findCustomer, cleanPhone } from '../src/lib/oldEstimates.js'

const row = (date, fields, extra = {}) => ({
  Date: date, Source: 'Gravity Forms', Form: 'Get An Estimate', Email: '', Phone: '', Message: '',
  'All fields': Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join(' | '), ...extra,
})

test('keeps real requests and tidies them', () => {
  const r = cleanRow(row('2022-11-14 09:00:00', { Name: 'pat SAMPLE', Phone: '(281) 555-0199', Email: 'Pat@Example.com', Message: 'Quote for lights on our one story home', 'How should we contact you? Text': 'Text' }))
  assert.equal(r.name, 'Pat Sample')
  assert.equal(r.email, 'pat@example.com')
  assert.equal(r.phone, '281-555-0199')
  assert.equal(r.contactBy, 'Text')
  assert.equal(r.date, '2022-11-14')
})

test('drops spam, bots and the encrypted calculator', () => {
  const spam = [
    { Name: 'xHkslbMIpBkfdmZPsBQ', Phone: '2815550199', Email: 'a@b.com', Message: 'opOEJYPPzcxZIKTbf' },
    { Name: 'RogergusSy', Phone: '2815550199', Email: 'a@b.com', Message: 'Hallo, ek wou jou prys ken.' },
    { Name: 'Mark Rogers', Phone: '2815550199', Email: 'a@b.com', Message: 'Need working capital? Check what you qualify for' },
    { Name: 'Amelia Brown', Phone: '2815550199', Email: 'a@b.com', Message: 'We run a YouTube growth service for your home page' },
    { Name: 'Eddie Stone', Phone: '2815550199', Email: 'a@b.com', Message: 'Get more Christmas light leads: www.example.com' },
    { Name: 'Kim Lee', Phone: '2815550199', Email: 'a@b.com', Message: 'Can I get a copy of your COVID policy?' },
  ]
  for (const f of spam) assert.equal(cleanRow(row('2025-11-01', f)), null, f.Message)
  assert.equal(cleanRow({ ...row('2020-11-01', { email: 'x@y.com', phone: '2815550199' }), Source: 'Estimate calculator' }), null)
  assert.ok(cleanRow(row('2020-11-23', { Name: 'Stephanie Smith', Phone: '2815550199', Email: 's@x.com' })), 'no message, in season: kept')
  assert.equal(cleanRow(row('2020-03-23', { Name: 'Stephanie Smith', Phone: '2815550199', Email: 's@x.com' })), null, 'no message in March: dropped')
})

test('repeat requests merge into one person with a stable id', () => {
  const a = cleanRow(row('2020-10-08', { Name: 'Jo Ex', Phone: '281-555-0142', Email: 'jo@example.com', Message: 'Quote for a two story house' }))
  const b = cleanRow(row('2021-11-02', { Name: 'Jo Example', Phone: '2815550142', Email: 'other@example.com', Message: 'Asking again about lights' }))
  const [p, ...rest] = mergePeople([b, a])
  assert.equal(rest.length, 0)
  assert.equal(p.fullName, 'Jo Example')
  assert.equal(p.firstAsked, '2020-10-08')
  assert.equal(p.lastAsked, '2021-11-02')
  assert.equal(p.year, '2021')
  assert.equal(p.requests.length, 2)
  assert.equal(p.id, 'old-jo-example-com')
})

test('matches existing customers by email, phone or full name', () => {
  const customers = [{ id: 'c1', fullName: 'Pat Sample', email: 'pat@example.com, pat2@x.com', phone: '(281) 555-0101' }]
  assert.equal(findCustomer({ email: 'pat2@x.com' }, customers)?.id, 'c1')
  assert.equal(findCustomer({ phone: '281-555-0101' }, customers)?.id, 'c1')
  assert.equal(findCustomer({ fullName: 'pat sample' }, customers)?.id, 'c1')
  assert.equal(findCustomer({ fullName: 'Pat', email: 'no@x.com' }, customers), null)
  assert.equal(cleanPhone('1 (281) 555-0101'), '281-555-0101')
})

test('same name with a new email merges; form entry + its email copy count once', () => {
  const mk = (date, email, msg) => cleanRow(row(date, { Name: 'Harry Example', Phone: '', Email: email, Message: msg }))
  const people = mergePeople([
    mk('2024-11-17', 'harry1@example.com', 'Provide and install Christmas lights'),
    mk('2024-11-18', 'harry1@example.com', 'Provide and install Christmas lights'),
    mk('2024-11-27', 'harry2@example.com', 'Install Christmas lighting for the holidays'),
  ])
  assert.equal(people.length, 1)
  assert.equal(people[0].requests.length, 2)
  assert.equal(people[0].email, 'harry2@example.com')
  assert.deepEqual(people[0].otherEmails, ['harry1@example.com'])
  assert.equal(findCustomer(people[0], [{ id: 'h', fullName: 'H. Example', email: 'harry1@example.com' }])?.id, 'h')
})
