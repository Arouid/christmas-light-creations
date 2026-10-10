import { useState } from 'react'
import { agoText, staffName } from '../lib/activity'
import { KIND_WORD } from '../lib/staffAlerts'
import { logActivity } from './activity'

// "I've got it" / "Take it over" on a message (docs/specs/dashboard.md): tells
// everyone who's answering it, so nobody does it twice. Each is a Recent
// activity entry; a take-over says whose it was. The newest one shows.
// Hidden while the activity rules aren't published.
const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()
const tapTime = () => Date.now()

export default function Handling({ m, who, feed, user }) {
  const [tap, setTap] = useState(null) // { at, from }: shows at once, before the server confirms
  if (!feed || feed.error) return null
  const me = user?.email
  const name = (email) => staffName(email, feed.names)
  // The newer of the latest saved one and my own tap (5 s for clock differences).
  const h = feed.handling?.get(m.id)
  const local = tap ? { by: me, at: tap.at, from: tap.from } : null
  const shown = !h ? local : !local ? h : h.at >= local.at - 5000 ? h : local
  const mine = Boolean(shown) && same(shown.by, me)

  function claim(e) {
    e.stopPropagation()
    const from = shown && !mine ? shown.by : null
    const kind = KIND_WORD[m.kind] ?? ''
    if (from) logActivity('takeover', { type: 'message', id: m.id, name: who }, [`was ${name(from)}’s`, kind].filter(Boolean).join(' · '))
    else logActivity('handling', { type: 'message', id: m.id, name: who }, kind)
    setTap({ at: tapTime(), from })
  }

  let line = ''
  if (shown) {
    const from = shown.from
    if (mine) line = from ? `You took it over from ${name(from)}` : 'You’re on it'
    else if (from) line = `${name(shown.by)} took it over from ${same(from, me) ? 'you' : name(from)}`
    else line = `${name(shown.by)} is on it`
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      {line && (
        <span className={`rounded-full px-2.5 py-1 font-semibold ${mine ? 'bg-pine-500/30 text-white' : 'bg-sky-500/20 text-sky-100'}`} role="status">
          👤 {line} · {agoText(shown.at)}
        </span>
      )}
      {!mine && (
        <button type="button" onClick={claim} className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">
          {shown ? 'Take it over' : 'I’ve got it'}
        </button>
      )}
    </div>
  )
}
