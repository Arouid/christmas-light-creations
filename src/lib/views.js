// Saved custom tabs ("views"): a named filter over customers for one season,
// replacing the hand-made filtered tabs of the old Google Sheet.

export const VIEW_COLUMNS = [
  ['name', 'Name'], ['area', 'Area'], ['type', 'Type'], ['phone', 'Phone'], ['address', 'Address'],
  ['city', 'City'], ['week', 'Week of'], ['day', 'Day'], ['date', 'Date'], ['timeframe', 'Timeframe'],
  ['gate', 'Gate code'], ['notes', 'Scheduling notes'], ['status', 'Status'], ['ask', 'Ask button'], ['review', 'Review ask'],
]

export const DEFAULT_COLUMNS = ['name', 'area', 'type', 'week', 'day', 'date', 'status', 'ask']

export const statusKey = (mode) => (mode === 'takedown' ? 'takedownStatus' : 'installStatus')

// "current" (the default) follows the calendar into next season automatically.
export const viewSeason = (view, current) => (!view.season || view.season === 'current' ? current : String(view.season))

// Empty filter = no restriction. A '' status means "not contacted / not scheduled".
export function matchesView(customer, view, season) {
  const s = customer.seasons?.[season] ?? {}
  const status = s[statusKey(view.mode)] ?? ''
  if (view.statuses?.length && !view.statuses.includes(status)) return false
  if (view.areas?.length && !view.areas.includes(customer.locationBlock ?? '')) return false
  if (view.installType && customer.installType !== view.installType) return false
  if (view.weekOf && (s.weekOf ?? '') !== view.weekOf) return false
  return true
}

export function describeView(view, blankLabel) {
  const parts = [view.mode === 'takedown' ? 'Takedowns' : 'Installs']
  if (view.statuses?.length) parts.push(view.statuses.map((s) => s || blankLabel).join(' or '))
  if (view.areas?.length) parts.push(view.areas.join(' or '))
  if (view.installType) parts.push(view.installType)
  if (view.weekOf) parts.push(`week of ${view.weekOf}`)
  return parts.join(' · ')
}
