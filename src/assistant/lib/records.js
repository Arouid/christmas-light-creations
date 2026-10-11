// Ask Claude (docs/specs/ask-claude.md): where a record the answer cites
// opens in the staff app, and how it's labelled. Pure; tested in
// tests/askClaude.test.mjs. Claude never writes links: it names { type, id }
// and the browser builds the hash here.

export const RECORD_ICON = { customer: '👤', lead: '📥', invoice: '🧾', route: '🚚' }

export function recordLink(r) {
  const id = encodeURIComponent(r?.id ?? '')
  switch (r?.type) {
    case 'customer': return `#accounts/customer/${id}`
    case 'lead': return `#accounts/lead/${id}`
    case 'invoice': return '#invoices'
    case 'route': return `#route-${id}`
    default: return ''
  }
}

export const recordLabel = (r) => `${RECORD_ICON[r?.type] ?? ''} ${r?.label || r?.id || ''}`.trim()

// Panel transcript -> the last turns the server accepts ({ role, text }).
export const historyFor = (turns, max = 6) => turns.filter((t) => t.role === 'user' || (t.role === 'assistant' && t.answer))
  .map((t) => ({ role: t.role, text: t.role === 'user' ? t.text : t.answer })).slice(-max)

// "- item" lines become list items (also right after a line of text); blank
// lines split paragraphs.
export function answerBlocks(text) {
  const blocks = []
  const bullet = /^[-•*]\s+/
  for (const para of String(text ?? '').split(/\n\s*\n/)) {
    let plain = []
    const flush = () => { if (plain.length) { blocks.push({ type: 'p', text: plain.join(' ') }); plain = [] } }
    for (const line of para.split('\n').map((l) => l.trim()).filter(Boolean)) {
      if (bullet.test(line)) {
        flush()
        const last = blocks.at(-1)
        if (last?.type === 'list' && last.open) last.items.push(line.replace(bullet, ''))
        else blocks.push({ type: 'list', items: [line.replace(bullet, '')], open: true })
      } else {
        if (blocks.at(-1)?.open) delete blocks.at(-1).open
        plain.push(line)
      }
    }
    flush()
    if (blocks.at(-1)?.open) delete blocks.at(-1).open
  }
  return blocks
}
