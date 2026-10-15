import { useState } from 'react'
import { ALL_LINKS, LINK_GROUPS, LOGIN_MAX, cleanLogins, editable, loginDraft, loginFor, loginHint } from '../../data/staffLinks'

// Reports → Links (docs/specs/staff-links.md): every service staff may need,
// what it's for, and the login it belongs to. The list is src/data/staffLinks.js;
// the logins are settings/app.logins (the repo is public), filled in here.
const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const btn = 'min-h-11 rounded-full px-4 text-sm font-semibold disabled:opacity-50'

function LinkCard({ link, settings, editing, value, onChange }) {
  const login = loginFor(link, settings)
  return (
    <li className="rounded-2xl border border-white/10 bg-night-900 p-4">
      {link.url
        ? <a href={link.url} target="_blank" rel="noopener noreferrer" className="-mt-2 flex min-h-11 items-center gap-1.5 font-semibold text-glow-300 underline underline-offset-2 hover:text-glow-400">{link.name}<span aria-hidden="true">↗</span></a>
        : <p className="-mt-2 flex min-h-11 items-center font-semibold text-slate-100">{link.name}</p>}
      <p className="text-sm text-slate-300">{link.what}</p>
      {link.where && <p className="mt-1 text-sm text-slate-400">{link.where}</p>}
      {link.note && <p className="mt-1 text-xs text-slate-500">{link.note}</p>}
      {editing && editable(link)
        ? (
          <label className="mt-2 block text-sm text-slate-400">Login
            <input value={value} maxLength={LOGIN_MAX} onChange={(e) => onChange(link.id, e.target.value)} placeholder={loginHint(link, settings)}
              autoComplete="off" autoCapitalize="none" spellCheck={false} className={field} />
          </label>
        )
        : <p className={`mt-2 text-sm [overflow-wrap:anywhere] ${login.known ? 'text-slate-100' : 'text-slate-500'}`}><span className="text-slate-400">Login: </span>{login.text}</p>}
    </li>
  )
}

export default function LinksReport({ settings, onSave }) {
  const [draft, setDraft] = useState(null) // null = reading; { id: login } while filling in
  const [state, setState] = useState(null) // null | 'saving' | 'saved' | { error }
  const editing = draft !== null
  const missing = ALL_LINKS.filter((l) => editable(l) && !loginFor(l, settings).known).length

  async function save(e) {
    e.preventDefault()
    setState('saving')
    try {
      await onSave({ logins: cleanLogins(draft) })
      setDraft(null)
      setState('saved')
    } catch (err) {
      setState({ error: err?.message || 'That didn’t save. Try again.' })
    }
  }
  // Its own key: reusing the Fill in button's element would turn it into
  // Save during the click, and the browser would then submit the form.
  const buttons = (
    <div key="editing" className="flex flex-wrap items-center gap-2">
      <button type="submit" disabled={state === 'saving'} className={`${btn} bg-glow-400 text-night-950`}>{state === 'saving' ? 'Saving…' : 'Save logins'}</button>
      <button type="button" onClick={() => { setDraft(null); setState(null) }} className={`${btn} border border-white/20`}>Cancel</button>
    </div>
  )

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="space-y-3">
        <p className="max-w-prose text-sm text-slate-400">Logins are kept in the app’s settings, never in the website’s code. Type the email or username only, never a password.</p>
        {editing ? buttons : (
          <div key="reading" className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => { setDraft(loginDraft(settings)); setState(null) }} className={`${btn} bg-white/10 hover:bg-white/15`}>✎ Fill in logins</button>
            {missing > 0 && <span className="text-sm text-slate-400">{missing} not recorded yet</span>}
            {state === 'saved' && <span role="status" className="text-sm text-emerald-400">Saved ✓</span>}
          </div>
        )}
        {state?.error && <p className="text-sm text-berry-300" role="alert">{state.error}</p>}
      </div>
      {LINK_GROUPS.map((g) => (
        <section key={g.title}>
          <h3 className="font-display text-lg font-bold">{g.title}</h3>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {g.links.map((l) => (
              <LinkCard key={l.id} link={l} settings={settings} editing={editing} value={draft?.[l.id] ?? ''}
                onChange={(id, v) => { setDraft((d) => ({ ...d, [id]: v })); setState(null) }} />
            ))}
          </ul>
        </section>
      ))}
      {editing && buttons}
    </form>
  )
}
