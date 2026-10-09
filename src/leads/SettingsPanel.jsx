import { useState } from 'react'
import { DEFAULT_SCHEDULE } from '../lib/discounts'
import HomeBase from './HomeBase'
import InstallApp from './InstallApp'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const box = 'space-y-2 rounded-2xl border border-white/10 bg-night-950 p-4'
const small = 'w-full rounded-lg border border-white/15 bg-night-900 px-2 py-1.5 text-sm'

// "10-15" <-> "Oct 15" for the schedule editor.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const toLabel = (md) => `${MONTHS[+md.slice(0, 2) - 1]} ${+md.slice(3)}`
const fromLabel = (t) => {
  const m = t.trim().match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})$/i)
  const i = m ? MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()) : -1
  return i >= 0 ? `${String(i + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null
}

function DiscountSchedule({ settings, onSave }) {
  const [rows, setRows] = useState(() => (settings.discountSchedule ?? DEFAULT_SCHEDULE).map((r) => ({ from: toLabel(r.from), to: toLabel(r.to), pct: String(r.pct) })))
  const [msg, setMsg] = useState(null)
  const set = (i, patch) => { setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); setMsg(null) }

  async function save() {
    const parsed = rows.map((r) => ({ from: fromLabel(r.from), to: fromLabel(r.to), pct: Number(r.pct) }))
    if (parsed.some((r) => !r.from || !r.to || r.from > r.to || !(r.pct > 0 && r.pct < 100))) {
      return setMsg('Use dates like "Oct 15" (first ≤ last) and a percent between 1 and 99.')
    }
    await onSave({ discountSchedule: parsed.sort((a, b) => a.from.localeCompare(b.from)) })
    setMsg('Saved ✓')
  }

  return (
    <div className={box}>
      <p className="font-semibold">Early-install discounts</p>
      <p className="text-sm text-slate-400">By install date (planned date, or the start of “week of”). Dates outside these get no discount. “Special Rate” customers are never changed.</p>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_4.5rem_auto] items-center gap-2 text-sm">
          <input aria-label="From" value={r.from} onChange={(e) => set(i, { from: e.target.value })} className={small} placeholder="Oct 15" />
          <input aria-label="To" value={r.to} onChange={(e) => set(i, { to: e.target.value })} className={small} placeholder="Oct 31" />
          <label className="flex items-center gap-1"><input aria-label="Percent" value={r.pct} inputMode="numeric" onChange={(e) => set(i, { pct: e.target.value })} className={small} />%</label>
          <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove row" className="px-2 text-slate-400">✕</button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRows((rs) => [...rs, { from: '', to: '', pct: '' }])} className="rounded-full bg-white/10 px-4 py-2 text-sm">+ Add dates</button>
        <button type="button" onClick={save} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">Save</button>
        {msg && <span className={`text-sm ${msg.startsWith('Saved') ? 'text-emerald-400' : 'text-berry-500'}`}>{msg}</span>}
      </div>
    </div>
  )
}

// Who gets an email the moment a website estimate request comes in
// (functions/index.js reads settings/app.alertEmails).
function AlertEmails({ settings, onSave }) {
  const [text, setText] = useState((settings.alertEmails ?? []).join('\n'))
  const [msg, setMsg] = useState(null)
  async function save() {
    const list = [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))]
    const bad = list.filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
    if (bad.length) return setMsg(`Not an email: ${bad.join(', ')}`)
    await onSave({ alertEmails: list })
    setText(list.join('\n'))
    setMsg('Saved ✓')
  }
  return (
    <div className={box}>
      <p className="font-semibold">New-request alerts</p>
      <p className="text-sm text-slate-400">
        These emails get a message the moment someone asks for an estimate on the website. Use the Gmail on your phone so it pops up as a notification. One per line.
      </p>
      <textarea value={text} rows={3} onChange={(e) => { setText(e.target.value); setMsg(null) }} className={field} placeholder="name@gmail.com" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">Save</button>
        {msg && <span className={`text-sm ${msg.startsWith('Saved') ? 'text-emerald-400' : 'text-berry-500'}`}>{msg}</span>}
      </div>
    </div>
  )
}

export default function SettingsPanel({ settings, onSave, textFrom, onTextFrom, onClose }) {
  const [account, setAccount] = useState(settings.voiceAccount ?? '')
  const [saved, setSaved] = useState(false)

  async function saveAccount(e) {
    e.preventDefault()
    await onSave({ voiceAccount: account.trim().toLowerCase() })
    setSaved(true)
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="mx-auto max-w-xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold">Settings</h2>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Done</button>
        </div>

        <div className={box}><InstallApp /></div>

        <AlertEmails settings={settings} onSave={onSave} />

        <form onSubmit={saveAccount} className={box}>
          <p className="font-semibold">Business texting (Google Voice)</p>
          <p className="text-sm text-slate-400">
            The Google account that owns the business Voice number. Text buttons open Voice in that account, so staff must be signed in to it
            (browser and Voice app). Shared by all staff.
          </p>
          <label className="block text-sm text-slate-400">Voice account email
            <input type="email" value={account} onChange={(e) => { setAccount(e.target.value); setSaved(false) }} className={field} placeholder="name@gmail.com" />
          </label>
          <button className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">{saved ? 'Saved ✓' : 'Save'}</button>
        </form>

        <div className={box}>
          <p className="font-semibold">On this device, text from</p>
          {[['business', 'The business number (account above)'], ['own', 'My own Google Voice number']].map(([v, label]) => (
            <label key={v} className="flex items-center gap-3 text-sm">
              <input type="radio" name="textFrom" checked={textFrom === v} onChange={() => onTextFrom(v)} /> {label}
            </label>
          ))}
          <p className="text-xs text-slate-500">Saved on this phone or computer only. Each staff member picks their own.</p>
        </div>

        <div className={box}>
          <p className="font-semibold">Light designer</p>
          <label className="block text-sm text-slate-400">Price per foot (new designs start with this; bulbs every 12")
            <input type="number" min="0" step="0.25" defaultValue={settings.designPricePerFoot ?? ''} placeholder="e.g. 4.50"
              onBlur={(e) => onSave({ designPricePerFoot: e.target.value ? Number(e.target.value) : null })} className={field} />
          </label>
        </div>

        <DiscountSchedule settings={settings} onSave={onSave} />

        <div className={box}>
          <p className="font-semibold">Home base</p>
          <p className="text-sm text-slate-400">Where the crew starts. Used for distances on the Map.</p>
          <HomeBase settings={settings} onSave={onSave} />
        </div>
      </div>
    </div>
  )
}
