// Firestore access for the customer's proposal page (no sign-in): read one
// proposal by its link token, mark it viewed, sign it. firestore.rules allow
// exactly these changes and nothing else from the public.
//   proposals/{token}              the proposal (+ status, signature)
//   proposalFiles/{token}-render   design image shown to the customer
//   proposalFiles/{token}-photo    the photo before lights (for the slider)
import { getFirebaseApp } from './firebase.js'

async function fs() {
  const [mod, app] = await Promise.all([import('firebase/firestore'), getFirebaseApp()])
  return { ...mod, db: mod.getFirestore(app) }
}

export async function getProposal(token) {
  const f = await fs()
  const snap = await f.getDoc(f.doc(f.db, 'proposals', token))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getProposalImages(token) {
  const f = await fs()
  const get = async (k) => (await f.getDoc(f.doc(f.db, 'proposalFiles', `${token}-${k}`)).catch(() => null))?.data()?.dataUrl ?? null
  const [render, photo] = await Promise.all([get('render'), get('photo')])
  return { render, photo }
}

export async function markViewed(token) {
  const f = await fs()
  await f.updateDoc(f.doc(f.db, 'proposals', token), { status: 'viewed', viewedAt: f.serverTimestamp() })
}

// signature: { name, image (PNG data URL), consent: true, docHash, userAgent }
export async function signProposal(token, signature) {
  const f = await fs()
  await f.updateDoc(f.doc(f.db, 'proposals', token), { status: 'signed', signature, signedAt: f.serverTimestamp() })
}
