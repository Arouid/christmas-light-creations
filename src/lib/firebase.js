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

let app
export async function getFirebaseApp() {
  if (!app) {
    const { initializeApp } = await import('firebase/app')
    app = initializeApp(firebaseConfig)
  }
  return app
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
