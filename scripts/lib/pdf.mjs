// SVG page → vector PDF through headless Chrome (the PDF page is the SVG's own size in inches).
// Chrome stamps the time into the file; it is pinned (same length, so the offsets hold) so a rebuild is byte-identical.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p))

export function svgToPdf(svg, wIn, hIn, out) {
  if (!chrome) throw new Error('Chrome not found (needed for the PDFs): set CHROME_PATH')
  const dir = mkdtempSync(join(tmpdir(), 'clc-pdf-'))
  const html = join(dir, 'page.html')
  writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${wIn}in ${hIn}in;margin:0}html,body{margin:0;padding:0}svg{display:block}</style></head><body>${svg}</body></html>`)
  try {
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${out}`, 'file:///' + html.replace(/\\/g, '/')], { stdio: 'ignore' })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  writeFileSync(out, readFileSync(out, 'latin1').replace(/\/(CreationDate|ModDate) \(D:\d{14}/g, '/$1 (D:20260101000000'), 'latin1')
}
