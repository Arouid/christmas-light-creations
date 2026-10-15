// Minimal .xlsx reader for the old Drive spreadsheets (old-history.mjs): every
// sheet -> { name, rows: [[cell text]] }. No dependency: an .xlsx is a zip of
// XML, unpacked with the system tar (Windows) or unzip.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const xmlText = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const colNum = (ref) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

export function readXlsx(file) {
  const dir = mkdtempSync(join(tmpdir(), 'clc-xlsx-'))
  try {
    if (process.platform === 'win32') execFileSync(join(process.env.SystemRoot, 'System32', 'tar.exe'), ['-xf', file, '-C', dir])
    else execFileSync('unzip', ['-q', file, '-d', dir])
    const strings = existsSync(join(dir, 'xl/sharedStrings.xml'))
      ? [...readFileSync(join(dir, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xmlText(m[1]))
      : []
    const book = readFileSync(join(dir, 'xl/workbook.xml'), 'utf8')
    const rels = readFileSync(join(dir, 'xl/_rels/workbook.xml.rels'), 'utf8')
    const targets = new Map([...rels.matchAll(/<Relationship [^>]*>/g)].map((m) => [m[0].match(/Id="([^"]+)"/)?.[1], m[0].match(/Target="([^"]+)"/)?.[1]]))
    const sheets = []
    for (const m of book.matchAll(/<sheet [^>]*>/g)) {
      const name = xmlText(m[0].match(/name="([^"]+)"/)?.[1] ?? '')
      const target = targets.get(m[0].match(/r:id="([^"]+)"/)?.[1])
      if (!target) continue
      const xml = readFileSync(join(dir, 'xl', target.replace(/^\/?xl\//, '')), 'utf8')
      const rows = []
      for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
        const row = []
        for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const ref = c[1].match(/r="([A-Z]+\d+)"/)?.[1]
          if (!ref) continue
          const type = c[1].match(/t="(\w+)"/)?.[1]
          const v = c[2]?.match(/<v>([\s\S]*?)<\/v>/)?.[1]
          row[colNum(ref)] = type === 's' ? strings[Number(v)] ?? ''
            : type === 'inlineStr' ? xmlText(c[2]?.match(/<is>([\s\S]*?)<\/is>/)?.[1] ?? '')
              : v != null ? xmlText(v) : ''
        }
        rows.push(Array.from(row, (x) => x ?? ''))
      }
      sheets.push({ name, rows })
    }
    return sheets
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
