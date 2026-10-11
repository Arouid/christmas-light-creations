# Sales assistant (Claude drafts replies)

> Status: Phase 1 built 2026-10-10, not yet deployed (needs the API key: TODO #43) · Decided 2026-10-10 by Scott (owner): draft-for-approval first, never autonomous sending; budget about $150/month, quality over cost.

## The problem

Customers text, call and email all day while the crew is on roofs. Replies wait, and when they come they vary by who writes them. Owner, 2026-10-10: "Can we make a Claude sales agent that responds to customers and answers questions / tries to sell jobs?"

## Phase 1 (built): draft mode

**Where the code lives** (owner, 2026-10-10: its own folders, like `src/designer/`, so it can be split into its own app later): the brain in `functions/assistant/` (`prompt.js`, `draft.js`, generated `knowledge.json`; no imports from the rest of `functions/`; `index.js` only registers the `draftReply` callable) and the staff-side pieces in `src/assistant/` (`SuggestReply.jsx`, `draftReply.js`, `lib/targets.js`, `lib/knowledge.js`), imported by the 💬 panel, Unmatched and Text & email history. Each folder has a README.

**Where**: a **✨ Suggest a reply** button under every message in **💬 New messages**, under every row in **Unmatched** (Leads), and at the top of anyone's **Text & email history** (Accounts customer and lead pages, customer detail).

**What happens**: the staff app asks the server (`draftReply`, `functions/index.js`) for a draft, saying only whose thread it is (`{ customerId }`, `{ leadId }` or `{ messageId }` for an unknown sender). The server:
1. Checks the caller is on the `staff` list (same gate as sending email from the app).
2. Reads the thread (the person's `messages`, last 30; for a lead, the website request itself is the first message; for an unknown sender, everything from that number or address) and their record (customer: address, seasons with prices, statuses, planned dates, original price, add-ons, notes; lead: request, status, source).
3. Sends Claude a fixed business prompt plus that thread and record, and asks for JSON.
4. Returns: **summary** (one line, what they're asking), **next action** (answer / send an estimate / schedule / a person should follow up), **channel** (text or email, whatever the customer used last), **subject**, **reply**, **escalate** flag, and a **reason** line for staff ("confirm they still want October before promising the discount").

**What staff see**: the summary and next step, the warning if any, the subject and the reply in editable boxes, then **✉️ Email this** (opens the normal compose box with the text loaded; Send from info@ as usual) or **Text this** (the normal copy-and-open-Google-Voice flow). Nothing is sent until they press Send there. **↻ Try again** asks for another draft. After a send, Recent activity on Home reads "Katie P. sent a Claude-drafted reply to Pat Sample".

**Who's on**: Claude appears on Home's Who's on list as "Claude (assistant)" with when it last drafted and for whom (server writes `presence/claude`; staff can't write that id). Never "on now".

### What the assistant knows

`functions/assistant/knowledge.json`, generated from the site's own copy by `node scripts/build-assistant-knowledge.mjs` (`src/assistant/lib/knowledge.js`): business name, phone, service areas (the Google Business Profile list), highlights, what's included, how it works, pricing notes, FAQ, the season dates from `urgency`, and four stock emails as voice samples. A test fails `npm run check` when the JSON is older than the copy. The system prompt (`systemPrompt()` in `functions/assistant/prompt.js`) adds the internal rules of thumb (per-foot C9 pricing after measuring, 10% early discount Oct 15–31, 50% re-install, takedown 15% / $150 default, add-ons) marked as **not for quoting**.

### Hard rules in the prompt

| Rule | Why |
|---|---|
| Never quote a price, range or per-foot rate unless this season's price is on their record | Owner: "I don't want to ball and chain myself"; every home is measured |
| Never promise an install or takedown date (we schedule area by area); may repeat a date already planned on their record | Same as the "Yes, put me on the schedule!" template |
| No discounts beyond 10% early install and 50% re-install; never anything for a review | Published terms only |
| Never invent a policy, product, person or time; when unsure, "a person will follow up" + next action **escalate** | |
| Upset, damage, refund, complaint, cancel, money owed → short and kind, "a person will call", **escalate** | Humans handle conflict |
| No gate codes or payment details in replies; the record sent to the model never includes the gate code | Privacy |
| Plain, warm, short; texts 1–4 sentences; emails signed "Thank you, Christmas Light Creations, 281-819-0163" | Matches `src/lib/emailTemplates.js` |

The server also checks the answer (`parseDraft`): unknown actions become **escalate**, texts lose their subject, lengths are capped. If Claude declines or answers in a shape we can't read, staff get a stock "we've got your message, someone will call" draft marked escalate, never nothing.

### Model, cost and limits

- Model: **Claude Opus 5.5** (`claude-opus-5-5`), effort `medium`, adaptive thinking, structured JSON output. Change with `AI_MODEL` in `functions/.env` and redeploy (`claude-sonnet-5-5` is about half the price; `claude-haiku-5-5` about a tenth).
- Per draft on Opus 5.5: ~3,300 tokens of fixed prompt (cached at 10% when drafts come within 5 minutes of each other) + ~800 of thread and record + ~600 output ≈ **3¢** (worst case with a long thread ~5¢). Sonnet ≈ 1.5¢, Haiku ≈ 0.2¢. Each call's token counts and cost are in the function log, never customer text.
- **150 drafts a day** for everyone together (`serverState/aiDraft`, no rules change: no client rule matches it), one every 2 seconds per staff member. Worst case ≈ $4.50/day, under the $150/month the owner set. Set the same amount as a **spend limit** in console.anthropic.com → Billing as the hard stop.
- Secret `ANTHROPIC_API_KEY` in Secret Manager (clipboard → `$HOME\anthropic.txt` → `functions:secrets:set ... --data-file`; see `docs/verified.md` 2026-10-09 on why not the prompt). A refused key sets off the red website-problem banner once, and the button says the assistant isn't set up.
- Refusal fallbacks (`fallbacks: "default"`) are **not** enabled: a customer-service draft is about as far from a safety decline as a request gets, and the stock-acknowledgement fallback covers it. Turn it on in `draftReply` if the log ever shows `draftReply refused`.

### Data and privacy

What goes to Anthropic per call: the fixed business prompt, the person's name, address, city, neighborhood, customer-since, install type, prices and statuses per season, planned dates, add-on and scheduling notes, staff notes (marked internal), and the last 30 messages. Not: gate codes, payment details, emails/phones of other people. The privacy page (`privacy` in `src/data/content.js`) says so under "Who else handles it". API use isn't used for training. Drafts aren't stored anywhere; only the activity entry when staff send one.

### What we DON'T do (Phase 1)

| Left out | Why |
|---|---|
| Sending anything by itself | Owner's decision: review ~50 drafts first |
| Storing drafts (`aiDrafts` collection) | Would need a rules change; nothing needs it yet |
| Reading other customers, routes or invoices | One thread at a time keeps the prompt small and the answers checkable |
| A chat with Claude inside the staff app | Phase 3 below |
| Tool use / web search | Nothing to look up; everything it may say is in the prompt |

## Phase 2 (written up, not built): auto-replies

**When**: after the owner has read about 50 drafts in Phase 1 and says the voice and the rules hold.

**What**: the server answers by itself, only for two message kinds:
1. **First-contact website estimate requests**: the "Got your request" acknowledgement, personalized from the request (address, design attached, preferred date noted as a request not a booking). Within a minute of the request, by email (text if no email).
2. **Simple FAQ texts** from known customers whose last message is a plain question the FAQ covers (hours, when installs start, do we do tile roofs, how to pay, what if a bulb goes out). Anything with a price question, a date request, a complaint, or that the model marks **escalate**, is left for a person and shows in 💬 as today.

**Guardrails**:
- Every automatic message ends with an "AI-assisted reply from Christmas Light Creations; a person will follow up if you need more" footer, and is filed in the customer's history as sent by `claude`, so it shows on Home ("Claude replied to …") and in Who's on.
- **Kill switch** in ⚙ Settings (`settings/app.aiAutoReply: false` stops it at once; the function reads it per call). A separate daily cap (start at 50) and one auto-reply per person per 24 hours; never twice in a thread without a human message in between.
- The 💬 list still shows the customer's message with "Claude answered" so staff can take it over; "I've got it" works as now.
- Same hard rules; a draft that fails `parseDraft` or comes back **escalate** is not sent.
- Firestore: outgoing entries are server-written (`sentBy: 'claude'`), so no rules change; the Settings flag is already a staff-editable settings field.

**To build**: a Firestore trigger on new `leads` and new incoming `messages` → the same prompt with an "auto mode" line → `sendStaffEmail`'s mailer path (email) or … texts: Google Voice has no API, so Phase 2 texts need the texting service decision first (decisions 2026-10-08). Email-only until then.

## Phase 3 (idea, not built): "Ask Claude" in the staff app

A chat panel for staff questions over the database ("who hasn't paid", "draft a text to everyone on Tuesday's route", "what did Pat ask last year"). Needs read-only tools over customers / invoices / routes / messages, the same staff gate, a per-question cost of a few cents, and its own spec. It does **not** replace Claude Code for fixing or changing the site: the in-app Claude never sees code, logs or Firebase settings.

## How to check (owner)

1. Set the key and deploy: `docs/TODO.md` #43.
2. Staff app → 💬 → a real text from a customer → **✨ Suggest a reply** → a draft in a few seconds with a sensible summary and next step; no price unless one is on file; no date promised.
3. Edit a word → **✉️ Email this** → the compose box has the edited text → **Send from info@** → arrives; Home → Recent activity says "… sent a Claude-drafted reply to …"; Who's on shows "Claude (assistant) · … · drafted a reply for …".
4. An unknown number in Unmatched → Suggest → a short text that asks for the address and offers to measure.
5. Try a nasty message on a test customer ("you damaged my gutter, I want a refund") → red **Next: A person should follow up**, short kind reply.
