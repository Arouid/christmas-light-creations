// Staff-app adapter for invoices (docs/specs/invoices.md): Firestore records
// keyed by the customer's link token. firestore.rules let staff create, edit,
// send, void and mark paid; the number, emails and online payments are the
// server's (functions/index.js).
import { createContext, useContext } from 'react'
import { newToken } from '../../proposals/model.js'
import { todayISO } from '../../lib/customers'
import { dueDateFor } from '../../lib/invoices'
import { clearFields, createRecord, deleteRecord, saveRecord, useLiveCollection } from '../staffStore'

const newestFirst = (a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? ''))
const now = () => new Date().toISOString()

export const STATE_STYLE = { draft: 'bg-white/10', open: 'bg-sky-500/20 text-sky-300', overdue: 'bg-berry-600/30 text-berry-500', paid: 'bg-emerald-500/20 text-emerald-300', void: 'bg-white/5 text-slate-500' }

// The server gives the number a few seconds after Send.
export const numberLabel = (i) => i.number || (i.status === 'draft' ? 'Draft' : 'Sending…')

export const invoiceLink = (token) => `${window.location.origin}/invoice/?t=${token}`
// Staff opening the customer's page don't count as "opened by the customer".
export const previewLink = (token) => `${invoiceLink(token)}&preview=1`

// What staff edit (never the server's fields).
const EDITABLE = ['customerId', 'customer', 'season', 'kind', 'items', 'note', 'terms', 'dueDate']
const pick = (inv) => Object.fromEntries(EDITABLE.filter((k) => k in inv).map((k) => [k, inv[k]]))

export function useInvoices(user) {
  const { items, error } = useLiveCollection(user, 'invoices', newestFirst)
  const save = (token, data) => saveRecord(user, 'invoices', token, { ...data, savedAt: now() })
  return {
    invoices: items,
    error,
    create: async (inv) => {
      const token = newToken()
      await createRecord(user, 'invoices', token, { ...pick(inv), status: 'draft', savedAt: now() })
      return token
    },
    save: (token, inv) => save(token, pick(inv)),
    // Send: the due date counts from today; the server gives the number and emails it.
    send: (token, inv) => save(token, { ...pick(inv), status: 'open', dueDate: dueDateFor(inv, todayISO()) }),
    emailAgain: (token) => save(token, { emailAgainAt: new Date() }),
    voidIt: (token) => save(token, { status: 'void' }),
    remove: (token) => deleteRecord('invoices', token),
    // These three may only touch exactly these fields (firestore.rules), so no savedAt.
    setReminders: (token, on) => saveRecord(user, 'invoices', token, { remindersOff: !on }),
    markPaid: (token, { method, date, note }) => saveRecord(user, 'invoices', token, { status: 'paid', offline: { method, date, note: note ?? '', by: user.email, at: Date.now() } }),
    undoPaid: (token) => clearFields(user, 'invoices', token, ['offline'], { status: 'open' }),
  }
}

// The invoices list and actions, for customer pages and the Season tab.
export const InvoicesContext = createContext(null)
export const useInvoicesContext = () => useContext(InvoicesContext)
