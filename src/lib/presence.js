// Who's on: each open staff app checks in (presence/{email}: lastSeen,
// device) every couple of minutes while it's on screen. Pure helpers here;
// the check-in and live list are in src/leads/usePresence.js.
import { staffName, toMs } from './activity.js'

export const BEAT_MS = 2 * 60 * 1000
// On now = checked in within the last 5 minutes (two missed beats of slack).
export const ON_MS = 5 * 60 * 1000

// "iPhone app", "Android", "Mac", "Windows"… short, for the list.
export function deviceLabel(ua = '', homeScreen = false) {
  const kind = /iPhone|iPod/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua)) ? 'iPad'
      : /Android/.test(ua) ? 'Android'
        : /Macintosh/.test(ua) ? 'Mac'
          : /Windows/.test(ua) ? 'Windows'
            : 'Computer'
  return homeScreen ? `${kind} app` : kind
}

// staffDocs: the staff list (id = email); seen: presence docs (id = email).
// Everyone on the staff list appears, on-now first, then most recent, then never.
export function presenceRows(staffDocs = [], seen = [], names = {}, now = Date.now()) {
  const byEmail = new Map((seen ?? []).map((p) => [String(p.id).toLowerCase(), p]))
  const rows = (staffDocs ?? []).map((s) => {
    const email = String(s.id).toLowerCase()
    const p = byEmail.get(email)
    const last = toMs(p?.lastSeen)
    const state = !last ? 'never' : now - last <= ON_MS ? 'on' : 'away'
    return { email, name: staffName(email, names), last, device: p?.device ?? '', state }
  })
  const rank = { on: 0, away: 1, never: 2 }
  return rows.sort((a, b) => rank[a.state] - rank[b.state] || b.last - a.last || a.name.localeCompare(b.name))
}
