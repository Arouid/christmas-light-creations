import { bounceLine, bouncesOnRecord } from '../lib/bounces'

// ⚠ under a person's contact details when an email to an address still on
// their record bounced (docs/specs/email-bounces.md). Nothing otherwise.
export default function BounceNote({ record, hint = 'Fix the address on their record, then send it again.' }) {
  const list = bouncesOnRecord(record)
  if (!list.length) return null
  return (
    <div role="status" className="space-y-1 rounded-xl border border-berry-500/50 bg-berry-600/15 px-3 py-2 text-sm text-slate-100">
      {list.map((b) => <p key={b.email} className="break-words">⚠ {bounceLine(b)}</p>)}
      {hint && <p className="text-slate-300">{hint}</p>}
    </div>
  )
}
