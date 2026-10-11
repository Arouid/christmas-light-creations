// Pulls one frame a second out of each rendered MP4 (clc-*.mp4) into video/out/frames/<name>/, with
// Remotion's own ffmpeg, so the result can be checked without a video player.
//   node scripts/frames.mjs              every MP4
//   node scripts/frames.mjs teaser 2     only files whose name contains "teaser", 2 frames a second
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const videoRoot = resolve(here, '..')
const videoDir = resolve(videoRoot, '..', 'assets-source', 'ads', 'video')
const ffmpeg = join(videoRoot, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe')
const perSecond = Number(process.argv.find((a) => /^\d+$/.test(a)) || 1)
const filter = process.argv.slice(2).filter((a) => !/^\d+$/.test(a))
const files = existsSync(videoDir)
  ? readdirSync(videoDir).filter((f) => f.startsWith('clc-') && f.endsWith('.mp4') && (!filter.length || filter.some((x) => f.includes(x))))
  : []

for (const file of files) {
  const mp4 = join(videoDir, file)
  const name = file.replace(/^clc-/, '').replace(/\.mp4$/, '')
  const dir = join(videoRoot, 'out', 'frames', name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const r = spawnSync(ffmpeg, ['-v', 'error', '-i', mp4, '-r', String(perSecond), '-q:v', '4', join(dir, 'f-%02d.jpg')], { stdio: 'inherit' })
  if (r.status !== 0) process.exit(1)
  console.log(name, readdirSync(dir).length, 'frames in', dir)
}
if (!files.length) console.log('no clc-*.mp4 in', videoDir)
