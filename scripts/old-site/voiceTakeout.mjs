// Old Google Voice history -> customer history entries (Firestore `messages`).
// Two sources: the Voice Takeout (one .html per call or text conversation) and
// old Voice notification emails in Gmail Takeout .mbox files. Pure: no files.
// Ids come from voiceId() so an entry the live sync already stored isn't doubled.
// Spec: docs/specs/message-sync.md. Tested in tests/voiceTakeout.test.mjs.
import { MAX_TEXT, OUR_PHONES, e164, isVoice, parseItem, voiceId } from '../../functions/messageSync.js'

// Business Voice numbers past and present (texts before 2018 went to 0288).
export const BUSINESS_PHONES = [...OUR_PHONES, '+12818190288']
const ours = (p) => BUSINESS_PHONES.includes(p)
const cap = (s) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT - 1)}…` : s)

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
export function htmlText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, n) => ENTITIES[n] ?? m)
    .replace(/[  ]/g, ' ')
    .trim()
}

const isoOf = (s) => {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}
// "PT1M5S" -> "1:05"
export function durationOf(iso) {
  const m = String(iso ?? '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return ''
  const [h, min, s] = [m[1], m[2], m[3]].map((x) => Number(x ?? 0))
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${String(min).padStart(2, '0')}:${ss}` : `${min}:${ss}`
}

const CALL_KINDS = { Received: ['call', 'in'], Placed: ['call', 'out'], Missed: ['missed', 'in'], Voicemail: ['voicemail', 'in'] }

function entry({ kind, direction, phone, at, text = '', duration = '' }) {
  const data = { source: 'takeout', kind, direction, at, phone }
  if (text) data.text = cap(text)
  if (duration) data.duration = duration
  return { id: voiceId({ kind, phone, at, text: data.text ?? '' }), data }
}

// One Takeout file ("Name - Text - 2026-09-28T00_19_17Z.html") -> entries.
// `phoneOfName` fills in the number for a conversation that only has our own
// texts and is filed under a contact name. Returns { entries, skipped }.
export function parseTakeoutHtml(fileName, html, phoneOfName = () => '') {
  const m = fileName.replace(/^.*[\\/]/, '').match(/^(.*) - (Text|Received|Placed|Missed|Voicemail|Recorded) - /)
  if (!m) return { entries: [], skipped: 'other-file' }
  const [, who, label] = m
  if (label === 'Recorded') return { entries: [], skipped: 'recorded' }

  if (label !== 'Text') {
    const [kind, direction] = CALL_KINDS[label]
    const phone = e164(html.match(/class="contributor vcard">[\s\S]*?href="tel:([^"]+)"/)?.[1])
    const at = isoOf(html.match(/<abbr class="published" title="([^"]+)"/)?.[1])
    if (!phone || ours(phone) || !at) return { entries: [], skipped: 'no-number' }
    const text = kind === 'voicemail' ? htmlText(html.match(/<span class="full-text">([\s\S]*?)<\/span>/)?.[1]) : ''
    const duration = kind === 'missed' ? '' : durationOf(html.match(/<abbr class="duration" title="([^"]+)"/)?.[1])
    return { entries: [entry({ kind, direction, phone, at, text, duration })] }
  }

  if (/class="participants"/.test(html)) return { entries: [], skipped: 'group-text' }
  const msgs = [...html.matchAll(/<div class="message">([\s\S]*?)<\/div>(?=\s*(?:<div class="message">|<\/div>))/g)].map(([, body]) => ({
    at: isoOf(body.match(/<abbr class="dt" title="([^"]+)"/)?.[1]),
    from: e164(body.match(/class="sender vcard"><a class="tel" href="tel:([^"]*)"/)?.[1]),
    me: /<abbr class="fn" title="">Me<\/abbr>/.test(body),
    text: htmlText(body.match(/<q>([\s\S]*?)<\/q>/)?.[1]),
    photo: /alt="Image MMS Attachment"|<img /.test(body),
  }))
  const them = msgs.find((x) => !x.me && x.from && !ours(x.from))?.from
    || e164(/^\+?\d{10,11}$/.test(who) ? who : '') || phoneOfName(who)
  if (!them) return { entries: [], skipped: 'no-number' }
  const entries = msgs.filter((x) => x.at && (x.text || x.photo)).map((x) => {
    const out = x.me || ours(x.from)
    return entry({ kind: 'text', direction: out ? 'out' : 'in', phone: them, at: x.at, text: x.text || '📷 Photo' })
  })
  return { entries }
}

// Contact name -> number, from every Takeout file that shows both.
export function namesToPhones(files) {
  const map = new Map()
  for (const html of files) {
    for (const [, tel, name] of html.matchAll(/href="tel:(\+?\d+)"><span class="fn">([^<]+)<\/span>/g)) {
      const p = e164(tel)
      if (p && !ours(p) && !map.has(name.trim())) map.set(name.trim(), p)
    }
  }
  return map
}

// ---- Old Voice notification emails (mbox) ----------------------------------

function unfold(head) {
  const h = {}
  for (const line of head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i > 0) h[line.slice(0, i).toLowerCase()] ??= line.slice(i + 1).trim()
  }
  return h
}
const bytesToText = (bin, charset = 'utf-8') => {
  try { return new TextDecoder(charset).decode(Buffer.from(bin, 'latin1')) } catch { return new TextDecoder().decode(Buffer.from(bin, 'latin1')) }
}
function decodePart(body, h) {
  const cte = (h['content-transfer-encoding'] ?? '').toLowerCase()
  const charset = h['content-type']?.match(/charset="?([^";\s]+)/i)?.[1] ?? 'utf-8'
  let bin = body
  if (cte === 'base64') bin = Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('latin1')
  else if (cte === 'quoted-printable') bin = body.replace(/=\r?\n/g, '').replace(/=([0-9a-f]{2})/gi, (_, x) => String.fromCharCode(parseInt(x, 16)))
  let text = bytesToText(bin, charset)
  if (/format=flowed/i.test(h['content-type'] ?? '')) {
    const delsp = /delsp=yes/i.test(h['content-type'])
    text = text.replace(/ \r?\n/g, delsp ? '' : ' ')
  }
  return text
}
// "=?UTF-8?B?...?=" / "=?UTF-8?Q?...?=" in a header.
export function decodeWords(s) {
  return String(s ?? '').replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=\s*/gi, (_, cs, enc, txt) => {
    const bin = enc.toLowerCase() === 'b' ? Buffer.from(txt, 'base64').toString('latin1')
      : txt.replace(/_/g, ' ').replace(/=([0-9a-f]{2})/gi, (__, x) => String.fromCharCode(parseInt(x, 16)))
    return bytesToText(bin, cs)
  })
}
// First text/plain body of a MIME message (headers + body as raw latin1 text).
function plainBody(head, body) {
  const h = unfold(head)
  const type = (h['content-type'] ?? 'text/plain').toLowerCase()
  if (type.startsWith('multipart/')) {
    const boundary = h['content-type'].match(/boundary="?([^";]+)"?/i)?.[1]
    if (!boundary) return ''
    for (const part of body.split(`--${boundary}`).slice(1)) {
      const cut = part.search(/\r?\n\r?\n/)
      if (cut < 0) continue
      const text = plainBody(part.slice(0, cut).replace(/^\r?\n/, ''), part.slice(cut).replace(/^\r?\n\r?\n/, ''))
      if (text) return text
    }
    return ''
  }
  return type.startsWith('text/plain') ? decodePart(body, h) : ''
}

// Header block of a raw message -> true if it's a Voice notification worth parsing.
export const isVoiceHead = (head) => isVoice(unfold(head).from)

// One raw message (latin1 text) -> an entry, or { skip }.
export function parseVoiceEmail(raw) {
  const cut = raw.search(/\r?\n\r?\n/)
  const head = cut < 0 ? raw : raw.slice(0, cut)
  const h = unfold(head)
  const item = { from: h.from, subject: decodeWords(h.subject), date: h.date, body: plainBody(head, cut < 0 ? '' : raw.slice(cut + 2)) }
  const ev = parseItem(item)
  if (ev.skip) return ev
  // Text emails: "<business number>.<their number>.<id>@txt…". The live sync only
  // knows today's number, so redo it with the old one too.
  const pair = String(item.from).match(/(\d{10,11})\.(\d{10,11})\.[^@\s]*@txt\.voice\.google\.com/i)
  if (pair) ev.phone = [e164(pair[1]), e164(pair[2])].find((p) => p && !ours(p)) ?? ''
  if (!ev.phone || ours(ev.phone)) return { skip: 'no-number' }
  const { kind, direction, at, phone } = ev
  const text = oldEmailText(ev.text)
  if (kind === 'text' && !text) return { skip: 'empty' }
  const data = { source: 'voice-email', kind, direction, at, phone }
  if (text) data.text = text
  return { id: voiceId({ kind, phone, at, text }), data }
}

// Boilerplate of older Voice emails (2012–2020) the live sync never sees.
export function oldEmailText(text) {
  const t = String(text ?? '')
    .replace(/\n?--\s*\nSent using SMS-to-email[\s\S]*$/i, '')
    .replace(/^Play message:.*$/gim, '')
    .replace(/^Transcript:\s*/i, '')
    .replace(/^(Unable to transcribe this message\.?|Transcript (?:is )?not available\.?)$/gim, '')
    .replace(/^MMS Received$/gim, '📷 Photo')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return t
}

// Email copies of events the Voice Takeout also has (same number and kind,
// within 3 minutes): keep the Takeout one (exact time, call length).
export function dropEmailCopies(entries) {
  const near = new Map()
  for (const e of entries) {
    if (e.data.source !== 'takeout') continue
    const k = `${e.data.phone}|${e.data.kind}`
    near.set(k, [...(near.get(k) ?? []), Date.parse(e.data.at)])
  }
  return entries.filter((e) => e.data.source !== 'voice-email'
    || !(near.get(`${e.data.phone}|${e.data.kind}`) ?? []).some((t) => Math.abs(t - Date.parse(e.data.at)) < 180_000))
}
