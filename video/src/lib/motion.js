import { interpolate, spring } from 'remotion'

// Shared easing helpers so every scene moves the same way.
export const pop = (frame, fps, delay = 0, config = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120, mass: 0.8, ...config } })

export const slideUp = (frame, fps, delay = 0) => {
  const s = pop(frame, fps, delay)
  return { opacity: interpolate(frame - delay, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), y: (1 - s) * 70 }
}

export const fadeIn = (frame, from = 0, len = 8) =>
  interpolate(frame, [from, from + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

export const fadeOut = (frame, dur, len = 8) =>
  interpolate(frame, [dur - len, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

export const progress = (frame, from, to) =>
  interpolate(frame, [from, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
