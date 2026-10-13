import { useState } from 'react'
import { askRecord, reviewSeasonOf, reviewWords } from '../lib/reviewAsk'
import { todayISO } from '../lib/customers'
import { textMessages } from '../lib/messages'
import { customerTarget, logActivity } from './activity'
import ComposeEmail from './ComposeEmail'
import { TextButton } from './Reach'
import { useStaff } from './staffContext'
import { mergePaths } from './staffStore'

// The ★ Google review box on a customer (docs/specs/review-ask.md): where
// the automatic ask stands in plain words, the Text / Email review link
// buttons for asking by hand, and ★ They reviewed (we can't see Google
// reviews from here, so a person closes the loop). The server never offers
// anything for a review and neither should anyone here.
const action = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2.5 text-sm font-medium hover:bg-white/15'
const gold = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-glow-400 px-3 py-2.5 text-sm font-semibold text-night-950 hover:bg-glow-300'

export default function ReviewAskBox({ customer }) {
  const { user } = useStaff()
  const [busy, setBusy] = useState(false)
  const season = reviewSeasonOf(customer)
  if (!season) return null
  const entry = customer.seasons[season]
  const r = askRecord(entry)
  const base = `seasons.${season}.reviewAsk`
  const write = async (paths) => {
    setBusy(true)
    try { await mergePaths(user, 'customers', customer.id, paths) } catch (e) { console.warn('review ask not saved', e.code ?? e.message) } finally { setBusy(false) }
  }
  // A hand ask before the website's: the old mark (the server then leaves them
  // alone). A text after the website queued one: close the 💬 item.
  const asked = (channel) => {
    if (r.askedAt && !r.manual) {
      if (channel === 'text' && !r.textedAt) write({ [`${base}.textedAt`]: Date.now(), [`${base}.textedBy`]: user?.email ?? '' })
      return
    }
    write({ [`seasons.${season}.reviewAsked`]: todayISO() })
  }
  const reviewed = () => {
    write({ [`${base}.reviewedAt`]: Date.now(), [`${base}.reviewedBy`]: user?.email ?? '' })
    logActivity('reviewed', customerTarget(customer.id, customer.fullName), season)
  }
  const undo = () => write({ [`${base}.reviewedAt`]: null, [`${base}.reviewedBy`]: null })

  return (
    <div className="rounded-xl border border-glow-400/30 bg-glow-400/5 p-3">
      <p className="text-sm text-slate-300">★ {season} install completed · Google review</p>
      <p className="mt-1 text-sm text-glow-300">{reviewWords(entry, customer)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {!r.reviewedAt && (
          <>
            <TextButton phone={customer.phone} className={r.askedAt && !r.textedAt && String(r.channel).includes('text') ? gold : action} label="★ Text review link" message={textMessages.review(customer)} onSent={() => asked('text')} />
            <ComposeEmail person={customer} season={season} target={{ customerId: customer.id }} start="review" label="Email review link" className={action} onSent={() => asked('email')} mark={{ season, field: 'reviewAsked' }} />
            <button type="button" onClick={reviewed} disabled={busy} className={action}>★ They reviewed</button>
          </>
        )}
        {r.reviewedAt > 0 && <button type="button" onClick={undo} disabled={busy} className="min-h-11 text-sm text-slate-400 underline">Undo “They reviewed”</button>}
      </div>
      <p className="mt-2 text-xs text-slate-500">The website asks everyone the same way 2 days after the install and reminds once; never offer anything for a review.</p>
    </div>
  )
}
