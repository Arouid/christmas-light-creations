// Firebase web config. These values are public by design: access is enforced
// by firestore.rules, not by keeping this secret. Paste the config from
// Firebase console → Project settings → Your apps → Web app.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

export const LEAD_STATUSES = ['new', 'called', 'estimate-sent', 'booked', 'lost']

export const STATUS_LABELS = {
  new: 'New',
  called: 'Called',
  'estimate-sent': 'Estimate sent',
  booked: 'Booked',
  lost: 'Lost',
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
const LEAD_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'zip', 'contactMethod', 'message']

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
