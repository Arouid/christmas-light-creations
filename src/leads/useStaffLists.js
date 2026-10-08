import { customerId, todayISO } from '../lib/customers'
import { addRecord, deleteRecord, mergeMany, saveRecord, updateField, useLiveCollection } from './staffStore'

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

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0)

// Custom tabs shared by all staff.
export function useViews(user) {
  const { items, error } = useLiveCollection(user, 'views', byOrder)
  return {
    views: items,
    error,
    add: (view) => addRecord(user, 'views', { ...view, order: Date.now() }),
    save: (id, view) => saveRecord(user, 'views', id, view),
    remove: (id) => deleteRecord('views', id),
  }
}

const none = () => 0

// Shared staff settings (one record, "app"): home base for distances and routes.
export function useSettings(user) {
  const { items, error } = useLiveCollection(user, 'settings', none)
  return {
    settings: items ? (items.find((i) => i.id === 'app') ?? {}) : null,
    error,
    save: (data) => saveRecord(user, 'settings', 'app', data),
  }
}
