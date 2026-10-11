# Home: "Spent this month"

> Status: built 2026-10-10 (owner asked: "are we able to pull into the dashboard the 'spent' amount from any API we're using, so it's right in front of me?") · needs `firestore.rules` republished (new `usage` collection) · functions deployed, see verified.md

## The problem

The app runs on paid services (Claude, PayPal, Google Cloud/Firebase/Maps, Google Workspace, Google Voice, the domain). Seeing what they cost means opening four consoles. The owner wants the month's spend on Home, next to the status lights.

## What we want

A **Spent this month** panel on Home (under System status): one total for the month in Central time, then four lines, each with an amount and a muted note that says how we know.

| Line | Amount | How we know | Note shown |
|---|---|---|---|
| **Claude** | Every Suggest a reply, Ask Claude and Plan with Claude call: tokens × Anthropic's list price | **exact** for our own usage (what Anthropic bills, before any credit) | "21 calls · list price per token · exact", then per service |
| **PayPal fees** | What PayPal kept on each online payment (deposit, balance, takedown, invoice) | **exact**: `paypal_fee` from the capture answer | "3 online payments · exact" |
| **Google Cloud** | — | **link**: the app can't read it (see below) | "Firebase, Maps, email: see billing ↗" |
| **Fixed** | ⚙ Settings → **Monthly costs** (Google Workspace, Google Voice, domain…) | **typed in ⚙** (an estimate: what the owner typed) | the names, "typed in ⚙" |

The total is Claude + PayPal fees + Fixed, and the panel says "Google Cloud not included". Under a dollar amounts read as cents ("3.2¢"), so a day's Claude use isn't "$0.03".

## How it works

- **Claude**: the server adds every call to `usage/{YYYY-MM}` (month in Central time): `claude.<draft|ask|plan>.{calls, inputTokens, outputTokens, microCents, models.<id>}`. `microCents` is thousandths of a cent, an integer, so Firestore's `increment` adds exactly. Prices per model live in `functions/usage.js` (`PRICES`, from the claude-api skill 2026-10-06: Opus 5.5 $4 / $20 per MTok, cache read $0.20, cache write $5); an unknown model id (a new release) is priced as Opus 5.5 so a real call never shows $0. The existing `costOf` in the prompt files still logs per call; the usage doc is what Home reads.
- **PayPal**: on a completed capture the server stores `feeCents` on the payment record (proposal `deposit` / `payments.<part>`, invoice `payment`) and adds `paypal.{payments, grossCents, feeCents}` to the month doc. If PayPal's answer has no `seller_receivable_breakdown.paypal_fee` (seen in sandbox), `feeCents` is null and `paypal.unknownFees` counts it ("1 fee unknown").
- **Google Cloud**: the Cloud Billing API only reports spend through a BigQuery billing export (enable export → BigQuery dataset → scheduled query → a function to read it), which is more setup than the number is worth for a project that costs cents. The line links to the billing page of project `clc-leads-site`. The $5 budget alert (TODO #12) is the safety net.
- **Fixed**: `settings/app.monthlyCosts` = `[{ name, amount }]` in dollars, edited in ⚙ Settings → Monthly costs (same stamped settings write as everything else there).
- Home listens to this month's doc live (`useLiveDoc`), so a draft or a payment shows within seconds. A missing doc is a $0 month. Recording never blocks or fails the call that spent the money (errors are logged as warnings).

## What we DON'T do

- **No Anthropic Admin API**: it needs an admin key with org-wide rights, and our own count is exact anyway.
- **No Google Cloud number** (see above); no BigQuery export unless the owner wants it later.
- **No per-call list** on Home: the function logs have every call's tokens and cost.
- **No budgets or alerts** here: the Anthropic console has the $150 monthly limit (TODO #43), Google Cloud the budget alert.
- **No history view**: older months stay in the database (`usage/2026-09`), nothing on Home shows them yet.

## Edge cases

- **Rules not published** (`usage` refused): the panel says so, shows the fixed costs only ("Needs the database rules published again"), nothing else breaks.
- **Month turns over**: the month key comes from the per-minute clock; at midnight Central the panel switches to the new (empty) doc.
- **Model changed** (`AI_MODEL` in functions/.env): priced per call by the model that answered, and the doc keeps a per-model call count.
- **Demo** (`/leads/?demo`): a sample month (21 Claude calls, 3 payments) and three fixed costs.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-10 | One doc per month, counters added by the server; nobody writes it from the app (rules: staff read, write false) | One read for the panel; exact integer adds; the app can't fake a bill |
| 2026-10-10 | Claude cost from our own token counts × list price, not from Anthropic's console | Exact for what we use, no admin key, no polling |
| 2026-10-10 | PayPal fee kept on the payment record too (`feeCents`) | A refund or a question about one payment can be answered from the record |
| 2026-10-10 | Google Cloud is a link, not a number | Billing export + BigQuery isn't worth it for cents a month; TODO #12 covers surprises |
| 2026-10-10 | Fixed costs typed in ⚙ Settings, labelled "typed in ⚙" | The app can't see those bills; the label keeps exact and typed apart |

## Acceptance criteria

1. [test] Price math per model and token kind; unknown model priced as Opus 5.5; increments for a call and a capture; fee parsing (USD only, null when missing); fixed-cost cleaning; the summary's total and notes; cents/dollars text. → `tests/usage.test.mjs`
2. [test] Rules: staff read `usage`, nobody writes it, outsiders get nothing. → `npm run test:rules`
3. [human] `/leads/?demo` at 375px: panel under System status with the demo total; four lines; "see billing" opens Google Cloud billing (44px); ⚙ Settings → Monthly costs: add a line, Save → Home's Fixed and total change; no horizontal scroll; no console errors. Observer: agent, browser pane.
4. [human] Live: after one Suggest a reply (or Ask Claude) the Claude line shows 1 call and a few cents; after one online payment the PayPal line shows the fee PayPal reports for that payment. Known-good control: the function log line (tokens, cost) and PayPal's activity page. Observer: owner.

## Contract

`usage/{YYYY-MM}` (server only):

| Field | Value |
|---|---|
| `claude.<service>.calls` | calls this month; service = `draft`, `ask`, `plan` (or `other`) |
| `claude.<service>.inputTokens` / `outputTokens` | input (incl. cache reads and writes) and output tokens |
| `claude.<service>.microCents` | cost in thousandths of a cent at list price |
| `claude.<service>.models.<model id>` | calls per model (dots in the id become `_`) |
| `paypal.payments` / `grossCents` / `feeCents` / `unknownFees` | online payments captured, what was charged, PayPal's fees, captures with no fee in the answer |
| `updatedAt` | server time of the last add |

Payment records gain `feeCents` (cents or null). `settings/app.monthlyCosts`: `[{ name, amount }]`.

## Links

- Home: `docs/specs/dashboard.md` · sales assistant, Ask Claude, Plan with Claude: their specs (costs per call) · invoices: `docs/specs/invoices.md` (payment record).
