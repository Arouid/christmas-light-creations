// Gift wrapping on the public site (docs/specs/gift-wrapping.md): hidden
// until the owner turns it on in ⚙ Settings (settings/app.giftWrapping).
// The page learns the switch from the same `booking` fetch as availability
// (lib/urgency.js), after it has drawn, so the built HTML never carries a
// word of it (scripts/prerender.mjs checks). The rules themselves live in
// functions/giftWrapping.js, shared with the server.
import { useSyncExternalStore } from 'react'
import { giftWrapping, nav as mainNav } from '../data/content.js'
import { fetchBooking } from './urgency.js'

export * from '../../functions/giftWrapping.js'

// The menu with the Gift wrapping link in place (after Photos) when on.
export const navLinks = (nav = mainNav, on = false) =>
  on ? nav.flatMap((n) => (n.href === giftWrapping.nav.after ? [n, giftWrapping.nav] : [n])) : nav

let on = false
let asked = false
const listeners = new Set()
const turnOn = () => { if (!on) { on = true; listeners.forEach((l) => l()) } }
function ask() {
  if (asked) return
  asked = true
  // Dev server only (Vite drops it from the build): ?giftwrap shows the feature without the live switch.
  if (import.meta.env?.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('giftwrap')) return turnOn()
  fetchBooking().then((b) => { if (b.giftWrapping) turnOn() })
}
function subscribe(listener) {
  listeners.add(listener)
  ask()
  return () => listeners.delete(listener)
}

// False in the built HTML and until the server has answered; then the switch.
export const useGiftWrapping = () => useSyncExternalStore(subscribe, () => on, () => false)
