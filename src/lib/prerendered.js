// The home page and /design/ are drawn into their HTML at build time
// (scripts/prerender.mjs), then React takes the page over in the browser.
// React's first draw there must match the build's HTML exactly, so what only
// the visitor's browser knows (today's date, a road-sign code) is drawn as
// the build saw it, then updated right after.
import { createContext, useContext, useSyncExternalStore } from 'react'
import { signCode } from './sign.js'

// The day the HTML was built ('YYYY-MM-DD'; stamped on #root as data-day).
export const BuildDay = createContext(null)

export const localDay = (d = new Date()) =>
  [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-')

const never = () => () => {}
let today
let sign
const getToday = () => (today ??= localDay())
const getSign = () => (sign ??= signCode())

// Today at noon (the build's day while React takes the page over).
export function useToday() {
  const built = useContext(BuildDay)
  const day = useSyncExternalStore(never, getToday, () => built ?? getToday())
  return new Date(`${day}T12:00:00`)
}

// The road-sign code (lib/sign.js); none in the built HTML.
export const useSign = () => useSyncExternalStore(never, getSign, () => '')

// False in the built HTML and while React takes it over; then true.
export const useTakenOver = () => useSyncExternalStore(never, () => true, () => false)
