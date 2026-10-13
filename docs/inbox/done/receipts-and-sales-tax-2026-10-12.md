> Processed 2026-10-12 by Claude Code: rules folded into functions/assistant/prompt.js + a Settings notes box (docs/specs/sales-assistant.md); site copy drafted in docs/specs/leasing.md; receipts specced in docs/specs/receipts.md. Kept here for the record.

# Feature request from Scott: receipts + sales tax (2026-10-12)

From: Claude (claude.ai chat with Scott). For: Claude Code in this repo. Write a spec
(`docs/specs/receipts.md`) and show Scott before building. Not legal or tax advice; his CPA
confirms the tax rules.

## Decisions Scott made

- He will collect Texas sales tax on **year-one purchase installs** (the whole charge), **every
  lease / monthly-plan charge**, and **new lights added** in later years.
- **No tax on re-installs** of lights the customer already owns.
- He buys lights at stores that often charge him sales tax. He'll use resale certificates where
  he can (Home Depot / Lowe's tax-exempt programs, wholesalers) and needs records to claim the
  tax he couldn't avoid as a credit on his sales tax return.

## 1. Receipts (photo + tag)

- Staff app: **📷 Add receipt** from a phone. Take a photo, then tag it.
- Fields: store, date, total, **sales tax paid**, and **what it was for**: new-customer install
  (optional link to the customer/proposal) · lease stock · add-on for a customer ·
  replacement/service · tools & supplies · other. Optional note.
- Nice to have: Claude reads the photo and fills in store, date, total and tax for staff to
  confirm (same `ANTHROPIC_API_KEY`, staff gate and cost tracking as `draftReply`). Never auto-saves
  without a person confirming.
- List view: filter by month/quarter, purpose, store; total of tax paid on items that went into
  sales and leases (the credit his CPA claims). Export CSV for the CPA.
- Storage is on (see job-record / install photos). A new Firestore collection means
  `firestore.rules` must be republished by Scott. Say so before shipping.

## 2. Tax line on proposals and invoices

- Settings: sales tax rate (Scott's CPA confirms the rate; most of the area is 8.25%) and the
  permit number once he has it.
- Tax applies to year-one installs, lease/monthly charges and added lights; not to re-installs,
  takedown of owned lights, or service calls. Show it as its own line ("Sales tax"). Customers
  see tax-free re-install years plainly.
- Totals/math live in `src/proposals/` and `functions/invoices.js`. Change them there, with tests.
- Update the FAQ/privacy only if something new is collected or promised.

## Not now

Filing returns automatically, or any bank/card integration.
