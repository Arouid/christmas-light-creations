# Add-ons and the yearly price

Status: building, 2026-10-09. Owner: Scott (Finess).

## Why

Customers who add lights (an arch, a tree, more roofline) pay full price that year, and from the next year on their re-install price goes up. They get confused when the bill changes. They should be able to see why.

## The rule (owner, 2026-10-09)

- Every price is based on the **undiscounted** amount. Discounts (early install, etc.) come off each year's bill separately.
- Yearly re-install price = 50% of the **original** first-year price (customer's `originalRate`) + 50% of each add-on's undiscounted price, for every add-on added in an earlier season.
- An add-on is billed in full the season it's added; the +50% starts the next season and stays every year after.
- 50% is only the default (owner, 2026-10-09: "things are a little more nuanced"). Staff can set the customer's re-install price by hand (`reinstallBase`), set any add-on's per-year amount by hand (`adds`), and add a **price change** (`kind: 'change'`, + or − per year, counts from its own season) for anything else (price increase, loyalty, special deal).
- Takedown isn't part of the yearly price: each season's takedown amount is typed per season (Edit details → season → Takedown billing). 15% / $150 is only the default for new proposal lines.

## What customers see (/account/)

A "Your yearly price" card: re-install of the original lights, each add-on with the year it was added and what it adds, and the yearly price **before discounts**. No lifetime totals or sums of past years (owner: customers shouldn't read it as "that's a lot we're paying"). Shown only after staff tick "Customer can see this" on that customer.

## Data

`customers/{id}`:
- `addOns: [{ id, kind?: 'addon' | 'change', season, what, price (undiscounted dollars; add-ons only), adds? (per-year dollars, overrides 50%; required for a change), source: 'staff' | 'history' | 'proposal', token? }]`
- `reinstallBase` (dollars per year, optional): re-install price when it isn't 50% of `originalRate`
- `priceShown: true` once staff have checked the breakdown
- `addOnsChecked: true` once the old "Install / add-on history" text was turned into entries (or found to have none)

Proposals: `kind: 'addon'` for an add-on proposal; `reinstallBasis: 'list'` on new proposals (next-season price = 50% of the undiscounted install). Proposals without it keep the old math, so signed agreements never change.

## How add-ons get recorded

1. An add-on proposal (ticked "Add-on to existing lights") is recorded on the customer automatically when the customer signs it (server, `proposalChanged`).
2. Staff add or edit one on the customer's account page (type, season, what, undiscounted price, per year if not 50%).
3. Old sheet text: the customer's page shows the "Install / add-on history" text with drafts (year and $ found in the text); staff confirm, fix or skip each. Accounts tab lists customers whose text is still unchecked.

## Acceptance (who observes)

1. Staff open a customer with an original rate and two add-ons: the breakdown adds up, and a mismatch with this season's rate on file is flagged. (staff, demo)
2. Ticking "Customer can see this" makes the card appear on that customer's /account/; unticked, it doesn't. (owner, phone)
3. A customer signs an add-on proposal: the add-on appears on their customer page with the proposal's undiscounted install price. (owner)
4. A customer with only a customer record (no proposal) can get an account sign-in link. (owner)
5. Signed proposals sent before this change still show the same next-season price. (`npm test`)
