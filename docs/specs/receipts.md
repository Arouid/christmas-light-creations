# Receipts and sales tax

> Status: Part 2 (the tax line) **built 2026-10-12**; Part 1 (receipts) not started. Owner's answers 2026-10-12: Texas + local (**8.25%**), from **October 15, 2026**, a lease price is all-inclusive (takedown inside the taxed price), service calls never taxed; the permit number goes in ⚙ Settings → Sales tax when it arrives. Not legal or tax advice; the CPA confirms.

## The owner's decisions

- Collect Texas sales tax on **year-one purchase installs** (the whole charge), **every lease / monthly-plan charge**, and **new lights added** in later years. **No tax on re-installs** of lights the customer already owns.
- He pays sales tax on lights he buys (Home Depot, Lowe's, wholesalers). He'll use resale certificates where he can and needs records of the tax he couldn't avoid, to claim it as a credit on the sales tax return.

## Part 2: the tax line on proposals and invoices (built 2026-10-12)

How it works: `src/lib/salesTax.js` reads `settings/app.salesTax` ({ ratePct, permit, from }; defaults 8.25%, 2026-10-15). A new estimate made on or after the start date carries `tax: { ratePct, permit? }` and every install line `taxable: true` (takedown lines `false`; staff untick/tick per line); `totals()` in `src/proposals/model.js` and `functions/proposalMath.js` tax the taxable lines after the discount, add it to the install (so the deposit includes it) and to any taxable removal line (a lease). Older proposals have no `tax`, so their math and fingerprints are unchanged; the fingerprint of a taxed one includes the rate, the per-line flags and the amounts. Invoices carry `tax: { ratePct, permit? }` when the editor's **Sales tax** box is ticked (on by default for add-ons, off for the rest); `invoiceCents()` = lines + tax, `invoiceSubtotal()`/`invoiceTax()` split it; emails, the invoice page and `/account/` show the line and the permit. The season's Total box keeps what the customer paid (tax included); the yearly re-install price stays pre-tax. No rules change.

| Piece | Where | What |
|---|---|---|
| Settings | ⚙ Settings → Sales tax | Rate (default 8.25%; the CPA confirms per city), permit number (printed on invoices once set), "collect from" date (nothing before it is taxed) |
| What's taxed | `src/proposals/model.js` + `functions/invoices.js` (shared math, tested) | Each line carries `taxable`, defaulted by kind: year-one install (purchase) yes · lease / monthly charge yes · added lights yes · re-install of owned lights no · takedown of owned lights no · service call no. Staff can flip a line. Tax = round(sum of taxable lines × rate) |
| Shown as | Proposal, invoice, `/account/`, receipts, PayPal amount | Its own line, "Sales tax (8.25%)"; re-install years show "no sales tax" plainly |
| Fingerprint | `PROPOSAL_VERSION` bump | A signed proposal's total includes tax; the canonical text gains the tax line |
| Season fill / yearly price | `src/lib/addOns.js` breakdown | Totals include tax; the breakdown labels the re-install as tax-free |
| FAQ | `content.js` → Paying | "Is sales tax included?" — Yes on new lights and leases, as its own line; not on re-installs of lights you own |

Tests: the taxable defaults, rounding, a proposal with mixed lines, an invoice built from a season (functions/invoices.js), the yearly-price breakdown.

## Part 1: receipts (photo + tag)

| Piece | What |
|---|---|
| Where | Staff app → **Receipts** (a new section: `src/lib/staffMenu.js` under Tools, in the drawer on phones) |
| Add | 📷 Take photo / From gallery (same browser resize + upload as install photos) → form: store, date, total, **sales tax paid**, purpose (new-customer install · lease stock · add-on for a customer · replacement / service · tools & supplies · other), optional customer (search), note. Save |
| Claude reads it (phase 1b) | Callable `readReceipt`: the photo → store, date, total, tax, suggested purpose, for staff to confirm. Same staff gate, `ANTHROPIC_API_KEY`, daily cap and usage tracking as `draftReply`; a vision-capable model (Sonnet 5.5 is plenty, about 1¢ a receipt). Never saves by itself |
| Data | Firestore `receipts/{id}`: date, store, totalCents, taxCents, purpose, customerId, note, photo { path, url, thumbUrl }, by, createdAt, updatedAt. Photo in Storage `receipts/{year}/{id}.jpg` |
| Rules | **New collection** → `firestore.rules` (staff create/update, stamped; delete by the adder or the owner) and a `storage.rules` block → **the owner republishes both** (CLI, as for install photos). Say so again before shipping |
| List | By month / quarter, purpose, store. Totals: tax paid on things that went into sales and leases (purpose ∈ install, lease stock, add-on) = the credit; tools & supplies shown apart. **Export CSV** for the CPA (built in the browser) |
| Home | "added a receipt" in Recent activity |

## Questions for the owner / CPA

1. One rate for every address, or per city? (Most of the area is 8.25%; some addresses differ.)
2. The permit number and the date tax collection starts.
3. Takedown on a lease: part of the lease charge (taxed) or its own line?
4. Service calls and replacement parts on purchased lights: never taxed, as assumed?
5. Is a lease of lights taxed as a rental of tangible property (the attorney brief asks the same)?

## Not now

Filing returns automatically; any bank or card integration.

## Size

Part 2 about a day (math, UI, tests); Part 1 about a day plus the rules/Storage publishes. Build Part 2 first if tax is collected this season.
