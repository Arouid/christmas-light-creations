import { byName, customerId } from '../lib/customers'
import { locateAddress } from '../lib/streetView'
import { createRecord, mergeMany, updateField, useLiveCollection } from './staffStore'

// A customer needs (re)locating when it has an address but no position for it.
export const needsLocating = (c) => Boolean(c.address) && c.geo?.address !== c.address

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export function useCustomers(user) {
  const { items, error } = useLiveCollection(user, 'customers', byName)

  // Saves { lat, lng, exact, address } — or { missing, address } if Google can't find it.
  async function locate(id, address) {
    const found = await locateAddress(address)
    await updateField(user, 'customers', id, 'geo', found ? { ...found, address } : { missing: true, address })
    return found
  }

  return {
    customers: items,
    error,
    update: async (id, path, value) => {
      await updateField(user, 'customers', id, path, value)
      if (path === 'address' && value) locate(id, value).catch(() => {})
    },
    create: async (fields) => {
      let id
      try {
        id = await createRecord(user, 'customers', customerId(fields.fullName), fields)
      } catch (err) {
        throw err.message === 'already-exists' ? new Error(`A customer named "${fields.fullName}" already exists.`) : err
      }
      if (fields.address) locate(id, fields.address).catch(() => {})
      return id
    },
    importMany: (records, onProgress) => mergeMany(user, 'customers', records, onProgress),
    // One at a time, gently, so Google doesn't throttle us.
    locateAll: async (list, onProgress) => {
      const todo = list.filter(needsLocating)
      let done = 0
      for (const c of todo) {
        await locate(c.id, c.address)
        onProgress?.(++done, todo.length)
        await wait(150)
      }
      return todo.length
    },
  }
}
