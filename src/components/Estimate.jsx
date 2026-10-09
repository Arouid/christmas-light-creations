import { useState } from 'react'
import { HEARD_FROM, business } from '../data/content'
import { firebaseReady, getFirebaseApp, submitLead } from '../lib/firebase'
import { signCode, signSource } from '../lib/sign'
import Icon from './Icon'
import RecaptchaNote from './RecaptchaNote'

const field = 'mt-1.5 block w-full rounded-xl border border-white/15 bg-night-950 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-glow-400 focus:outline-none focus:ring-2 focus:ring-glow-400/30'
const label = 'block text-sm font-medium text-slate-300'

export default function Estimate() {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [sign] = useState(signCode)

  async function onSubmit(e) {
    e.preventDefault()
    if (!firebaseReady) return
    const data = new FormData(e.currentTarget)
    // Hidden field only bots fill in: pretend success, save nothing.
    if (data.get('website')) return setStatus('sent')
    setStatus('sending')
    try {
      await submitLead(data)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="estimate" className="relative px-4 py-20 md:py-28">
      <div className="bulb-string twinkle absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-glow-400">Free estimate</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">Claim your spot before we fill up.</h2>
          <p className="mt-4 text-lg text-slate-300">
            Our schedule books fast every fall. Tell us about your home and we’ll measure and send a price, no need to be home.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={business.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-3.5 font-semibold hover:bg-white/15">
              <Icon name="phone" className="size-5" /> Call {business.phone}
            </a>
            <a href={business.smsHref} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-semibold hover:bg-white/5">
              <Icon name="chat" className="size-5" /> Text us
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-night-900 p-6 md:p-8">
          {status === 'sent' ? (
            <div className="py-12 text-center" role="status">
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-pine-500/20 text-pine-500">
                <Icon name="check" className="size-8" />
              </div>
              <h3 className="font-display text-2xl font-bold">Thanks, we got it!</h3>
              <p className="mt-2 text-slate-400">We’ll be in touch soon. Need us sooner? Call {business.phone}.</p>
            </div>
          ) : (
            // Load Firebase (and the anti-spam check) once someone starts filling in the form.
            <form onSubmit={onSubmit} onFocus={() => { if (firebaseReady) getFirebaseApp().catch(() => {}) }} className="grid gap-5 sm:grid-cols-2">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <label className={label}>First name *<input required name="firstName" maxLength={80} autoComplete="given-name" className={field} /></label>
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
                <textarea required name="message" rows={4} maxLength={3000} className={field} placeholder="Roofline, trees, walkways, colors…" />
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
          )}
        </div>
      </div>
    </section>
  )
}
