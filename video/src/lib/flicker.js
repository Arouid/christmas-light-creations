// Neon flicker: frames since switch-on → brightness 0..1 (a few stutters, then steady).
const FLICKER = [0.15, 0.9, 0.2, 1, 0.3, 1, 1, 0.5, 1, 1]

export function flickerOn(framesSinceOn) {
  if (framesSinceOn < 0) return 0
  const i = Math.floor(framesSinceOn / 2)
  return i < FLICKER.length ? FLICKER[i] : 1
}
