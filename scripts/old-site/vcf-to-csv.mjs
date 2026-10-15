// vCard (a Google Contacts export inside a Takeout zip) -> the minimal Google
// CSV old-history.mjs reads for names of phone numbers. Used for info@'s
// contacts on 2026-10-15 (old-site-backup/info-contacts-2026-10-14.csv).
// Usage: node scripts/old-site/vcf-to-csv.mjs <in.vcf> <out.csv> [compare-with.csv]
// The optional third file prints how many of the phones it doesn't have yet.
import { readFileSync, writeFileSync } from 'node:fs'
import Papa from 'papaparse'
const [, , input, output, compare] = process.argv
const digits = (s) => { const d = String(s ?? '').replace(/\D/g, ''); return d.length === 11 && d[0] === '1' ? d.slice(1) : d }
const text = readFileSync(input, 'utf8').replace(/\r?\n[ \t]/g, '')
const rows = []
for (const card of text.split(/BEGIN:VCARD/).slice(1)) {
  const lines = card.split(/\r?\n/)
  const get = (key) => lines.filter((l) => l.toUpperCase().startsWith(key)).map((l) => l.slice(l.indexOf(':') + 1).replace(/\\,/g, ',').replace(/\\;/g, ';').trim()) // vCard escapes \, and \;
  const [last = '', first = '', middle = ''] = (get('N:')[0] ?? get('N;')[0] ?? '').split(';')
  const fn = get('FN')[0] ?? ''
  const org = (get('ORG')[0] ?? '').replace(/;+$/, '')
  const tels = [...get('TEL;'), ...get('TEL:')].filter(Boolean)
  const emails = [...get('EMAIL;'), ...get('EMAIL:')].filter(Boolean)
  const note = (get('NOTE')[0] ?? '').replace(/\\n/g, ' ') // vCard writes line breaks as \n
  rows.push({ 'First Name': first || (!last ? fn : ''), 'Middle Name': middle, 'Last Name': last, Nickname: get('NICKNAME')[0] ?? '', 'Organization Name': org, 'Phone 1 - Value': tels.join(' ::: '), 'Phone 2 - Value': '', 'E-mail 1 - Value': emails.join(' ::: '), Notes: note })
}
writeFileSync(output, '﻿' + Papa.unparse(rows))
const withPhone = rows.filter((r) => r['Phone 1 - Value'])
console.log(`${rows.length} contacts, ${withPhone.length} with a phone, ${rows.filter((r) => r['E-mail 1 - Value']).length} with an email`)
if (compare) {
  const old = Papa.parse(readFileSync(compare, 'utf8').replace(/^﻿/, ''), { header: true, skipEmptyLines: true }).data
  const oldPhones = new Set(old.flatMap((c) => Object.entries(c).filter(([k]) => /^Phone \d+ - Value$/.test(k)).flatMap(([, v]) => String(v).split(':::').map(digits))).filter(Boolean))
  const newPhones = new Set(withPhone.flatMap((r) => r['Phone 1 - Value'].split(':::').map(digits)).filter(Boolean))
  const fresh = [...newPhones].filter((p) => !oldPhones.has(p))
  console.log(`phones: ${newPhones.size} in the new file, ${oldPhones.size} in ${compare}, ${fresh.length} not in it`)
}
