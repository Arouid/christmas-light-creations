# Ask Claude (staff questions over the database)

> Status: built 2026-10-10, not yet deployed (needs the API key: TODO #43) · Decided 2026-10-10 by Scott (owner): Phase 3 of `docs/specs/sales-assistant.md`; read-only, never a developer.

## The problem

Staff know the answer is somewhere in the app but not where: "which invoices are overdue?", "what did Pat Sample ask last year?", "who's on Thursday's route?", "is the text sync working?". Today that is three tabs and a search. Owner, 2026-10-10: "will there be a Claude console inside the staff app to interact with?"

## What we want

A **🤖 Ask Claude** tab in the staff app's tab row, right after Home so it shows without scrolling on a phone (owner, 2026-10-10; it replaced a 🤖 button in the top bar, which the owner wanted kept short). It is a chat: header pinned at the top, the thread scrolling in the middle, the question box pinned at the bottom; the thread survives switching tabs while the app is open. Staff type a plain question; in a few seconds the answer comes back in plain words, with the records it looked at listed under it as links that open the right account, invoice list or route. A **✉️ Draft this** button appears when the answer concerns one customer or lead, and hands over to the existing **✨ Suggest a reply** flow for that person (staff still edit and send themselves).

Claude answers only from what the read-only tools return, says so when it finds nothing, and never guesses a price, date or policy. Follow-up questions in the same panel keep the conversation (the last few turns go back to the server), so "and the one before that?" works.

## What we DON'T do

| Left out | Why |
|---|---|
| Writing anything (status, notes, invoices, routes) | Owner's rule: the in-app Claude is read-only; staff change records in the app |
| Sending texts or emails from the panel | Same as Phase 1: drafts go through Email / Text screens, staff press Send |
| Reading or changing code, deploys, logs, Firebase settings | Claude Code stays the developer; this Claude never sees any of it |
| Gate codes, payment references, other people's emails/phones in answers | Same privacy line as the draft prompt |
| Streaming the answer token by token | The answer is short; a spinner is enough and keeps the server simple (one callable, one HTTP call) |
| Storing questions or answers | Nothing needs it; the function log keeps only token counts and cost |
| Open-ended analytics ("what was revenue by month in 2024?") | Tools return bounded lists (≤ 25 rows); Season and Home already show totals |

## Edge cases

- **No key / key refused**: the button works, the panel says the assistant isn't set up (same wording as Suggest a reply); the red website-problem banner fires once.
- **Switched off** (`settings/app.askClaude === false`): the tab is hidden and `#ask` shows a line saying Ask Claude is turned off in ⚙ Settings; the server refuses questions from an old tab.
- **Daily cap reached** (100 questions, everyone together): a clear message, try tomorrow.
- **Too many tool calls** (more than 8 in one question): the server stops and asks Claude to answer with what it has; the answer says it may be incomplete.
- **Nothing found**: Claude says so and suggests the Accounts search; no made-up record.
- **Several people match a name**: Claude lists them with links and asks which.
- **Claude declines** (safety stop): a stock "couldn't answer that one" line, never an empty panel.
- **Demo mode** (`/leads/?demo`): canned answers for a few sample questions so the UI is checkable without a key.
- **Long question** (> 1,000 characters) or empty: refused in the browser before any call.
- **Conversation gets long**: only the last 6 turns go back; older ones are dropped client-side.

## Decisions

- 2026-10-10 (owner): build it as Phase 3 of the sales assistant; read-only; a few cents a question; Claude Opus 5.5 like Phase 1. Budget shared with drafts (about $150/month).
- 2026-10-10 (Claude Code): one callable (`askClaude`) running a short **manual tool loop** on the server (no SDK beta runner), so the 8-tool cap and the read-only tool set are enforced in our code, not by the model.
- 2026-10-10: tools return **compact JSON rows with ids**; the model cites records by id in a structured `records` list, and the browser builds the links (`#accounts/customer/<id>`, `#accounts/lead/<id>`, `#invoices`, `#route-<id>`). Claude never writes URLs.
- 2026-10-10: Street/phone/name search loads the customer list once per question (a few hundred records) and filters in memory: Firestore can't substring-search and the list is small.
- 2026-10-10: kill switch is a staff-editable settings field (`askClaude`, default on) with a toggle in ⚙ Settings, so the owner can stop it without a deploy. `serverState/askClaude` counts questions; no rules change (no client rule matches `serverState`).

## Acceptance criteria

1. [test] `askRequest()` refuses empty, over-long, non-string questions and malformed history; keeps at most the last 6 turns. → `tests/askClaude.test.mjs`
2. [test] `askAllowed()` allows 100 questions a Central day for everyone together, then refuses; a new day starts over. → same file
3. [test] Every tool's arguments are checked (`toolArgs`): unknown tool, missing/over-long strings, bad dates and limits are refused with a reason the model can read. → same file
4. [test] `parseAnswer()` turns the model's JSON into `{ answer, records[], draftFor }` with unknown record types dropped, lengths capped, and a fallback when it isn't JSON. → same file
5. [test] Record rows sent to the model carry no gate code or payment reference (`customerRow`, `invoiceRow`). → same file
6. [test] `recordLink()` maps each record type to the right in-app hash. → same file
7. [human, demo] `/leads/?demo` → 🤖 Ask Claude tab → "which invoices are overdue?" → an answer with two linked records; "what did Pat Sample ask last year?" → an answer with a **✉️ Draft this** button that opens Suggest a reply. 375 px, no sideways scroll, no console errors. Observer: Claude Code in the browser pane; owner on a phone once deployed.
8. [human, live] After the key is set and `askClaude` deployed: a real question about a real overdue invoice returns the right number and a link that opens that customer; the function log shows tokens and cost, no customer text. Observer: owner (TODO #43).
9. [check] `npm run check` green; guide, privacy, decisions, verified, TODO updated in the same commit.

## Contract

**Callable** `askClaude` (region us-south1, staff only, same gate as `draftReply`).

Request: `{ question: string (1–1000), history?: [{ role: 'user'|'assistant', text: string }] (≤ 6) }`

Response: `{ answer: string, records: [{ type: 'customer'|'lead'|'invoice'|'route', id: string, label: string }], draftFor: { customerId } | { leadId } | null, incomplete: boolean, toolCalls: number, model: string, cost: number }`

Errors (HttpsError codes): `unauthenticated`, `permission-denied`, `invalid-argument`, `failed-precondition` (off, or key refused), `resource-exhausted` (cap), `unavailable`.

**Tools the model may call** (all read-only, all capped at 25 rows):

| Tool | Arguments | Returns |
|---|---|---|
| `find_customers` | `query` (name, street, phone digits, email, neighborhood) | id, name, address, city, phone, email, since, this season's install status and planned date |
| `get_customer` | `id` | the row plus every season (status, planned, prices, paid, takedown, add-on, scheduling notes), staff notes, install type |
| `list_leads` | `status?` (new, called, estimate, booked, declined, spam), `days?` (default 30) | id, name, city, status, created, first 200 chars of the request |
| `list_invoices` | `state` (open, overdue, draft, paid, all), `customerId?` | number, state, customer name, customerId, kind, season, total, due date, sent day |
| `routes_for_day` | `day` (YYYY-MM-DD; "today" allowed) | id, day, status, stops (order, name, address, kind, status, eta from the stored legs) |
| `get_messages` | `customerId` or `leadId`, `limit?` (≤ 25, default 15) | date, direction, kind, subject, first 400 chars |
| `system_status` | none | last text/email sync, open website problems (kind + first line), request-alert list size, kill-switch flags, today's date and season |

**Firestore**: `serverState/askClaude` `{ day, count, last: { [staff]: ms } }` (server only). `settings/app.askClaude` boolean (staff-editable, default true).

**Where the code lives**: `functions/assistant/ask.js` (tools over a Firestore `db`, the loop) and `functions/assistant/askPrompt.js` (pure: prompt, tool schemas, argument checks, request checks, answer parsing, limits); `src/assistant/AskClaude.jsx` (panel), `src/assistant/askApi.js` (callable + demo), `src/assistant/lib/records.js` (pure: links and labels). `index.js` registers the callable only.

## Links

- `docs/specs/sales-assistant.md` (Phase 1 prompt and hard rules, reused here; Phase 2 auto-replies)
- `docs/specs/dashboard.md` (the status lights the `system_status` tool mirrors)
- `docs/specs/invoices.md` (invoice states: overdue = open and past due, computed, not stored)
- `firestore.rules` (`serverState` has no client rule; `settings/app` is staff-editable)
