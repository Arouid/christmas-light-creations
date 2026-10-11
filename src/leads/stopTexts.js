// A route stop's install-day texts (docs/specs/install-texts.md): which ones
// it gets, what was already told, and what a tap leaves behind. The app can't
// send a text (Google Voice has no API): the person pastes it into Voice, and
// this records the tap on the stop (through onStop), in Recent activity and in
// the customer's history. The dialog itself is <StopTextDialog> in InstallTexts.jsx.
import { useState } from 'react'
import { seasonYear } from '../lib/customers'
import { ACTIVITY_TEXT, historyEntry, mergeTexts, stopText, textOptions, toldText } from '../lib/installTexts'
import { customerTarget, logActivity } from './activity'
import { useStaff } from './staffContext'
import { createRecord } from './staffStore'

export const TITLE = { onway: 'On our way: text', done: 'All done: text', reminder: 'Day-before reminder: text' }
// The season a route day belongs to (July–December: that year; else the year before), without touching the clock.
export const routeSeason = (route) => {
  const [y, m] = String(route?.day ?? '').split('-').map(Number)
  return Number.isInteger(y) && Number.isInteger(m) ? String(m >= 7 ? y : y - 1) : seasonYear()
}

// Writes what a tap leaves behind: the mark on the stop, a line in Recent
// activity and an entry in the customer's history.
export function recordTap({ stop, customer, step, text, user, onStop, extraMark = {} }) {
  const now = Date.now()
  onStop({ texts: { ...(stop.texts ?? {}), [step]: { at: new Date(now).toISOString(), by: user?.email ?? '', ...extraMark } } })
  logActivity('text', customerTarget(stop.customerId, customer?.fullName), ACTIVITY_TEXT[step])
  const { id, data } = historyEntry({ stop, customer, step, text, user, now })
  createRecord(user, 'messages', id, data).catch((e) => console.warn('Text not filed in history', e.code ?? e.message))
}

// -> { reason, onway: { allowed, told, open }, done: { allowed, told, open }, dialog }
// dialog: null, or the props for <StopTextDialog>. `onStop(patch)` merges the
// patch into the stop on its route.
export function useStopTexts({ stop, route, customer, onStop }) {
  const { user, settings } = useStaff()
  const [open, setOpen] = useState(null) // the step shown in the dialog
  const opts = textOptions(stop, customer)
  const told = (step) => toldText(stop.texts?.[step])
  const state = (step, allowed) => ({ allowed: Boolean(allowed), told: told(step), open: () => setOpen(step) })

  let dialog = null
  if (open) {
    const text = stopText(open, { stop, route, customer, season: routeSeason(route), templates: mergeTexts(settings?.textTemplates) })
    dialog = {
      phone: stop.phone || customer?.phone, message: text,
      title: `${TITLE[open]} ${customer?.firstName || customer?.fullName || stop.name}`,
      note: told(open) ? `You already ${told(open)}. Text again?` : open === 'done' ? 'The stop is marked done. Paste this into Voice, or close to skip the text.' : null,
      onClose: () => setOpen(null),
      onOpenVoice: () => { setOpen(null); recordTap({ stop, customer, step: open, text, user, onStop }) },
    }
  }
  return { reason: opts.reason ?? '', onway: state('onway', opts.onway), done: state('done', opts.done), dialog }
}
