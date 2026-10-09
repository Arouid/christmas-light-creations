import { useState } from 'react'
import { business } from '../../data/content'
import { gmailUrl } from '../../lib/messages'
import ProposalDocument from '../../proposals/ProposalDocument.jsx'
import SignaturePad from '../../proposals/SignaturePad.jsx'
import { PAY_PARTS, PART_LABEL, STATUS_LABEL, fillTerms, fmt, itemCents, itemsFromDesign, newItem, newProposal, partAmount, paymentOf, sendProblems, takedownItem, termVars, totals } from '../../proposals/model.js'
import { DEFAULT_TERMS, FILL_IN } from '../../proposals/terms.js'
import { COLOR_SETS, STYLES, normalize } from '../../designer/model.js'
import { designStats } from '../../designer/stats.js'
import { useDesigns } from '../designs/useDesigns'
import { TextButton } from '../Reach'
import { useStaff } from '../staffContext'
import { canDeleteProposal, canVoidProposal, countersign, createProposal, deleteProposal, proposalLink, reviseProposal, saveProposal, sendProposal, useProposals } from './useProposals'

const BIZ = { name: business.name, phone: business.phone, email: 'info@christmas-light-creations.com', logo: business.logo }
const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2 text-base text-slate-100'
const small = 'rounded-lg border border-white/15 bg-night-950 px-2 py-1.5 text-sm text-slate-100'
const btn = 'rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40'
const primary = 'rounded-full bg-glow-400 px-5 py-2.5 text-sm font-semibold text-night-950 hover:bg-glow-300 disabled:opacity-40'
const STATUS_STYLE = { draft: 'bg-white/10', sent: 'bg-sky-500/20 text-sky-300', viewed: 'bg-violet-500/20 text-violet-300', signed: 'bg-glow-400 text-night-950', countersigned: 'bg-emerald-500/20 text-emerald-300', declined: 'bg-berry-600/30', void: 'bg-white/5 text-slate-500' }
const when = (iso) => (iso ? new Date(iso.seconds ? iso.seconds * 1000 : iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')

// Items from a saved light design: one line per strand/shape (rename them to
// "Front roofline", "Mulch beds"… like the paper form), then takedown.
const setName = (colors) => Object.entries(COLOR_SETS).find(([, v]) => v.join() === (colors ?? []).join())?.[0] ?? 'custom colors'
function designItems(d, settings) {
  const design = normalize(JSON.parse(d.designJson))
  const st = designStats(design)
  const rate = design.pricePerFoot ?? settings.designPricePerFoot ?? 0
  let n = 0
  const lines = design.strands.map((s, i) => ({
    label: s.shape ? 'Round outline (window/wreath)' : s.closed ? 'Window/door outline' : `Roofline ${++n}`,
    feet: st.perStrand[i].feet,
    rate,
    details: `${STYLES[s.style]?.label ?? s.style}, ${setName(s.colors)}`,
  }))
  return itemsFromDesign({ lines, takedownPct: settings.takedownPct ?? 15, takedownMin: settings.takedownMin ?? 150 })
}

// " · paid in full" / " · deposit, install balance paid" for the list.
function paidSummary(x) {
  const due = PAY_PARTS.filter((part) => partAmount(x, part) > 0)
  const paid = due.filter((part) => paymentOf(x, part)?.status === 'paid')
  if (!paid.length) return ''
  const test = paid.some((part) => paymentOf(x, part).env === 'sandbox') ? ' (test)' : ''
  return paid.length === due.length ? ` · paid in full${test}` : ` · ${paid.map((part) => PART_LABEL[part].toLowerCase()).join(', ')} paid${test}`
}

// Deposit, install balance and takedown on a signed proposal. The balance and
// takedown show a Pay button on the customer's page once staff ask for them.
const ASK_TEXT = {
  balance: (first, amount, link) => `Hi ${first}, your Christmas lights are up! Thank you for choosing ${business.name}. You can pay the install balance of ${amount} here: ${link}`,
  takedown: (first, amount, link) => `Hi ${first}, your lights are down, labeled and stored for next year. You can pay ${amount} for takedown & storage here: ${link}`,
}
function Payments({ p, first, link, onAsk }) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 p-4">
      <p className="font-semibold">Payments</p>
      <ul className="divide-y divide-white/5">
        {PAY_PARTS.filter((part) => partAmount(p, part) > 0).map((part) => {
          const pay = paymentOf(p, part)
          const asked = part === 'deposit' || p.requests?.[part] === true
          const amount = fmt(partAmount(p, part))
          const message = ASK_TEXT[part]?.(first, amount, link)
          return (
            <li key={part} className="space-y-2 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{PART_LABEL[part]} · <span className="tabular-nums">{amount}</span></span>
                {pay?.status === 'paid'
                  ? <span className="text-sm font-semibold text-emerald-300">paid ✓{pay.env === 'sandbox' ? ' (test)' : ''}</span>
                  : <span className="text-sm text-slate-400">{asked ? 'Pay button is on their page' : 'Not asked yet'}</span>}
              </div>
              {part !== 'deposit' && pay?.status !== 'paid' && (
                <div className="flex flex-wrap gap-2">
                  {asked
                    ? <>
                        <TextButton phone={p.customer?.phone} message={message} label="Text it" className={btn} />
                        {p.customer?.email && <a href={gmailUrl({ to: p.customer.email, subject: `${PART_LABEL[part]}: ${business.name}`, body: message })} target="_blank" rel="noreferrer" className={btn}>Email it</a>}
                        <button type="button" onClick={() => onAsk(part, false)} className={`${btn} text-slate-400`}>Take back</button>
                      </>
                    : <button type="button" onClick={() => onAsk(part, true)} className={btn}>Ask for {part === 'balance' ? 'install balance' : 'takedown payment'}</button>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Editor({ token, p, owner, designs, settings, user, onClose }) {
  const [d, setD] = useState(p)
  const [busy, setBusy] = useState(null)
  const [preview, setPreview] = useState(false)
  const [csName, setCsName] = useState(settings.countersignName ?? '')
  const [csImage, setCsImage] = useState(null)
  const [copied, setCopied] = useState(false)
  const editable = d.status === 'draft'
  const live = p.status !== d.status && !editable ? p : d // after saves, show the stored status
  const t = totals(d)
  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  const setItem = (id, patch) => set({ items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  const termsTemplate = d.termsTemplate ?? d.terms ?? ''
  const filled = { ...d, termsText: fillTerms(termsTemplate, termVars(d, BIZ)) }
  const problems = sendProblems({ ...d, terms: termsTemplate })
  const link = proposalLink(token)
  const first = (d.customer?.name ?? '').split(' ')[0] || 'there'
  const message = `Hi ${first}, here's your Christmas light proposal from ${business.name}: ${link}\nYou can look it over, sign right on your phone, and we'll get you on the schedule. Questions? Call or text ${business.phone}.`

  async function run(label, fn) {
    setBusy(label)
    try { await fn() } catch (e) { setBusy(`Couldn’t save: ${e.message}`); return }
    setBusy(null)
  }
  const saveDraft = () => run('Saving…', () => saveProposal(user, token, { ...d, termsTemplate }))
  const send = () => run('Sending…', async () => {
    await saveProposal(user, token, { ...d, termsTemplate })
    await sendProposal(user, token, { ...d, termsTemplate }, BIZ)
    set({ status: 'sent' })
  })
  const revise = () => run('Reopening…', async () => { await reviseProposal(user, token, { ...d, termsTemplate }); set({ status: 'draft', terms: termsTemplate }) })
  const voidIt = () => window.confirm('Void this proposal? The customer’s link will say it’s no longer active.') && run('Saving…', async () => { await saveProposal(user, token, { status: 'void' }); set({ status: 'void' }) })
  const remove = () => window.confirm('Delete this proposal for good? Its link will stop working. This can’t be undone.') && run('Deleting…', async () => { await deleteProposal(token); onClose() })
  const cs = () => run('Signing…', async () => { await countersign(user, token, { name: csName.trim(), image: csImage }); set({ status: 'countersigned' }) })
  async function copy() { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* select instead */ } }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-night-950/95 p-3 backdrop-blur sm:p-6" role="dialog" aria-modal="true" aria-label="Proposal">
      <div className="mx-auto max-w-3xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold">Proposal</h2>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[live.status]}`}>{STATUS_LABEL[live.status]}</span>
            <button type="button" onClick={() => setPreview((v) => !v)} className={btn}>{preview ? 'Edit' : 'Preview'}</button>
            <button type="button" onClick={onClose} className={btn}>Close</button>
          </div>
        </div>
        {busy && <p className="text-sm text-glow-300" role="status">{busy}</p>}

        {preview ? (
          <div className="rounded-2xl bg-night-950 p-4"><ProposalDocument proposal={editable ? filled : { ...p, ...d }} business={BIZ} /></div>
        ) : (
          <>
            <fieldset disabled={!editable} className="space-y-4 disabled:opacity-80">
              <div className="grid gap-2 sm:grid-cols-2">
                {[['name', 'Customer name'], ['address', 'Address'], ['email', 'Email'], ['phone', 'Phone']].map(([k, label]) => (
                  <label key={k} className="text-sm text-slate-400">{label}
                    <input value={d.customer?.[k] ?? ''} onChange={(e) => set({ customer: { ...d.customer, [k]: e.target.value } })} className={field} />
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">Items</p>
                  {designs?.length > 0 && (
                    <select defaultValue="" onChange={(e) => { const des = designs.find((x) => x.id === e.target.value); if (des) set({ designId: des.id, items: designItems(des, settings) }); e.target.value = '' }} className={small} aria-label="Fill from a light design">
                      <option value="">Fill from a light design…</option>
                      {designs.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.feet} ft</option>)}
                    </select>
                  )}
                </div>
                {d.designId && <p className="text-xs text-slate-400">Design attached: the customer sees the mockup with a before/after slider.</p>}
                <ul className="space-y-2">
                  {d.items.map((i) => (
                    <li key={i.id} className="grid grid-cols-4 gap-2 rounded-xl bg-white/5 p-2 sm:grid-cols-[1fr_4.5rem_3.5rem_5.5rem_7rem_auto]">
                      <div className="col-span-4 flex gap-2 sm:col-span-1">
                        <input value={i.label} onChange={(e) => setItem(i.id, { label: e.target.value })} placeholder="Description (e.g. Front roofline)" aria-label="Description" className={`${small} min-w-0 flex-1`} />
                        <button type="button" onClick={() => set({ items: d.items.filter((x) => x.id !== i.id) })} aria-label="Remove item" className="px-2 text-slate-400 sm:hidden">✕</button>
                      </div>
                      <input value={i.qty} inputMode="decimal" onChange={(e) => setItem(i.id, { qty: e.target.value })} aria-label="Quantity" className={`${small} min-w-0`} />
                      <input value={i.unit} onChange={(e) => setItem(i.id, { unit: e.target.value })} placeholder="unit" aria-label="Unit" className={`${small} min-w-0`} />
                      <input value={i.rate} inputMode="decimal" onChange={(e) => setItem(i.id, { rate: e.target.value })} aria-label="Price each" placeholder="$ each" className={`${small} min-w-0`} />
                      <select value={i.due} onChange={(e) => setItem(i.id, { due: e.target.value })} className={`${small} min-w-0`} aria-label="When it's paid">
                        <option value="install">at install</option>
                        <option value="removal">at takedown</option>
                      </select>
                      <button type="button" onClick={() => set({ items: d.items.filter((x) => x.id !== i.id) })} aria-label="Remove item" className="hidden px-2 text-slate-400 sm:block">✕</button>
                      <input value={i.details ?? ''} onChange={(e) => setItem(i.id, { details: e.target.value })} placeholder="Details: color, bulb type, clips/stakes, timer" aria-label="Details" className={`${small} col-span-4 text-xs sm:col-span-6`} />
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => set({ items: [...d.items, newItem('', 1, '', 0)] })} className={btn}>＋ Add item</button>
                  {/* Takedown from the current install lines (replaces an existing takedown line). */}
                  <button type="button" onClick={() => {
                    const install = d.items.filter((i) => i.due !== 'removal')
                    const sub = install.reduce((tt, i) => tt + itemCents(i), 0)
                    set({ items: [...install, ...d.items.filter((i) => i.due === 'removal' && !/^Takedown/.test(i.label)), takedownItem(sub, settings.takedownPct ?? 15, settings.takedownMin ?? 150)] })
                  }} className={btn}>＋ Takedown ({settings.takedownPct ?? 15}%, min ${settings.takedownMin ?? 150})</button>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm text-slate-400">Discount % (install)
                  <input value={d.discountPct ?? 0} inputMode="decimal" onChange={(e) => set({ discountPct: Number(e.target.value) || 0, discountLabel: Number(e.target.value) ? (d.discountLabel || 'Early install discount') : '' })} className={`${field} w-28`} />
                </label>
                {owner.installType === 'Early Install' && !d.discountPct && <button type="button" onClick={() => set({ discountPct: 10, discountLabel: 'Early install discount' })} className={btn}>Early install 10%</button>}
                <label className="text-sm text-slate-400">Deposit %
                  <input value={d.depositPct ?? 0} inputMode="decimal" onChange={(e) => set({ depositPct: Number(e.target.value) || 0 })} className={`${field} w-24`} />
                </label>
                <div className="ml-auto text-right text-sm">
                  <p>Total <strong className="text-lg">{fmt(t.total)}</strong></p>
                  <p className="text-slate-400">Deposit {fmt(t.deposit)} · at install {fmt(t.dueAtInstall)}{t.dueAtRemoval ? ` · takedown ${fmt(t.dueAtRemoval)}` : ''}</p>
                </div>
              </div>

              <label className="block text-sm text-slate-400">Timer schedule (optional)
                <input value={d.timer ?? ''} onChange={(e) => set({ timer: e.target.value })} placeholder="e.g. On 5:30 PM, off 11:30 PM" className={field} />
              </label>
              <label className="block text-sm text-slate-400">Notes for the customer (optional)
                <textarea value={d.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} rows={2} className={field} />
              </label>

              <details className="rounded-xl border border-white/10 p-3" open={termsTemplate.includes(FILL_IN)}>
                <summary className="cursor-pointer text-sm font-semibold">Contract terms {termsTemplate.includes(FILL_IN) && <span className="text-glow-300">· has [TO FILL IN] parts</span>}</summary>
                <p className="mt-2 text-xs text-slate-500">{'{total}'}, {'{deposit}'}, {'{address}'} and the like fill in automatically when sent. Change the default for all proposals in ⚙ Settings.</p>
                <textarea value={termsTemplate} onChange={(e) => set({ termsTemplate: e.target.value })} rows={12} className={`${field} font-mono text-xs`} />
              </details>
            </fieldset>

            {editable && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={saveDraft} className={btn}>Save draft</button>
                <button type="button" onClick={send} disabled={problems.length > 0} className={primary}>Send to customer</button>
                {problems.length > 0 && <span className="text-sm text-glow-300">Needs: {problems.join(', ')}</span>}
              </div>
            )}
          </>
        )}

        {['sent', 'viewed'].includes(live.status) && (
          <div className="space-y-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
            <p className="font-semibold">Send the link {live.status === 'viewed' && <span className="text-sm font-normal text-violet-300">· they’ve opened it</span>}</p>
            <p className="break-all rounded-lg bg-night-950 px-3 py-2 font-mono text-xs">{link}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copy} className={btn}>{copied ? 'Copied ✓' : 'Copy link'}</button>
              {d.customer?.email && <a href={gmailUrl({ to: d.customer.email, subject: `Your Christmas light proposal from ${business.name}`, body: message })} target="_blank" rel="noreferrer" className={btn}>Email it</a>}
              <TextButton phone={d.customer?.phone} message={message} label="Text it" className={btn} />
              <a href={link} target="_blank" rel="noreferrer" className={btn}>Open customer view</a>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
              <button type="button" onClick={revise} className={btn}>Make changes (reopens as draft)</button>
            </div>
          </div>
        )}

        {live.status === 'signed' && (
          <div className="space-y-3 rounded-2xl border border-glow-400/40 bg-glow-400/5 p-4">
            <p className="font-semibold">Signed by {p.signature?.name}. Countersign to finish the agreement:</p>
            <label className="block text-sm text-slate-400">Your name and title
              <input value={csName} onChange={(e) => setCsName(e.target.value)} placeholder="e.g. Scott Minor, Owner" className={field} />
            </label>
            <SignaturePad onChange={setCsImage} height={120} />
            <button type="button" onClick={cs} disabled={csName.trim().length < 2} className={primary}>Countersign</button>
          </div>
        )}
        {live.status === 'countersigned' && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="font-semibold text-emerald-300">Signed by both ✓</p>
            <a href={link} target="_blank" rel="noreferrer" className={btn}>Open signed copy (print / PDF)</a>
          </div>
        )}
        {['signed', 'countersigned'].includes(live.status) && (
          <Payments p={p} first={first} link={link} onAsk={(part, on) => run('Saving…', () => saveProposal(user, token, { requests: { [part]: on } }))} />
        )}
        {(canVoidProposal(live) || canDeleteProposal(live)) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            {canVoidProposal(live) && <button type="button" onClick={voidIt} className={`${btn} text-slate-400`}>Void</button>}
            {canDeleteProposal(live) && <button type="button" onClick={remove} className={`${btn} text-berry-500`}>Delete</button>}
            {live.deposit?.env === 'sandbox' && <span className="text-xs text-slate-500">Test payment: can be deleted</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// Proposals for one customer or lead.
// owner: { type, id, name, address, email, phone, installType }
export default function ProposalsPanel({ owner }) {
  const { user, settings } = useStaff()
  const proposals = useProposals(user, owner.id)
  const { designs } = useDesigns(user, owner.id)
  const [open, setOpen] = useState(null) // token
  const [busy, setBusy] = useState(false)
  const [showVoid, setShowVoid] = useState(false)
  const current = open && proposals?.find((x) => x.id === open)
  const voided = proposals?.filter((x) => x.status === 'void').length ?? 0
  const listed = proposals?.filter((x) => showVoid || x.status !== 'void') ?? []

  async function create() {
    setBusy(true)
    const latest = designs?.[0]
    // Saved terms that were never finished fall back to the current default.
    const terms = settings.proposalTerms && !settings.proposalTerms.includes(FILL_IN) ? settings.proposalTerms : DEFAULT_TERMS
    const p = {
      ...newProposal({
        customer: { name: owner.name, email: owner.email, phone: owner.phone, address: owner.address },
        items: latest ? designItems(latest, settings) : [newItem('C9 lights, installed (12" spacing)', 0, 'ft', settings.designPricePerFoot ?? 0)],
        depositPct: settings.depositPct ?? 50,
        discountPct: owner.installType === 'Early Install' ? 10 : 0,
        terms,
        season: String(new Date().getFullYear()),
      }),
      termsTemplate: terms,
      ...(latest ? { designId: latest.id } : {}),
    }
    try { setOpen(await createProposal(user, owner, p)) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={create} disabled={busy} className={primary}>{busy ? 'Starting…' : '📝 New proposal'}</button>
        {voided > 0 && (
          <button type="button" onClick={() => setShowVoid((v) => !v)} aria-pressed={showVoid}
            className="min-h-11 rounded-full border border-white/10 px-4 text-sm text-slate-400 hover:bg-white/5">
            {showVoid ? 'Hide voided' : `Voided (${voided})`}
          </button>
        )}
      </div>
      {listed.length > 0 && (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
          {listed.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => setOpen(x.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/5">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{x.title}{x.season ? ` · ${x.season}` : ''}</span>
                  <span className="block text-xs text-slate-400">{fmt(totals(x).total)}{paidSummary(x)} · {x.status === 'draft' ? `saved ${when(x.savedAt)}` : x.signedAt ? `signed ${when(x.signedAt)}` : `sent ${when(x.sentAt)}`}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[x.status]}`}>{STATUS_LABEL[x.status]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {current && <Editor key={current.id + current.status} token={current.id} p={current} owner={owner} designs={designs} settings={settings} user={user} onClose={() => setOpen(null)} />}
    </div>
  )
}
