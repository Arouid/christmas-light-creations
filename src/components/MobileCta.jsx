import { business } from '../data/content'
import { useSign } from '../lib/prerendered'
import Icon from './Icon'

// Thumb-reach action bar, phones only. Road-sign visitors also get Text.
export default function MobileCta() {
  const sign = useSign()
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 grid ${sign ? 'grid-cols-3' : 'grid-cols-2'} gap-2 border-t border-white/10 bg-night-950/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden`}>
      <a href={business.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 font-semibold">
        <Icon name="phone" className="size-5" /> Call
      </a>
      {sign && (
        <a href={business.smsWith(business.signText)} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 font-semibold">
          <Icon name="chat" className="size-5" /> Text
        </a>
      )}
      <a href="#estimate" className="rounded-full bg-glow-400 py-3 text-center font-semibold text-night-950">
        {sign ? 'Estimate' : 'Free estimate'}
      </a>
    </div>
  )
}
