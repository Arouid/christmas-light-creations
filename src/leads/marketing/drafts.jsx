import { useState } from 'react'
import { photosIn, sectionMeta } from '../../lib/marketingDocs'

const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15'
const photoUrl = (file) => `${import.meta.env.BASE_URL}images/gallery/${file}`

// Copy to the clipboard; where the browser refuses, select the text so a long-press copies it.
function CopyButton({ text, label = 'Copy' }) {
  const [state, setState] = useState('')
  async function copy(e) {
    const box = e.currentTarget.closest('[data-copy]') // read before the await: the event lets go of it after
    try {
      await navigator.clipboard.writeText(text)
      setState('Copied ✓')
    } catch {
      const pre = box?.querySelector('pre')
      if (pre) { const r = document.createRange(); r.selectNodeContents(pre); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r) }
      setState('Selected: copy it')
    }
    setTimeout(() => setState(''), 2500)
  }
  return <button type="button" onClick={copy} className={btn}>{state || `📋 ${label}`}</button>
}

// One draft: when and where it goes, the photo, then each piece to paste with its own Copy button.
export function DraftSection({ doc, section }) {
  const meta = sectionMeta(doc, section)
  const photos = [...new Set([...photosIn(meta.map(([, v]) => v).join(' ')), ...section.blocks.flatMap((b) => photosIn(b.text))])]
  const rows = section.blocks.filter((b) => b.kind === 'row')
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-night-950/60 p-3">
      <p className="font-semibold">{section.num != null ? `${section.num} · ` : ''}{section.title}</p>
      {meta.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {meta.map(([k, v]) => [<dt key={`${k}-t`} className="text-slate-400">{k}</dt>, <dd key={`${k}-d`} className="m-0 break-words">{v}</dd>])}
        </dl>
      )}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((f) => (
            <a key={f} href={photoUrl(f)} target="_blank" rel="noreferrer" className="block w-32" title="Open the full photo to save it">
              <img src={photoUrl(f)} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-lg bg-white/5 object-cover" onError={(e) => { e.currentTarget.parentElement.hidden = true }} />
              <span className="mt-1 block truncate text-[12px] text-slate-400">{f}</span>
            </a>
          ))}
        </div>
      )}
      {section.blocks.map((b, i) => {
        if (b.kind === 'note') return <p key={i} className="text-xs text-slate-400">{b.text}</p>
        if (b.kind === 'copy') {
          return (
            <div key={i} data-copy className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-glow-300/80">{b.label}</p>
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-white/5 p-2 font-sans text-sm">{b.text}</pre>
              <CopyButton text={b.text} />
            </div>
          )
        }
        return null
      })}
      {rows.length > 0 && (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li key={i} data-copy className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-sm">
              <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-sans">{r.text}</pre>
              <span className="text-xs text-slate-400">{r.cells.slice(1).filter((c) => c !== r.text).join(' · ')}</span>
              <CopyButton text={r.text} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
