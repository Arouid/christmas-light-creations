// "Ask Claude": the read-only tools over Firestore and the short tool loop.
// index.js only registers the callable and hands in what it owns (the
// database, the key, the model, today's date, the invoice and alert helpers).
// No imports from the rest of functions/. Spec: docs/specs/ask-claude.md.
import Anthropic from '@anthropic-ai/sdk'
import knowledge from './knowledge.json' with { type: 'json' }
import {
  ANSWER_SCHEMA, MAX_OUTPUT_TOKENS, MAX_ROWS, MAX_TOOL_CALLS, MODEL, TOOLS, askMessages, askSystemPrompt, costOf, customerRow, fallbackAnswer,
  invoiceRow, leadRow, messageRow, parseAnswer, routeRow, toolArgs,
} from './askPrompt.js'

export class AskError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

const digits = (s) => String(s ?? '').replace(/\D/g, '')
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const docsOf = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

// ---- Tools (each returns something JSON-able for the model) ------------------

// ctx: { db, today, season, helpers: { invoiceState, invoiceCents, paidInfo, alertRecipients } }
export function makeTools(ctx) {
  const { db, today, season, helpers } = ctx
  let customersCache = null
  const allCustomers = async () => (customersCache ??= docsOf(await db.collection('customers').limit(2000).get()))

  return {
    async find_customers({ query }) {
      const q = norm(query)
      const qd = digits(query)
      const rows = (await allCustomers()).filter((c) => {
        const hay = norm([c.fullName, c.address, c.city, c.neighborhood, c.email, c.locationBlock].join(' '))
        return hay.includes(q) || (qd.length >= 4 && digits(c.phone).includes(qd)) || q.split(' ').every((w) => w && hay.includes(w))
      })
      return { count: rows.length, customers: rows.slice(0, MAX_ROWS).map((c) => customerRow(c.id, c, season)), ...(rows.length > MAX_ROWS ? { note: `Only the first ${MAX_ROWS} shown; ask with a more exact name or street.` } : {}) }
    },
    async get_customer({ id }) {
      const c = (await db.doc(`customers/${id}`).get()).data()
      return c ? customerRow(id, c, season, true) : { problem: 'No customer with that id.' }
    },
    async list_leads({ status, days }) {
      const since = new Date(Date.now() - days * 86400000)
      const q = db.collection('leads').where('createdAt', '>=', since).orderBy('createdAt', 'desc').limit(200)
      const rows = docsOf(await q.get()).filter((l) => !status || l.status === status)
      return { count: rows.length, leads: rows.slice(0, MAX_ROWS).map((l) => leadRow(l.id, l)) }
    },
    async list_invoices({ state, customerId }) {
      let q = db.collection('invoices').limit(1000)
      if (customerId) q = q.where('customerId', '==', customerId)
      const all = docsOf(await q.get()).map((inv) => ({ inv, state: helpers.invoiceState(inv, today) }))
      const want = all.filter(({ state: s }) => state === 'all' || s === state || (state === 'open' && s === 'overdue'))
      const ms = (inv) => inv.sentAt?.toMillis?.() ?? inv.createdAt?.toMillis?.() ?? 0
      want.sort((a, b) => ms(b.inv) - ms(a.inv))
      const cents = want.reduce((t, { inv }) => t + helpers.invoiceCents(inv), 0)
      return { count: want.length, total: `$${(cents / 100).toFixed(2)}`, invoices: want.slice(0, MAX_ROWS).map(({ inv, state: s }) => invoiceRow(inv.id, inv, s, helpers.invoiceCents(inv), helpers.paidInfo(inv))) }
    },
    async routes_for_day({ day }) {
      const d = day === 'today' ? today : day
      const rows = docsOf(await db.collection('routes').where('day', '==', d).limit(20).get())
      return { day: d, count: rows.length, routes: rows.map((r) => routeRow(r.id, r)) }
    },
    async get_messages({ customerId, leadId, limit }) {
      const [field, id] = customerId ? ['customerId', customerId] : ['leadId', leadId]
      const rows = docsOf(await db.collection('messages').where(field, '==', id).limit(300).get())
      rows.sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')))
      return { count: rows.length, messages: rows.slice(0, limit).map(messageRow) }
    },
    async system_status() {
      const [settings, incidents, lastMsg] = await Promise.all([
        db.doc('settings/app').get().then((s) => s.data() ?? {}),
        db.collection('incidents').where('open', '==', true).limit(20).get().then(docsOf),
        db.collection('messages').orderBy('syncedAt', 'desc').limit(1).get().then(docsOf).catch(() => []),
      ])
      const syncAt = lastMsg[0]?.syncedAt?.toMillis?.() ?? null
      const hours = syncAt ? Math.round((Date.now() - syncAt) / 3600000) : null
      return {
        today, season,
        textEmailSync: syncAt ? { lastAt: new Date(syncAt).toISOString(), hoursAgo: hours, status: hours < 24 ? 'ok' : hours < 72 ? 'quiet' : 'stale' } : { status: 'nothing synced yet' },
        websiteProblems: incidents.map((i) => ({ kind: i.kind, since: i.at?.toMillis ? new Date(i.at.toMillis()).toISOString().slice(0, 10) : '', message: String(i.message ?? '').split('\n')[0].slice(0, 160) })),
        requestAlertEmails: helpers.alertRecipients(settings).length,
        assistant: { suggestReply: 'on', askClaude: settings.askClaude !== false ? 'on' : 'off', autoReplies: settings.aiAutoReply ? 'on' : 'off (not built yet)' },
        installers: (settings.installers ?? []).length,
      }
    },
  }
}

// ---- The loop ------------------------------------------------------------------

// One question. Returns { result: { answer, records, draftFor, incomplete, toolCalls }, usage, cost, model }.
// Throws AskError for things the staff member should hear about.
export async function askFor({ apiKey, model = MODEL, question, history, today, season, db, helpers, log, onKeyRefused }) {
  const tools = makeTools({ db, today, season, helpers })
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 90_000 })
  const messages = askMessages({ today, season, history, question })
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
  const add = (u = {}) => { for (const k of Object.keys(usage)) usage[k] += Number(u[k]) || 0 }
  let toolCalls = 0
  let incomplete = false
  let final = null

  for (let round = 0; round < MAX_TOOL_CALLS + 2; round++) {
    const outOfTools = toolCalls >= MAX_TOOL_CALLS
    let res
    try {
      res = await client.messages.create({
        model: model || MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: [{ type: 'text', text: askSystemPrompt(knowledge), cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        tool_choice: { type: outOfTools ? 'none' : 'auto' },
        messages,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: ANSWER_SCHEMA } },
      })
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) {
        await onKeyRefused?.()
        throw new AskError('failed-precondition', 'Ask Claude isn’t set up yet (its API key was refused). Look it up in the app for now.')
      }
      if (e instanceof Anthropic.RateLimitError) throw new AskError('resource-exhausted', 'The assistant is busy right now. Try again in a minute.')
      log?.error?.('askClaude failed', { status: e.status ?? null, message: e.message })
      throw new AskError('unavailable', 'The assistant didn’t answer. Try again in a minute.')
    }
    add(res.usage)
    if (res.stop_reason === 'refusal') {
      log?.warn?.('askClaude refused', { category: res.stop_details?.category ?? null })
      final = fallbackAnswer()
      break
    }
    const uses = res.content.filter((b) => b.type === 'tool_use')
    if (res.stop_reason !== 'tool_use' || !uses.length) {
      const parsed = parseAnswer(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''))
      final = parsed.problem ? fallbackAnswer(parsed.problem) : parsed
      break
    }
    messages.push({ role: 'assistant', content: res.content })
    const results = []
    for (const u of uses) {
      toolCalls++
      let out
      if (toolCalls > MAX_TOOL_CALLS) {
        incomplete = true
        out = { problem: `Tool limit reached (${MAX_TOOL_CALLS} per question). Answer with what you have and say it may be incomplete.` }
      } else {
        const checked = toolArgs(u.name, u.input)
        if (checked.problem) out = { problem: checked.problem }
        else {
          try { out = await tools[u.name](checked.args) } catch (e) {
            log?.warn?.('askClaude tool failed', { tool: u.name, message: e.message })
            out = { problem: 'That lookup failed on our side. Answer with what you have.' }
          }
        }
      }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out), is_error: Boolean(out?.problem) })
    }
    messages.push({ role: 'user', content: results })
    if (toolCalls >= MAX_TOOL_CALLS) incomplete = true
  }
  if (!final) final = fallbackAnswer('it kept looking things up')

  const cost = Number(costOf(usage).toFixed(4))
  log?.info?.('askClaude', { toolCalls, records: final.records.length, incomplete, input: usage.input_tokens, output: usage.output_tokens, cacheRead: usage.cache_read_input_tokens, cacheWrite: usage.cache_creation_input_tokens, cost })
  return { result: { ...final, incomplete, toolCalls }, usage, cost, model: model || MODEL }
}
