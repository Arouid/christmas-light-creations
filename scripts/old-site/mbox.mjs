// Gmail Takeout .mbox reading: stream messages, decode MIME bodies and headers.
// Used by voice-history.mjs and win-back.mjs. Messages are raw latin1 text
// (bytes as characters) until decoded here.
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

export function unfold(head) {
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
// First body of the given type ('text/plain' or 'text/html').
function bodyOf(head, body, want) {
  const h = unfold(head)
  const type = (h['content-type'] ?? 'text/plain').toLowerCase()
  if (type.startsWith('multipart/')) {
    const boundary = h['content-type'].match(/boundary="?([^";]+)"?/i)?.[1]
    if (!boundary) return ''
    for (const part of body.split(`--${boundary}`).slice(1)) {
      const cut = part.search(/\r?\n\r?\n/)
      if (cut < 0) continue
      const text = bodyOf(part.slice(0, cut).replace(/^\r?\n/, ''), part.slice(cut).replace(/^\r?\n\r?\n/, ''), want)
      if (text) return text
    }
    return ''
  }
  return type.startsWith(want) ? decodePart(body, h) : ''
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, n) => ENTITIES[n] ?? m)
    .replace(/[  ]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Raw message -> { h (headers), from, to, subject, date, text (plain, or HTML as text) }.
export function readEmail(raw) {
  const cut = raw.search(/\r?\n\r?\n/)
  const head = cut < 0 ? raw : raw.slice(0, cut)
  const body = cut < 0 ? '' : raw.slice(cut).replace(/^\r?\n\r?\n/, '')
  const h = unfold(head)
  const text = bodyOf(head, body, 'text/plain') || htmlToText(bodyOf(head, body, 'text/html'))
  return { h, head, from: decodeWords(h.from), to: decodeWords(h.to), subject: decodeWords(h.subject), date: h.date, text }
}

// Streams an mbox. `want(head)` decides from the header block whether to keep
// the body; `onMessage(raw)` gets each wanted message.
export async function streamMbox(path, want, onMessage) {
  const rl = createInterface({ input: createReadStream(path, 'latin1'), crlfDelay: Infinity })
  let lines = []
  let inHead = true
  let wanted = false
  const flush = () => { if (wanted && lines.length) onMessage(lines.join('\n')) }
  for await (const line of rl) {
    if (/^From \S+@xxx /.test(line)) {
      flush()
      lines = []; inHead = true; wanted = false
      continue
    }
    if (inHead) {
      lines.push(line)
      if (line === '') { inHead = false; wanted = want(lines.join('\n')); if (!wanted) lines = [] }
    } else if (wanted) lines.push(line.startsWith('>From ') ? line.slice(1) : line)
  }
  flush()
}
