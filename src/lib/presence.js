// Who's on: each open staff app checks in (presence/{email}: lastSeen,
// device) every couple of minutes while it's on screen. Pure helpers here;
// the check-in and live list are in src/leads/usePresence.js.
import { staffName, toMs } from './activity.js'

export const BEAT_MS = 2 * 60 * 1000
// On now = checked in within the last 5 minutes (two missed beats of slack).
export const ON_MS = 5 * 60 * 1000

// "iPhone app", "Windows · Chrome", "Chromebook · Chrome", "iPad · Safari"…
// (≤40 chars; firestore.rules). platform = navigator.userAgentData?.platform
// when the browser offers it (Chrome hides the OS in the user agent string).
export function deviceLabel(ua = '', homeScreen = false, platform = '') {
  const p = String(platform)
  const kind = /iPhone|iPod/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua)) ? 'iPad'
      : /Android/i.test(p) || /Android/.test(ua) ? 'Android'
        : /Chrome ?OS|CrOS/i.test(p) || /CrOS/.test(ua) ? 'Chromebook'
          : /mac/i.test(p) || /Macintosh/.test(ua) ? 'Mac'
            : /win/i.test(p) || /Windows/.test(ua) ? 'Windows'
              : /linux/i.test(p) || /Linux/.test(ua) ? 'Linux'
                : 'Computer'
  if (homeScreen) return `${kind} app`
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /SamsungBrowser/.test(ua) ? 'Samsung'
      : /Firefox\//.test(ua) ? 'Firefox'
        : /Chrome\/|CriOS\//.test(ua) ? 'Chrome'
          : /Safari\//.test(ua) ? 'Safari'
            : ''
  return browser ? `${kind} · ${browser}` : kind
}

// The sales assistant (docs/specs/sales-assistant.md) checks in as this id
// each time it drafts a reply (written by the server only), so it shows on
// Who's on like a team member: never "on now", just when it last worked.
export const ASSISTANT_ID = 'claude'

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
  const bot = byEmail.get(ASSISTANT_ID)
  if (bot && toMs(bot.lastSeen)) rows.push({ email: ASSISTANT_ID, name: 'Claude (assistant)', last: toMs(bot.lastSeen), device: bot.device ?? 'drafted a reply', state: 'away' })
  // Two staff entries with the same name (two emails for one person): show which is which.
  const count = rows.reduce((m, r) => m.set(r.name, (m.get(r.name) ?? 0) + 1), new Map())
  for (const r of rows) r.dupe = count.get(r.name) > 1
  const rank = { on: 0, away: 1, never: 2 }
  return rows.sort((a, b) => rank[a.state] - rank[b.state] || b.last - a.last || a.name.localeCompare(b.name) || a.email.localeCompare(b.email))
}
