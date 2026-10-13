// gemini/<name>.jpg → gemini/<name>-off.jpg (the "lights off" copy prepare-assets makes).
export const offName = (file) => file.replace(/\.(jpe?g|png|webp)$/i, '') + '-off.jpg'
