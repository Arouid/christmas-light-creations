import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bounceFields, bounceIncident, bouncePush, bounceReason, bounceSummary, isBounceMail, parseBounce, parseSyncItem, pickBounced, recordsOf } from '../functions/bounces.js'
import { docsFor, buildDirectory, emailIdBase } from '../functions/messageSync.js'

// Hand-written bounce notices in the shapes Gmail and other mail servers use
// (made-up addresses and ids, no real data).
const DATE = '2026-11-18T17:12:40.000Z'
const MID = '<0c4f-91AB@christmas-light-creations.com>'
const daemon = 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>'
const gmail = (over) => ({ gmailId: 'b1', messageId: '<bounce1@mx.google.com>', date: DATE, from: daemon, to: 'info@christmas-light-creations.com', subject: 'Delivery Status Notification (Failure)', ...over })

const notFound = gmail({
  inReplyTo: MID, references: MID, failedTo: 'pat.sampel@example.com',
  body: `** Address not found **

Your message wasn't delivered to pat.sampel@example.com because the address couldn't be found, or is unable to receive mail.

Learn more here: https://support.google.com/mail/?p=NoSuchUser

The response was:

550 5.1.1 The email account that you tried to reach does not exist. Please try double-checking the recipient's email address for typos or unnecessary spaces. For more information, go to https://support.google.com/mail/?p=NoSuchUser 5a6b7c8d9e-12.34 - gsmtp`,
})
const noDomain = gmail({
  body: `** Address not found **

Your message wasn't delivered to pat@example.con because the domain example.con couldn't be found. Check for typos or unnecessary spaces and try again.

The response was:

DNS Error: DNS type 'mx' lookup of example.con responded with code NXDOMAIN Domain name not found: example.con`,
})
const full = gmail({ body: `** Message not delivered **\n\nYour message wasn't delivered to jordan@example.com.\n\nThe response was:\n\n552 5.2.2 The recipient's inbox is out of storage space and inactive. Please direct the recipient to https://support.google.com/mail/?p=OverQuotaPerm` })
const disabled = gmail({ body: `** Address not found **\n\nYour message wasn't delivered to old.account@example.com.\n\nThe response was:\n\n550 5.2.1 The email account that you tried to reach is disabled.` })
const blocked = gmail({ body: `** Message blocked **\n\nYour message to pat@example.com has been blocked.\n\nThe response from the remote server was:\n\n550 5.7.1 Message rejected as spam by Content Filtering. [192.0.2.55]` })
const delay = gmail({
  subject: 'Delivery Status Notification (Delay)',
  body: `** Delivery incomplete **\n\nThere was a temporary problem delivering your message to pat@example.com. Gmail will retry for 47 more hours. You'll be notified if the delivery fails permanently.\n\nThe response was:\n\n452 4.2.2 The email account that you tried to reach is over quota.`,
})
// Another server's bounce after it accepted the mail (RFC 3464 fields, the original quoted below).
const postfix = {
  gmailId: 'b2', messageId: '<20261118171240.ABC@mx.example.org>', date: DATE, from: 'MAILER-DAEMON@mx.example.org (Mail Delivery System)',
  to: 'info@christmas-light-creations.com', subject: 'Undelivered Mail Returned to Sender',
  body: `This is the mail system at host mx.example.org.

I'm sorry to have to inform you that your message could not
be delivered to one or more recipients.

Reporting-MTA: dns; mx.example.org

Final-Recipient: rfc822; jordan@example.com
Original-Recipient: rfc822;jordan@example.com
Action: failed
Status: 5.1.1
Diagnostic-Code: smtp; 550 5.1.1 <jordan@example.com>: Recipient address rejected: User unknown in local recipient table

----- Original message -----
From: "Christmas Light Creations" <info@christmas-light-creations.com>
To: jordan@example.com
Message-ID: <CAOUT9@mail.gmail.com>
Subject: =?UTF-8?Q?Your_2026_install_=E2=80=94_Thursday?=

We're blocked on Thursday, can we do Friday? Your mailbox is full of our emails, ha.`,
}

test('only mail from a mail server is read as a bounce', () => {
  assert.equal(isBounceMail(notFound), true)
  assert.equal(isBounceMail(postfix), true)
  assert.equal(isBounceMail({ from: 'postmaster@example.net' }), true)
  assert.equal(isBounceMail({ from: 'Microsoft Outlook <MicrosoftExchange329e71ec88ae4615bbc36ab6ce41109e@example.onmicrosoft.com>' }), true)
  assert.equal(isBounceMail({ from: 'Pat Sample <pat.sample@example.com>' }), false)
  assert.equal(isBounceMail({ from: 'noreply@shop.example.com' }), false)
  assert.equal(isBounceMail(null), false)
})

test('Gmail "Address not found": final, address from X-Failed-Recipients, Message-ID from In-Reply-To', () => {
  const b = parseBounce(notFound)
  assert.equal(b.bounce, true)
  assert.equal(b.at, DATE)
  assert.equal(b.code, '5.1.1')
  assert.equal(b.reason, 'the address doesn’t exist (check it for a typo)')
  assert.deepEqual(b.emails, ['pat.sampel@example.com'])
  assert.deepEqual(b.refs, [emailIdBase(MID)])
  assert.equal(b.subject, '')
})

test('plain reasons: domain, full mailbox, closed account, blocked; IP addresses are not codes', () => {
  assert.equal(parseBounce(noDomain).reason, 'the domain after @ doesn’t exist (check it for a typo)')
  assert.deepEqual(parseBounce(noDomain).emails, ['pat@example.con'])
  assert.equal(parseBounce(full).reason, 'their mailbox is full')
  assert.equal(parseBounce(disabled).reason, 'that email account is closed or disabled')
  const b = parseBounce(blocked)
  assert.equal(b.code, '5.7.1')
  assert.equal(b.reason, 'their mail server refused it (it may look like spam to them)')
  assert.deepEqual(b.emails, ['pat@example.com'])
  const ipOnly = parseBounce(gmail({ body: 'Your message couldn’t be delivered to pat@example.com.\nRemote server [10.5.1.1] closed the connection.' }))
  assert.equal(ipOnly.code, '')
  assert.equal(ipOnly.reason, 'it couldn’t be delivered')
  assert.equal(bounceReason('5.3.0', 'Something else'), 'it couldn’t be delivered (code 5.3.0)')
})

test('delays are never bounces; unreadable notices are left alone', () => {
  assert.deepEqual(parseBounce(delay), { skip: 'bounce-delay' })
  assert.deepEqual(parseBounce({ ...postfix, subject: 'Delayed Mail (still being retried)', body: 'Final-Recipient: rfc822; jordan@example.com\nAction: delayed\nStatus: 4.4.7' }), { skip: 'bounce-delay' })
  assert.deepEqual(parseBounce(gmail({ subject: 'Hello', body: 'Something about your mailbox settings.' })), { skip: 'bounce-unclear' })
  assert.deepEqual(parseBounce(gmail({ date: 'nope' })), { skip: 'no-date' })
})

test('other servers: delivery-status fields, original Message-ID and encoded subject; the quoted original is not read for reasons', () => {
  const b = parseBounce(postfix)
  assert.equal(b.code, '5.1.1')
  assert.equal(b.reason, 'the address doesn’t exist (check it for a typo)', 'not "blocked" or "full" from our own quoted text')
  assert.deepEqual(b.emails, ['jordan@example.com'])
  assert.deepEqual(b.refs, [emailIdBase('<CAOUT9@mail.gmail.com>')])
  assert.equal(b.subject, 'Your 2026 install — Thursday')
})

test('failed address: our own addresses never; any address only when nothing names it', () => {
  const exim = parseBounce({ ...postfix, from: 'Mail Delivery System <Mailer-Daemon@mx.example.net>', subject: 'Mail delivery failed: returning message to sender',
    body: 'From: info@christmas-light-creations.com\nThis message was created automatically by mail delivery software.\n\nA message that you sent could not be delivered to one or more of its recipients. This is a permanent error. The following address(es) failed:\n\n  sam@example.net\n    host mx.example.net said: 550 No such user here' })
  assert.deepEqual(exim.emails, ['sam@example.net'])
  assert.equal(exim.reason, 'the address doesn’t exist (check it for a typo)')
  const loose = parseBounce(gmail({ body: 'Message not delivered.\nCopy to info@christmas-light-creations.com, clc.voicemail.01@gmail.com.\nRecipient: casey@example.org' }))
  assert.deepEqual(loose.emails, ['casey@example.org'])
})

test('sync routing: bounces parsed as bounces, other automatic mail still junk, "Undeliverable" from a customer is an email', () => {
  assert.equal(parseSyncItem(notFound).bounce, true)
  const dir = buildDirectory([{ id: 'sample-customer', email: 'pat.sample@example.com' }], [])
  const shop = parseSyncItem({ gmailId: 'j', messageId: '<n1@shop.example.com>', date: DATE, from: 'noreply@shop.example.com', to: 'info@christmas-light-creations.com', subject: 'Your order shipped', body: 'Tracking inside' })
  assert.equal(shop.junk, 'automatic')
  assert.deepEqual(docsFor(shop, dir), [])
  const person = parseSyncItem({ gmailId: 'p', messageId: '<p1@example.com>', date: DATE, from: 'Pat Sample <pat.sample@example.com>', to: 'info@christmas-light-creations.com', subject: 'Undeliverable: my last email?', body: 'Did you get my last email?' })
  assert.equal(person.kind, 'email')
  assert.equal(docsFor(person, dir)[0].data.customerId, 'sample-customer')
  assert.deepEqual(parseSyncItem(null), { skip: 'bad-item' })
})

// History entries as Firestore holds them (id + data).
const base = emailIdBase(MID)
const minutes = (n) => new Date(Date.parse(DATE) + n * 60000).toISOString()
const out = (id, email, at, subject = 'Install day', extra = {}) => ({ id, kind: 'email', direction: 'out', email, at, subject, customerId: id.split('-').slice(2).join('-') || 'c', ...extra })

test('matching by Message-ID: the entry with that id; of one email to several people, only the failed address', () => {
  const b = parseBounce(notFound)
  const mine = out(`${base}-sample-customer`, 'pat.sampel@example.com', minutes(-1))
  const other = out(`${base}-example-family`, 'family@example.com', minutes(-1))
  assert.deepEqual(pickBounced(b, { byRef: [mine, other] }), [mine])
  // One entry with that Message-ID: it, even if the address differs (a forward that failed).
  assert.deepEqual(pickBounced({ ...b, emails: ['elsewhere@example.net'] }, { byRef: [other] }), [other])
  // Several, failed address unknown: can't tell, nothing by Message-ID.
  assert.deepEqual(pickBounced({ ...b, emails: [] }, { byRef: [mine, other] }), [])
  // Incoming mail with the same id prefix never counts.
  assert.deepEqual(pickBounced(b, { byRef: [{ ...mine, direction: 'in' }] }), [])
})

test('matching by address: latest email to it in the week before the bounce, same subject preferred', () => {
  const b = { ...parseBounce(notFound), refs: [] }
  const old = out('em-a-sample-customer', 'pat.sampel@example.com', minutes(-8 * 24 * 60), 'Old news')
  const twoDays = out('em-b-sample-customer', 'pat.sampel@example.com', minutes(-2 * 24 * 60), 'Your 2026 install')
  const hour = out('em-c-sample-customer', 'pat.sampel@example.com', minutes(-60), 'Invoice CLC-2026-0007')
  const later = out('em-d-sample-customer', 'pat.sampel@example.com', minutes(30), 'Sent after the bounce')
  const incoming = { ...out('em-e-sample-customer', 'pat.sampel@example.com', minutes(-30)), direction: 'in' }
  const otherAddress = out('em-f-sample-customer', 'pat.sample@example.com', minutes(-5))
  const byEmail = [old, twoDays, hour, later, incoming, otherAddress]
  assert.deepEqual(pickBounced(b, { byEmail }), [hour])
  assert.deepEqual(pickBounced({ ...b, subject: 'Your 2026 INSTALL' }, { byEmail }), [twoDays])
  assert.deepEqual(pickBounced(b, { byEmail: [old, later, incoming] }), [])
  // Message-ID found nothing usable: the address still decides.
  assert.deepEqual(pickBounced(parseBounce(notFound), { byRef: [], byEmail }), [hour])
})

test('what is stored, flagged and told', () => {
  const b = parseBounce(notFound)
  assert.deepEqual(bounceFields(b), { bounced: true, bouncedAt: DATE, bounceReason: b.reason, bounceCode: '5.1.1' })
  assert.deepEqual(recordsOf({ customerId: 'sample-customer', pastRequestId: 'old-x' }), ['customers/sample-customer', 'pastRequests/old-x'])
  assert.deepEqual(recordsOf({ leadId: 'abc' }), ['leads/abc'])
  assert.deepEqual(recordsOf({ customerId: 'a/b' }), [])
  const m = { id: `${base}-sample-customer`, ...out(`${base}-sample-customer`, 'pat.sampel@example.com', minutes(-1), 'Secret subject'), ...bounceFields(b) }
  const names = { 'customer:sample-customer': 'Pat Sample' }
  const msg = bounceIncident(m, names)
  assert.match(msg, /^An email to Pat Sample \(sent Nov 18\) bounced: the address doesn’t exist/)
  assert.ok(!msg.includes('@') && !msg.includes('Secret'), 'no address or subject in the banner / log')
  assert.match(bounceIncident({ ...m, customerId: undefined, pastRequestId: 'old-x' }, names), /^An email to a customer/)
  const now = Date.parse(DATE) + 5 * 60000
  assert.deepEqual(bouncePush([m], names, now), { title: 'Email to Pat Sample bounced', body: 'The address doesn’t exist (check it for a typo)', link: '#accounts/customer/sample-customer', tag: `bounce:${m.id}` })
  const two = bouncePush([m, { ...m, id: 'x', customerId: 'example-family' }], { ...names, 'customer:example-family': 'Example Family' }, now)
  assert.deepEqual(two, { title: '2 emails bounced', body: 'Pat Sample, Example Family', link: '#home', tag: 'bounces' })
  assert.equal(bouncePush([m], names, now + 3 * 24 * 3600000), null, 'old bounces from a catch-up don’t buzz phones')
  assert.equal(bouncePush([], names, now), null)
  const s = bounceSummary(b, 1)
  assert.deepEqual(s, { status: 'bounce', permanent: true, reason: b.reason, code: '5.1.1', refs: 1, address: true, matches: 1 })
  assert.ok(!JSON.stringify(s).includes('@'))
})

test('staff app: a bounce note only counts while that address is on the record', async () => {
  const { bounceLine, bounceOf, bouncesOnRecord } = await import('../src/lib/bounces.js')
  const flag = { at: '2026-10-10T15:00:00.000Z', reason: 'the address doesn’t exist (check it for a typo)', entryId: 'em-x-pat' }
  const rec = { email: 'Pat.Sampel@example.com', otherEmails: ['pat2@example.com'], bouncedEmails: { 'pat.sampel@example.com': flag, 'old@example.com': flag } }
  assert.deepEqual(bouncesOnRecord(rec).map((b) => b.email), ['pat.sampel@example.com'], 'old@ was replaced: no warning')
  assert.equal(bounceOf(rec, ' PAT.SAMPEL@example.com ').reason, flag.reason)
  assert.equal(bounceOf(rec, 'pat2@example.com'), null)
  assert.deepEqual(bouncesOnRecord({ email: 'pat.sample@example.com', bouncedEmails: rec.bouncedEmails }), [], 'typo fixed: warning gone')
  assert.deepEqual(bouncesOnRecord({ email: 'x@example.com' }), [])
  assert.deepEqual(bouncesOnRecord(null), [])
  assert.match(bounceLine(bouncesOnRecord(rec)[0]), /^Email to pat\.sampel@example\.com bounced Oct 10: the address doesn’t exist/)
})
