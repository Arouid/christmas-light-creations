// "⬇ Export N to spreadsheet" on the Customers and Season tabs: the rows the
// tab shows, as a CSV that Excel, Numbers and Google Sheets open as-is
// (UTF-8 with a BOM so Excel keeps accents, CRLF lines, every field quoted).
// Always the full set of columns, whatever the table is showing. Pure;
// tested in tests/customersExport.test.mjs.
import { getPath, todayISO } from './customers.js'
import { CUSTOMER_COLUMNS, columnValue } from './customerColumns.js'
import { installedLines } from './jobRecord.js'

const TABLE_LABEL = new Map(CUSTOMER_COLUMNS)
const own = (field) => (c) => c[field]
const season = (path) => (c, year) => getPath(c.seasons?.[year] ?? {}, path)

// [key, label, get(customer, season, gates)]. A key without a getter is a
// Customers-table column (columnValue), so the cell reads as it does on
// screen; "{season}" in a label becomes the year ("2026 install status").
export const EXPORT_COLUMNS = [
  ['name', 'Name', own('fullName')],
  ['firstName', 'First name', own('firstName')],
  ['lastName', 'Last name', own('lastName')],
  ['phone'], ['email'], ['address'], ['city'], ['area'], ['neighborhood'], ['gate'],
  ['hoa', 'HOA', own('hoa')],
  ['lightsDownBy', 'Lights down by', own('lightsDownBy')],
  ['type', 'Install type'],
  ['lightColor', 'Light color', own('lightColor')],
  ['since'],
  ['originalRate', 'Original rate', own('originalRate')],
  ['status', '{season} install status'], ['week', '{season} week of'], ['day', '{season} day'],
  ['date', '{season} planned date'], ['notes', '{season} scheduling notes'],
  ['installRate', '{season} install rate', season('install.rate')],
  ['installDiscount', '{season} install discount', season('install.discount')],
  ['installTotal', '{season} install total', season('install.total')],
  ['installPaid', '{season} install paid', season('install.paid')],
  ['installPaidBy', '{season} install paid by', season('install.paymentType')],
  ['installPaymentDate', '{season} install payment date', season('install.paymentDate')],
  ['takedown', '{season} takedown status'],
  ['takedownRate', '{season} takedown rate', season('takedown.rate')],
  ['takedownPaid', '{season} takedown paid', season('takedown.paid')],
  ['takedownPaidBy', '{season} takedown paid by', season('takedown.paymentType')],
  ['takedownPaymentDate', '{season} takedown payment date', season('takedown.paymentDate')],
  ['installed', 'What’s up', (c) => installedLines(c).join(' · ')],
  ['takedownNotes', 'Install / takedown notes', own('takedownNotes')],
  ['customerNotes', 'Other notes', own('notes')],
].map(([key, label = TABLE_LABEL.get(key), get]) => [key, label, get ?? ((c, year, gates) => columnValue(c, key, year, gates))])

export const BOM = '﻿'

// One CSV field: always quoted, quotes doubled (commas and line breaks are then safe).
export const csvField = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

// customers: the rows as shown (already filtered). columns: keys from
// EXPORT_COLUMNS, in the order wanted (default: all of them).
export function customersCsv(customers, { season: year, gates = [], columns } = {}) {
  const picked = columns ? columns.map((k) => EXPORT_COLUMNS.find(([key]) => key === k)).filter(Boolean) : EXPORT_COLUMNS
  const header = picked.map(([, label]) => label.replace('{season}', year ?? ''))
  const rows = customers.map((c) => picked.map(([, , get]) => get(c, year, gates)))
  return BOM + [header, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n'
}

// clc-customers-2026-10-12.csv, clc-customers-needs-scheduling-2026-10-12.csv,
// clc-season-2026-installs-2026-10-12.csv.
export function exportFileName({ kind = 'customers', season: year, mode = 'install', tag = '', date = todayISO() } = {}) {
  const slug = String(tag ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const parts = kind === 'season' ? ['clc-season', year, `${mode}s`] : ['clc-customers']
  return `${[...parts, slug, date].filter(Boolean).join('-')}.csv`
}
