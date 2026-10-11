# src/assistant — the sales assistant in the staff app

Staff side of "✨ Suggest a reply" (spec: `docs/specs/sales-assistant.md`). Modular like `src/designer/` and `src/proposals/` so it can become its own app later.

| File | What |
|---|---|
| `SuggestReply.jsx` | The button and the draft panel: summary, next step, warning, editable subject and reply, then **✉️ Email this** / **Text this** through the existing `ComposeEmail` (its `initial` prop) and `TextButton`. Logs `ai-draft` to Recent activity when sent. |
| `draftReply.js` | `requestDraft(target)` calls the `draftReply` Cloud Function; in demo mode (`/leads/?demo`) returns a sample draft. |
| `lib/targets.js` | Pure: whose thread a list entry means, the activity entry, where the email is filed. |
| `lib/knowledge.js` | Pure: what the assistant may know, from `src/data/content.js` and the stock email templates. Written to `functions/assistant/knowledge.json` by `scripts/build-assistant-knowledge.mjs`. |

Used by: `src/leads/MessagesPanel.jsx` (💬 rows), `src/leads/UnmatchedMessages.jsx`, `src/leads/TextHistory.jsx` (Accounts and customer detail).
Depends on: `src/leads/ComposeEmail`, `src/leads/Reach` (TextButton, pill), `src/leads/activity` (logActivity), `src/leads/demo`, `src/lib/firebase`, and `NEXT_ACTIONS` from `functions/assistant/prompt.js`.
