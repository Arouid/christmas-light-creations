import { useEffect, useRef, useState } from 'react'
import { HEARD_FROM, business, designPage, urgency } from '../data/content'
import { firebaseReady, getFirebaseApp, submitLead } from '../lib/firebase'
import { signCode, signSource } from '../lib/sign'
import Icon from './Icon'
import RecaptchaNote from './RecaptchaNote'

const field = 'mt-1.5 block w-full rounded-xl border border-white/15 bg-night-950 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-glow-400 focus:outline-none focus:ring-2 focus:ring-glow-400/30'
const label = 'block text-sm font-medium text-slate-300'

// The estimate request form (home page, area pages, /design/).
// design (optional, /design/): { preview: image src, get: () => attachment }
// sends their light design with the request (docs/specs/public-designer.md).
export default function EstimateForm({ design, defaultMessage = '' }) {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [sign] = useState(signCode)
  const [attach, setAttach] = useState(true)
  const message = useRef(null)
  const first = useRef(null)

  // "Request this date" (Availability): put the date at the top of the message.
  useEffect(() => {
    const onPick = (e) => {
      const line = urgency.availability.request.replace('{date}', e.detail)
      const el = message.current
      if (!el) return
      // Replace an earlier picked date rather than stacking them.
      const prefix = line.split(':')[0]
      const rest = el.value.split('\n').filter((l) => !l.startsWith(prefix))
      el.value = `${[line, ...rest].join('\n').trim()}\n`
      setTimeout(() => first.current?.focus({ preventScroll: true }), 400)
    }
    window.addEventListener('clc:pick-date', onPick)
    return () => window.removeEventListener('clc:pick-date', onPick)
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    if (!firebaseReady) return
    const data = new FormData(e.currentTarget)
    // Hidden field only bots fill in: pretend success, save nothing.
    if (data.get('website')) return setStatus('sent')
    setStatus('sending')
    try {
      await submitLead(data, design && attach ? await design.get() : null)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-3xl border border-white/10 bg-night-900 p-6 py-12 text-center md:p-8" role="status">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-pine-500/20 text-pine-500">
          <Icon name="check" className="size-8" />
        </div>
        <h3 className="font-display text-2xl font-bold">Thanks, we got it!</h3>
        <p className="mt-2 text-slate-400">We’ll be in touch soon. Need us sooner? Call {business.phone}.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-night-900 p-6 md:p-8">
      {/* Load Firebase (and the anti-spam check) once someone starts filling in the form. */}
      <form onSubmit={onSubmit} onFocus={() => { if (firebaseReady) getFirebaseApp().catch(() => {}) }} className="grid gap-5 sm:grid-cols-2">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        {design && (
          <div className="flex items-center gap-3 rounded-2xl border border-glow-400/30 bg-glow-400/5 p-3 sm:col-span-2">
            <img src={design.preview} alt="Your light design" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            <label className="flex min-h-11 flex-1 items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="size-5 accent-glow-400" />
              {attach ? `✓ ${designPage.attached}` : designPage.attach}
            </label>
          </div>
        )}
        <label className={label}>First name *<input ref={first} required name="firstName" maxLength={80} autoComplete="given-name" className={field} /></label>
        <label className={label}>Last name *<input required name="lastName" maxLength={80} autoComplete="family-name" className={field} /></label>
        <label className={label}>Email *<input required type="email" name="email" maxLength={200} autoComplete="email" className={field} /></label>
        <label className={label}>Phone<input type="tel" name="phone" maxLength={40} autoComplete="tel" className={field} /></label>
        <label className={`${label} sm:col-span-2`}>Street address *
          <input required name="address" maxLength={200} autoComplete="street-address" className={field} placeholder="We can’t estimate without it" />
        </label>
        <label className={label}>City<input name="city" maxLength={80} autoComplete="address-level2" className={field} defaultValue="Pearland" /></label>
        <label className={label}>ZIP<input name="zip" inputMode="numeric" maxLength={10} autoComplete="postal-code" className={field} /></label>
        <fieldset className="sm:col-span-2">
          <legend className={label}>Best way to reach you *</legend>
          <div className="mt-2 flex gap-2">
            {['Phone', 'Text', 'Email'].map((m, i) => (
              <label key={m} className="flex-1 cursor-pointer">
                <input type="radio" name="contactMethod" value={m} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block rounded-xl border border-white/15 py-2.5 text-center text-sm font-medium peer-checked:border-glow-400 peer-checked:bg-glow-400/10 peer-checked:text-glow-300 peer-focus-visible:ring-2 peer-focus-visible:ring-glow-400">
                  {m}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className={`${label} sm:col-span-2`}>How did you hear about us?
          <select name="source" defaultValue={sign ? signSource(sign) : ''} className={field}>
            <option value="">Choose one (optional)</option>
            {sign && <option value={signSource(sign)}>Road sign</option>}
            {HEARD_FROM.filter((h) => !(sign && h === 'Road sign')).map((h) => <option key={h}>{h}</option>)}
          </select>
        </label>
        <label className={`${label} sm:col-span-2`}>How can we help? *
          <textarea ref={message} required name="message" rows={4} maxLength={3000} className={field} placeholder="Roofline, trees, walkways, colors…" defaultValue={defaultMessage} />
        </label>

        <div className="sm:col-span-2">
          {firebaseReady ? (
            <button type="submit" disabled={status === 'sending'}
              className="w-full rounded-full bg-glow-400 py-4 font-semibold text-night-950 shadow-[0_0_28px_-6px] shadow-glow-400 hover:bg-glow-300 disabled:opacity-60">
              {status === 'sending' ? 'Sending…' : 'Request my free estimate'}
            </button>
          ) : (
            <a href={business.phoneHref} className="block w-full rounded-full bg-glow-400 py-4 text-center font-semibold text-night-950">
              Call {business.phone} for your estimate
            </a>
          )}
          <RecaptchaNote className="mt-3" />
          {status === 'error' && (
            <p className="mt-3 text-center text-sm text-berry-500" role="alert">
              Something went wrong. Please call or text {business.phone}.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
