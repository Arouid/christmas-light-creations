// gemini/<name>.jpg → gemini/<name>-off.jpg (the "lights off" copy prepare-assets makes).
export const offName = (file) => file.replace(/\.(jpe?g|png|webp)$/i, '') + '-off.jpg'

// The cut-outs (RGBA, the cottage and its snow mound only), lit and lights off.
export const cutName = (file) => file.replace(/\.(jpe?g|png|webp)$/i, '') + '-cut.png'
export const cutOffName = (file) => file.replace(/\.(jpe?g|png|webp)$/i, '') + '-cut-off.png'
