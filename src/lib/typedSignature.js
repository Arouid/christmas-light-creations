// Type-to-sign (owner 2026-10-13: on a computer, a typed name as the
// signature; the drawn pad stays). The typed name is drawn onto a canvas and
// handed on as the same PNG data URL the pad produces, so storage, the rules
// (image < 300 KB) and the signed copy don't change. ESIGN/UETA treat a typed
// name adopted with intent to sign the same as a drawn one; the consent box
// says so. `makeCanvas` is injected so tests can pass a fake.
export const SIGN_W = 600
export const SIGN_H = 200
export const SIGN_FONT = 'italic 600 64px Fraunces, Georgia, "Times New Roman", serif'

export function signatureFromName(name, makeCanvas = () => document.createElement('canvas')) {
  const text = String(name ?? '').replace(/\s+/g, ' ').trim()
  if (text.length < 2) return null
  const canvas = makeCanvas()
  canvas.width = SIGN_W
  canvas.height = SIGN_H
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, SIGN_W, SIGN_H)
  ctx.fillStyle = '#111827'
  ctx.textBaseline = 'middle'
  // Shrink long names until they fit with a margin.
  for (const size of [64, 56, 48, 40, 32, 26]) {
    ctx.font = SIGN_FONT.replace('64px', `${size}px`)
    if (ctx.measureText(text).width <= SIGN_W - 48) break
  }
  ctx.fillText(text, 24, SIGN_H / 2)
  // A baseline rule, like a signature line.
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(24, SIGN_H - 40, SIGN_W - 48, 2)
  return canvas.toDataURL('image/png')
}
