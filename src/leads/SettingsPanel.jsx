import { useState } from 'react'
import HomeBase from './HomeBase'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const box = 'space-y-2 rounded-2xl border border-white/10 bg-night-950 p-4'

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
          <p className="font-semibold">Home base</p>
          <p className="text-sm text-slate-400">Where the crew starts. Used for distances on the Map.</p>
          <HomeBase settings={settings} onSave={onSave} />
        </div>
      </div>
    </div>
  )
}
