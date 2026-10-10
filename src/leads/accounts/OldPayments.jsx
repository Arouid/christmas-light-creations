import { useEffect, useState } from 'react'
import { FILED_STATUSES, findCustomer } from '../../lib/oldEstimates'
import { contactLinks, matchedBy, paymentsFromPast, seasonFills, uniquePayments } from '../../lib/oldPayments'
import { queryOnce, updateField } from '../staffStore'

// "From old records": what the old-history import found about a customer that
// isn't on their record yet (src/lib/oldPayments.js):
// - old PayPal/Square payments → their Seasons (only empty boxes are filled),
//   so the Seasons table and the customer's "What you've paid" show them;
// - phones/emails from Past requests cards matched to them → otherPhones /
//   otherEmails, so re-importing the customer history brings those texts,
//   calls and emails over.
const btn = 'min-h-11 rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-40'
const PART = { install: 'Lights up', takedown: 'Takedown' }

async function applyFills(user, customerId, fills) {
  for (const f of fills) await updateField(user, 'customers', customerId, f.path, f.value)
}
async function applyLinks(user, c, links) {
  if (links.phones.length) await updateField(user, 'customers', c.id, 'otherPhones', [...(c.otherPhones ?? []), ...links.phones])
  if (links.emails.length) await updateField(user, 'customers', c.id, 'otherEmails', [...(c.otherEmails ?? []), ...links.emails])
}
const usePaymentMessages = (field, value) => {
  const [list, setList] = useState(null)
  useEffect(() => {
    let live = true
    queryOnce('messages', field, value).then((l) => { if (live) setList(l.filter((m) => m.kind === 'payment')) }).catch(() => { if (live) setList([]) })
    return () => { live = false }
  }, [field, value])
  return list
}

function SeasonRow({ s, onAdd, busy }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{s.season} season</p>
        {['install', 'takedown'].filter((k) => s.parts[k]).map((k) => (
          <p key={k} className="text-slate-300">{PART[k]}: ${s.parts[k].amount.toFixed(2)} <span className="text-slate-400">· {s.parts[k].via}{s.parts[k].count > 1 ? ` (${s.parts[k].count} payments)` : ''} · {s.parts[k].date}</span></p>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={onAdd} className={btn}>Add</button>
    </li>
  )
}

// On a customer's account page. `past` = Past requests cards matched to them.
export function OldRecordsPanel({ customer: c, user, past = [] }) {
  const messages = usePaymentMessages('customerId', c.id)
  const [busy, setBusy] = useState(false)
  const kept = past.filter((r) => !FILED_STATUSES.includes(r.status))
  const seasons = seasonFills(uniquePayments([...(messages ?? []).map((m) => ({ ...m, customerId: c.id })), ...kept.flatMap((r) => paymentsFromPast(r, c.id))]), c)
  const links = contactLinks(kept, c)
  const nameOnly = kept.some((r) => matchedBy(r, c) === 'name')
  if (!seasons.length && !links.phones.length && !links.emails.length) return null
  const run = async (fn) => { setBusy(true); try { await fn() } finally { setBusy(false) } }
  return (
    <details open className="rounded-2xl border border-glow-400/30 bg-night-900">
      <summary className="cursor-pointer px-4 py-3 font-semibold">🗂 From old records</summary>
      <div className="space-y-3 border-t border-white/10 p-4 text-sm">
        {seasons.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold">Old payments to add to Seasons ({seasons.length})</p>
            <p className="text-slate-400">From old PayPal/Square emails and Past requests cards. January–April payments count as takedown unless the payment says otherwise. Only empty boxes are filled; fix anything in Edit details.</p>
            <ul className="divide-y divide-white/5">{seasons.map((s) => <SeasonRow key={s.season} s={s} busy={busy} onAdd={() => run(() => applyFills(user, c.id, s.fills))} />)}</ul>
            {seasons.length > 1 && <button type="button" disabled={busy} onClick={() => run(() => applyFills(user, c.id, seasons.flatMap((s) => s.fills)))} className={btn}>Add all {seasons.length} seasons</button>}
          </div>
        )}
        {(links.phones.length > 0 || links.emails.length > 0) && (
          <div className="space-y-2">
            <p className="font-semibold">Other phones / emails on their old records</p>
            <p className="text-slate-300">{[...links.phones, ...links.emails].join(' · ')}</p>
            {nameOnly && <p className="text-glow-300">Matched by name only: make sure this is the same person.</p>}
            <p className="text-slate-400">Link them, then re-import the customer history (Import tab) to bring over texts, calls and emails from them.</p>
            <button type="button" disabled={busy} onClick={() => run(() => applyLinks(user, c, links))} className={btn}>Link to {c.fullName}</button>
          </div>
        )}
      </div>
    </details>
  )
}

// On the Accounts search page: every customer with old payments or contact
// info not yet on their record.
export function OldRecordsToFill({ customers, past = [], user, open }) {
  const messages = usePaymentMessages('kind', 'payment')
  const [progress, setProgress] = useState(null)
  const byId = new Map((customers ?? []).map((c) => [c.id, c]))
  const pastBy = new Map()
  for (const r of past) {
    if (FILED_STATUSES.includes(r.status)) continue
    const c = (r.customerId && byId.get(r.customerId)) || findCustomer(r, customers ?? [])
    if (c) pastBy.set(c.id, [...(pastBy.get(c.id) ?? []), r])
  }
  const msgBy = new Map()
  for (const m of messages ?? []) if (m.customerId) msgBy.set(m.customerId, [...(msgBy.get(m.customerId) ?? []), m])
  const todo = (customers ?? []).map((c) => {
    const mine = pastBy.get(c.id) ?? []
    const seasons = seasonFills(uniquePayments([...(msgBy.get(c.id) ?? []), ...mine.flatMap((r) => paymentsFromPast(r, c.id))]), c)
    // Bulk linking only for cards matched by email or phone, never by name alone.
    const links = contactLinks(mine.filter((r) => matchedBy(r, c) !== 'name'), c)
    const nameOnly = contactLinks(mine.filter((r) => matchedBy(r, c) === 'name'), c)
    return { c, seasons, links, check: nameOnly.phones.length + nameOnly.emails.length > 0 }
  }).filter((x) => x.seasons.length || x.links.phones.length || x.links.emails.length || x.check)
  if (!todo.length) return null
  const bulk = todo.filter((x) => x.seasons.length || x.links.phones.length || x.links.emails.length)
  const fillAll = async () => {
    const s = bulk.reduce((t, x) => t + x.seasons.length, 0)
    const l = bulk.filter((x) => x.links.phones.length || x.links.emails.length).length
    if (!window.confirm(`Add old payments to ${s} seasons and link old phones/emails for ${l} customers? Only empty boxes are filled; name-only matches are left for you to check.`)) return
    let done = 0
    setProgress(`0 / ${bulk.length}`)
    try {
      for (const x of bulk) {
        await applyFills(user, x.c.id, x.seasons.flatMap((v) => v.fills))
        await applyLinks(user, x.c, x.links)
        setProgress(`${++done} / ${bulk.length}`)
      }
    } finally {
      setProgress(null)
    }
  }
  return (
    <details className="mt-4 rounded-2xl border border-white/10 bg-night-900">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">From old records: {todo.length} customer{todo.length === 1 ? '' : 's'} to update</summary>
      <div className="space-y-2 border-t border-white/10 p-3 text-sm">
        <p className="text-slate-400">Old payments go into Seasons (empty boxes only); old phones/emails are linked so re-importing the customer history (Import tab) brings their texts and emails over.</p>
        {bulk.length > 0 && <button type="button" disabled={Boolean(progress)} onClick={fillAll} className={btn}>{progress ? `Adding… ${progress}` : `Add all (${bulk.length} customer${bulk.length === 1 ? '' : 's'})`}</button>}
        <ul className="divide-y divide-white/5">
          {todo.map((x) => (
            <li key={x.c.id}><button type="button" onClick={() => open(`customer:${x.c.id}`)} className="block min-h-11 w-full px-1 py-2 text-left hover:bg-white/5">
              <span className="font-medium">{x.c.fullName}</span>
              <span className="text-slate-400">{x.seasons.length ? ` · payments ${x.seasons.map((s) => s.season).join(', ')}` : ''}{x.links.phones.length + x.links.emails.length ? ` · ${x.links.phones.length + x.links.emails.length} phone/email to link` : ''}</span>
              {x.check && <span className="text-glow-300"> · name match: check</span>}
            </button></li>
          ))}
        </ul>
      </div>
    </details>
  )
}
