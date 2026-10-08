import { createContext, useContext } from 'react'

// Which Google account's Voice number the Text buttons open ('' = the
// browser's first signed-in account, i.e. the staff member's own Voice).
export const VoiceAccount = createContext('')
export const useVoiceAccount = () => useContext(VoiceAccount)

// Per-device choice: text from the business number or my own Google Voice.
const KEY = 'clc-text-from'
export function getTextFrom() {
  try { return localStorage.getItem(KEY) || 'business' } catch { return 'business' }
}
export function saveTextFrom(value) {
  try { localStorage.setItem(KEY, value) } catch { /* private mode: choice lasts this visit */ }
}
