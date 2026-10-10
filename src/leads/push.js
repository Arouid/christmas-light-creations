// Phone notifications on this device (docs/specs/staff-alerts.md): our own
// service worker (public/leads/sw.js) shows them; Firebase Cloud Messaging
// delivers them to this device's installation id (FID), kept in the staff
// member's staffPrefs doc. Firebase Messaging loads only when needed.
import { PUSH_VAPID_KEY, getFirebaseApp } from '../lib/firebase'
import { deviceName } from '../lib/staffAlerts'
import { demoMode } from './demo'
import { mergePaths } from './staffStore'

const BASE = import.meta.env.BASE_URL
const SW_URL = `${BASE}leads/sw.js`
const SW_SCOPE = `${BASE}leads/`
const KEY = 'clcPushFid' // this device's id while its notifications are on

export const prefsId = (user) => String(user?.email ?? '').toLowerCase()
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
export const permission = () => (typeof Notification === 'undefined' ? 'default' : Notification.permission)
export const storedFid = () => { try { return localStorage.getItem(KEY) || '' } catch { return '' } }
const remember = (fid) => { try { if (fid) localStorage.setItem(KEY, fid); else localStorage.removeItem(KEY) } catch { /* private mode: fine */ } }

export async function pushSupported() {
  if (demoMode || !('serviceWorker' in navigator) || typeof Notification === 'undefined' || !('PushManager' in window)) return false
  const { isSupported } = await import('firebase/messaging')
  return isSupported().catch(() => false)
}

async function loadMessaging() {
  const [m, app] = await Promise.all([import('firebase/messaging'), getFirebaseApp()])
  return { m, messaging: m.getMessaging(app) }
}

// Registers our service worker, waits until it runs, then registers this
// device with FCM. The id arrives through onRegistered, not as a return value.
async function registerDevice() {
  await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('The notification helper didn’t start. Reload the app and try again.')), 15000)),
  ])
  const { m, messaging } = await loadMessaging()
  return new Promise((resolve, reject) => {
    const off = m.onRegistered(messaging, (fid) => { off(); resolve(fid) })
    m.register(messaging, { vapidKey: PUSH_VAPID_KEY, serviceWorkerRegistration: reg }).catch((e) => { off(); reject(e) })
  })
}

const saveDevice = (user, fid, extra = {}) =>
  mergePaths(user, 'staffPrefs', prefsId(user), { [`pushDevices.${fid}`]: { name: deviceName(navigator.userAgent), at: Date.now() }, ...extra })

// From the Turn on tap. iPhone only shows the permission prompt when it's
// asked straight from the tap, so it's the first thing, before any await.
export async function turnOn(user) {
  const asked = Notification.requestPermission()
  if ((await asked) !== 'granted') return false
  const fid = await registerDevice()
  const old = storedFid()
  await saveDevice(user, fid, old && old !== fid ? { [`pushDevices.${old}`]: null } : {})
  remember(fid)
  return true
}

export async function turnOff(user, fid = storedFid()) {
  if (fid === storedFid()) {
    try {
      const { m, messaging } = await loadMessaging()
      await m.unregister(messaging)
    } catch (e) {
      console.warn('FCM unregister', e)
    }
    remember('')
  }
  if (fid) await mergePaths(user, 'staffPrefs', prefsId(user), { [`pushDevices.${fid}`]: null })
}

// On app start, for a device that has notifications on: keeps FCM's
// registration fresh (the SDK re-registers weekly or when the id changes)
// and our list right. Permission taken away in phone settings → off.
export async function refreshDevice(user, devices) {
  const fid = storedFid()
  if (!fid || demoMode) return
  if (permission() !== 'granted') { await turnOff(user, fid); return }
  if (!(await pushSupported())) return
  const now = await registerDevice()
  if (now !== fid || !devices?.[fid]) {
    await saveDevice(user, now, now !== fid ? { [`pushDevices.${fid}`]: null } : {})
    remember(now)
  }
}

// "Send a test": the server sends a test notification to your own devices.
export async function sendTest() {
  const [{ getFunctions, httpsCallable }, app] = await Promise.all([import('firebase/functions'), getFirebaseApp()])
  try {
    return (await httpsCallable(getFunctions(app, 'us-south1'), 'sendTestPush')()).data
  } catch (err) {
    const said = /\s/.test(err.message ?? '') ? err.message : ''
    throw new Error(said || 'Couldn’t reach the server. Check your connection and try again.', { cause: err })
  }
}

// The count on the installed app's icon, where the phone supports it.
export function setIconBadge(n) {
  try {
    if (n > 0) navigator.setAppBadge?.(n)?.catch?.(() => {})
    else navigator.clearAppBadge?.()?.catch?.(() => {})
  } catch { /* not supported: fine */ }
}
