// Draws the /design/ page's opening picture (the sample house with the
// sample lights) with the designer's own renderDesign, in headless Chrome, so
// it is exactly what the live canvas draws. Saves it as WebP (~20 KB) to
// public/images/design/. The page shows this picture at load and only loads
// the designer once the visitor opens it or uploads a photo.
// Run after changing sampleDesign.js, the sample house or render.js:
//   node scripts/sample-design.mjs   (needs Chrome; set CHROME_PATH if it isn't found)
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { createServer } from 'vite'

const out = fileURLToPath(new URL('../public/images/design/sample-design.webp', import.meta.url))

const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p))
if (!chrome) throw new Error('Chrome not found: set CHROME_PATH')

// A bare page that draws the sample and prints it as a PNG data URL.
const PAGE = `<!doctype html><pre id="out"></pre><script type="module">
import { renderDesign } from '/src/designer/render.js'
import { loadImage } from '/src/designer/image.js'
import { SAMPLE_PHOTO, sampleDesign } from '/src/design/sampleDesign.js'
const c = document.createElement('canvas')
c.width = SAMPLE_PHOTO.width
c.height = SAMPLE_PHOTO.height
renderDesign(c.getContext('2d'), sampleDesign(), await loadImage(SAMPLE_PHOTO.src))
document.getElementById('out').textContent = c.toDataURL('image/png')
</script>`

const server = await createServer({
  logLevel: 'error',
  server: { port: 5190, hmr: false },
  plugins: [{
    name: 'sample-design-page',
    configureServer(s) {
      s.middlewares.use('/__sample-design', (req, res) => { res.setHeader('content-type', 'text/html'); res.end(PAGE) })
    },
  }],
})
await server.listen()
try {
  const url = `${server.resolvedUrls.local[0]}__sample-design`
  const { stdout } = await promisify(execFile)(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=20000', '--dump-dom', url], { maxBuffer: 64 * 1024 * 1024 })
  const png = stdout.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)?.[1]
  if (!png) throw new Error('No picture came back from Chrome')
  const info = await sharp(Buffer.from(png, 'base64')).webp({ quality: 80 }).toFile(out)
  console.log(`sample-design.webp: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`)
} finally {
  await server.close()
}
