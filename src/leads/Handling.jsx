import { useState } from 'react'
import { agoText, staffName } from '../lib/activity'
import { KIND_WORD } from '../lib/staffAlerts'
import { logActivity } from './activity'

// "I've got it" on a message (docs/specs/dashboard.md): tells everyone you're
// answering it, so nobody does it twice. It's a Recent activity entry; the
// newest one shows. Hidden while the activity rules aren't published.
export default function Handling({ m, who, feed, user }) {
  const [claimed, setClaimed] = useState(0) // shows at once, before the server confirms
  if (!feed || feed.error) return null
  // The newer of the latest saved one and my own tap (5 s for clock differences).
  const h = feed.handling?.get(m.id)
  const local = claimed ? { by: user.email, at: claimed } : null
  const shown = !h ? local : !local ? h : h.at >= local.at - 5000 ? h : local
  const mine = Boolean(shown) && String(shown.by).toLowerCase() === String(user?.email ?? '').toLowerCase()
  function claim(e) {
    e.stopPropagation()
    logActivity('handling', { type: 'message', id: m.id, name: who }, KIND_WORD[m.kind] ?? '')
    setClaimed(Date.now())
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      {shown && (
        <span className={`rounded-full px-2.5 py-1 font-semibold ${mine ? 'bg-pine-500/30 text-white' : 'bg-sky-500/20 text-sky-100'}`}>
          👤 {mine ? 'You’re' : `${staffName(shown.by, feed.names)} is`} on it · {agoText(shown.at)}
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
