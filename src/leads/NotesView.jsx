import { useState } from 'react'
import { staffName } from '../lib/activity'
import { TEXT_MAX, TITLE_MAX, noteRecord, searchNotes, splitNotes, whenText } from '../lib/notes'

// Notes (src/lib/notes.js, owner 2026-10-13): each person's own notes,
// private unless "Share with the team" is on; shared ones show to everyone
// under the writer's name, read-only. Rules in firestore.rules.
const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const btn = 'min-h-11 rounded-full px-4 text-sm font-semibold'

function Editor({ note, email, onSave, onRemove, onClose }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [text, setText] = useState(note?.text ?? '')
  const [shared, setShared] = useState(Boolean(note?.shared))
  const [state, setState] = useState(null) // null | 'saving' | { error }
  const [confirm, setConfirm] = useState(false)
  async function save(e) {
    e.preventDefault()
    const r = noteRecord({ title, text, shared }, email)
    if (r.problem) return setState({ error: r.problem })
    setState('saving')
    try {
      await onSave(note?.id, r.record)
      onClose()
    } catch (err) {
      setState({ error: /permission/i.test(err?.message ?? '') ? 'Not saved: the database rules for notes aren’t published yet (Scott).' : (err?.message || 'That didn’t save. Try again.') })
    }
  }
  return (
    <form onSubmit={save} className="space-y-3 rounded-3xl border border-glow-400/40 bg-night-900 p-4">
      <label className="block text-sm text-slate-400">Title
        <input value={title} maxLength={TITLE_MAX} onChange={(e) => { setTitle(e.target.value); setState(null) }} placeholder="Optional: the first line is used" className={field} />
      </label>
      <label className="block text-sm text-slate-400">Note
        <textarea value={text} rows={8} maxLength={TEXT_MAX} onChange={(e) => { setText(e.target.value); setState(null) }} className={field} autoFocus />
      </label>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-slate-200">
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="mt-1 size-5 accent-glow-400" />
        <span><span className="font-semibold">Share with the team</span><span className="block text-slate-400">Scott, Lacie and Katie see it under your name. Off = only you.</span></span>
      </label>
      {state?.error && <p className="text-sm text-berry-500" role="alert">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={state === 'saving'} className={`${btn} bg-glow-400 text-night-950 disabled:opacity-50`}>{state === 'saving' ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onClose} className={`${btn} border border-white/20`}>Cancel</button>
        {note?.id && !confirm && <button type="button" onClick={() => setConfirm(true)} className={`${btn} ml-auto text-berry-500`}>Delete</button>}
        {note?.id && confirm && <button type="button" onClick={() => onRemove(note.id).then(onClose)} className={`${btn} ml-auto bg-berry-600 text-white`}>Delete for good</button>}
      </div>
    </form>
  )
}

function NoteCard({ n, mine, onOpen }) {
  const body = (
    <>
      <p className="flex flex-wrap items-center gap-2 font-semibold">{n.title || 'Untitled'}{n.shared && <span className="rounded-full bg-glow-400/20 px-2 py-0.5 text-[11px] font-semibold text-glow-300">Shared</span>}</p>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-300">{n.text}</p>
      <p className="mt-1 text-xs text-slate-500">{whenText(n.updatedAt ?? n.createdAt)}</p>
    </>
  )
  if (mine) return <button type="button" onClick={() => onOpen(n)} className="block w-full rounded-2xl border border-white/10 bg-night-900 p-4 text-left hover:border-glow-400/50">{body}</button>
  return <div className="rounded-2xl border border-white/10 bg-night-900 p-4">{body}</div>
}

export default function NotesView({ mine, shared, email, names, onAdd, onSave, onRemove }) {
  const [editing, setEditing] = useState(null) // null | {} (new) | note
  const [q, setQ] = useState('')
  const split = splitNotes(mine ?? [], shared ?? [], email)
  const myList = searchNotes(split.mine, q)
  const loading = mine === null || shared === null
  const save = (id, record) => (id ? onSave(id, record) : onAdd(record))
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Notes</h2>
          <p className="text-sm text-slate-400">Yours are private. Tick “Share with the team” and Scott sees it.</p>
        </div>
        {!editing && <button type="button" onClick={() => setEditing({})} className={`${btn} bg-glow-400 text-night-950`}>＋ New note</button>}
      </div>
      {editing && <Editor note={editing.id ? editing : null} email={email} onSave={save} onRemove={onRemove} onClose={() => setEditing(null)} />}
      {split.mine.length > 3 && <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my notes" aria-label="Search my notes" className={field} />}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">My notes</h3>
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && !split.mine.length && <p className="text-sm text-slate-400">Nothing yet. Tap ＋ New note: a thought, a customer’s quirk, a question for Scott.</p>}
        {myList.map((n) => <NoteCard key={n.id} n={n} mine onOpen={setEditing} />)}
        {!myList.length && split.mine.length > 0 && <p className="text-sm text-slate-400">No note matches.</p>}
      </section>
      {split.fromOthers.map(([who, notes]) => (
        <section key={who} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">From {staffName(who, names)}</h3>
          {notes.map((n) => <NoteCard key={n.id} n={n} />)}
        </section>
      ))}
    </div>
  )
}
