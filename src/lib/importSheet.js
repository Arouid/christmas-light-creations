// Turns the Google Sheet's "Scheduling" and "Accounts" tabs (as rows of
// cells) into customer records. Pure: no Firebase, no file reading.

import { customerId } from './customers.js'

const norm = (h) => String(h ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

// Repeated headers (Accounts has "Payment Type" twice) become "payment type#2".
function headerKeys(row) {
  const seen = {}
  return row.map((h) => {
    const k = norm(h)
    seen[k] = (seen[k] ?? 0) + 1
    return seen[k] > 1 ? `${k}#${seen[k]}` : k
  })
}

function toObjects(rows) {
  if (!rows?.length) return []
  const keys = headerKeys(rows[0])
  return rows.slice(1)
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, String(r[i] ?? '').trim()])))
    .filter((o) => o['full name'])
}

// Drop blanks so a re-import never erases something typed in the app.
function compact(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') {
      const inner = compact(v)
      if (Object.keys(inner).length) out[k] = inner
    } else if (v !== undefined && v !== '') {
      out[k] = v
    }
  }
  return out
}

const yearFrom = (keys, re) => keys.map((k) => k.match(re)?.[1]).find(Boolean)

export function buildCustomers(schedulingRows, accountsRows = []) {
  const schedKeys = headerKeys(schedulingRows?.[0] ?? [])
  const acctKeys = headerKeys(accountsRows?.[0] ?? [])
  if (!schedKeys.includes('full name')) throw new Error('The Scheduling file has no "Full Name" column. Is it the right tab?')
  if (accountsRows.length && !acctKeys.includes('full name')) throw new Error('The Accounts file has no "Full Name" column. Is it the right tab?')

  const cur = yearFrom(schedKeys, /^(\d{4}) scheduling notes$/) ?? String(new Date().getFullYear())
  const prev = yearFrom(schedKeys, /^(\d{4}) install scheduling status$/) ?? String(Number(cur) - 1)
  const adjustKey = acctKeys.find((k) => k.startsWith('price adjustments for'))

  const accounts = new Map(toObjects(accountsRows).map((a) => [norm(a['full name']), a]))
  const warnings = []
  const ids = new Set()
  const customers = []

  const add = (s, a) => {
    const fullName = s['full name'] || a['full name']
    let id = customerId(fullName)
    for (let n = 2; ids.has(id); n++) id = `${customerId(fullName)}-${n}`
    if (id !== customerId(fullName)) warnings.push(`Two rows named "${fullName}"; the second was saved as ${id}.`)
    ids.add(id)

    customers.push({
      id,
      data: compact({
        fullName,
        firstName: s['first name'] || a['first name'],
        lastName: s['last name'] || a['last name'],
        email: s['email address'] || a['email address'],
        phone: s['phone number'],
        address: s.address,
        city: s.city,
        neighborhood: s.neighborhood,
        gateCode: s['gate code'],
        locationBlock: s['location block'],
        installType: s['install block'] || a['install block'],
        lightColor: s['light color'],
        lightReminders: s['light reminders'],
        freeColorSwapUsed: s['used 1 free color swap'],
        installHistory: s['install/add on history'],
        preferredTimeframe: s['preferred install timeframe'],
        oldSchedulingNotes: s['old scheduling notes'],
        takedownNotes: s[`${cur} install / takedown notes`],
        since: a.since,
        originalRate: a['original rate'],
        normalPaymentMethod: a['normal payment method'],
        pcNumber: a['pc#'],
        priceNotes: a.notes,
        priceAdjustments: adjustKey ? a[adjustKey] : '',
        seasons: {
          [cur]: {
            installStatus: s['install scheduling status'] || a['scheduling status'],
            takedownStatus: s['take down scheduling'] || a['takedown scheduling status'],
            takedownResponse: s['take down response'] || a['td response'],
            firstContact: s['first contact (wants lights)'],
            timeframe: a['scheduling timeframe'],
            weekOf: s['week of'],
            day: s.day,
            plannedDate: s['planned date'],
            schedulingNotes: s[`${cur} scheduling notes`],
            addOn: s[`${cur} add on modification`],
            install: { rate: a['install rate'], discount: a.discount, discountReason: a['discount reason'], total: a['total due'] },
            takedown: { rate: a['td: rate'] },
          },
          [prev]: {
            installStatus: s[`${prev} install scheduling status`],
            weekOf: s[`${prev} week of`],
            day: s[`${prev} day`],
            plannedDate: s[`${prev} planned date`],
            install: { invoice: a.invoice, paid: a.paid, paymentType: a['payment type'], paymentDate: a['payment date'] },
            takedown: { invoice: a['td: invoice'], paid: a['td: paid'], paymentType: a['payment type#2'], paymentDate: a['td: payment date'] },
          },
        },
      }),
    })
  }

  for (const s of toObjects(schedulingRows)) {
    const key = norm(s['full name'])
    const a = accounts.get(key)
    if (accountsRows.length && !a) warnings.push(`"${s['full name']}" is on Scheduling but not on Accounts.`)
    accounts.delete(key)
    add(s, a ?? {})
  }
  for (const a of accounts.values()) {
    warnings.push(`"${a['full name']}" is on Accounts but not on Scheduling.`)
    add({}, a)
  }

  return { customers, warnings, currentSeason: cur, previousSeason: prev }
}

// "Gate Codes" tab: Neighborhood, Code, Alternative, Notes.
export function buildGateCodes(rows) {
  const keys = headerKeys(rows?.[0] ?? [])
  if (!keys.includes('neighborhood')) throw new Error('The Gate Codes file has no "Neighborhood" column. Is it the right tab?')
  return rows.slice(1)
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, String(r[i] ?? '').trim()])))
    .filter((g) => g.neighborhood)
    .map((g) => ({
      id: customerId(g.neighborhood),
      data: compact({ neighborhood: g.neighborhood, code: g.code, alternative: g.alternative, notes: g.notes }),
    }))
}
