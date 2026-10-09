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
export const APP_CHECK_SITE_KEY = ''

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

export async function submitLead(formData) {
  const [{ getFirestore, collection, addDoc, serverTimestamp }, fbApp] = await Promise.all([
    import('firebase/firestore'),
    getFirebaseApp(),
  ])
  const lead = Object.fromEntries(LEAD_FIELDS.map((k) => [k, String(formData.get(k) ?? '').trim()]))
  await addDoc(collection(getFirestore(fbApp), 'leads'), {
    ...lead,
    status: 'new',
    notes: '',
    createdAt: serverTimestamp(),
  })
}
