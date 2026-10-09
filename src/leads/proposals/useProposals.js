// Staff-app adapter for proposals: Firestore records keyed by the customer's
// link token (see firestore.rules: the public can only open, view and sign).
import { docHash, fillTerms, newToken, termVars } from '../../proposals/model.js'
import { createRecord, getRecord, saveRecord, useLiveQuery } from '../staffStore'
import { loadDesignPhoto, loadDesignRender } from '../designs/useDesigns'

const newestFirst = (a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? ''))

export const proposalLink = (token) => `${window.location.origin}/proposal/?t=${token}`

export function useProposals(user, ownerId) {
  return useLiveQuery(user, 'proposals', 'ownerId', ownerId, newestFirst)
}

// New draft: the id is the link token, so it's unguessable from the start.
export async function createProposal(user, owner, proposal) {
  const token = newToken()
  await createRecord(user, 'proposals', token, { ...proposal, ownerType: owner.type, ownerId: owner.id, savedAt: new Date().toISOString() })
  return token
}

export const saveProposal = (user, token, data) => saveRecord(user, 'proposals', token, { ...data, savedAt: new Date().toISOString() })

// Send: freeze the terms (placeholders filled), fingerprint the exact content,
// copy the design images where the customer's page can read them.
export async function sendProposal(user, token, proposal, business) {
  const terms = fillTerms(proposal.termsTemplate ?? proposal.terms, termVars(proposal, business))
  const final = { ...proposal, terms, termsText: terms }
  const hash = await docHash(final)
  if (proposal.designId) {
    const [render, photo] = await Promise.all([loadDesignRender(proposal.designId), loadDesignPhoto(proposal.designId)])
    if (render) await saveRecord(user, 'proposalFiles', `${token}-render`, { dataUrl: render })
    if (photo) await saveRecord(user, 'proposalFiles', `${token}-photo`, { dataUrl: photo })
  }
  await saveProposal(user, token, { terms, termsText: terms, docHash: hash, status: 'sent', sentAt: new Date().toISOString() })
  return hash
}

export const countersign = (user, token, { name, image }) =>
  saveProposal(user, token, { status: 'countersigned', countersign: { name, image: image ?? null, by: user.email }, countersignedAt: new Date().toISOString() })

// Back to draft for changes (only before the customer signs). The link then
// shows "being updated" until it's sent again with a new fingerprint.
export const reviseProposal = (user, token, p) => saveProposal(user, token, { status: 'draft', docHash: null, terms: p.termsTemplate ?? p.terms, termsText: null })

export const getProposalRecord = (token) => getRecord('proposals', token)
