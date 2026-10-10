import { useEffect, useState } from 'react'
import { KIND_WORD, LIST_DAYS, isNew, messageLink, previewOf, whoOf } from '../lib/staffAlerts'
import Handling from './Handling'
import PushSetup from './PushSetup'

// 💬 New messages (docs/specs/staff-alerts.md): texts, voicemails, missed
// calls, emails and website estimate requests from the last 7 days, newest first; the ones
// that arrived since you last looked are marked. Tap one → their account.
const ICON = { text: '💬', voicemail: '🎙', missed: '📵', email: '✉️', request: '📝' }

function when(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`
}

export default function MessagesPanel({ user, alerts, names, feed, onClose }) {
  // "New" as it was when the list opened: opening it clears your count.
  const [seenAtOpen] = useState(alerts.seenAt)
  const { markSeen } = alerts
  useEffect(() => {
    markSeen()
    return markSeen // what arrived while it was open was seen too
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once per opening

  const go = (link) => { onClose(); window.location.assign(link) }
  const { list } = alerts

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="New messages">
      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-16">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-night-950/95 px-4 pb-3 pt-1">
          <h2 className="font-display text-2xl font-extrabold">New messages</h2>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold">Done</button>
        </div>

        <PushSetup user={user} prefs={alerts.prefs} />

        {alerts.error && <p className="text-berry-500" role="alert">Couldn’t load messages: {alerts.error === 'not-staff' ? 'refused by the database.' : alerts.error}</p>}
        {!alerts.error && !list.length && (
          <p className="rounded-2xl bg-white/5 p-4 text-slate-400">{alerts.loading ? 'Loading…' : `No texts, voicemails, calls, emails or estimate requests in the last ${LIST_DAYS} days.`}</p>
        )}
        {list.length > 0 && (
          <ul className="space-y-2">
            {list.map((m) => {
              const fresh = isNew(m, seenAtOpen)
              return (
                <li key={m.id}>
                  <button type="button" onClick={() => go(messageLink(m))}
                    className={`flex min-h-11 w-full gap-3 rounded-2xl p-3 text-left hover:bg-white/10 ${fresh ? 'bg-glow-400/10 ring-1 ring-glow-400/40' : 'bg-white/5'}`}>
                    <span className="w-7 shrink-0 text-center text-xl leading-6" aria-hidden="true">{ICON[m.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold">{whoOf(m, names)}</span>
                        <span className="shrink-0 text-xs text-slate-400">{when(m.at)}</span>
                      </span>
                      <span className="block text-sm text-slate-300">
                        {fresh && <span className="mr-1.5 rounded-full bg-glow-400 px-1.5 text-xs font-bold text-night-950">New</span>}
                        <span className="font-medium">{KIND_WORD[m.kind]}</span>
                        {m.unmatched && <span className="text-slate-400"> · {m.email ? 'new sender' : 'unknown number'}</span>}
                      </span>
                      {previewOf(m) && <span className="mt-0.5 line-clamp-2 block break-words text-sm text-slate-400">{previewOf(m)}</span>}
                    </span>
                  </button>
                  <div className="pl-13"><Handling m={m} who={whoOf(m, names)} feed={feed} user={user} /></div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="text-xs text-slate-500">
          What customers and new people sent in the last {LIST_DAYS} days: texts, voicemails and emails arrive within about 5 minutes, website estimate requests at once. Our own replies aren’t listed. Tap one to open their account and full history; unknown numbers and emails open the Unmatched list on Leads.
        </p>
      </div>
    </div>
  )
}
