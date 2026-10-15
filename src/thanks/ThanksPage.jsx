import { useEffect } from 'react'
import { business } from '../data/content'
import Icon from '../components/Icon'
import { loadAdsTag, reportConversion, takeContactForAds } from '../lib/ads'

// /thanks/: where the estimate form lands after a successful send. Its own
// address so Google Ads can count it as a lead (src/lib/ads.js).
export default function ThanksPage() {
  // Load the tag here too (a "page reached /thanks/" conversion needs it on this page);
  // reportConversion adds the event once a conversion label is set, with the hashed
  // email and phone the form left (taken and cleared at once: a reload sends none).
  useEffect(() => {
    const userData = takeContactForAds()
    loadAdsTag().then(() => reportConversion('estimate', userData))
  }, [])
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <a href={import.meta.env.BASE_URL} className="flex items-center gap-2">
        <img src={business.logo} alt="" className="size-12" />
        <span className="font-display text-xl font-extrabold leading-tight">{business.name}</span>
      </a>
      <div className="w-full rounded-3xl border border-white/10 bg-night-900 p-8" role="status">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-pine-500/20 text-pine-500">
          <Icon name="check" className="size-8" />
        </div>
        <h1 className="font-display text-3xl font-extrabold">Thanks, we got it!</h1>
        <p className="mt-3 text-slate-300">We’ll be in touch soon to set up your free estimate. Need us sooner?</p>
        <a href={business.phoneHref} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-glow-400 px-5 font-semibold text-night-950">
          <Icon name="phone" className="size-5" /> Call {business.phone}
        </a>
      </div>
      <a href={import.meta.env.BASE_URL} className="text-slate-400 underline">← Back to the home page</a>
    </main>
  )
}
