import { business } from '../data/content'
import Icon from './Icon'

// Thumb-reach action bar, phones only.
export default function MobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-white/10 bg-night-950/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <a href={business.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 font-semibold">
        <Icon name="phone" className="size-5" /> Call
      </a>
      <a href="#estimate" className="rounded-full bg-glow-400 py-3 text-center font-semibold text-night-950">
        Free estimate
      </a>
    </div>
  )
}
