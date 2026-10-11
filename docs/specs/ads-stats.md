# Home: "Google Ads" panel

> Status: built 2026-10-11 (owner asked, after the Spent this month work: "can I pull any of these ad stats into my dashboard?") · see verified.md

## The problem

Spent this month (`docs/specs/spend.md`) shows what the ads cost, but not what they bring. The owner wants to see, without opening ads.google.com, whether the money turns into clicks and estimate requests, and what people type before they click.

## What we want

A **Google Ads · <month>** panel on Home, arrangeable like the others (default: right after Spent this month), with a small **see ads ↗** link in its title. From the same BigQuery Data Transfer for Google Ads that feeds the Spent panel, so nothing new to connect:

| Shown | What it is |
|---|---|
| **spent** | the month's ad cost (same number as the Spent panel's Google Ads line) |
| **clicks** | clicks on the ads |
| **per click** | spent ÷ clicks, "—" without clicks |
| **requests** | estimate requests Google counted from the ads (its conversions). Shown only once there are any; until then the fourth number is **times shown** (impressions) |
| muted line | "$12.13 per estimate request · 3,180 times shown · as of Oct 9", or "no estimate requests counted yet · as of Oct 9" |
| top 3 campaigns | name, cost, clicks, requests |
| **People searched** | the 5 most-clicked search terms this month, with clicks and cost: the words people typed before clicking (for new keywords and negatives) |

Before the transfer exists: "Not connected yet · BigQuery → Data transfers → Google Ads". Rules refused: the same "needs the rules published" line as the Spent panel.

## How it works

- `googleSpend` (`functions/index.js`, every 6 hours) already queries the transfer's campaign stats. `adsQuery` (`functions/googleBilling.js`) now sums `metrics_impressions`, `metrics_clicks`, `metrics_conversions` and `metrics_conversions_value` next to `metrics_cost_micros`, per month and campaign (column names checked 2026-10-11 against BigQuery's "Google Ads report transformation" page, CampaignBasicStats); campaign names from the latest snapshot (`_DATA_DATE = _LATEST_DATE`, Google's own sample pattern). A second query, `termsQuery`, reads `ads_SearchQueryStats_<customerId>` (`search_term_view_search_term`, clicks, cost) and `topTerms` keeps the 5 most clicked per month.
- **No wildcards for Ads tables** (found 2026-10-11): the transfer's `ads_*` names are views over the partitioned `p_*` tables, and BigQuery refuses wildcards on views. The tables are named with the customer id, `ADS_CUSTOMER_ID = '9268846031'` (926-884-6031, the account made 2026-10-11). A different Ads account means changing that constant.
- Stored in `usage/{YYYY-MM}.ads` (whole field replaced with `mergeFields`): `{ totalCents, byCampaign: { <name>: { cents, clicks, impressions, conversions } }, impressions, clicks, conversions, conversionsValueCents, topTerms: [{ term, clicks, cents }], asOf, lastDay }`. The search-terms table missing on its own (transfer still filling) just leaves `topTerms` empty; the stats table missing skips Ads as before. `topServices` (the Spent panel's top campaigns) reads both the new `{ cents, … }` entries and the bare cents of docs written before 2026-10-11.
- Home: `adsSummary(usage.ads)` (`functions/googleBilling.js`, pure) gives the panel its numbers: cost per click and per request only when there's something to divide by; null while not connected. `AdsPanel` in `src/leads/HomePanels.jsx`, registered as `ads` in `src/lib/dashLayout.js`.
- **Conversions stay 0** until the owner defines a conversion action in Google Ads for the estimate form (the tag on `/thanks/`, `src/lib/ads.js`); Google counts them, not the site. Nothing new is loaded on the public site for this panel.

## What we DON'T do

- **No Google Ads API**: it needs a developer token and OAuth for the Ads account; the transfer already lands the same reports in BigQuery daily.
- **No live numbers**: the transfer is a day behind; "as of" says which day.
- **No per-keyword or per-ad tables, no charts, no history**: the panel answers "is it working this month?"; everything else is a tap away in Google Ads.
- **No conversion tracking changes**: the panel shows what Google counts; defining the conversion action is the owner's step in Google Ads (TODO #46).

## Edge cases

- **Clicks but no spend** (credits, a $0 day): per click shows "—"? No: 0¢ ÷ clicks is 0¢; "—" only without clicks.
- **A campaign with 0¢ and no clicks** (paused) is left out of `byCampaign`; one with impressions only stays (a new campaign shows it is running).
- **Fractional conversions** (Google attributes parts of one): kept to 2 decimals; "4 requests" reads from the rounded number.
- **Month turns over**: the panel follows the Spent panel's month key.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-11 | Same transfer and same scheduled function; the Ads field grows instead of a new collection | Nothing new to connect or publish rules for; one BigQuery read every 6 hours |
| 2026-10-11 | Ads tables named by customer id, not wildcards | The `ads_*` names are views; BigQuery refuses wildcards on views |
| 2026-10-11 | Requests (conversions) shown instead of impressions once there are any | Impressions matter little to the owner; requests are what the ads are for |
| 2026-10-11 | Top 5 search terms, most clicked first | What people typed is the one Ads report that changes what the owner does (keywords, negatives) |

## Acceptance criteria

1. [test] Ads query names the customer's tables (no wildcard), sums the five metrics and uses the latest campaign snapshot; terms query and top 5 per month; rows → cents, metrics, lastDay; `topServices` reads both shapes; `adsSummary` divides only when it can and is null when not connected. → `tests/googleBilling.test.mjs`; the `ads` panel in the layout → `tests/dashLayout.test.mjs`
2. [human] `/leads/?demo` at 375px: the panel after Spent this month with $48.50 · 97 clicks · 50¢ per click · 4 requests, "$12.13 per estimate request · 3,180 times shown · as of <day>", two campaigns, five search terms, **see ads** 44px; no horizontal scroll; no console errors. Observer: agent, browser pane.
3. [human] Live, a day after the transfer's first run: the panel's spend matches the Spent panel's Google Ads line and ads.google.com's month-to-date clicks and cost; search terms match Ads → Insights → Search terms. Observer: owner.
4. [human] Live, after the owner defines a conversion action: **requests** appears with a count, and the cost per request. Observer: owner.

## Links

- Spend: `docs/specs/spend.md` (same function, same doc) · Home: `docs/specs/dashboard.md` · the conversion tag: decisions.md 2026-10-11.
