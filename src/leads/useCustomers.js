import { byName, customerId } from '../lib/customers'
import { createRecord, mergeMany, updateField, useLiveCollection } from './staffStore'

export function useCustomers(user) {
  const { items, error } = useLiveCollection(user, 'customers', byName)
  return {
    customers: items,
    error,
    update: (id, path, value) => updateField(user, 'customers', id, path, value),
    create: async (fields) => {
      try {
        return await createRecord(user, 'customers', customerId(fields.fullName), fields)
      } catch (err) {
        throw err.message === 'already-exists' ? new Error(`A customer named "${fields.fullName}" already exists.`) : err
      }
    },
    importMany: (records, onProgress) => mergeMany(user, 'customers', records, onProgress),
  }
}
