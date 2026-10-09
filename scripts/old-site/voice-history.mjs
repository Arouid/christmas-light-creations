// Builds the "Text history" import file for the staff app (Import tab) from
// Google Takeout: the Voice zip (calls, texts, voicemails) and Gmail .mbox files
// or Mail zips (old Voice text/voicemail emails). Matching to customers happens
// in the app at import time; this file keeps every number.
//
//   node scripts/old-site/voice-history.mjs old-site-backup/takeout-*.zip old-site-backup/Archived-002.mbox
//
// Writes old-site-backup/voice-history.json (not in git: customer data).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { streamMbox } from './mbox.mjs'
import { dropEmailCopies, isVoiceHead, namesToPhones, parseTakeoutHtml, parseVoiceEmail } from './voiceTakeout.mjs'

const OUT = 'old-site-backup/voice-history.json'
const inputs = process.argv.slice(2)
if (!inputs.length) {
  console.error('Usage: node scripts/old-site/voice-history.mjs <takeout .zip | .mbox> …')
  process.exit(1)
}

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : [p]
})

const byId = new Map()
const counts = {}
const tally = (k) => { counts[k] = (counts[k] ?? 0) + 1 }
const keep = (e, src) => {
  if (e.skip) return tally(`skipped ${e.skip}`)
  if (!byId.has(e.id)) { byId.set(e.id, e); tally(`${src} ${e.data.kind} ${e.data.direction}`) } else tally('duplicate')
}

const readMbox = (path) => streamMbox(path, isVoiceHead, (raw) => keep(parseVoiceEmail(raw), 'email'))

const temps = []
try {
  const htmlFiles = []
  const mboxes = []
  for (const input of inputs) {
    if (input.endsWith('.mbox')) { mboxes.push(input); continue }
    const dir = mkdtempSync(join(tmpdir(), 'clc-takeout-'))
    temps.push(dir)
    if (process.platform === 'win32') execFileSync(join(process.env.SystemRoot, 'System32', 'tar.exe'), ['-xf', input, '-C', dir]) // Windows' tar reads .zip
    else execFileSync('unzip', ['-q', input, '-d', dir])
    for (const f of walk(dir)) {
      if (/[\\/]Voice[\\/]Calls[\\/].*\.html$/.test(f)) htmlFiles.push(f)
      else if (f.endsWith('.mbox')) mboxes.push(f)
    }
  }

  const html = htmlFiles.map((f) => [f, readFileSync(f, 'utf8')])
  const names = namesToPhones(html.map(([, h]) => h))
  for (const [f, h] of html) {
    const { entries, skipped } = parseTakeoutHtml(f, h, (n) => names.get(n) ?? '')
    if (skipped) tally(`skipped ${skipped}`)
    entries.forEach((e) => keep(e, 'takeout'))
  }
  for (const m of mboxes) {
    console.log(`Reading ${m}…`)
    await readMbox(m)
  }

  const all = [...byId.values()]
  const messages = dropEmailCopies(all).sort((a, b) => a.data.at.localeCompare(b.data.at))
  counts['dropped: email copy of a Takeout entry'] = all.length - messages.length
  writeFileSync(OUT, JSON.stringify({ builtAt: new Date().toISOString(), messages }))
  console.table(Object.entries(counts).sort().map(([what, n]) => ({ what, n })))
  console.log(`${messages.length} entries, ${new Set(messages.map((m) => m.data.phone)).size} numbers, ${messages[0]?.data.at.slice(0, 10)} to ${messages.at(-1)?.data.at.slice(0, 10)} -> ${OUT}`)
} finally {
  temps.forEach((d) => rmSync(d, { recursive: true, force: true }))
}
