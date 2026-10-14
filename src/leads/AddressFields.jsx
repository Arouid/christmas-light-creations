import { useState } from 'react'
import { addressEdit, addressParts, addressSave, joinAddress, sameAddress } from '../lib/address'
import Field from './Field'

// Street, City, State and ZIP under Property (src/lib/address.js; owner
// 2026-10-14). Each box saves the whole address line (and City when it
// changes) through the card's usual save, so the map position is looked up
// again like before. "Save full address" writes the line the boxes show when
// the saved one is incomplete (an older record with only the street).
export default function AddressFields({ customer, onUpdate }) {
  const parts = addressParts(customer)
  const full = joinAddress(parts)
  const [state, setState] = useState('idle') // idle | saving | error

  async function save(fields) {
    // City first: saving the address starts the map lookup.
    if ('city' in fields) await onUpdate(customer.id, 'city', fields.city)
    await onUpdate(customer.id, 'address', fields.address)
  }

  async function saveFull() {
    setState('saving')
    try {
      await save(addressSave(customer, parts))
      setState('idle')
    } catch {
      setState('error')
    }
  }

  const box = (key, label, opts = {}) => (
    <Field label={label} value={parts[key]} inputMode={opts.inputMode} className={opts.className}
      onSave={(v) => save(addressEdit(customer, key, v))} />
  )

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        {box('street', 'Street (and apt or unit)', { className: 'sm:col-span-2' })}
        {box('city', 'City')}
        <div className="grid grid-cols-2 gap-3">
          {box('state', 'State')}
          {box('zip', 'ZIP', { inputMode: 'numeric' })}
        </div>
      </div>
      {full && !sameAddress(full, customer.address) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-glow-400/10 px-3 py-2 text-sm text-glow-300">
          <span className="min-w-0 flex-1">Saved as “{customer.address || 'nothing yet'}”. Full address: <strong>{full}</strong>{parts.zip ? '' : ' (add the ZIP)'}</span>
          <button type="button" onClick={saveFull} disabled={state === 'saving'} className="min-h-11 rounded-full bg-glow-400 px-4 font-semibold text-night-950 disabled:opacity-60">
            {state === 'saving' ? 'Saving…' : 'Save full address'}
          </button>
          {state === 'error' && <span role="alert" className="text-berry-500">Not saved, try again</span>}
        </div>
      )}
    </div>
  )
}
