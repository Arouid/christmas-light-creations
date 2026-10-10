import { useEffect, useState } from 'react'
import { PUSH_VAPID_KEY } from '../lib/firebase'
import { pushState } from '../lib/staffAlerts'
import { demoMode } from './demo'
import { isIos, isStandalone, permission, pushSupported, sendTest, storedFid, turnOff, turnOn } from './push'

// "Phone notifications on this device" at the top of 💬 New messages
// (docs/specs/staff-alerts.md). Says plainly what stops them when they can't work.
const SAY = {
  rules: 'Phone notifications need the database rules published again (firestore.rules). The list below still works.',
  'no-key': 'Phone notifications aren’t set up yet: the owner adds the web push key (Firebase console). The list below still works.',
  'ios-install': 'On iPhone and iPad, notifications only work in the installed app: in Safari tap Share → Add to Home Screen, open CLC Staff from your Home Screen, then turn them on there.',
  unsupported: 'This browser can’t show notifications. Use Chrome on Android or a computer, or the installed app on iPhone (iOS 16.4 or later).',
  blocked: 'Notifications are blocked for this site. Allow them in your browser or phone settings (Site settings → Notifications → Allow), then come back here.',
  off: 'Get a notification on this device within about 5 minutes when a customer texts, leaves a voicemail, calls or emails.',
  on: 'On for this device ✓ You’ll get a notification for each new customer message.',
}
const btn = 'min-h-11 rounded-full px-4 text-sm font-semibold disabled:opacity-50'

export default function PushSetup({ user, prefs }) {
  const [supported, setSupported] = useState(null)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [, redraw] = useState(0) // permission / stored id live outside React
  useEffect(() => { pushSupported().then(setSupported) }, [])

  const devices = prefs.data?.pushDevices ?? {}
  const mine = storedFid()
  const state = pushState({
    prefsError: prefs.error, vapidKey: PUSH_VAPID_KEY, supported, ios: isIos(), standalone: isStandalone(),
    permission: permission(), on: Boolean(mine && devices[mine]),
  })

  async function run(what, fn) {
    setBusy(what)
    setNote('')
    try { await fn() } catch (e) { setNote(e.message || 'That didn’t work. Try again.') } finally { setBusy(''); redraw((n) => n + 1) }
  }
  const on = () => run('on', async () => { if (!(await turnOn(user))) setNote(permission() === 'denied' ? '' : 'Notifications weren’t allowed. Tap Turn on again and choose Allow.') })
  const test = () => run('test', async () => {
    const r = await sendTest()
    setNote(r.sent ? `Sent to ${r.sent} device${r.sent === 1 ? '' : 's'}. It should show within a minute.` : 'No device of yours is set up yet. Turn notifications on first.')
  })
  const others = Object.entries(devices).filter(([fid]) => fid !== mine)

  if (demoMode) {
    return <p className="rounded-2xl bg-white/5 p-3 text-sm text-slate-400">📲 Phone notifications: can’t be turned on in the sample-data preview.</p>
  }
  if (supported === null && !prefs.error) return null

  return (
    <section className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3" aria-label="Phone notifications on this device">
      <h3 className="font-semibold">📲 Phone notifications on this device</h3>
      <p className="text-sm text-slate-300">{SAY[state]}</p>
      {state === 'off' && <button type="button" disabled={Boolean(busy)} onClick={on} className={`${btn} bg-glow-400 text-night-950`}>{busy === 'on' ? 'Turning on…' : 'Turn on'}</button>}
      {state === 'on' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={Boolean(busy)} onClick={test} className={`${btn} bg-glow-400 text-night-950`}>{busy === 'test' ? 'Sending…' : 'Send a test'}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => run('off', () => turnOff(user))} className={`${btn} bg-white/10`}>{busy === 'off' ? 'Turning off…' : 'Turn off'}</button>
        </div>
      )}
      {note && <p className="text-sm text-glow-300" role="status">{note}</p>}
      {others.length > 0 && (
        <div className="border-t border-white/10 pt-2 text-sm">
          <p className="text-slate-400">Also on for you:</p>
          <ul className="mt-1 space-y-1">
            {others.map(([fid, d]) => (
              <li key={fid} className="flex items-center justify-between gap-2">
                <span>{d?.name || 'A device'}</span>
                <button type="button" disabled={Boolean(busy)} onClick={() => run('off', () => turnOff(user, fid))} className={`${btn} bg-white/10`}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
