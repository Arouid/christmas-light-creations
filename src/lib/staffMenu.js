// The staff app's sections and how a phone reaches them. Computers show the
// sections as a row of tabs (BEFORE, then MORE under a ▾); phones get a ☰
// drawer (src/leads/Drawer.jsx, owner 2026-10-12: "like the Firebase
// console's") with a search box, SHORTCUTS, then the rest in GROUPS.

// The computer tab row, in order; the rarely used ones under "More" (the row
// got too long: owner 2026-10-10); Past requests lives inside Leads.
export const BEFORE = [['home', 'Home'], ['ask', '🤖 Ask Claude'], ['map', 'Map'], ['accounts', 'Accounts'], ['invoices', 'Invoices'], ['leads', 'Leads'], ['customers', 'Customers'], ['season', 'Season'], ['route', 'Routes'], ['service', 'Service']]
export const MORE = [['signs', 'Signs'], ['emails', 'Emails'], ['gates', 'Gates'], ['import', 'Import']]
// Not in the row: Past requests lives inside Leads; Marketing, Reports and
// Notes are buttons on Home next to Arrange (owner 2026-10-15), and the Home
// tab stays lit while you're in them.
export const ON_HOME = ['marketing', 'reports', 'notes']
export const HIDDEN = [['past', 'Past requests'], ['marketing', '📣 Marketing'], ['reports', '📊 Reports'], ['notes', 'Notes']]
export const ALL_TABS = [...BEFORE, ...MORE, ...HIDDEN]
export const LABEL = Object.fromEntries(ALL_TABS)

// Drawer label: the plain name, words only.
export const NAME = Object.fromEntries(ALL_TABS.map(([k, label]) => [k, label.replace(/^\S+\s(?=\S)/, (m) => (/\p{Extended_Pictographic}/u.test(m) ? '' : m))]))

// Phones: what gets tapped all day, then the rest grouped the way the guide groups jobs.
// Each heading carries one of our line icons (src/components/Icon.jsx) and the
// rows are words only, as on the customer account's menu (owner 2026-10-15: "I
// thought we changed this", "lower the line height too").
export const SHORTCUTS = ['home', 'accounts', 'map', 'ask']
export const SHORTCUTS_HEADING = ['Every day', 'compass']
export const GROUPS = [
  ['Customers & messages', ['leads', 'past', 'customers', 'emails'], 'user'],
  ['Prices & money', ['invoices'], 'receipt'],
  ['Installs, takedowns & service', ['season', 'route', 'service'], 'tree'],
  ['Marketing & reviews', ['marketing'], 'star'],
  // The claude.ai reports, kept current (owner 2026-10-15: "Reports should live under reports")
  ['Reports', ['reports'], 'chart'],
  ['Tools', ['notes', 'signs', 'gates', 'import'], 'wrench'],
]
export const groupOf = (tab) => GROUPS.find(([, keys]) => keys.includes(tab))?.[0] ?? null

// The drawer's search box sends a term to the Accounts search: #accounts?q=<term>.
export const searchHash = (term) => `#accounts?q=${encodeURIComponent(term.trim())}`
export function searchFromHash(hash) {
  const m = /^#accounts\?q=(.*)$/.exec(hash ?? '')
  try { return m ? decodeURIComponent(m[1]) : '' } catch { return '' }
}
