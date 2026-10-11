// Whose thread the assistant should read, and how that person appears in
// Recent activity. Pure. target: { customerId } | { leadId } | { messageId }.

// A 💬 list entry or a synced message -> the request the server takes.
export const draftTarget = (m) => (m.customerId ? { customerId: m.customerId } : m.leadId ? { leadId: m.leadId } : { messageId: m.id })

// -> { type, id } for src/leads/activity.js logActivity().
export const activityTarget = (t) => (t.customerId ? { type: 'customer', id: t.customerId } : t.leadId ? { type: 'lead', id: t.leadId } : { type: 'message', id: t.messageId })

// -> the `target` ComposeEmail files the email under (none for an unknown sender: Gmail only).
export const emailTarget = (t) => (t.customerId ? { customerId: t.customerId } : t.leadId ? { leadId: t.leadId } : undefined)
