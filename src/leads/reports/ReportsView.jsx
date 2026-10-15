import { useEffect, useMemo, useState } from 'react'
import { ELSEWHERE, REPORTS, reportById, reportFromHash } from '../../data/reports'
import { withoutSections } from '../../lib/markdown'
import { WINBACK_GROUPS, winbackStats } from '../../lib/pastStates'
import { mergeTemplates } from '../../lib/emailTemplates'
import { fillTemplate } from '../../lib/messages'
import Markdown, { Inline } from './Markdown'
import { CHECKLIST_ROWS, DOC_BLOCKS, TODO_ROWS } from './docs'

// 📊 Reports (docs/specs/reports.md): the reports Claude used to write as
// claude.ai pages, drawn from the repo's own docs at build time plus the live
// lists the app already reads, so they never go stale. Read-only.

const card = 'space-y-3 rounded-2xl border border-white/10 bg-night-900 p-4'
const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15'

export default function ReportsView({ requests, pastError, customers, season, settings }) {
  const [id, setId] = useState(() => reportFromHash(window.location.hash))
  useEffect(() => {
    const onHash = () => { setId(reportFromHash(window.location.hash)); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const report = reportById(id)
  if (!report) return <ReportList />
  return (
    <div className="space-y-4">
      <a href="#reports" className={btn}>← All reports</a>
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-300/80">Report</p>
        <h2 className="font-display text-3xl font-extrabold">{report.title}</h2>
        <p className="text-sm text-slate-400">{report.blurb}</p>
        <p className="text-xs text-slate-500">Drawn from {[...report.sources, ...report.docs.map((d) => d.path)].join(' · ')}. Every push redraws it.</p>
      </header>
      {report.links?.length > 0 && (
        <div className="flex flex-wrap gap-2">{report.links.map(([href, label]) => <a key={href} href={href} className={btn}>{label}</a>)}</div>
      )}
      {report.live === 'winback' && <WinbackLive requests={requests} error={pastError} customers={customers} season={season} settings={settings} />}
      {report.todo && <TodoItems ids={report.todo} />}
      {report.checklist && <Checks ids={report.checklist} />}
      {report.pictures && (
        <p className="text-sm text-slate-400">Before and after pictures of the same spots (Oct 14): <a href={report.pictures} target="_blank" rel="noopener noreferrer" className="text-glow-300 underline">on claude.ai</a></p>
      )}
      {report.docs.map((d) => <DocPart key={d.path} doc={d} />)}
    </div>
  )
}

function ReportList() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-300/80">Always current</p>
        <h2 className="font-display text-3xl font-extrabold">Reports</h2>
        <p className="text-sm text-slate-400">The plans and reviews Claude wrote for Scott, drawn from the same files and lists the app uses, so they change when the work does. Nothing here sends or changes anything.</p>
      </header>
      <ul className="space-y-2">
        {REPORTS.map((r) => (
          <li key={r.id}>
            <a href={`#reports/${r.id}`} className="block min-h-11 rounded-2xl border border-white/10 bg-night-900 p-4 hover:border-glow-400/50">
              <span className="font-display text-xl font-extrabold">{r.title}</span>
              <span className="mt-1 block text-sm text-slate-400">{r.blurb}</span>
            </a>
          </li>
        ))}
      </ul>
      <section className={card} aria-labelledby="rp-elsewhere">
        <h3 id="rp-elsewhere" className="font-semibold">Already in the app</h3>
        <ul className="space-y-1 text-sm text-slate-300">
          {ELSEWHERE.map(([what, where, href]) => (
            <li key={what}>{what}: {href ? <a href={`#${href}`} className="text-glow-300 underline">{where}</a> : where}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// One Markdown file, folded under its own title (the doc's # heading).
function DocPart({ doc }) {
  const blocks = DOC_BLOCKS[doc.path] ?? []
  const [first, ...rest] = blocks
  const title = first?.type === 'h' && first.level === 1 ? first.text : doc.path
  const body = withoutSections(first?.type === 'h' && first.level === 1 ? rest : blocks, doc.skip)
  return (
    <details open={doc.open} className="group rounded-2xl border border-white/10 bg-night-900">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-4 font-display text-lg font-extrabold">
        <span><Inline text={title} /></span>
        <span aria-hidden="true" className="text-slate-400 motion-safe:transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-white/10 p-4">
        <Markdown blocks={body} />
        <p className="mt-4 text-xs text-slate-500">From {doc.path}{doc.skip?.length ? ` (without ${doc.skip.join(', ')})` : ''}</p>
      </div>
    </details>
  )
}

// Rows of docs/TODO.md by id; a finished one is gone from the file.
function TodoItems({ ids }) {
  return (
    <section className={card} aria-labelledby="rp-todo">
      <h3 id="rp-todo" className="font-display text-xl font-extrabold">Still to do</h3>
      <ul className="space-y-3">
        {ids.map((id) => {
          const row = TODO_ROWS.get(id)
          return (
            <li key={id} className="space-y-1 rounded-xl border border-white/10 bg-night-950/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-glow-300">TODO {id}{row?.cells[2] ? ` · ${row.cells[2]}` : ''}</p>
              {row
                ? <p className="text-sm leading-relaxed text-slate-300"><Inline text={row.cells[1]} /></p>
                : <p className="text-sm text-pine-500">Done: no longer in docs/TODO.md.</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const statusTone = (s) => (/^(not checked|ready)/i.test(s) ? 'bg-glow-400/15 text-glow-300' : /(done|passed|checked|✅|works)/i.test(s) ? 'bg-pine-500/20 text-slate-100' : 'bg-white/10 text-slate-300')

// Rows of docs/test-checklist.md by number: the live checks still waiting.
function Checks({ ids }) {
  return (
    <section className={card} aria-labelledby="rp-checks">
      <h3 id="rp-checks" className="font-display text-xl font-extrabold">Live checks</h3>
      <p className="text-sm text-slate-400">From the test checklist: what someone still has to look at on a real phone or the live site.</p>
      <ul className="space-y-3">
        {ids.map((n) => {
          const row = CHECKLIST_ROWS.get(n)
          if (!row) return <li key={n} className="text-sm text-pine-500">#{n}: checked and moved to the verified log.</li>
          const [, check, expected, status = ''] = row.cells
          return (
            <li key={n} className="space-y-1.5 rounded-xl border border-white/10 bg-night-950/60 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">#{n}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(status)}`}><Inline text={status || 'Not checked'} /></span>
              </div>
              <p className="leading-relaxed text-slate-300"><Inline text={check} /></p>
              <p className="leading-relaxed text-slate-400"><span className="font-semibold text-slate-300">Expected: </span><Inline text={expected} /></p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// The win-back's emails, filled in for a made-up Pat the way the queue fills them.
const EMAILS = [
  ['comeback', 'Former customers', {}],
  ['winback', 'Recent requests', { lastAsked: '2022-10-01' }],
  ['winback-older', 'Older requests (November, on Scott’s go)', { lastAsked: '2018-10-01' }],
  ['winback-last', 'The follow-up, 5+ days after the first', { lastAsked: '2022-10-01' }],
]
const COLS = [['people', 'People'], ['ready', 'Ready to email'], ['emailed', 'Emailed'], ['interested', 'Interested'], ['booked', 'Estimate booked'], ['noThanks', 'No thanks'], ['customers', 'Now customers']]

function WinbackLive({ requests, error, customers, season, settings }) {
  const stats = useMemo(() => (requests && customers ? winbackStats(requests, customers, season) : null), [requests, customers, season])
  const templates = useMemo(() => mergeTemplates(settings?.emailTemplates ?? []), [settings?.emailTemplates])
  return (
    <>
      <section className={card} aria-labelledby="rp-counts">
        <h3 id="rp-counts" className="font-display text-xl font-extrabold">Right now</h3>
        {error && <p role="alert" className="text-sm text-berry-300">Can’t read the old-site list ({String(error)}). The plan and the emails below are still current.</p>}
        {!error && !stats && <p className="text-sm text-slate-400">Loading the old-site list…</p>}
        {stats && (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[40rem] text-left text-sm tabular-nums">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                  <tr><th scope="col" className="px-3 py-2">Group</th>{COLS.map(([k, label]) => <th key={k} scope="col" className="px-3 py-2 text-right">{label}</th>)}</tr>
                </thead>
                <tbody>
                  {WINBACK_GROUPS.map(([k, label, note]) => (
                    <tr key={k} className="border-t border-white/10 align-top">
                      <th scope="row" className="min-w-44 px-3 py-2 font-semibold">{label}<span className="block text-xs font-normal text-slate-400">{note}</span></th>
                      {COLS.map(([c]) => <td key={c} className="px-3 py-2 text-right text-slate-300">{stats.by[k][c]}</td>)}
                    </tr>
                  ))}
                  <tr className="border-t border-white/20 font-semibold">
                    <th scope="row" className="px-3 py-2">All</th>
                    {COLS.map(([c]) => <td key={c} className="px-3 py-2 text-right">{stats.total[c]}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">Counted the way Old-site requests counts: “Ready to email” is To contact with an email and not outside our area (what ✉ Email these sends); “Emailed” is anyone emailed from the list this {season} season. Answers are the statuses staff set.</p>
          </>
        )}
      </section>
      <section className={card} aria-labelledby="rp-emails">
        <h3 id="rp-emails" className="font-display text-xl font-extrabold">The four emails, as they go out today</h3>
        <p className="text-sm text-slate-400">For a made-up Pat, signed by whoever sends. The 10% line shows through October 31 and drops out by itself after.</p>
        {EMAILS.map(([tid, who, extra]) => {
          const t = templates.find((x) => x.id === tid)
          if (!t) return null
          const pat = { firstName: 'Pat', fullName: 'Pat Sample', ...extra }
          return (
            <article key={tid} className="space-y-2 rounded-xl border border-white/10 bg-night-950/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-glow-300">{who}{t.edited ? ' · edited in the Emails tab' : ''}</p>
              <p className="font-semibold">{t.label}</p>
              <p className="border-b border-dashed border-white/15 pb-2 text-sm"><span className="text-slate-400">Subject </span>{fillTemplate(t.subject, pat, season)}</p>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-200">{fillTemplate(t.body, pat, season)}</pre>
            </article>
          )
        })}
      </section>
    </>
  )
}
