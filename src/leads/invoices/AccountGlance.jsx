import { yearlyPrice } from '../../lib/addOns'
import { KIND_SHORT, STATE_LABEL, invoiceCents, invoiceState, money, suggestedLines, unpaidSeasons } from '../../lib/invoices'
import { todayISO } from '../../lib/customers'
import { PAY_PARTS, PART_LABEL, isPayable, partAmount, paymentOf, fmt } from '../../proposals/model.js'
import { useProposals } from '../proposals/useProposals'
import { useStaff } from '../staffContext'
import { STATE_STYLE, numberLabel, useInvoicesContext } from './useInvoices'

const PART = { install: 'Lights up', takedown: 'Takedown' }
const show = (v) => String(v ?? '').trim()

// One season's billing box (install or takedown) as a short line.
function BillLine({ label, b }) {
  if (!b || !Object.values(b).some(show)) return <li><span className="text-slate-400">{label}:</span> nothing on file</li>
  const amount = show(b.total) || show(b.rate)
  const discount = show(b.discount) && show(b.discount) !== '0' ? ` (${b.discount} off${show(b.rate) && show(b.total) ? ` of ${b.rate}` : ''})` : ''
  const paid = show(b.paid)
  return (
    <li>
      <span className="text-slate-400">{label}:</span> {amount || 'no amount'}{discount}
      {paid && <span className={/^yes$/i.test(paid) ? ' text-emerald-300' : /^no$/i.test(paid) ? ' text-glow-300' : ''}> · {/^yes$/i.test(paid) ? 'paid' : /^no$/i.test(paid) ? 'not paid' : paid}{[b.paymentType, b.paymentDate].filter(show).length ? ` (${[b.paymentType, b.paymentDate].filter(show).join(', ')})` : ''}</span>}
      {show(b.invoice) && <span className="text-slate-400"> · {b.invoice}</span>}
    </li>
  )
}

// Inside the invoice editor: what this customer owes and has on file, so
// staff don't have to leave the invoice. "＋ Add" puts suggested lines in.
export default function AccountGlance({ customerId, season, kind, token, editable, onAddLines }) {
  const ctx = useInvoicesContext()
  const { user } = useStaff()
  const proposals = useProposals(user, customerId)
  const c = ctx?.customers?.find((x) => x.id === customerId)
  if (!c) return <p className="text-sm text-slate-400">Their customer record isn’t loaded.</p>
  const today = todayISO()
  const s = c.seasons?.[season] ?? {}
  const y = yearlyPrice(c, season)
  const earlier = unpaidSeasons(c, season)
  const others = (ctx.invoices ?? []).filter((i) => i.customerId === c.id && i.id !== token && i.status !== 'void')
  const due = (proposals ?? []).flatMap((p) => PAY_PARTS.filter((part) => partAmount(p, part) > 0 && paymentOf(p, part)?.status !== 'paid' && ['signed', 'countersigned'].includes(p.status))
    .map((part) => ({ p, part, asked: isPayable(p, part) })))
  const lines = editable ? suggestedLines(c, season, kind) : []
  const sub = 'text-xs font-semibold uppercase tracking-wider text-slate-400'

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className={sub}>{season} season</p>
        <ul className="space-y-0.5">
          <BillLine label="Lights up" b={s.install} />
          <BillLine label="Takedown" b={s.takedown} />
          {s.installStatus && <li><span className="text-slate-400">Status:</span> {s.installStatus}{s.plannedDate ? ` · ${s.plannedDate}` : ''}</li>}
        </ul>
        {y.yearlyCents != null && <p className="mt-1 text-slate-400">Yearly price {season}: <span className="text-slate-200">{money(y.yearlyCents)}</span> before discounts{y.thisSeason.length ? ` · new this season: ${y.thisSeason.map((a) => `${a.what}${a.priceCents ? ` ${money(a.priceCents)}` : ''}`).join(', ')}` : ''}</p>}
      </div>

      {earlier.length > 0 && (
        <div>
          <p className={sub}>Not paid from earlier seasons</p>
          <ul>{earlier.map((e) => <li key={e.season + e.part} className="text-glow-300">{e.season} {PART[e.part].toLowerCase()}{e.amount ? `: ${e.amount}` : ''}</li>)}</ul>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <p className={sub}>Their other invoices</p>
          <ul className="space-y-0.5">
            {others.map((i) => {
              const st = invoiceState(i, today)
              return <li key={i.id} className="flex flex-wrap items-center gap-x-2">{numberLabel(i)} · {KIND_SHORT[i.kind] ?? ''} {i.season} · <span className="tabular-nums">{money(invoiceCents(i))}</span> <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_STYLE[st]}`}>{STATE_LABEL[st]}</span></li>
            })}
          </ul>
        </div>
      )}

      {due.length > 0 && (
        <div>
          <p className={sub}>Proposal payments not paid yet</p>
          <ul>{due.map(({ p, part, asked }) => <li key={p.id + part}>{p.season || p.title}: {PART_LABEL[part]} {fmt(partAmount(p, part))} <span className="text-slate-400">· {asked ? 'Pay button is on their proposal' : 'not asked yet'}</span></li>)}</ul>
        </div>
      )}

      {lines.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lines.map((l) => (
            <button key={l.id} type="button" onClick={() => onAddLines([{ ...l, id: `${l.id}x${Date.now().toString(36)}` }])}
              className="inline-flex min-h-11 items-center rounded-full bg-white/10 px-3.5 py-2 text-left text-sm font-semibold hover:bg-white/15">＋ {l.description} {money(l.cents)}</button>
          ))}
          {lines.length > 1 && <button type="button" onClick={() => onAddLines(lines.map((l) => ({ ...l, id: `${l.id}x${Date.now().toString(36)}` })))}
            className="inline-flex min-h-11 items-center rounded-full bg-glow-400 px-3.5 py-2 text-sm font-semibold text-night-950 hover:bg-glow-300">＋ Add all ({money(lines.reduce((t, l) => t + l.cents, 0))})</button>}
        </div>
      )}

      <a href={`#accounts/customer/${encodeURIComponent(c.id)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-glow-300 underline">Open their full account ↗</a>
    </div>
  )
}
