// The tour's first card (owner 2026-10-13, Lacie's phone): the app must be
// saved to the home screen, and the card says how for the device in hand.
// Pure: the user agent and the standalone flag are passed in, so tests can
// pin them. Rich text (**bold**) like the rest of the guide.
export const DEVICE = { ios: 'ios', android: 'android', computer: 'computer' }

export function deviceOf(ua = '') {
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))) return DEVICE.ios
  if (/Android/.test(ua)) return DEVICE.android
  return DEVICE.computer
}

const WHY = 'Phone notifications and the 💬 badge only work from the installed app.'

// -> the sentence(s) for the welcome card.
export function installHint({ ua = '', standalone = false } = {}) {
  if (standalone) return `You’re in the installed app ✓ Notifications and the 💬 badge work here: turn them on under **💬 → Phone notifications**.`
  const device = deviceOf(ua)
  if (device === DEVICE.ios) return `**Save this app to your Home Screen first.** In Safari, tap the **Share** button (the square with the arrow, bottom of the screen), then **Add to Home Screen**, then **Add**. Open **CLC Staff** from the icon and sign in the same way. ${WHY}`
  if (device === DEVICE.android) return `**Save this app to your home screen first.** In Chrome, tap the **⋮** menu (top right), then **Install app** or **Add to Home screen**, then **Install**. Open **CLC Staff** from the icon and sign in the same way. ${WHY}`
  return `On your phone, save the app to the home screen first (iPhone: Safari → **Share** → **Add to Home Screen**; Android: Chrome **⋮** → **Install app**), or on this computer use **⚙ Settings → Install**. ${WHY}`
}
