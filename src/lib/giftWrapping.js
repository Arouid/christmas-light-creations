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

// Every phrase of the gift-wrapping words (the strings with a space in them,
// not paths): none may be in a built page while the switch is off
// (scripts/prerender.mjs, tests/giftWrapping.test.mjs).
export function giftPhrases(words = giftWrapping) {
  if (typeof words === 'string') return words.includes(' ') ? [words.trim()] : []
  if (!words || typeof words !== 'object') return []
  return [...new Set(Object.values(words).flatMap((w) => giftPhrases(w)))]
}

let answer = null // null until the server has answered, then true or false
let asked = false
const listeners = new Set()
const settle = (value) => { answer = value; listeners.forEach((l) => l()) }
function ask() {
  if (asked) return
  asked = true
  // Dev server only (Vite drops it from the build): ?giftwrap shows the feature without the live switch.
  if (import.meta.env?.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('giftwrap')) return settle(true)
  fetchBooking().then((b) => settle(b.giftWrapping === true))
}
function subscribe(listener) {
  listeners.add(listener)
  ask()
  return () => listeners.delete(listener)
}

// False in the built HTML and until the server has answered; then the switch.
// ask = false: don't ask the server at all (the shared header on /cost/ and the
// policy pages, where the privacy page says nothing is fetched); always false.
const noSubscribe = () => () => {}
export const useGiftWrapping = (ask = true) => useSyncExternalStore(ask ? subscribe : noSubscribe, () => ask && answer === true, () => false)

// The gift-wrapping page itself (src/gift/GiftPage.jsx): null in the built
// HTML and until the server has answered (a failed ask counts as off), then
// true or false, so the page can send visitors home while it's off.
export const useGiftWrappingAnswer = () => useSyncExternalStore(subscribe, () => answer, () => null)
