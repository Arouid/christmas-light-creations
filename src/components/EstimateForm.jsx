import { useEffect, useRef, useState } from 'react'
import { HEARD_FROM, business, designPage, estimateForm as words, giftWrapping, urgency } from '../data/content'
import { keepContactForAds } from '../lib/ads'
import { firebaseReady, getFirebaseApp, submitLead } from '../lib/firebase'
import { SERVICES, useGiftWrapping } from '../lib/giftWrapping'
import { useSign, useTakenOver } from '../lib/prerendered'
import { signSource } from '../lib/sign'
import { LIT_OPTIONS, composeMessage, needsPhone } from '../lib/estimateForm'
import Icon from './Icon'
import RecaptchaNote from './RecaptchaNote'

// Two looks, each a full set of class strings (never a second bg-… added onto
// a shared one): night, the site's own; snow, the white-and-red gift-wrapping
// page (docs/specs/gift-wrapping.md).
const SKINS = {
  night: {
    box: 'rounded-3xl border border-white/10 bg-night-900',
    field: 'mt-1.5 block w-full rounded-xl border border-white/15 bg-night-950 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-glow-400 focus:outline-none focus:ring-2 focus:ring-glow-400/30',
    label: 'block text-sm font-medium text-slate-300',
    muted: 'text-slate-400',
    chip: 'rounded-xl border border-white/15 text-center text-sm font-medium peer-checked:border-glow-400 peer-checked:bg-glow-400/10 peer-checked:text-glow-300 peer-focus-visible:ring-2 peer-focus-visible:ring-glow-400',
    pickOn: 'border-glow-400 bg-glow-400/15 text-glow-300',
    pickOff: 'border-white/15 text-slate-200 hover:border-white/30',
    error: 'text-berry-300',
    submit: 'bg-glow-400 text-night-950 shadow-[0_0_28px_-6px] shadow-glow-400 hover:bg-glow-300',
    call: 'bg-glow-400 text-night-950',
    link: 'text-glow-300',
  },
  snow: {
    box: 'rounded-3xl border border-berry-500/20 bg-white shadow-xl shadow-berry-700/10',
    field: 'mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-night-950 placeholder:text-slate-500 focus:border-berry-600 focus:outline-none focus:ring-2 focus:ring-berry-600/25',
    label: 'block text-sm font-medium text-slate-700',
    muted: 'text-slate-600',
    chip: 'rounded-xl border border-slate-300 text-center text-sm font-medium text-slate-800 peer-checked:border-berry-600 peer-checked:bg-berry-50 peer-checked:text-berry-700 peer-focus-visible:ring-2 peer-focus-visible:ring-berry-600',
    pickOn: 'border-berry-600 bg-berry-50 text-berry-700',
    pickOff: 'border-slate-300 text-slate-700 hover:border-slate-400',
    error: 'text-berry-600',
    submit: 'bg-berry-600 text-white shadow-lg shadow-berry-600/25 hover:bg-berry-700',
    call: 'bg-berry-600 text-white',
    link: 'text-berry-700',
  },
}

// The estimate request form (home page, area pages, /design/, /gift-wrapping/).
// design (optional, /design/): { preview: image src, get: () => attachment, sample: the untouched sample }
// sends their light design with the request (docs/specs/public-designer.md).
// service: the "What do you need?" choice it opens with (the gift-wrapping page: Gift wrapping).
// skin: 'night' (the site) or 'snow' (the white gift-wrapping page).
export default function EstimateForm({ design, defaultMessage = '', service: startService, skin = 'night' }) {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const sign = useSign()
  const takenOver = useTakenOver()
  const [attach, setAttach] = useState(true)
  const look = SKINS[skin] ?? SKINS.night
  const { field, label } = look
  // "What do you need?" (docs/specs/gift-wrapping.md): only while gift wrapping is switched on.
  const gift = useGiftWrapping()
  const [service, setService] = useState(SERVICES.includes(startService) ? startService : SERVICES[0])
  // Gift wrapping alone: no "What would you like lit?", and the words talk about wrapping.
  const giftOnly = gift && service === 'Gift wrapping'
  // "What would you like lit?" chips + an optional note fold into the lead's message (src/lib/estimateForm.js).
  const [picks, setPicks] = useState([])
  const [phoneErr, setPhoneErr] = useState(false)
  const togglePick = (o) => setPicks((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))
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
    if (needsPhone(data.get('contactMethod'), data.get('phone'))) { setPhoneErr(true); return }
    data.set('message', composeMessage(picks, data.get('message'), { gift: giftOnly }))
    setStatus('sending')
    try {
      await submitLead(data, design && attach ? await design.get() : null)
      // Its own page, so Google Ads can count the request (src/lib/ads.js); bots above never get here.
      // A hash of the email and phone goes along for that page (enhanced conversions); never throws.
      await keepContactForAds({ email: data.get('email'), phone: data.get('phone') })
      window.location.assign(`${import.meta.env.BASE_URL}thanks/`)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className={`${look.box} p-6 py-12 text-center md:p-8`} role="status">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-pine-500/20 text-pine-500">
          <Icon name="check" className="size-8" />
        </div>
        <h3 className="font-display text-2xl font-bold">Thanks, we got it!</h3>
        <p className={`mt-2 ${look.muted}`}>We’ll be in touch soon. Need us sooner? Call <span className="whitespace-nowrap">{business.phone}</span>.</p>
      </div>
    )
  }

  return (
    <div className={`${look.box} p-6 md:p-8`}>
      {/* Load Firebase (and the anti-spam check) once someone starts filling in the form. */}
      <form onSubmit={onSubmit} onFocus={() => { if (firebaseReady) getFirebaseApp().catch(() => {}) }} className="grid gap-5 sm:grid-cols-2">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <p className={`text-sm ${look.muted} sm:col-span-2`}>{giftOnly ? giftWrapping.form.intro : 'Takes about a minute. You get one exact price within a day; we don’t quote over the phone.'}</p>
        {design && (
          <div className="flex items-center gap-3 rounded-2xl border border-glow-400/30 bg-glow-400/5 p-3 sm:col-span-2">
            <img src={design.preview} alt="Your light design" className="h-24 w-36 shrink-0 rounded-lg object-cover" />
            <label className="flex min-h-11 flex-1 items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="size-5 accent-glow-400" />
              {attach ? `✓ ${design.sample ? designPage.attachedSample : designPage.attached}` : designPage.attach}
            </label>
          </div>
        )}
        {gift && (
          <fieldset className="sm:col-span-2">
            <legend className={label}>{giftWrapping.form.legend}</legend>
            <div className="mt-2 flex gap-2">
              {SERVICES.map((s) => (
                <label key={s} className="flex-1 cursor-pointer">
                  <input type="radio" name="service" value={s} checked={service === s} onChange={() => setService(s)} className="peer sr-only" />
                  <span className={`flex h-full min-h-11 items-center justify-center px-1 py-2.5 leading-tight ${look.chip}`}>
                    {s}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className={label}>First name *<input ref={first} required name="firstName" maxLength={80} autoComplete="given-name" className={field} /></label>
        <label className={label}>Last name *<input required name="lastName" maxLength={80} autoComplete="family-name" className={field} /></label>
        <label className={label}>Email *<input required type="email" name="email" maxLength={200} autoComplete="email" className={field} /></label>
        <label className={label}>Phone<input type="tel" name="phone" maxLength={40} autoComplete="tel" className={field} onInput={() => setPhoneErr(false)} /></label>
        <label className={`${label} sm:col-span-2`}>Street address *
          <span id="address-hint" className={`mt-0.5 block font-normal ${look.muted}`}>{giftOnly ? giftWrapping.form.addressHint : words.addressHint}</span>
          <input required name="address" maxLength={200} autoComplete="street-address" aria-describedby="address-hint" className={field} />
        </label>
        <label className={label}>City<input name="city" maxLength={80} autoComplete="address-level2" className={field} placeholder={words.cityPlaceholder} /></label>
        <label className={label}>ZIP<input name="zip" inputMode="numeric" maxLength={10} autoComplete="postal-code" className={field} /></label>
        <fieldset className="sm:col-span-2">
          <legend className={label}>Best way to reach you *</legend>
          <div className="mt-2 flex gap-2">
            {['Phone', 'Text', 'Email'].map((m, i) => (
              <label key={m} className="flex-1 cursor-pointer">
                <input type="radio" name="contactMethod" value={m} defaultChecked={i === 0} className="peer sr-only" />
                <span className={`flex min-h-11 items-center justify-center py-2.5 ${look.chip}`}>
                  {m}
                </span>
              </label>
            ))}
          </div>
          {phoneErr && <p className={`mt-2 text-sm ${look.error}`} role="alert">{words.phoneError}</p>}
        </fieldset>
        <label className={`${label} sm:col-span-2`}>How did you hear about us?
          {/* key: a sign code known only after the page is taken over still preselects "Road sign" */}
          <select key={sign} name="source" defaultValue={sign ? signSource(sign) : ''} className={field}>
            <option value="">Choose one (optional)</option>
            {sign && <option value={signSource(sign)}>Road sign</option>}
            {HEARD_FROM.filter((h) => !(sign && h === 'Road sign')).map((h) => <option key={h}>{h}</option>)}
          </select>
        </label>
        {!giftOnly && (
          <fieldset className="sm:col-span-2">
            <legend className={label}>What would you like lit? <span className={`font-normal ${look.muted}`}>(tap any, optional)</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LIT_OPTIONS.map((o) => (
                <button key={o} type="button" onClick={() => togglePick(o)} aria-pressed={picks.includes(o)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-medium ${picks.includes(o) ? look.pickOn : look.pickOff}`}>
                  {picks.includes(o) ? '✓ ' : ''}{o}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <label className={`${label} sm:col-span-2`}>Anything else? <span className={`font-normal ${look.muted}`}>(optional)</span>
          <textarea ref={message} name="message" rows={3} maxLength={3000} className={field} defaultValue={defaultMessage}
            placeholder={giftOnly ? giftWrapping.form.placeholder : 'Colors you like, a date you need, a gate code…'} />
        </label>

        <div className="sm:col-span-2">
          {firebaseReady ? (
            // Off until React has taken the page over: a plain-HTML send would put their details in the URL.
            <button type="submit" disabled={!takenOver || status === 'sending'}
              className={`w-full rounded-full py-4 font-semibold disabled:opacity-60 ${look.submit}`}>
              {status === 'sending' ? 'Sending…' : giftOnly ? giftWrapping.form.submit : 'Request my free estimate'}
            </button>
          ) : (
            <a href={business.phoneHref} className={`block w-full rounded-full py-4 text-center font-semibold ${look.call}`}>
              Call {business.phone} for your estimate
            </a>
          )}
          <p className={`mt-3 text-center text-sm ${look.muted}`}>Rather not type? <a href={business.smsWith(giftOnly ? giftWrapping.form.text.sms : 'Hi! I’d like a free estimate for my home at: ')} className={`font-semibold underline ${look.link}`}>{giftOnly ? giftWrapping.form.text.link : 'Text a photo of your house to'} <span className="whitespace-nowrap">{business.phone}</span></a>.</p>
          <RecaptchaNote className="mt-3" muted={look.muted} />
          {status === 'error' && (
            <p className={`mt-3 text-center text-sm ${look.error}`} role="alert">{words.sendError}</p>
          )}
        </div>
      </form>
    </div>
  )
}
