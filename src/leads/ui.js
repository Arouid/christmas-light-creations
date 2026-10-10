import { BLANK_LABEL } from '../lib/customers'

// Shared bits of the staff app's look.
export const select = 'rounded-xl border border-white/15 bg-night-900 px-3 py-2.5 text-sm'
// Search boxes: keep the browser's saved-address / contact pop-up (and
// password managers) from covering the results. Spread onto the <input>.
export const noAutofill = { autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false, name: 'clc-search', 'data-lpignore': 'true', 'data-1p-ignore': 'true', 'data-form-type': 'other' }
export const blankFor =(mode) => (mode === 'takedown' ? BLANK_LABEL.takedownStatus : BLANK_LABEL.installStatus)
