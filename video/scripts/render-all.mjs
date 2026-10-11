// Renders the ads into assets-source/ads/video/ (gitignored).
//   node scripts/render-all.mjs                 everything: the 5-second ad and the full ad, three shapes each
//   node scripts/render-all.mjs teaser          the 5-second ad only (or: ad)
//   node scripts/render-all.mjs 9x16            one shape only (16x9, 9x16, 1x1); combine: teaser 9x16
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const videoRoot = resolve(here, '..')
const outDir = resolve(videoRoot, '..', 'assets-source', 'ads', 'video')
mkdirSync(outDir, { recursive: true })

const SETS = { teaser: { prefix: 'Teaser', file: 'clc-teaser-5s' }, ad: { prefix: 'Ad', file: 'clc-ad' } }
const SHAPES = ['16x9', '9x16', '1x1']
const args = process.argv.slice(2)
const sets = Object.keys(SETS).filter((s) => args.includes(s))
const shapes = SHAPES.filter((s) => args.includes(s))

for (const set of sets.length ? sets : Object.keys(SETS)) {
  for (const shape of shapes.length ? shapes : SHAPES) {
    const id = SETS[set].prefix + shape
    const out = join(outDir, `${SETS[set].file}-${shape}.mp4`)
    console.log(`\n▶ ${id} → ${out}`)
    // Windows refuses to replace an MP4 that a player or the file pane holds open: clear it first,
    // and drop leftovers of a render that was interrupted.
    try { rmSync(out, { force: true }) } catch { console.error(`Close ${out} in the player and run again`); process.exit(1) }
    for (const f of readdirSync(outDir)) if (f.endsWith('.remotion-in-progress')) rmSync(join(outDir, f), { force: true })
    const r = spawnSync('npx', ['remotion', 'render', 'src/index.jsx', id, out, '--codec=h264', '--crf=19', '--overwrite'], {
      cwd: videoRoot, stdio: 'inherit', shell: true,
    })
    if (r.status !== 0) { console.error(`render of ${id} failed`); process.exit(r.status || 1) }
  }
}
console.log('\nDone. Files in', outDir)
