import { business, estimateSection } from '../data/content'
import Availability from './Availability'
import EstimateForm from './EstimateForm'
import Icon from './Icon'

// The estimate section. On phones the form comes right after the heading
// (design review 2026-10-14: every "estimate" button used to land a screen
// above the first field); availability, Call / Text and the designer line
// follow it. From lg up they sit in the left column, the form on the right.
export default function Estimate() {
  return (
    <section id="estimate" className="relative px-4 py-20 md:py-28">
      <div className="bulb-string twinkle absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-12">
        <div className="lg:col-start-1 lg:row-start-1">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-glow-400">Free estimate</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">Claim your spot before we fill up.</h2>
          <p className="mt-4 text-lg text-slate-300">
            Our schedule books fast every fall. Tell us about your home and we’ll measure and send a price, no need to be home.
          </p>
        </div>

        <div id="estimate-form" data-bar-hide="" className="scroll-mt-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <EstimateForm />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <Availability />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href={business.phoneHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-3.5 font-semibold hover:bg-white/15">
              <Icon name="phone" className="size-5" /> Call {business.phone}
            </a>
            <a href={business.smsHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-semibold hover:bg-white/5">
              <Icon name="chat" className="size-5" /> Text us
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            {estimateSection.designer.before}
            <a href={`${import.meta.env.BASE_URL}design/`} className="font-semibold text-glow-300 underline underline-offset-2 hover:text-white">{estimateSection.designer.link}</a>
            {estimateSection.designer.after}
          </p>
        </div>
      </div>
    </section>
  )
}
