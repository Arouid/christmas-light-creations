import { useState } from 'react'
import { locateAddress } from '../lib/streetView'

// Where the crew starts: used for distances and routes. Staff-only setting.
export default function HomeBase({ settings, onSave }) {
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState(null)
  const home = settings?.homeBase

  async function save(e) {
    e.preventDefault()
    const address = String(new FormData(e.currentTarget).get('address')).trim()
    setMsg('Finding it…')
    const found = await locateAddress(address).catch(() => null)
    if (!found) return setMsg('Google couldn’t find that address. Check it and try again.')
    await onSave({ homeBase: { address, lat: found.lat, lng: found.lng } })
    setMsg(null)
    setEditing(false)
  }

  if (home && !editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="truncate text-left text-xs text-cyan-100/70 hover:text-white">
        ◆ Home base: {home.address} <span className="underline">change</span>
      </button>
    )
  }
  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2 text-xs">
      <input name="address" required defaultValue={home?.address} placeholder="Home base address (shop / yard)"
        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-night-900 px-2 py-1.5" />
      <button className="rounded-lg bg-glow-400 px-3 py-1.5 font-semibold text-night-950">Save</button>
      {home && <button type="button" onClick={() => setEditing(false)} className="px-2 py-1.5 text-slate-400">Cancel</button>}
      {msg && <span className="w-full text-glow-300">{msg}</span>}
    </form>
  )
}
