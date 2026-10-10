import { business } from '../data/content'
import { useSign } from '../lib/prerendered'
import Icon from './Icon'

// Shown at the top of the page to people who came from a road sign: most of
// them want to text or call from the car, not fill in a form.
export default function SignWelcome() {
  const sign = useSign()
  if (!sign) return null
  return (
    <div className="mb-6 max-w-xl rounded-2xl border border-glow-400/40 bg-night-900/85 p-4 backdrop-blur md:p-5">
      <p className="font-display text-xl font-extrabold">Saw our sign? 👋</p>
      <p className="mt-1 text-slate-300">Text us your address and we’ll send a free estimate. No need to be home.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={business.smsWith(business.signText)} className="inline-flex items-center justify-center gap-2 rounded-full bg-glow-400 py-3 font-semibold text-night-950">
          <Icon name="chat" className="size-5" /> Text us
        </a>
        <a href={business.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 py-3 font-semibold">
          <Icon name="phone" className="size-5" /> Call
        </a>
      </div>
    </div>
  )
}
