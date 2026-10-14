import { useState } from 'react'
import { describeKey, withoutBlocked } from '../lib/blocklist'
import { DEFAULT_SCHEDULE } from '../lib/discounts'
import { STAFF_NAMES, staffName, staffTitle } from '../lib/activity'
import { useStaff } from './staffContext'
import { useLiveCollection } from './staffStore'
import HomeBase from './HomeBase'
import InstallApp from './InstallApp'
import { InstallTextSettings } from './InstallTexts'
import { DEFAULT_TERMS, FILL_IN } from '../proposals/terms.js'
import { giftWrappingOn } from '../lib/giftWrapping'
import { salesTaxSettings } from '../lib/salesTax'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const box = 'space-y-2 rounded-2xl border border-white/10 bg-night-950 p-4'
const small = 'w-full rounded-lg border border-white/15 bg-night-900 px-2 py-1.5 text-sm'

// "10-15" <-> "Oct 15" for the schedule editor.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const toLabel = (md) => `${MONTHS[+md.slice(0, 2) - 1]} ${+md.slice(3)}`
const fromLabel = (t) => {
  const m = t.trim().match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})$/i)
  const i = m ? MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()) : -1
  return i >= 0 ? `${String(i + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null
}

function DiscountSchedule({ settings, onSave }) {
  const [rows, setRows] = useState(() => (settings.discountSchedule ?? DEFAULT_SCHEDULE).map((r) => ({ from: toLabel(r.from), to: toLabel(r.to), pct: String(r.pct) })))
  const [msg, setMsg] = useState(null)
  const set = (i, patch) => { setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); setMsg(null) }

  async function save() {
    const parsed = rows.map((r) => ({ from: fromLabel(r.from), to: fromLabel(r.to), pct: Number(r.pct) }))
    if (parsed.some((r) => !r.from || !r.to || r.from > r.to || !(r.pct > 0 && r.pct < 100))) {
      return setMsg('Use dates like "Oct 15" (first ≤ last) and a percent between 1 and 99.')
    }
    await onSave({ discountSchedule: parsed.sort((a, b) => a.from.localeCompare(b.from)) })
    setMsg('Saved ✓')
  }

  return (
    <div className={box}>
      <p className="font-semibold">Early-install discounts</p>
      <p className="text-sm text-slate-400">By install date (planned date, or the start of “week of”). Dates outside these get no discount. “Special Rate” customers are never changed.</p>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_4.5rem_auto] items-center gap-2 text-sm">
          <input aria-label="From" value={r.from} onChange={(e) => set(i, { from: e.target.value })} className={small} placeholder="Oct 15" />
          <input aria-label="To" value={r.to} onChange={(e) => set(i, { to: e.target.value })} className={small} placeholder="Oct 31" />
          <label className="flex items-center gap-1"><input aria-label="Percent" value={r.pct} inputMode="numeric" onChange={(e) => set(i, { pct: e.target.value })} className={small} />%</label>
          <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove row" className="px-2 text-slate-400">✕</button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRows((rs) => [...rs, { from: '', to: '', pct: '' }])} className="rounded-full bg-white/10 px-4 py-2 text-sm">+ Add dates</button>
        <button type="button" onClick={save} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">Save</button>
        {msg && <span className={`text-sm ${msg.startsWith('Saved') ? 'text-emerald-400' : 'text-berry-500'}`}>{msg}</span>}
      </div>
    </div>
  )
}

// "How full we are" line on the home page (settings/app.bookingStatus, read
// by the bookingStatus function). Must be true; hides itself after 14 days.
function BookingStatus({ settings, onSave }) {
  const cur = settings.bookingStatus ?? {}
  const [text, setText] = useState(cur.text ?? '')
  const [msg, setMsg] = useState(null)
  const [opened] = useState(() => Date.now())
  const age = cur.updatedAt ? Math.max(0, Math.floor((opened - Date.parse(cur.updatedAt)) / 86400000)) : null
  async function save(value) {
    await onSave({ bookingStatus: { text: value.trim().slice(0, 120), updatedAt: new Date().toISOString() } })
    setText(value.trim())
    setMsg(value.trim() ? 'Saved ✓ It shows on the website within 5 minutes.' : 'Removed ✓')
  }
  return (
    <div className={box}>
      <p className="font-semibold">How booked we are (home page)</p>
      <p className="text-sm text-slate-400">
        A short, true line under the main buttons, like “October is 80% booked” or “Only weekends left in November”. It hides itself if nobody updates it for 14 days{cur.text && age != null ? ` (last updated ${age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`})` : ''}.
      </p>
      <input value={text} maxLength={120} onChange={(e) => { setText(e.target.value); setMsg(null) }} className={field} placeholder="October is 80% booked" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => save(text)} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">Save</button>
        {cur.text && <button type="button" onClick={() => save('')} className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold">Remove from website</button>}
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
      </div>
    </div>
  )
}

// Gift wrapping on the website (docs/specs/gift-wrapping.md): built, off
// until the owner says go (2026-10-13). settings/app.giftWrapping is read by
// the `booking` function with the availability; the page draws the section
// only when it says so, so the built HTML never carries it.
function GiftWrapping({ settings, onSave }) {
  const [msg, setMsg] = useState(null)
  const on = giftWrappingOn(settings)
  async function toggle(next) {
    await onSave({ giftWrapping: next })
    setMsg(next ? 'Saved ✓ It shows on the website within 5 minutes.' : 'Saved ✓ Gone from the website within 5 minutes.')
  }
  return (
    <div className={box}>
      <p className="font-semibold">🎁 Gift wrapping</p>
      <p className="text-sm text-slate-400">
        Off: nothing about gift wrapping shows anywhere on the website. On: the home page gets a Gift wrapping section (with its menu link and FAQ answers) and the estimate form asks “What do you need?” (Christmas lights / Gift wrapping / Both); a request that asks for it shows 🎁 on the lead and in the alert email, and its “Got your request” email talks about wrapping.
      </p>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} className="size-5 accent-glow-400" />
        <span className="font-semibold text-slate-100">Show gift wrapping on the website</span>
      </label>
      {msg && <span className="text-sm text-emerald-400">{msg}</span>}
    </div>
  )
}

// What the sales assistant knows beyond the website copy
// (settings/app.assistantNotes): the owner's own facts and answers, read on
// every ✨ Suggest a reply draft (docs/specs/sales-assistant.md). The prompt's
// hard rules (no prices, no dates, nothing sent by itself) still win.
const NOTES_MAX = 6000
function AssistantNotes({ settings, onSave }) {
  const cur = settings.assistantNotes ?? ''
  const [text, setText] = useState(cur)
  const [msg, setMsg] = useState(null)
  async function save() {
    await onSave({ assistantNotes: text.trim().slice(0, NOTES_MAX) })
    setMsg('Saved ✓ The next draft uses it.')
  }
  return (
    <div className={box}>
      <p className="font-semibold">What the sales assistant knows</p>
      <p className="text-sm text-slate-400">Facts and answers for ✨ Suggest a reply beyond what the website says: a new offer, how you answer a common question, what to say about businesses or tile roofs. Plain sentences, one per line. Whatever you write here, it still never gives a price or a date, and nothing is sent without a person.</p>
      <textarea value={text} rows={8} maxLength={NOTES_MAX} onChange={(e) => { setText(e.target.value); setMsg(null) }} className={field}
        placeholder={'We light businesses too: storefronts, restaurants and neighborhood entrances.\nA lease gets 10% cheaper every returning year, up to 50% off.'} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={text.trim() === cur.trim()} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950 disabled:opacity-50">Save</button>
        <span className="text-xs text-slate-500">{text.length}/{NOTES_MAX}</span>
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
      </div>
    </div>
  )
}

// Sales tax (settings/app.salesTax, src/lib/salesTax.js, docs/specs/receipts.md):
// the rate new estimates and invoices carry, the permit number printed on
// invoices, and the day it starts. Owner 2026-10-12: Texas + local, from Oct 15.
function SalesTax({ settings, onSave }) {
  const cur = salesTaxSettings(settings)
  const [v, setV] = useState({ ratePct: String(cur.ratePct), permit: cur.permit, from: cur.from })
  const [msg, setMsg] = useState(null)
  const edit = (patch) => { setV({ ...v, ...patch }); setMsg(null) }
  async function save() {
    const next = salesTaxSettings({ salesTax: v })
    await onSave({ salesTax: next })
    setV({ ratePct: String(next.ratePct), permit: next.permit, from: next.from })
    setMsg('Saved ✓ New estimates and invoices from the start date use it.')
  }
  return (
    <div className={box}>
      <p className="font-semibold">Sales tax</p>
      <p className="text-sm text-slate-400">Its own line on new estimates and invoices for new lights and leases (a first-year install, an add-on, every lease payment); never on re-installs of lights the customer owns, their takedown, or service calls. Texas + local is 8.25% here; your CPA confirms the rate. 0 switches it off.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm text-slate-400">Rate %<input value={v.ratePct} inputMode="decimal" onChange={(e) => edit({ ratePct: e.target.value })} className={field} /></label>
        <label className="text-sm text-slate-400">Permit number<input value={v.permit} maxLength={40} onChange={(e) => edit({ permit: e.target.value })} className={field} placeholder="printed on invoices once set" /></label>
        <label className="text-sm text-slate-400">From<input type="date" value={v.from} onChange={(e) => edit({ from: e.target.value })} className={field} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">Save</button>
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
      </div>
    </div>
  )
}

// "Check availability" on the website (functions/availability.js): how many
// installs fit in a day, which days we work, and day-by-day changes (helper
// days, rain, days off). Saved in settings/app.availability.
const WEEK = [['Sun', 0], ['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6]]
function InstallAvailability({ settings, onSave }) {
  const cur = { perDay: 2, workDays: [1, 2, 3, 4, 5, 6], overrides: {}, show: 3, ...(settings.availability ?? {}) }
  const [day, setDay] = useState('')
  const [count, setCount] = useState('6')
  const [msg, setMsg] = useState(null)
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'))
  const save = async (changes) => { await onSave({ availability: { ...cur, ...changes } }); setMsg('Saved ✓ The website updates within 10 minutes.') }
  const upcoming = Object.entries(cur.overrides).filter(([d]) => d >= today).sort()
  const label = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <div className={box}>
      <p className="font-semibold">Install availability (website “Check availability”)</p>
      <p className="text-sm text-slate-400">The website shows the next real open install days. A day is full when its planned installs (Season dates and route stops) reach its number below. Customers only ever see dates.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm text-slate-400">Installs on a normal day
          <input type="number" min="0" max="20" defaultValue={cur.perDay} onBlur={(e) => save({ perDay: Number(e.target.value) || 0 })} className={field} /></label>
        <label className="text-sm text-slate-400">Dates shown on the website
          <input type="number" min="1" max="7" defaultValue={cur.show} onBlur={(e) => save({ show: Math.min(7, Math.max(1, Number(e.target.value) || 3)) })} className={field} /></label>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Days we install">
        {WEEK.map(([name, n]) => {
          const on = cur.workDays.includes(n)
          return <button key={n} type="button" aria-pressed={on} onClick={() => save({ workDays: on ? cur.workDays.filter((x) => x !== n) : [...cur.workDays, n].sort() })}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${on ? 'bg-glow-400 text-night-950' : 'bg-white/10 text-slate-400'}`}>{name}</button>
        })}
      </div>
      <p className="text-sm text-slate-400">Change one day: <strong>6</strong> on helper days, <strong>0</strong> for rain or a day off.</p>
      <div className="flex flex-wrap items-end gap-2">
        <input type="date" value={day} min={today} onChange={(e) => setDay(e.target.value)} aria-label="Day" className={`${field} w-44`} />
        <input type="number" min="0" max="20" value={count} onChange={(e) => setCount(e.target.value)} aria-label="Installs that day" className={`${field} w-20`} />
        <button type="button" disabled={!day} onClick={() => { save({ overrides: { ...cur.overrides, [day]: Number(count) || 0 } }); setDay('') }} className="min-h-11 rounded-full bg-glow-400 px-5 text-sm font-semibold text-night-950 disabled:opacity-40">Set</button>
      </div>
      {upcoming.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {upcoming.map(([d, n]) => (
            <li key={d} className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-3 pr-1">
              {label(d)}: {Number(n) === 0 ? 'closed' : `${n} installs`}
              <button type="button" aria-label={`Remove change for ${label(d)}`} onClick={() => { const next = { ...cur.overrides }; delete next[d]; save({ overrides: next }) }} className="min-h-11 min-w-11 rounded-full text-slate-400">✕</button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
    </div>
  )
}

// Who gets an email the moment a website estimate request comes in
// (functions/index.js reads settings/app.alertEmails).
function AlertEmails({ settings, onSave }) {
  const [text, setText] = useState((settings.alertEmails ?? []).join('\n'))
  const [msg, setMsg] = useState(null)
  async function save() {
    const list = [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))]
    const bad = list.filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
    if (bad.length) return setMsg(`Not an email: ${bad.join(', ')}`)
    await onSave({ alertEmails: list })
    setText(list.join('\n'))
    setMsg('Saved ✓')
  }
  return (
    <div className={box}>
      <p className="font-semibold">New-request alerts</p>
      <p className="text-sm text-slate-400">
        These emails get a message the moment someone asks for an estimate on the website. Use the Gmail on your phone so it pops up as a notification. One per line.
      </p>
      <textarea value={text} rows={3} onChange={(e) => { setText(e.target.value); setMsg(null) }} className={field} placeholder="name@gmail.com" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">Save</button>
        {msg && <span className={`text-sm ${msg.startsWith('Saved') ? 'text-emerald-400' : 'text-berry-500'}`}>{msg}</span>}
      </div>
    </div>
  )
}

// Automatic emails (docs/specs/auto-emails.md): what the server sends on its
// own. Off at once: each function reads settings/app when it runs.
const AUTO_EMAILS = [
  ['ackRequests', '“Got your request” to the customer', 'The moment a website estimate request comes in: what happens next, the designer link, Pay in 3. Filed in the lead’s history.'],
  ['weatherEmails', 'Weather heads-ups', 'Each afternoon the server reads the National Weather Service forecast for Pearland. Storms, strong wind or a freeze ahead: customers on a route that day hear their date may move, customers with lights up get the storm tips (unless they turned them off), and you get a notification and an email.'],
  ['staffNudges', '“Still waiting” reminders to staff', 'Every hour from 8 am to 8 pm: a notification and an email to the alert list when a customer message, request or problem report has waited 2+ hours with nobody tapping I’ve got it.'],
  ['pitchFilter', 'File sales pitches as spam', 'A request that reads like a cold pitch to a business (an opt-out line, “we help local companies”, a free cleaning / SEO / marketing bid…) goes straight under Leads → Spam / test with the reason: no alert, no “Got your request”. Home’s Recent activity notes it; one tap (It’s a real request) brings a wrong one back.'],
  ['reviewAsks', 'Review request after install', 'Two days after an install is marked Install Completed, the customer gets one “thank you, a Google review helps a small family business more than anything” email with the review link (same words for everyone, nothing offered), and one reminder four days later unless they wrote back or you tapped ★ They reviewed. People who prefer texts get a ⭐ Review text to send item in 💬 for you to send from Voice. Never while a service call is open, never to anyone who turned optional emails off.'],
]
// Blocked senders (docs/specs/spam-filters.md): the 🚫 Spam button on an unmatched text or
// email (Leads tab) adds the sender here; the sync drops their next messages before they
// are stored. settings/app.blockedSenders, keys from functions/blocklist.js.
function BlockedSenders({ settings, onSave }) {
  const list = Array.isArray(settings.blockedSenders) ? settings.blockedSenders : []
  const [msg, setMsg] = useState(null)
  async function unblock(key) {
    await onSave({ blockedSenders: withoutBlocked(list, key) })
    setMsg('Unblocked ✓')
  }
  return (
    <div className={box}>
      <p className="font-semibold">🚫 Blocked senders</p>
      <p className="text-sm text-slate-400">Numbers and addresses marked <b>Spam</b> on the Leads tab (“messages from people we don’t know yet”). Their next texts and emails are dropped by the sync before anyone sees them, and blocked emails go to Gmail’s spam folder.</p>
      {list.length ? (
        <ul className="space-y-1">
          {list.map((k) => (
            <li key={k} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span className="break-all">{describeKey(k)}</span>
              <button type="button" onClick={() => unblock(k)} className="min-h-11 shrink-0 rounded-full bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">Unblock</button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-500">Nobody blocked yet.</p>}
      {msg && <span className="text-sm text-emerald-400">{msg}</span>}
    </div>
  )
}

function AutoEmails({ settings, onSave }) {
  const [msg, setMsg] = useState(null)
  async function toggle(key, on) {
    await onSave({ [key]: on })
    setMsg('Saved ✓')
  }
  return (
    <div className={box}>
      <p className="font-semibold">Automatic emails</p>
      <p className="text-sm text-slate-400">What the website does by itself. Every customer email carries the logo, the phone number and the “found us in spam?” line.</p>
      {AUTO_EMAILS.map(([key, label, help]) => (
        <label key={key} className="flex min-h-11 cursor-pointer items-start gap-3">
          <input type="checkbox" checked={settings[key] !== false} onChange={(e) => toggle(key, e.target.checked)} className="mt-1 size-5 accent-glow-400" />
          <span className="text-sm"><span className="font-semibold text-slate-100">{label}</span><span className="block text-slate-400">{help}</span></span>
        </label>
      ))}
      {msg && <span className="text-sm text-emerald-400">{msg}</span>}
    </div>
  )
}

// Names on Home (Recent activity, "… is on it"): one box per person on the
// staff list, shared by everyone (settings/app.staffNames, docs/specs/dashboard.md).
const byEmail = (a, b) => a.id.localeCompare(b.id)
function StaffNames({ settings, onSave }) {
  const { user } = useStaff()
  const staff = useLiveCollection(user, 'staff', byEmail)
  const saved = Object.fromEntries((settings.staffNames ?? []).map((x) => [String(x.email).toLowerCase(), x.name]))
  const savedTitles = Object.fromEntries((settings.staffNames ?? []).map((x) => [String(x.email).toLowerCase(), x.title ?? '']))
  const [names, setNames] = useState(saved)
  const [titles, setTitles] = useState(savedTitles)
  const [msg, setMsg] = useState(null)
  const emails = [...new Set([...(staff.items ?? []).map((x) => x.id.toLowerCase()), ...Object.keys(saved)])].sort()
  async function save() {
    await onSave({ staffNames: emails.map((email) => ({ email, name: String(names[email] ?? '').trim(), title: String(titles[email] ?? '').trim() })).filter((x) => x.name || x.title) })
    setMsg('Saved ✓')
  }
  return (
    <div className={box}>
      <p className="font-semibold">Staff names</p>
      <p className="text-sm text-slate-400">Name: how each person shows on Home (“Katie emailed…”, “Scott is on it”) and signs emails (“Katie at Christmas Light Creations”); first name and last initial. Title: under the name in the email sign-off. Empty = the grey default (Scott M. Owner, Lacie M. Co-owner, Katie P. Customer care).</p>
      {staff.error && <p className="text-sm text-berry-500">Couldn’t load the staff list.</p>}
      {!staff.error && !emails.length && <p className="text-sm text-slate-400">Loading the staff list…</p>}
      {emails.map((email) => (
        <div key={email} className="grid gap-2 sm:grid-cols-2">
          <label className="block break-all text-sm text-slate-400">{email}
            <input list="staff-first-names" value={names[email] ?? ''} placeholder={staffName(email)} autoComplete="off" aria-label={`Name for ${email}`}
              onChange={(e) => { setNames({ ...names, [email]: e.target.value }); setMsg(null) }} className={field} />
          </label>
          <label className="block text-sm text-slate-400">Title
            <input value={titles[email] ?? ''} placeholder={staffTitle(email) || 'e.g. Customer care'} autoComplete="off" aria-label={`Title for ${email}`}
              onChange={(e) => { setTitles({ ...titles, [email]: e.target.value }); setMsg(null) }} className={field} />
          </label>
        </div>
      ))}
      <datalist id="staff-first-names">{STAFF_NAMES.map((n) => <option key={n} value={n} />)}</datalist>
      {emails.length > 0 && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">Save</button>
          {msg && <span className="text-sm text-emerald-400">{msg}</span>}
        </div>
      )}
    </div>
  )
}

// Defaults for new proposals: deposit, takedown %, who countersigns, and the
// contract terms (owner + attorney to finish every [TO FILL IN]).
function ProposalDefaults({ settings, onSave }) {
  const [terms, setTerms] = useState(settings.proposalTerms && !settings.proposalTerms.includes(FILL_IN) ? settings.proposalTerms : DEFAULT_TERMS)
  const [msg, setMsg] = useState(null)
  const num = (k) => (e) => onSave({ [k]: e.target.value === '' ? null : Number(e.target.value) })
  return (
    <div className={box}>
      <p className="font-semibold">Proposals & contracts</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="text-sm text-slate-400">Deposit %<input type="number" min="0" max="100" defaultValue={settings.depositPct ?? 50} onBlur={num('depositPct')} className={field} /></label>
        <label className="text-sm text-slate-400">Takedown % of install<input type="number" min="0" max="100" defaultValue={settings.takedownPct ?? 15} onBlur={num('takedownPct')} className={field} /></label>
        <label className="text-sm text-slate-400">Takedown minimum $<input type="number" min="0" defaultValue={settings.takedownMin ?? 150} onBlur={num('takedownMin')} className={field} /></label>
        <p className="col-span-2 text-xs text-slate-500 sm:col-span-3">Takedown included in the install price? Set both takedown boxes to 0: new proposals get no takedown line or payment, and the contract terms’ takedown sentence should be edited below.</p>
        <label className="col-span-2 text-sm text-slate-400 sm:col-span-1">Countersigned by<input defaultValue={settings.countersignName ?? ''} placeholder="Scott Minor, Owner" onBlur={(e) => onSave({ countersignName: e.target.value.trim() })} className={field} /></label>
      </div>
      <label className="block text-sm text-slate-400">Contract terms for new proposals
        <textarea value={terms} onChange={(e) => { setTerms(e.target.value); setMsg(null) }} rows={10} className={`${field} font-mono text-xs`} />
      </label>
      {terms.includes(FILL_IN) && <p className="text-sm text-glow-300">Finish the parts marked [TO FILL IN] (ideally with a Texas attorney). Proposals can’t be sent until they’re done.</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={async () => { await onSave({ proposalTerms: terms }); setMsg('Saved ✓') }} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">Save terms</button>
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
      </div>
    </div>
  )
}

export default function SettingsPanel({ settings, onSave, textFrom, onTextFrom, onClose }) {
  const [account, setAccount] = useState(settings.voiceAccount ?? '')
  const [saved, setSaved] = useState(false)

  async function saveAccount(e) {
    e.preventDefault()
    await onSave({ voiceAccount: account.trim().toLowerCase() })
    setSaved(true)
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="mx-auto max-w-xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold">Settings</h2>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Done</button>
        </div>

        <div className={box}><InstallApp /></div>

        <AlertEmails settings={settings} onSave={onSave} />
        <AutoEmails settings={settings} onSave={onSave} />
        <BlockedSenders settings={settings} onSave={onSave} />

        <StaffNames settings={settings} onSave={onSave} />

        <BookingStatus settings={settings} onSave={onSave} />
        <GiftWrapping settings={settings} onSave={onSave} />
        <AssistantNotes settings={settings} onSave={onSave} />
        <SalesTax settings={settings} onSave={onSave} />

        <InstallAvailability settings={settings} onSave={onSave} />

        <form onSubmit={saveAccount} className={box}>
          <p className="font-semibold">Business texting (Google Voice)</p>
          <p className="text-sm text-slate-400">
            The Google account that owns the business Voice number. Text buttons open Voice in that account, so staff must be signed in to it
            (browser and Voice app). Shared by all staff.
          </p>
          <label className="block text-sm text-slate-400">Voice account email
            <input type="email" value={account} onChange={(e) => { setAccount(e.target.value); setSaved(false) }} className={field} placeholder="name@gmail.com" />
          </label>
          <button className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">{saved ? 'Saved ✓' : 'Save'}</button>
        </form>

        <div className={box}>
          <p className="font-semibold">On this device, text from</p>
          {[['business', 'The business number (account above)'], ['own', 'My own Google Voice number']].map(([v, label]) => (
            <label key={v} className="flex items-center gap-3 text-sm">
              <input type="radio" name="textFrom" checked={textFrom === v} onChange={() => onTextFrom(v)} /> {label}
            </label>
          ))}
          <p className="text-xs text-slate-500">Saved on this phone or computer only. Each staff member picks their own.</p>
        </div>

        <InstallTextSettings settings={settings} onSave={onSave} />

        <div className={box}>
          <p className="font-semibold">Light designer</p>
          <label className="block text-sm text-slate-400">Price per foot (new designs start with this; bulbs every 12")
            <input type="number" min="0" step="0.25" defaultValue={settings.designPricePerFoot ?? ''} placeholder="e.g. 4.50"
              onBlur={(e) => onSave({ designPricePerFoot: e.target.value ? Number(e.target.value) : null })} className={field} />
          </label>
        </div>

        <div className={box}>
          <p className="font-semibold">🤖 Ask Claude</p>
          <p className="text-sm text-slate-400">The question panel in the top bar. Claude reads the database (customers, leads, invoices, routes, messages) and answers; it can’t change or send anything. Turning it off hides the tab for everyone and the server refuses questions. Suggest a reply is separate.</p>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={settings.askClaude !== false} onChange={(e) => onSave({ askClaude: e.target.checked })} className="size-5" /> Ask Claude is on
          </label>
        </div>

        <ProposalDefaults settings={settings} onSave={onSave} />

        <DiscountSchedule settings={settings} onSave={onSave} />

        <div className={box}>
          <p className="font-semibold">Home base</p>
          <p className="text-sm text-slate-400">Where the crew starts. Used for distances on the Map.</p>
          <HomeBase settings={settings} onSave={onSave} />
        </div>
      </div>
    </div>
  )
}
