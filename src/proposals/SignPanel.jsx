import { useState } from 'react'
import SignaturePad from './SignaturePad.jsx'
import { PAY_DAYS, PAY_DAY_LABEL } from '../../functions/payIn3.js'

// Typed name + drawn signature + consent to sign electronically.
// onSign({ name, image, consent: true, payDay? }) — the host saves it.
// payIn3: also make them pick the day of the month for payments 2 and 3 (owner 2026-10-12: the 1st or the 15th).
// agreementRead: false until they've opened the folded agreement above; the consent box waits for it.
export default function SignPanel({ expectedName = '', payIn3 = false, agreementRead = true, onSign }) {
  const [name, setName] = useState(expectedName)
  const [image, setImage] = useState(null)
  const [consent, setConsent] = useState(false)
  const [payDay, setPayDay] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const ready = name.trim().length >= 2 && image && consent && agreementRead && (!payIn3 || payDay)

  async function sign() {
    setBusy(true)
    setErr(null)
    try {
      await onSign({ name: name.trim(), image, consent: true, ...(payIn3 ? { payDay } : {}) })
    } catch (e) {
      setErr(e.message || 'Signing didn’t go through. Please try again.')
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-glow-400/40 bg-night-900 p-5 print:hidden">
      <h2 className="font-display text-2xl font-extrabold">Sign to accept</h2>
      <label className="block text-sm text-slate-300">Your full name
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
          className="mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-4 py-3 text-base text-slate-100" />
      </label>
      {payIn3 && (
        <fieldset>
          <legend className="text-sm text-slate-300">Payments 2 and 3: which day of the month?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PAY_DAYS.map((d) => (
              <label key={d} className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 font-semibold ${payDay === d ? 'border-glow-400 bg-glow-400/10 text-glow-300' : 'border-white/15'}`}>
                <input type="radio" name="payDay" value={d} checked={payDay === d} onChange={() => setPayDay(d)} className="size-4" /> The {PAY_DAY_LABEL[d]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">Payment 1 is due now. Payments 2 and 3 fall on that day in each of the next two months; we email you a link that morning.</p>
        </fieldset>
      )}
      <div>
        <p className="mb-1 text-sm text-slate-300">Your signature</p>
        <SignaturePad onChange={setImage} />
      </div>
      <label className={`flex items-start gap-3 text-sm ${agreementRead ? 'text-slate-300' : 'text-slate-500'}`}>
        <input type="checkbox" checked={consent} disabled={!agreementRead} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 shrink-0" />
        <span>I have read this proposal and agreement, I agree to its terms, and I agree to sign electronically. My electronic signature is the legal equivalent of my handwritten signature.</span>
      </label>
      {!agreementRead && <p className="text-sm text-glow-300">Tap <strong>Read the agreement</strong> above first; the box unlocks once you've opened it.</p>}
      {err && <p className="text-sm text-berry-500" role="alert">{err}</p>}
      <button type="button" onClick={sign} disabled={!ready || busy}
        className="w-full rounded-full bg-glow-400 py-4 font-semibold text-night-950 disabled:opacity-40">
        {busy ? 'Signing…' : 'Sign and accept'}
      </button>
    </section>
  )
}
