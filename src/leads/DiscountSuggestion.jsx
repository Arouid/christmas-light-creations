import { useState } from 'react'
import { suggestDiscount } from '../lib/discounts'
import { useDiscountSchedule } from './discountContext'

// Shown in a customer's season when the install date calls for a different
// early-install discount/total than what's on file.
export default function DiscountSuggestion({ customer, year, onUpdate }) {
  const schedule = useDiscountSchedule()
  const [busy, setBusy] = useState(false)
  const s = customer.seasons?.[year]
  const next = suggestDiscount(s, schedule, customer.installType)
  if (!next) return null

  async function apply() {
    setBusy(true)
    const base = `seasons.${year}.install`
    await onUpdate(customer.id, `${base}.discount`, next.discount)
    await onUpdate(customer.id, `${base}.discountReason`, next.discountReason)
    await onUpdate(customer.id, `${base}.total`, next.total)
    setBusy(false)
  }

  const when = s.plannedDate || `week of ${s.weekOf}`
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-glow-400/30 bg-glow-400/5 px-3 py-2 text-sm">
      <p>
        {next.pct ? <>Early install ({when}): <strong>{next.pct}% off</strong></> : <>Install on {when}: <strong>no early discount</strong></>}
        {' '}→ total <strong>{next.total}</strong>
        <span className="text-slate-400"> (on file: {s.install?.discount || '0'} · {s.install?.total || 'no total'})</span>
      </p>
      <button type="button" onClick={apply} disabled={busy}
        className="rounded-full bg-glow-400 px-4 py-1.5 font-semibold text-night-950 disabled:opacity-50">{busy ? 'Saving…' : 'Apply'}</button>
    </div>
  )
}
