# Contract review brief: Christmas Light Creations

Prepared for: a Texas-licensed attorney (flat-fee review)
Business: Christmas Light Creations, Pearland, TX (family-owned, est. 2011, insured). Owner: Scott Minor, 281-819-0163
Customers: mostly homeowners (consumer contracts), some small businesses. Service area: Pearland, the Bay Area and Galveston County.
How customers sign: we measure in person (or the customer sends photos), then we send a proposal link; the customer e-signs online (typed name, drawn signature, consent box). Deposits and balances are paid by PayPal/card link, Venmo, Zelle, check or cash.

We're asking you to review **two agreements**:

---

## A. Install agreement (in use now: purchase model)

The full current text is in the staff app (default in `src/proposals/terms.js`). In short:

| # | Clause | Current term |
|---|---|---|
| 1 | Work | We supply, install, service all season, and take down in January |
| 2 | Payment | Deposit (a set % of the install, up to 50%) at signing holds the date; rest of the install due when complete; takedown price due in January |
| 3 | Scheduling | Installs begin Oct 15; weather/safety may require rescheduling; early-install discount (10%) is kept if *we* move the date |
| 4 | Service | Free repair/replacement of our lights during the season |
| 5 | Access | Customer provides access (incl. gate codes) and working outlets; no tile roofs |
| 6 | Ownership | Paid in full → customer owns the lights; we label and box them; re-install in future seasons is 50% of the original price |
| 7 | Cancellation | Deposit refunded **in full through October 15**, **half from October 16 to November 1**, **not refundable from November 2** (owner, 2026-10-12). If we can't install by **Dec 1**, the customer may choose a full deposit refund |
| 8 | Liability | We repair damage we cause. Not liable for pre-existing conditions, weather/outages/surges, animals, or undisclosed items. Except for our negligence, liability is capped at the amount paid |
| 9 | E-signature | Electronic signature is equivalent to handwritten |

---

## B. Pay-in-3 plan (new pilot: lease)

Not written yet. Proposed terms:

| Topic | Proposed term |
|---|---|
| What it is | A **payment plan** on any new install, bought (agreement A) or leased: three equal payments covering everything (install, service, removal). Never on a re-install of lights the customer owns. For a lease we own the lights |
| Design | The customer may choose a new design each year or keep the previous one |
| Payment | **Three equal payments** per season: the first when the customer signs; the second and third on the day of the month they choose when signing (the **1st or the 15th**), one in each of the next two months. We email a payment link that morning; no autopay, no card on file for now (a PayPal subscription version is planned behind a switch and stays **off until you have reviewed it**) |
| Term | **No initial term**: season by season. We call in late summer to book the next season; nothing renews by itself |
| Price changes | Year-one price from the quote. A returning-customer discount is undecided |
| Moving | The plan can move to a new address in our service area, or be **assigned to the home's buyer if the buyer agrees**. Payments already made are not refunded |
| Early cancellation | The first payment is refundable in full within **3 days of signing**. After that the customer owes the **full season total** in the three payments, whether or not they cancel (owner, 2026-10-12) |
| Still to decide | Missed or declined payments; damage to our lights by the customer; renewal price increases; notice before renewal |

For comparison, our standard **lease** (paid up front) is year one at full price, then 10% more off for each returning year, capped at 50% off. The pay-in-3 plan is that lease, paid in thirds (owner, 2026-10-12: "no 2-year commitment, and thirds").

---

## Our questions

1. **Deposit refund schedule (A-7).** Full refund through October 15, half through November 1, none from November 2 (installs start October 15). Is that enforceable as liquidated damages, or is the no-refund window a penalty risk? Anything to add for a customer who cancels before we have done any work?
2. **3-day cancellation.** We measure at the customer's home, then they sign online. Does the Texas home solicitation law (Bus. & Com. Code ch. 601) or the FTC Cooling-Off Rule apply, and do we need a cancellation notice?
3. **Liability clause (A-8).** Does it need to be conspicuous (bold, or a separate initial) to hold up? How does it interact with the DTPA and the implied warranty of good and workmanlike performance?
4. **Pay-in-3 as credit.** The lights go up after the second of three payments, so part of the price is paid afterwards. Three installments stays under TILA's "more than four installments" line; does Texas Finance Code ch. 345 (retail installment contracts) still reach it, and what disclosure, if any, do we need?
5. **Online signup and renewal.** The plan is season by season (no automatic renewal). Anything we still owe the customer for an online, e-signed lease (ROSCA or Texas law on recurring plans), given it doesn't renew by itself?
6. **Autopay authorization.** Not needed now (no recurring charges); for the record, what would we need if a monthly autopay version comes later?
7. **Early termination (B).** What early-cancellation term is enforceable for a season-by-season lease paid in thirds (e.g. the remaining payments once the lights are up; the first payment if they cancel before)?
8. **Lease terms.** Risk of loss and damage to our lights at the customer's home; our right to remove the lights at season's end or on default; whether the lease needs its own agreement instead of the purchase one (A-6 says the lights become the customer's).
9. **Sales tax.** Is a lease of lights taxed differently from a sale plus installation? (We'll also ask our accountant.)

Thank you. We'd welcome a marked-up version of A and a drafted version of B.
