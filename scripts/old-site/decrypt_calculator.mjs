// Adds the old site's price-calculator requests (WP Cost Estimation plugin,
// stored encrypted) to the combined past-requests CSV.
//
// The plugin encrypts each field with AES-128-CBC: key = the first 16 chars
// of the `lfbK` option, value = urlsafe-base64("<base64 ciphertext>::<iv>").
// Entries from before the key was last changed (2017–2018) can't be read.
//
// Usage (after past_requests_from_emails.py):
//   node scripts/old-site/decrypt_calculator.mjs old-site-backup/calculator-logs.json old-site-backup/past-requests-all.csv
import crypto from 'node:crypto'
import fs from 'node:fs'
import Papa from 'papaparse'

const [logsPath, csvPath] = process.argv.slice(2)
const { key, logs } = JSON.parse(fs.readFileSync(logsPath, 'utf8'))
const aesKey = Buffer.from(key).subarray(0, 16)

function decrypt(value) {
  if (!value) return ''
  try {
    const raw = Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    const i = raw.indexOf('::')
    const d = crypto.createDecipheriv('aes-128-cbc', aesKey, raw.subarray(i + 2))
    return d.update(raw.subarray(0, i).toString('latin1'), 'base64', 'utf8') + d.final('utf8')
  } catch {
    return null
  }
}

// contentTxt: "[n] :[n] - Name : Pat Sample[n] - Phone : …[n] - Message : …"
function summary(text) {
  const out = {}
  for (const part of text.split('[n]')) {
    const m = part.match(/^\s*-\s*([^:]+?)\s*:\s*(.*)$/s)
    if (m) out[m[1].trim()] = m[2].trim()
  }
  return out
}

const csv = Papa.parse(fs.readFileSync(csvPath, 'utf8'), { header: true, skipEmptyLines: true })
const rows = csv.data.filter((r) => r.Source !== 'Price calculator') // re-runs replace, not duplicate
let added = 0
let unreadable = 0
for (const l of logs) {
  const email = decrypt(l.email)
  if (email === null) {
    unreadable++
    continue
  }
  const s = summary(decrypt(l.contentTxt) ?? '')
  const phone = s.Phone || decrypt(l.phone) || ''
  const address = (decrypt(l.address) || '').trim()
  const message = s.Message || ''
  const fields = [`Name: ${s.Name ?? ''}`, `Phone: ${phone}`, `Email: ${s.Email || email}`, `Message: ${message}`]
  if (address) fields.push(`address: ${address}`)
  rows.push({
    Date: l.dateLog, Source: 'Price calculator', Form: l.formTitle, 'First name': '', 'Last name': '',
    Email: s.Email || email, Phone: phone, Address: address, City: '', Message: message, 'All fields': fields.join(' | '),
  })
  added++
}
fs.writeFileSync(csvPath, Papa.unparse(rows, { columns: csv.meta.fields }))
console.log(`${added} calculator requests added, ${unreadable} unreadable (older key)`)
