// Phone numbers as keys (docs/specs/phone-sign-in.md). Pure: shared by the
// server (phoneKeys on records, the account lookup), the sign-in screen and
// the message sync. US numbers only, in E.164, the form Firebase puts in a
// phone sign-in token (`phone_number`).

// "(281) 555-0101" / "+1 281.555.0101" / "12815550101" -> "+12815550101"; else ''.
export function phoneKey(raw) {
  const d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return ''
}

// Every US phone number in a free-text field ("281-555-0101 / 832 555 0102"), unique, in order.
export function phonesIn(field) {
  const found = String(field ?? '').match(/(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g) ?? []
  return [...new Set(found.map(phoneKey).filter(Boolean))]
}

// "+12815550101" -> "(281) 555-0101" for the screen; anything else as given.
export function prettyPhone(key) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(String(key ?? ''))
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : String(key ?? '')
}
