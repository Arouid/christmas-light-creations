// Reads the season's marketing drafts (docs/marketing/*.md, written with the
// marketing plugin on 2026-10-14) into what the staff app's Marketing section
// shows, so the files stay the one place the words live. Pure, so
// tests/marketing.test.mjs can run it on the real files.
//
// A doc: "# Title", an intro (notes and an overview table whose first column is
// the draft's number), then "## 1 · Title" sections. In a section, paste-ready
// text is a quote block (> …), a code block, or a labeled line such as
// **Subject:** / **Offer title:** / **Terms:** / **Nextdoor:**; table rows are
// short items (headlines, sitelinks); anything else is a note.

const COPY_LABELS = ['Subject', 'Offer title', 'Terms', 'Nextdoor']

// Markdown marks off, links as their words: notes are shown as plain text.
export function plainText(s) {
  return String(s ?? '')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

const cellsOf = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => plainText(c))
const isSeparator = (line) => /^\|?\s*:?-{2,}/.test(line.trim())
// A row's main text: the second cell when the first is a short id (H1, D2, 3), else the first;
// a trailing character count "(28)" is dropped.
const mainOf = (cells) => (/^[A-Z]?\d+$/.test(cells[0] ?? '') && cells[1] ? cells[1] : cells[0] ?? '').replace(/\s*\(\d+\)\s*$/, '')

// Photo file names mentioned in a text (the gallery's 1600 px copies).
export const photosIn = (text) => [...new Set(String(text ?? '').match(/[a-z0-9][a-z0-9-]*\.jpe?g/gi) ?? [])]

export function parseDraftDoc(md) {
  const doc = { title: '', intro: [], headers: [], rows: {}, sections: [] }
  let cur = null
  let quote = []
  let code = null
  let tableHeader = null
  const target = () => (cur ? cur.blocks : doc.intro)
  const flushQuote = () => {
    if (!quote.length) return
    const text = quote.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    if (text) target().push({ kind: 'copy', label: 'Text to paste', text })
    quote = []
  }

  for (const line of String(md ?? '').replace(/\r/g, '').split('\n')) {
    if (code) {
      if (/^```/.test(line)) { target().push({ kind: 'copy', label: 'Text to paste', text: code.join('\n').trim() }); code = null }
      else code.push(line)
      continue
    }
    if (/^```/.test(line)) { flushQuote(); code = []; continue }
    if (/^#\s/.test(line)) { doc.title = plainText(line.slice(2)); continue }
    const h = /^##\s+(?:(\d+)\s*·\s*)?(.+)$/.exec(line)
    if (h) {
      flushQuote()
      tableHeader = null
      cur = { num: h[1] ? Number(h[1]) : null, title: plainText(h[2]), blocks: [] }
      doc.sections.push(cur)
      continue
    }
    if (/^>/.test(line)) { quote.push(line.replace(/^>\s?/, '')); continue }
    flushQuote()
    if (/^\s*\|/.test(line)) {
      if (isSeparator(line)) continue
      const cells = cellsOf(line)
      if (!tableHeader) { tableHeader = cells; if (!cur) doc.headers = cells; continue }
      if (!cur && /^\d+$/.test(cells[0])) doc.rows[Number(cells[0])] = cells
      else if (cur) cur.blocks.push({ kind: 'row', cells, text: mainOf(cells) })
      continue
    }
    tableHeader = null
    const labeled = /^\*\*([^*:]+):\*\*\s*(.*)$/.exec(line.trim())
    if (labeled && cur && COPY_LABELS.includes(labeled[1])) {
      target().push({ kind: 'copy', label: labeled[1], text: plainText(labeled[2]) })
      continue
    }
    const text = plainText(line)
    if (text && text !== '---') target().push({ kind: 'note', text })
    // A sentence listing three or more `items` (negative keywords, URL exclusions): also a list to paste.
    const items = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1])
    if (cur && items.length >= 3) target().push({ kind: 'copy', label: 'List to paste', text: items.join('\n') })
  }
  flushQuote()
  if (code) target().push({ kind: 'copy', label: 'Text to paste', text: code.join('\n').trim() })
  return doc
}

// The overview table's row for a numbered section, as [heading, value] pairs.
export function sectionMeta(doc, section) {
  const row = section?.num != null ? doc.rows[section.num] : null
  if (!row) return []
  return doc.headers.map((h, i) => [h, row[i] ?? '']).filter(([h, v], i) => i > 0 && h && v)
}

// A task's draft: { num } for "## 3 · …", { title } for a section whose title starts with it.
export function findSection(doc, ref) {
  if (!doc || !ref) return null
  if (ref.num != null) return doc.sections.find((s) => s.num === ref.num) ?? null
  if (ref.title) return doc.sections.find((s) => s.title.toLowerCase().startsWith(ref.title.toLowerCase())) ?? null
  return null
}
