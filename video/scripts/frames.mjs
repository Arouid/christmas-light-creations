// Pulls one frame a second out of each rendered MP4 into video/out/frames/<shape>/, with Remotion's
// own ffmpeg, so the result can be checked without a video player.
//   node scripts/frames.mjs            all three
//   node scripts/frames.mjs 9x16 2     one shape, 2 frames a second
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const videoRoot = resolve(here, '..')
const videoDir = resolve(videoRoot, '..', 'assets-source', 'ads', 'video')
const ffmpeg = join(videoRoot, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe')
const shapes = ['16x9', '9x16', '1x1']
const wanted = shapes.filter((s) => process.argv.includes(s))
const perSecond = Number(process.argv.find((a) => /^\d+$/.test(a)) || 1)

for (const shape of wanted.length ? wanted : shapes) {
  const mp4 = join(videoDir, `clc-ad-${shape}.mp4`)
  if (!existsSync(mp4)) { console.log('missing', mp4); continue }
  const dir = join(videoRoot, 'out', 'frames', shape)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const r = spawnSync(ffmpeg, ['-v', 'error', '-i', mp4, '-r', String(perSecond), '-q:v', '4', join(dir, 'f-%02d.jpg')], { stdio: 'inherit' })
  if (r.status !== 0) process.exit(1)
  console.log(shape, readdirSync(dir).length, 'frames in', dir)
}
