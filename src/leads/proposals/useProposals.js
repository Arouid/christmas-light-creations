// Staff-app adapter for proposals: Firestore records keyed by the customer's
// link token (see firestore.rules: the public can only open, view and sign).
import { docHash, fillTerms, newToken, termVars } from '../../proposals/model.js'
import { createRecord, deleteRecord, getRecord, saveRecord, useLiveQuery } from '../staffStore'
import { loadDesignPhoto, loadDesignRender } from '../designs/useDesigns'

const newestFirst = (a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? ''))

export const proposalLink = (token) => `${window.location.origin}/proposal/?t=${token}`

// Same test as firestore.rules: drafts, never-signed voided ones and test-mode
// payments can go; signed or really-paid proposals stay as the record.
export const canDeleteProposal = (p) => p.status === 'draft' || (p.status === 'void' && !p.signature) || (p.deposit?.env === 'sandbox' && !p.payments)
// Signed but not really paid: staff can void it (customer backed out, or a test).
export const canVoidProposal = (p) => ['sent', 'viewed', 'signed', 'countersigned'].includes(p.status) && !(p.deposit?.status === 'paid' && p.deposit.env !== 'sandbox')

export async function deleteProposal(token) {
  await Promise.all([deleteRecord('proposalFiles', `${token}-render`), deleteRecord('proposalFiles', `${token}-photo`)])
  await deleteRecord('proposals', token)
}

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
  // Sent from now on: next-season price from the undiscounted install (owner 2026-10-09).
  const withBasis = { ...proposal, reinstallBasis: proposal.reinstallBasis ?? 'list' }
  const terms = fillTerms(withBasis.termsTemplate ?? withBasis.terms, termVars(withBasis, business))
  const final = { ...withBasis, terms, termsText: terms }
  const hash = await docHash(final)
  if (proposal.designId) {
    const [render, photo] = await Promise.all([loadDesignRender(proposal.designId), loadDesignPhoto(proposal.designId)])
    if (render) await saveRecord(user, 'proposalFiles', `${token}-render`, { dataUrl: render })
    if (photo) await saveRecord(user, 'proposalFiles', `${token}-photo`, { dataUrl: photo })
  }
  await saveProposal(user, token, { reinstallBasis: withBasis.reinstallBasis, terms, termsText: terms, docHash: hash, status: 'sent', sentAt: new Date().toISOString() })
  return hash
}

export const countersign = (user, token, { name, image }) =>
  saveProposal(user, token, { status: 'countersigned', countersign: { name, image: image ?? null, by: user.email }, countersignedAt: new Date().toISOString() })

// Back to draft for changes (only before the customer signs). The link then
// shows "being updated" until it's sent again with a new fingerprint.
export const reviseProposal = (user, token, p) => saveProposal(user, token, { status: 'draft', docHash: null, terms: p.termsTemplate ?? p.terms, termsText: null })

export const getProposalRecord = (token) => getRecord('proposals', token)
