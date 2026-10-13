// The brain of "Suggest a reply": loads the thread and record, asks Claude
// for one JSON draft, checks it, and returns it. index.js only registers the
// callable and passes in what it owns (the database, the key, the model, who
// is asking, incident reporting). No imports from the rest of functions/.
// Spec: docs/specs/sales-assistant.md.
import Anthropic from '@anthropic-ai/sdk'
import knowledge from './knowledge.json' with { type: 'json' }
import { MAX_OUTPUT_TOKENS, MODEL, OUTPUT_SCHEMA, channelFor, costOf, fallbackDraft, parseDraft, systemPrompt, userPrompt } from './prompt.js'

export const PRESENCE_ID = 'claude' // Who's on row (src/lib/presence.js)

const messagesWhere = async (db, field, value) => (await db.collection('messages').where(field, '==', value).limit(200).get()).docs.map((d) => ({ id: d.id, ...d.data() }))

// { record, messages, contact } for a target from prompt.js draftRequest(), or null if gone.
export async function threadFor(db, target) {
  if (target.coll === 'messages') {
    const m = (await db.doc(`messages/${target.id}`).get()).data()
    if (!m) return null
    // An unknown sender: everything from the same number or address.
    const key = m.phone ? ['phone', m.phone] : m.email ? ['email', m.email] : null
    const messages = key ? (await messagesWhere(db, ...key)).filter((x) => x.unmatched || x.id === target.id) : [m]
    return { record: null, messages: messages.length ? messages : [{ id: target.id, ...m }], contact: { firstName: '', fullName: m.name ?? '', phone: m.phone ?? '', email: m.email ?? '' } }
  }
  const record = (await db.doc(`${target.coll}/${target.id}`).get()).data()
  if (!record) return null
  const messages = await messagesWhere(db, target.field, target.id)
  if (target.coll === 'leads') {
    // The website request itself is the first message of the thread.
    if (record.message || record.createdAt) {
      const at = record.createdAt?.toDate ? record.createdAt.toDate().toISOString() : String(record.createdAt ?? '')
      messages.push({ id: `request-${target.id}`, kind: 'request', direction: 'in', at, text: [record.city, record.message].filter(Boolean).join(' · ') })
    }
    return { record, messages, contact: { firstName: record.firstName ?? '', fullName: `${record.firstName ?? ''} ${record.lastName ?? ''}`.trim(), phone: record.phone ?? '', email: record.email ?? '' } }
  }
  // The account chat (docs/specs/account-chat.md) is part of the conversation too.
  const chat = (await db.doc(`conversations/${target.id}`).get()).data()
  messages.push(...chatMessages(chat))
  return { record, messages, contact: { firstName: record.firstName ?? '', fullName: record.fullName ?? '', phone: record.phone ?? '', email: record.email ?? '' } }
}

// A conversations/{customerId} document -> history-shaped messages. Pure.
export const chatMessages = (chat) => (chat?.messages ?? []).map((m, i) => ({
  id: `chat-${i}`, kind: 'chat', direction: m.from === 'staff' ? 'out' : 'in', at: String(m.at ?? ''), text: String(m.text ?? ''),
}))

// Problems the callable turns into HttpsErrors: { code, message }.
export class DraftError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

// One draft. `thread` from threadFor(); `today` "YYYY-MM-DD"; `season` a year.
// Returns { draft, usage, cost, model }. Throws DraftError for things the
// staff member should hear about; `onKeyRefused` is called once before that.
// `notes`: the owner's extra facts (settings/app.assistantNotes), part of the cached system prompt.
export async function draftFor({ apiKey, model = MODEL, thread, coll, today, season, notes = '', log, onKeyRefused }) {
  const channel = channelFor(thread.messages, thread.record ?? thread.contact)
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 })
  let res
  try {
    res = await client.messages.create({
      model: model || MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [{ type: 'text', text: systemPrompt(knowledge, notes), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt({ today, season, coll, record: thread.record, messages: thread.messages, channel }) }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      await onKeyRefused?.()
      throw new DraftError('failed-precondition', 'The assistant isn’t set up yet (its API key was refused). Write the reply yourself for now.')
    }
    if (e instanceof Anthropic.RateLimitError) throw new DraftError('resource-exhausted', 'The assistant is busy right now. Try again in a minute.')
    log?.error?.('draftReply failed', { status: e.status ?? null, message: e.message })
    throw new DraftError('unavailable', 'The assistant didn’t answer. Try again in a minute, or write the reply yourself.')
  }
  const usage = res.usage ?? {}
  let draft
  if (res.stop_reason === 'refusal') {
    log?.warn?.('draftReply refused', { category: res.stop_details?.category ?? null })
    draft = fallbackDraft(channel, thread.contact.firstName, knowledge.business)
  } else {
    const parsed = parseDraft(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''))
    draft = parsed.problem ? { ...fallbackDraft(channel, thread.contact.firstName, knowledge.business), reason: parsed.problem } : parsed
  }
  const cost = Number(costOf(usage).toFixed(4))
  log?.info?.('draftReply', { record: coll, channel: draft.channel, nextAction: draft.nextAction, escalate: draft.escalate,
    input: usage.input_tokens ?? 0, output: usage.output_tokens ?? 0, cacheRead: usage.cache_read_input_tokens ?? 0, cacheWrite: usage.cache_creation_input_tokens ?? 0, cost })
  return { draft, usage, cost, model: model || MODEL }
}
