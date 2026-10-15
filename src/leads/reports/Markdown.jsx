import { inlineParts, linkKind } from '../../lib/markdown'

// Draws src/lib/markdown.js blocks as React elements (never HTML). Tables
// scroll sideways inside their own box, so the page never does at 375 px.

const linkClass = 'text-glow-300 underline underline-offset-2 [overflow-wrap:anywhere] hover:text-glow-400'

function parts(list) {
  return list.map((p, i) => {
    if (p.kind === 'text') return p.text
    if (p.kind === 'code') return <code key={i} className="rounded bg-white/10 px-1 py-0.5 text-[0.85em] [overflow-wrap:anywhere]">{p.text}</code>
    if (p.kind === 'strong') return <strong key={i} className="font-semibold text-slate-50">{parts(p.parts)}</strong>
    if (p.kind === 'em') return <em key={i}>{parts(p.parts)}</em>
    if (p.kind === 'del') return <del key={i} className="text-slate-500">{parts(p.parts)}</del>
    // A link: the web in a new tab, a site page on the site, a repo file as its words.
    const kind = linkKind(p.href)
    if (kind === 'file') return <span key={i}>{parts(p.parts)}</span>
    return <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{parts(p.parts)}</a>
  })
}

export function Inline({ text }) {
  return <>{parts(inlineParts(text))}</>
}

// Wider tables get a minimum width and scroll inside their box on a phone.
const MIN_W = { 2: '', 3: 'min-w-[30rem]', 4: 'min-w-[40rem]', 5: 'min-w-[46rem]' }

function Table({ head, rows }) {
  const cols = Math.max(head.length, ...rows.map((r) => r.length))
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className={`w-full text-left text-sm ${MIN_W[Math.min(cols, 5)] ?? ''}`}>
        {head.length > 0 && (
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>{head.map((h, i) => <th key={i} scope="col" className="px-3 py-2 font-semibold"><Inline text={h} /></th>)}</tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-white/10 align-top">
              {r.map((c, j) => <td key={j} className="px-3 py-2 text-slate-300"><Inline text={c} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const HEADING = {
  1: 'font-display text-xl font-extrabold',
  2: 'pt-2 font-display text-lg font-extrabold',
  3: 'pt-1 font-semibold text-slate-100',
}

export default function Markdown({ blocks }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.type === 'h') {
          const Tag = `h${Math.min(b.level + 2, 6)}`
          return <Tag key={i} className={HEADING[b.level] ?? HEADING[3]}><Inline text={b.text} /></Tag>
        }
        if (b.type === 'p') return <p key={i} className="text-sm leading-relaxed text-slate-300"><Inline text={b.text} /></p>
        if (b.type === 'list') {
          const List = b.ordered ? 'ol' : 'ul'
          return (
            <List key={i} start={b.ordered ? b.start : undefined} className={`space-y-1.5 pl-5 text-sm leading-relaxed text-slate-300 ${b.ordered ? 'list-decimal' : 'list-disc'}`}>
              {b.items.map((it, j) => <li key={j} className={it.depth ? 'ml-4' : ''}><Inline text={it.text} /></li>)}
            </List>
          )
        }
        if (b.type === 'table') return <Table key={i} head={b.head} rows={b.rows} />
        if (b.type === 'quote') return <blockquote key={i} className="whitespace-pre-wrap border-l-2 border-glow-400/50 pl-3 text-sm text-slate-200"><Inline text={b.text} /></blockquote>
        if (b.type === 'code') return <pre key={i} className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-night-950 p-3 text-xs text-slate-200">{b.text}</pre>
        return <hr key={i} className="border-white/10" />
      })}
    </div>
  )
}
