// A small Markdown reader for the staff app's Reports (docs/specs/reports.md):
// the repo's own docs, read at build time, turned into blocks and inline parts
// that src/leads/reports/Markdown.jsx draws as React elements. Never HTML, so
// nothing in a doc can run or style itself on the page. Pure.
//
// Blocks: { type: 'h', level, text } · { type: 'p', text } · { type: 'list',
// ordered, start, items: [{ text, depth }] } · { type: 'table', head, rows } ·
// { type: 'quote', text } · { type: 'code', text } · { type: 'hr' }.

const TABLE = /^\s*\|/
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const FENCE = /^\s*```/

// Table cells; "\|" is a pipe inside a cell, not a border.
export function cellsOf(line) {
  const cells = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/)
  return cells.map((c) => c.trim().replace(/\\\|/g, '|'))
}
const isSeparator = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)

export function parseMarkdown(md) {
  const lines = String(md ?? '').replace(/\r/g, '').split('\n')
  const blocks = []
  let para = []
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') })
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (FENCE.test(line)) {
      flush()
      const code = []
      for (i++; i < lines.length && !FENCE.test(lines[i]); i++) code.push(lines[i])
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (h) { flush(); blocks.push({ type: 'h', level: h[1].length, text: h[2] }); continue }
    if (!line.trim()) { flush(); continue }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); blocks.push({ type: 'hr' }); continue }
    if (TABLE.test(line)) {
      flush()
      const raw = []
      for (; i < lines.length && TABLE.test(lines[i]); i++) raw.push(lines[i])
      i--
      // A header row is the one above the |---| line; without that line, every row is data.
      const hasHead = raw.length > 1 && isSeparator(raw[1])
      const rows = raw.filter((l) => !isSeparator(l)).map(cellsOf)
      blocks.push({ type: 'table', head: hasHead ? rows.shift() : [], rows })
      continue
    }
    if (/^\s*>/.test(line)) {
      flush()
      const quote = []
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) quote.push(lines[i].replace(/^\s*>\s?/, ''))
      i--
      blocks.push({ type: 'quote', text: quote.join('\n').trim() })
      continue
    }
    const first = ITEM.exec(line)
    if (first) {
      flush()
      const ordered = /\d/.test(first[2])
      const items = []
      for (; i < lines.length; i++) {
        const m = ITEM.exec(lines[i])
        if (m) { items.push({ text: m[3].trim(), depth: m[1].length >= 2 ? 1 : 0 }); continue }
        // An indented line carries on the item above it; anything else ends the list.
        if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) { items.at(-1).text += ` ${lines[i].trim()}`; continue }
        break
      }
      i--
      blocks.push({ type: 'list', ordered, start: ordered ? Number.parseInt(first[2], 10) : 1, items })
      continue
    }
    para.push(line.trim())
  }
  flush()
  return blocks
}

// Inline marks -> parts: { kind: 'text' | 'code', text } · { kind: 'strong' |
// 'em' | 'del', parts } · { kind: 'link', href, parts }. Bare https:// addresses
// become links too.
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|~~(.+?)~~|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\w*\\])\*(?!\s)([^*]+?)(?<!\s)\*(?![\w*])|(https?:\/\/[^\s)<>|]*[^\s)<>|.,;:!?'"”’])/g

const unescape = (s) => s.replace(/\\([\\`*_{}[\]()#+\-.!|~>])/g, '$1')

export function inlineParts(text) {
  const out = []
  const s = String(text ?? '')
  let last = 0
  for (const m of s.matchAll(INLINE)) {
    if (m.index > last) out.push({ kind: 'text', text: unescape(s.slice(last, m.index)) })
    if (m[1] != null) out.push({ kind: 'code', text: m[1] })
    else if (m[2] != null) out.push({ kind: 'strong', parts: inlineParts(m[2]) })
    else if (m[3] != null) out.push({ kind: 'del', parts: inlineParts(m[3]) })
    else if (m[4] != null) out.push({ kind: 'link', href: m[5], parts: inlineParts(m[4]) })
    else if (m[6] != null) out.push({ kind: 'em', parts: inlineParts(m[6]) })
    else out.push({ kind: 'link', href: m[7], parts: [{ kind: 'text', text: m[7] }] })
    last = m.index + m[0].length
  }
  if (last < s.length) out.push({ kind: 'text', text: unescape(s.slice(last)) })
  return out
}

// The words alone (for search, titles, tests).
export const partsText = (parts) => parts.map((p) => (p.parts ? partsText(p.parts) : p.text)).join('')

// Where a link goes: 'web' (https, mailto, tel: a new tab or the app), 'site'
// (a path on christmas-light-creations.com) or 'file' (a repo file: words only).
export function linkKind(href) {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return 'web'
  if (/^\/(?!\/)/.test(href)) return 'site'
  return 'file'
}

// The blocks under a heading whose words start with `title` (case-insensitive),
// up to the next heading of the same or a higher level. [] when it's not there.
export function sectionOf(blocks, title, { withHeading = false } = {}) {
  const want = title.toLowerCase()
  const at = blocks.findIndex((b) => b.type === 'h' && b.text.toLowerCase().startsWith(want))
  if (at < 0) return []
  const { level } = blocks[at]
  const end = blocks.findIndex((b, i) => i > at && b.type === 'h' && b.level <= level)
  return blocks.slice(withHeading ? at : at + 1, end < 0 ? undefined : end)
}

// The blocks with the named sections left out (each from its heading to the
// next heading of the same or a higher level).
export function withoutSections(blocks, titles = []) {
  const want = titles.map((t) => t.toLowerCase())
  const out = []
  let cut = 0 // the level being skipped, 0 when keeping
  for (const b of blocks) {
    if (b.type === 'h' && cut && b.level <= cut) cut = 0
    if (!cut && b.type === 'h' && want.some((t) => b.text.toLowerCase().startsWith(t))) cut = b.level
    if (!cut) out.push(b)
  }
  return out
}

// Every table row whose first cell is an id ("79", "N", "158"), across all of a
// doc's tables (docs/TODO.md, docs/test-checklist.md): id -> { id, head,
// cells, section } where section is the nearest ## heading above it.
export function rowsById(blocks) {
  const rows = new Map()
  let section = ''
  for (const b of blocks) {
    if (b.type === 'h' && b.level <= 2) section = b.text
    if (b.type !== 'table') continue
    for (const cells of b.rows) {
      const id = cells[0]?.replace(/\*/g, '').trim()
      if (id && /^(\d+|[A-Z]{1,2})$/.test(id) && !rows.has(id)) rows.set(id, { id, head: b.head, cells, section })
    }
  }
  return rows
}
