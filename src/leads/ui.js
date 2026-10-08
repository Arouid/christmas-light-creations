import { BLANK_LABEL } from '../lib/customers'

// Shared bits of the staff app's look.
export const select = 'rounded-xl border border-white/15 bg-night-900 px-3 py-2.5 text-sm'
export const blankFor = (mode) => (mode === 'takedown' ? BLANK_LABEL.takedownStatus : BLANK_LABEL.installStatus)
