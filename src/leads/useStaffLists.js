import { customerId, todayISO } from '../lib/customers'
import { addRecord, deleteRecord, mergeMany, saveRecord, updateField, useLiveCollection } from './staffStore'
import { customerTarget, logActivity } from './activity'

const newestFirst = (a, b) => (b.received ?? '').localeCompare(a.received ?? '')
const byNeighborhood = (a, b) => (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '')

export function useServiceCalls(user) {
  const { items, error } = useLiveCollection(user, 'serviceCalls', newestFirst)
  return {
    calls: items,
    error,
    // Recent activity (docs/specs/dashboard.md): logged and finished calls.
    update: async (id, path, value) => {
      await updateField(user, 'serviceCalls', id, path, value)
      const call = items?.find((c) => c.id === id)
      if (path === 'status' && value === 'Done' && call) logActivity('service-done', customerTarget(call.customerId, call.customerName), call.issue ?? '')
    },
    log: async (customer, issue, details) => {
      const id = await addRecord(user, 'serviceCalls', {
        customerId: customer.id,
        customerName: customer.fullName,
        issue,
        ...(details ? { details } : {}),
        received: todayISO(),
        status: 'Open',
      })
      logActivity('service-logged', customerTarget(customer.id, customer.fullName), issue)
      return id
    },
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

const newestAsked = (a, b) => (b.lastAsked ?? '').localeCompare(a.lastAsked ?? '')

export function usePastRequests(user) {
  const { items, error } = useLiveCollection(user, 'pastRequests', newestAsked)
  return {
    requests: items,
    error,
    update: (id, path, value) => updateField(user, 'pastRequests', id, path, value),
    importMany: (records, onProgress) => mergeMany(user, 'pastRequests', records, onProgress),
  }
}

const newestPlaced = (a, b) => String(b.placedAt ?? '').localeCompare(String(a.placedAt ?? ''))

// Road-sign drops (one per placement; see lib/signs.js).
export function useSigns(user) {
  const { items, error } = useLiveCollection(user, 'signs', newestPlaced)
  return {
    drops: items,
    error,
    add: (data) => addRecord(user, 'signs', data),
    update: (id, path, value) => updateField(user, 'signs', id, path, value),
    remove: (id) => deleteRecord('signs', id),
  }
}

const byDayDesc = (a, b) => String(b.day ?? '').localeCompare(String(a.day ?? ''))

// Service routes (see lib/router.js). Stops are an array on the route, saved whole.
export function useRoutes(user) {
  const { items, error } = useLiveCollection(user, 'routes', byDayDesc)
  return {
    routes: items,
    error,
    create: (data) => addRecord(user, 'routes', data),
    save: (id, data) => saveRecord(user, 'routes', id, data),
    remove: (id) => deleteRecord('routes', id),
  }
}
