import { useState } from 'react'
import { business, urgency } from '../data/content'
import { dayLabel, fetchBooking, pickDate } from '../lib/urgency'
import Icon from './Icon'

// "Check availability": the next real open install days from our schedule
// (never made up). "Request this date" fills the estimate form.
const T = urgency.availability

export default function Availability({ className = '' }) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState(undefined) // undefined = not asked yet, null = couldn't load
  const show = () => {
    setOpen(!open)
    if (days === undefined) fetchBooking().then((b) => setDays(b.openDays))
  }
  return (
    <div className={className}>
      <button type="button" onClick={show} aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-glow-400/40 bg-night-900/60 px-5 py-2.5 text-sm font-semibold text-glow-300 hover:bg-night-900">
        📅 {T.button}
      </button>
      {open && (
        <div className="mt-3 max-w-md rounded-2xl border border-white/10 bg-night-900/95 p-4 text-sm">
          {days === undefined && <p className="text-slate-400">{T.loading}</p>}
          {days?.length > 0 && (
            <>
              <p className="font-semibold text-slate-100">{T.title}</p>
              <ul className="mt-2 space-y-2">
                {days.map((d) => (
                  <li key={d} className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-glow-300">{dayLabel(d)}</span>
                    <button type="button" onClick={() => pickDate(d)} className="min-h-11 rounded-full bg-glow-400 px-4 font-semibold text-night-950 hover:bg-glow-300">{T.pick}</button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">{T.note}</p>
            </>
          )}
          {(days === null || days?.length === 0) && (
            <p className="text-slate-300">{T.full} <a href={business.phoneHref} className="inline-flex items-center gap-1 font-semibold text-glow-300 underline"><Icon name="phone" className="size-4" />{business.phone}</a></p>
          )}
        </div>
      )}
    </div>
  )
}
