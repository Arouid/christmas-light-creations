// The estimate form's "What would you like lit?" chips and the optional note
// (owner 2026-10-13: the required free-text "message" was the field people
// gave up on). The chips and the note fold into the one `message` the lead
// already has, so nothing changes in the rules or the staff app. Pure.
export const LIT_OPTIONS = ['Roofline', 'Trees', 'Bushes', 'Walkway & path', 'Windows & columns', 'Not sure yet']
export const NOTE_MAX = 3000

// -> the lead's message. Chips first ("Light: roofline, trees"), then the note; never empty.
export function composeMessage(picks = [], note = '', { gift = false } = {}) {
  const chosen = LIT_OPTIONS.filter((o) => picks.includes(o))
  const lines = []
  if (chosen.length && !gift) lines.push(`Light: ${chosen.map((o) => o.toLowerCase()).join(', ')}`)
  const extra = String(note ?? '').replace(/\r\n?/g, '\n').trim().slice(0, NOTE_MAX)
  if (extra) lines.push(extra)
  return lines.join('\n') || (gift ? 'Gift wrapping (no details given)' : 'No details given: please advise')
}

// "Phone" or "Text" as the way to reach them needs a number.
export const needsPhone = (contactMethod, phone) => ['Phone', 'Text'].includes(String(contactMethod ?? '')) && !String(phone ?? '').replace(/\D/g, '').length
