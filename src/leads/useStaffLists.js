import { customerId, todayISO } from '../lib/customers'
import { addRecord, mergeMany, updateField, useLiveCollection } from './staffStore'

const newestFirst = (a, b) => (b.received ?? '').localeCompare(a.received ?? '')
const byNeighborhood = (a, b) => (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '')

export function useServiceCalls(user) {
  const { items, error } = useLiveCollection(user, 'serviceCalls', newestFirst)
  return {
    calls: items,
    error,
    update: (id, path, value) => updateField(user, 'serviceCalls', id, path, value),
    log: (customer, issue, details) => addRecord(user, 'serviceCalls', {
      customerId: customer.id,
      customerName: customer.fullName,
      issue,
      ...(details ? { details } : {}),
      received: todayISO(),
      status: 'Open',
    }),
  }
}

export function useGateCodes(user) {
  const { items, error } = useLiveCollection(user, 'gateCodes', byNeighborhood)
  return {
    gates: items,
    error,
    update: (id, path, value) => updateField(user, 'gateCodes', id, path, value),
    add: (neighborhood, code) => mergeMany(user, 'gateCodes', [{ id: customerId(neighborhood), data: { neighborhood, code } }]),
    importMany: (records, onProgress) => mergeMany(user, 'gateCodes', records, onProgress),
  }
}
