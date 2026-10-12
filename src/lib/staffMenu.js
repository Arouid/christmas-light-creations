// The staff app's sections and how a phone reaches them. Computers show the
// sections as a row of tabs (BEFORE, then MORE under a ▾); phones get a ☰
// drawer (src/leads/Drawer.jsx, owner 2026-10-12: "like the Firebase
// console's") with a search box, SHORTCUTS, then the rest in GROUPS.

// The computer tab row, in order; the rarely used ones under "More" (the row
// got too long: owner 2026-10-10); Past requests lives inside Leads.
export const BEFORE = [['home', 'Home'], ['ask', '🤖 Ask Claude'], ['map', 'Map'], ['accounts', 'Accounts'], ['invoices', 'Invoices'], ['leads', 'Leads'], ['customers', 'Customers'], ['season', 'Season'], ['route', 'Routes'], ['service', 'Service']]
export const MORE = [['signs', 'Signs'], ['emails', 'Emails'], ['gates', 'Gates'], ['import', 'Import']]
export const HIDDEN = [['past', 'Past requests']]
export const ALL_TABS = [...BEFORE, ...MORE, ...HIDDEN]
export const LABEL = Object.fromEntries(ALL_TABS)

// Drawer rows get a small picture, like the console's.
export const ICON = {
  home: '🏠', ask: '🤖', map: '🗺️', accounts: '🔎', invoices: '🧾', leads: '📥', customers: '👥', season: '🎄',
  route: '🚚', service: '🛠', signs: '🪧', emails: '✉️', gates: '🔐', import: '📄', past: '🕰️',
}
// Drawer label: the plain name (the icon is drawn beside it).
export const NAME = Object.fromEntries(ALL_TABS.map(([k, label]) => [k, label.replace(/^\S+\s(?=\S)/, (m) => (/\p{Extended_Pictographic}/u.test(m) ? '' : m))]))

// Phones: what gets tapped all day, then the rest grouped the way the guide groups jobs.
export const SHORTCUTS = ['home', 'accounts', 'map', 'ask']
export const GROUPS = [
  ['Customers & messages', ['leads', 'past', 'customers', 'emails']],
  ['Prices & money', ['invoices']],
  ['Installs, takedowns & service', ['season', 'route', 'service']],
  ['Tools', ['signs', 'gates', 'import']],
]
export const groupOf = (tab) => GROUPS.find(([, keys]) => keys.includes(tab))?.[0] ?? null

// The drawer's search box sends a term to the Accounts search: #accounts?q=<term>.
export const searchHash = (term) => `#accounts?q=${encodeURIComponent(term.trim())}`
export function searchFromHash(hash) {
  const m = /^#accounts\?q=(.*)$/.exec(hash ?? '')
  try { return m ? decodeURIComponent(m[1]) : '' } catch { return '' }
}
