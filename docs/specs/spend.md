# Home: "Spent this month"

> Status: built 2026-10-10 (owner asked: "are we able to pull into the dashboard the 'spent' amount from any API we're using, so it's right in front of me?"); rules published and site live 2026-10-11 · Google Cloud as a real number from the billing export added 2026-10-11 (owner: "this is the best we can do with Google?") · Google Ads from the Ads transfer and fixed costs dropped 2026-10-11 (owner: "I dont want to see the fixed costs just the costs that go up by usage") · see verified.md

## The problem

The app runs on paid services (Claude, PayPal, Google Cloud/Firebase/Maps, Google Workspace, Google Voice, the domain). Seeing what they cost means opening four consoles. The owner wants the month's spend on Home, next to the status lights.

## What we want

A **Spent this month** panel on Home (under System status): one total for the month in Central time, then four lines, each with an amount and a muted note that says how we know. Only costs that go up with use (owner, 2026-10-11): no fixed bills.

| Line | Amount | How we know | Note shown |
|---|---|---|---|
| **Claude** | Every Suggest a reply, Ask Claude and Plan with Claude call: tokens × Anthropic's list price | **exact** for our own usage (what Anthropic bills, before any credit) | "21 calls · list price per token · exact", then per service |
| **PayPal fees** | What PayPal kept on each online payment (deposit, balance, takedown, invoice) | **exact**: `paypal_fee` from the capture answer | "3 online payments · exact" |
| **Google Cloud** | Net cost (cost + credits) of project clc-leads-site, per service, from Google's billing export into BigQuery | **exact**, about a day behind (Google exports with a delay) | "as of Oct 10 · exact", then the top 3 services; a small "see billing ↗" link. Before the first run: "export on, first numbers within a day" |
| **Google Ads** | Ad cost per campaign from the BigQuery Data Transfer for Google Ads (same dataset) | **exact**, a day behind | "as of Oct 10 · exact", then the top 3 campaigns; a small "see ads ↗" link. Before the transfer exists: "not connected yet · BigQuery → Data transfers → Google Ads" |

The total is Claude + PayPal fees + Google Cloud + Google Ads; while a Google source has no number yet the panel says so ("Google Cloud and Google Ads not in yet"). Under a dollar amounts read as cents ("3.2¢"), so a day's Claude use isn't "$0.03".

## How it works

- **Claude**: the server adds every call to `usage/{YYYY-MM}` (month in Central time): `claude.<draft|ask|plan>.{calls, inputTokens, outputTokens, microCents, models.<id>}`. `microCents` is thousandths of a cent, an integer, so Firestore's `increment` adds exactly. Prices per model live in `functions/usage.js` (`PRICES`, from the claude-api skill 2026-10-06: Opus 5.5 $4 / $20 per MTok, cache read $0.20, cache write $5); an unknown model id (a new release) is priced as Opus 5.5 so a real call never shows $0. The existing `costOf` in the prompt files still logs per call; the usage doc is what Home reads.
- **PayPal**: on a completed capture the server stores `feeCents` on the payment record (proposal `deposit` / `payments.<part>`, invoice `payment`) and adds `paypal.{payments, grossCents, feeCents}` to the month doc. If PayPal's answer has no `seller_receivable_breakdown.paypal_fee` (seen in sandbox), `feeCents` is null and `paypal.unknownFees` counts it ("1 fee unknown").
- **Google Cloud**: Google reports a project's spend only through a Cloud Billing export into BigQuery. The owner turned it on 2026-10-11 (Billing → Billing export → BigQuery, "Standard usage cost", project clc-leads-site, dataset `billing`, location US). `googleSpend` (`functions/index.js`, every 6 hours at :20) queries the export table (`billing.gcp_billing_export_v1_*`, a wildcard so the billing-account id in the name doesn't matter) for this and last month: `SUM(cost) + SUM(credits.amount)` per `invoice.month` and `service.description`, plus `MAX(export_time)`. `functions/googleBilling.js` (pure) builds the query and turns the rows into `google: { totalCents, byService: { <service>: cents }, asOf, lastExportAt }`, written with `mergeFields: ['google']` so the Claude and PayPal counters are untouched and a service that disappears doesn't linger. Last month is refreshed too, because Google keeps adding to a month for a few days after it ends. Home shows "as of" the export's last timestamp (Central date). The functions service account needs **BigQuery Job User** on the project and **BigQuery Data Viewer** on the dataset; a refused query is logged and the panel keeps saying "export on". The $5 budget alert (TODO #12) stays the safety net.
- **Google Ads**: the owner connects the BigQuery Data Transfer for Google Ads (BigQuery → Data transfers → Create → Google Ads, signed in as the Ads account owner, customer id from ads.google.com, destination dataset `billing`). It writes `ads_CampaignBasicStats_<customerId>` (cost per campaign per day, `metrics_cost_micros`) and `ads_Campaign_<customerId>` (campaign names). The same `googleSpend` run queries them by customer id, `ADS_CUSTOMER_ID` (no wildcard: these names are views, and BigQuery refuses wildcards on views; found 2026-10-11) (`adsQuery`): micros summed per month (`segments_date`) and campaign, named from the latest snapshot, into `ads: { totalCents, byCampaign: { <campaign>: cents }, asOf, lastDay }` (`adsSpend`). Each source is queried on its own: a "table not found" (`isMissingTable`) is skipped and logged, so Google Cloud still updates while Ads isn't connected, and vice versa. Home shows "as of" the last day with data. **Local Services Ads** have no BigQuery transfer: if the business advertises there instead, the line stays "not connected" and only the link helps.
- Home listens to this month's doc live (`useLiveDoc`), so a draft or a payment shows within seconds. A missing doc is a $0 month. Recording never blocks or fails the call that spent the money (errors are logged as warnings).

## What we DON'T do

- **No Anthropic Admin API**: it needs an admin key with org-wide rights, and our own count is exact anyway.
- **No live Google Cloud number**: the export is a day behind by Google's design; the "as of" date says so. No scheduled queries or extra BigQuery tables: one query every 6 hours reads the export directly (a few KB scanned, well inside BigQuery's free tier).
- **No fixed costs** (Workspace, Voice, domain): the owner wants only the costs that go up with use (2026-10-11); the ⚙ Monthly costs editor and `settings/app.monthlyCosts` are gone.
- **No Local Services Ads number**: Google offers no BigQuery transfer for it.
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
| 2026-10-11 | Google Cloud becomes a real number from the billing export, read by a scheduled function every 6 hours | Owner asked "this is the best we can do with Google?" and enabled the export; the number is exact, a day behind, and the link stays |
| 2026-10-11 | `google` written with `mergeFields` (whole field replaced), ISO strings for `asOf` / `lastExportAt` | Counters next to it stay exact; a service that drops out doesn't linger; the pure summary needs no Timestamp class |
| 2026-10-11 | Google Ads read by the same function from the Ads transfer, each source skipped on its own when its table isn't there | Owner: "I'd like to track ad spend with google here too"; one schedule, and Cloud keeps working while Ads isn't connected |
| 2026-10-11 | Fixed costs removed (line, editor, setting) | Owner: "I dont want to see the fixed costs just the costs that go up by usage" |
| 2026-10-10 | Fixed costs typed in ⚙ Settings, labelled "typed in ⚙" | The app can't see those bills; the label keeps exact and typed apart |

## Acceptance criteria

1. [test] Price math per model and token kind; unknown model priced as Opus 5.5; increments for a call and a capture; fee parsing (USD only, null when missing); fixed-cost cleaning; the summary's total and notes; cents/dollars text. → `tests/usage.test.mjs`. Billing and Ads query text and months, rows → cents per service / campaign (rounded once), latest export time and last day, safe keys, top 3, Google Cloud and Ads in the total only once present, missing-table detection, "as of" text. → `tests/googleBilling.test.mjs`
2. [test] Rules: staff read `usage`, nobody writes it, outsiders get nothing. → `npm run test:rules`
3. [human] `/leads/?demo` at 375px: panel under System status with the demo total; four lines; Google Cloud and Google Ads each show a dollar amount, "as of" a date, their top services / campaigns and a small link (44px) to Google Cloud billing / Google Ads; no Fixed line and no Monthly costs box in ⚙ Settings; no horizontal scroll; no console errors. Observer: agent, browser pane.
4. [human] Live: after one Suggest a reply (or Ask Claude) the Claude line shows 1 call and a few cents; after one online payment the PayPal line shows the fee PayPal reports for that payment. Known-good control: the function log line (tokens, cost) and PayPal's activity page. Observer: owner.
5. [human] Live: within a day of the export starting, the Google Cloud line shows a dollar amount and an "as of" date, and it matches the Google Cloud billing page's month-to-date for the project (same day). Known-good control: `googleSpend` log line (cents, lines, through) and console.cloud.google.com/billing. Observer: owner.
6. [human] Live: within a day of the Ads transfer's first run, the Google Ads line shows the month's cost and matches ads.google.com's month-to-date (same day). Known-good control: the `googleSpend` log and the Ads overview. Observer: owner.

## Contract

`usage/{YYYY-MM}` (server only):

| Field | Value |
|---|---|
| `claude.<service>.calls` | calls this month; service = `draft`, `ask`, `plan` (or `other`) |
| `claude.<service>.inputTokens` / `outputTokens` | input (incl. cache reads and writes) and output tokens |
| `claude.<service>.microCents` | cost in thousandths of a cent at list price |
| `claude.<service>.models.<model id>` | calls per model (dots in the id become `_`) |
| `paypal.payments` / `grossCents` / `feeCents` / `unknownFees` | online payments captured, what was charged, PayPal's fees, captures with no fee in the answer |
| `google.totalCents` | net Google Cloud cost of the month so far (cost + credits), from the billing export |
| `google.byService.<service>` | cents per service (Google's `service.description`, dots replaced by `_`), services rounding to 0¢ left out |
| `google.asOf` / `google.lastExportAt` | ISO strings: when the query ran, and the newest `export_time` in the rows (Home's "as of") |
| `ads.totalCents` | Google Ads cost of the month so far, from the Ads transfer |
| `ads.byCampaign.<campaign>` | `{ cents, clicks, impressions, conversions }` per campaign (name from the latest snapshot, dots replaced by `_`), campaigns with nothing at all left out; docs before 2026-10-11 hold bare cents, still read |
| `ads.impressions` / `clicks` / `conversions` / `conversionsValueCents` / `topTerms` | the month's totals and top 5 search terms for the Google Ads panel (`docs/specs/ads-stats.md`) |
| `ads.asOf` / `ads.lastDay` | when the query ran (ISO), and the last `segments_date` with data (`YYYY-MM-DD`, Home's "as of") |
| `updatedAt` | server time of the last add |

Payment records gain `feeCents` (cents or null).

## Links

- Home: `docs/specs/dashboard.md` · sales assistant, Ask Claude, Plan with Claude: their specs (costs per call) · invoices: `docs/specs/invoices.md` (payment record).
