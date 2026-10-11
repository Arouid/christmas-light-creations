// Renders the three shapes into assets-source/ads/video/ (gitignored).
//   node scripts/render-all.mjs            all three
//   node scripts/render-all.mjs 16x9       one shape (16x9, 9x16, 1x1)
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const videoRoot = resolve(here, '..')
const outDir = resolve(videoRoot, '..', 'assets-source', 'ads', 'video')
mkdirSync(outDir, { recursive: true })

const shapes = { '16x9': 'Ad16x9', '9x16': 'Ad9x16', '1x1': 'Ad1x1' }
const wanted = process.argv.slice(2).filter((a) => shapes[a])
const list = wanted.length ? wanted : Object.keys(shapes)

for (const shape of list) {
  const out = join(outDir, `clc-ad-${shape}.mp4`)
  console.log(`\n▶ ${shapes[shape]} → ${out}`)
  // Windows refuses to replace an MP4 that a player or the file pane holds open: clear it first,
  // and drop leftovers of a render that was interrupted.
  try { rmSync(out, { force: true }) } catch { console.error(`Close ${out} in the player and run again`); process.exit(1) }
  for (const f of readdirSync(outDir)) if (f.endsWith('.remotion-in-progress')) rmSync(join(outDir, f), { force: true })
  const r = spawnSync('npx', ['remotion', 'render', 'src/index.jsx', shapes[shape], out, '--codec=h264', '--crf=19', '--overwrite'], {
    cwd: videoRoot, stdio: 'inherit', shell: true,
  })
  if (r.status !== 0) { console.error(`render of ${shape} failed`); process.exit(r.status || 1) }
}
console.log('\nDone. Files in', outDir)
