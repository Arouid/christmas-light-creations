import { useState } from 'react'
import SignaturePad from './SignaturePad.jsx'

// Typed name + drawn signature + consent to sign electronically.
// onSign({ name, image, consent: true }) — the host saves it.
export default function SignPanel({ expectedName = '', onSign }) {
  const [name, setName] = useState(expectedName)
  const [image, setImage] = useState(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const ready = name.trim().length >= 2 && image && consent

  async function sign() {
    setBusy(true)
    setErr(null)
    try {
      await onSign({ name: name.trim(), image, consent: true })
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
      <div>
        <p className="mb-1 text-sm text-slate-300">Your signature</p>
        <SignaturePad onChange={setImage} />
      </div>
      <label className="flex items-start gap-3 text-sm text-slate-300">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 shrink-0" />
        <span>I have read this proposal and agreement, I agree to its terms, and I agree to sign electronically. My electronic signature is the legal equivalent of my handwritten signature.</span>
      </label>
      {err && <p className="text-sm text-berry-500" role="alert">{err}</p>}
      <button type="button" onClick={sign} disabled={!ready || busy}
        className="w-full rounded-full bg-glow-400 py-4 font-semibold text-night-950 disabled:opacity-40">
        {busy ? 'Signing…' : 'Sign and accept'}
      </button>
    </section>
  )
}
