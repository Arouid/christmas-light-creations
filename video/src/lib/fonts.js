import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

// The site's fonts (public/fonts/, copied to video/public/fonts/ by prepare-assets).
export const DISPLAY = 'Fraunces'
export const BODY = 'Inter'

let started = false
export function loadFonts() {
  if (started) return
  started = true
  loadFont({ family: DISPLAY, url: staticFile('fonts/fraunces-latin.woff2'), weight: '600 800' })
  loadFont({ family: BODY, url: staticFile('fonts/inter-latin.woff2'), weight: '400 700' })
}
