# src/assistant — the sales assistant in the staff app

Staff side of "✨ Suggest a reply" (spec: `docs/specs/sales-assistant.md`), "🤖 Ask Claude" (spec: `docs/specs/ask-claude.md`) and "✨ Plan with Claude" (spec: `docs/specs/schedule-assistant.md`). Modular like `src/designer/` and `src/proposals/` so it can become its own app later.

| File | What |
|---|---|
| `SuggestReply.jsx` | The button and the draft panel: summary, next step, warning, editable subject and reply, then **✉️ Email this** / **Text this** through the existing `ComposeEmail` (its `initial` prop) and `TextButton`. Logs `ai-draft` to Recent activity when sent. |
| `draftReply.js` | `requestDraft(target)` calls the `draftReply` Cloud Function; in demo mode (`/leads/?demo`) returns a sample draft. |
| `AskClaude.jsx` | The 🤖 panel: question box, transcript, answer with the records it used as links, **✨ Draft a reply to them** (SuggestReply with the `draftFor` target). |
| `askApi.js` | `ask(question, history)` calls the `askClaude` Cloud Function; canned demo answers in `/leads/?demo`. |
| `PlanSchedule.jsx` | The Season tab’s planning panel: date range, who to plan (ticked list), **Make a plan**, the plan by day with reasons and over-capacity warnings, a day picker per person (move or drop), **Apply** (writes `plannedDate`, `day`, `weekOf` and the status through `onUpdate`, skipping anyone scheduled meanwhile), then **✉ Email these** with the `schedule-confirm` template through `EmailQueue`. |
| `scheduleApi.js` | `proposeSchedule({ from, to, customerIds })` calls the `proposeSchedule` Cloud Function; in demo mode returns a canned plan built with the same day helpers. |
| `lib/records.js` | Pure: record → in-app hash link and label, transcript → history, answer text → paragraphs and lists. |
| `lib/targets.js` | Pure: whose thread a list entry means, the activity entry, where the email is filed. |
| `lib/knowledge.js` | Pure: what the assistant may know, from `src/data/content.js` and the stock email templates. Written to `functions/assistant/knowledge.json` by `scripts/build-assistant-knowledge.mjs`. |

Used by: `src/leads/MessagesPanel.jsx` (💬 rows), `src/leads/UnmatchedMessages.jsx`, `src/leads/TextHistory.jsx` (Accounts and customer detail), `src/leads/LeadsApp.jsx` (the 🤖 Ask Claude tab, `#ask`, rendered `inline`; hidden when `settings/app.askClaude` is false), `src/leads/SeasonView.jsx` (✨ Plan with Claude).
Depends on: `src/leads/ComposeEmail`, `src/leads/Reach` (TextButton, pill), `src/leads/activity` (logActivity), `src/leads/demo`, `src/lib/firebase`, `NEXT_ACTIONS` from `functions/assistant/prompt.js`, the pure plan helpers from `functions/assistant/schedulePrompt.js`, and `EmailQueue` from `src/leads/BulkEmail`.
