import { business } from '../data/content'
import Availability from './Availability'
import EstimateForm from './EstimateForm'
import Icon from './Icon'

export default function Estimate() {
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
          <Availability className="mt-6" />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={business.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-3.5 font-semibold hover:bg-white/15">
              <Icon name="phone" className="size-5" /> Call {business.phone}
            </a>
            <a href={business.smsHref} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-semibold hover:bg-white/5">
              <Icon name="chat" className="size-5" /> Text us
            </a>
          </div>
        </div>

        <EstimateForm />
      </div>
    </section>
  )
}
