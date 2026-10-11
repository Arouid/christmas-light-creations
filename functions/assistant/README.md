# functions/assistant — the sales assistant's brain

Server side of "✨ Suggest a reply" (spec: `docs/specs/sales-assistant.md`). Built to be lifted into its own app later: nothing in here imports from the rest of `functions/`.

| File | What |
|---|---|
| `prompt.js` | Pure: the fixed system prompt built from `knowledge.json` plus the hard rules, the per-request prompt (record + thread), the JSON output schema, `parseDraft` (checks and tidies the answer), `draftRequest` (what the browser may ask), `draftAllowed` (150 a day), cost per call. Tested in `tests/assistant.test.mjs`. |
| `draft.js` | `threadFor(db, target)` loads the thread and record; `draftFor({...})` calls Claude (`@anthropic-ai/sdk`, structured output) and returns the checked draft, usage and cost. Throws `DraftError` with an HttpsError code. |
| `knowledge.json` | Generated from the site copy by `node scripts/build-assistant-knowledge.mjs` (`src/assistant/lib/knowledge.js`); a test fails when it is stale. Don't edit by hand. |

Depends on: `@anthropic-ai/sdk` (functions/package.json), a Firestore `db` handed in, the `ANTHROPIC_API_KEY` secret and `AI_MODEL` param owned by `functions/index.js`, which only registers the `draftReply` callable (staff gate, daily count, Who's on presence write).
