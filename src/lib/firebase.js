// Firebase web config. These values are public by design: access is enforced
// by firestore.rules, not by keeping this secret. Paste the config from
// Firebase console → Project settings → Your apps → Web app.
export const firebaseConfig = {
  apiKey: 'AIzaSyBiaZL1UuwcZ6Y0p9pRORA2lzUobp8K3zc',
  authDomain: 'clc-leads-site.firebaseapp.com',
  projectId: 'clc-leads-site',
  storageBucket: 'clc-leads-site.firebasestorage.app',
  messagingSenderId: '448935757441',
  appId: '1:448935757441:web:6566870219966c20762f80',
}

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

// 'spam': junk or test requests; only these can be deleted (firestore.rules).
export const LEAD_STATUSES = ['new', 'called', 'estimate-sent', 'booked', 'lost', 'spam']

export const STATUS_LABELS = {
  new: 'New',
  called: 'Called',
  'estimate-sent': 'Estimate sent',
  booked: 'Booked',
  lost: 'Lost',
  spam: 'Spam / test',
}

// App Check (anti-spam): proves requests come from our pages, not a script.
// reCAPTCHA Enterprise site key (public by design), from Google Cloud console
// → Security → reCAPTCHA (score-based, no checkbox). Empty = App Check off.
// On localhost a debug token is printed in the console instead; register it
// in Firebase console → App Check → Apps → ⋮ → Manage debug tokens.
export const APP_CHECK_SITE_KEY = '6Le6IuctAAAAAG-n1sS8J5Gjg-IvFXnnHqgI9uxR'

// Phone notifications for staff (docs/specs/staff-alerts.md): the PUBLIC half
// of the project's web push key, from Firebase console → Project settings →
// Cloud Messaging → Web configuration → Web Push certificates. Public by
// design. Empty = the staff app says notifications aren't set up yet.
// Generated 2026-10-09.
export const PUSH_VAPID_KEY = 'BF6QFVaqOyLPLtXF_x2TrmgtQpnDUFPBHqqKtSn0AK9i2VtLZzMDnVTKGqA-bCkaq-5Svsrcn0qYAJ_jG0qkPXQ'

let appPromise
export function getFirebaseApp() {
  appPromise ??= (async () => {
    const { initializeApp } = await import('firebase/app')
    const app = initializeApp(firebaseConfig)
    if (APP_CHECK_SITE_KEY) {
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check')
      if (import.meta.env.DEV) globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true
      initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true })
    }
    return app
  })()
  return appPromise
}

// Fields a customer may send; must match the create rule in firestore.rules.
const LEAD_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'zip', 'contactMethod', 'message', 'source']

// attachment (optional, /design/): { design, photo, image } from the public
// designer (docs/specs/public-designer.md). It's saved first (leadDesigns) and
// the lead points to it; if that fails the request still goes out without it.
export async function submitLead(formData, attachment = null) {
  const [{ getFirestore, collection, addDoc, serverTimestamp }, fbApp] = await Promise.all([
    import('firebase/firestore'),
    getFirebaseApp(),
  ])
  const db = getFirestore(fbApp)
  const lead = Object.fromEntries(LEAD_FIELDS.map((k) => [k, String(formData.get(k) ?? '').trim()]))
  let designId = null
  if (attachment) {
    try {
      const ref = await addDoc(collection(db, 'leadDesigns'), { ...attachment, createdAt: serverTimestamp() })
      designId = ref.id
    } catch (err) {
      console.warn('Design not attached', err.code ?? err.message)
      lead.message = `${lead.message}\n\n(They made a design on the website, but it couldn’t be attached.)`.slice(0, 3000)
    }
  }
  await addDoc(collection(db, 'leads'), {
    ...lead,
    ...(designId ? { designId } : {}),
    status: 'new',
    notes: '',
    createdAt: serverTimestamp(),
  })
}
