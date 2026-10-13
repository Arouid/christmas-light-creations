# Pay in 3 (payment plan) and leases on estimates

> Status: built 2026-10-12 in the main session (the owner started the card from his phone; the app couldn't open a separate session from there). Owner's rules the same evening: "Everyone gets Pay in 3 if they want it. Except re-installs. Current customers can be offered it if they ask or say they can't afford it this year or are looking for payment options. Pay in 3 is all costs included: takedown and install, no deposit." The contract wording is pilot wording for the attorney (TODO #30).

## What it is

An estimate now has a **kind** and a **plan**, set in the staff editor:

| | Choices | What changes |
|---|---|---|
| Kind (`p.kind`) | *Purchase* (none; the lights become theirs) · *Add-on* (`addon`) · *Lease* (`lease`, we keep the lights) | Next-season line and terms clause 6: purchase/add-on = 50% re-install; lease = 10% off for coming back (up to 50% off), takedown inside the price (no takedown line) |
| Plan (`p.plan`) | *Deposit · install balance · takedown* (none) · *Pay in 3* (`payin3`) | Pay in 3 = the whole total (install + takedown, tax inside) in three equal payments to the cent (the last takes the odd cent), on the same three payment slots: deposit → Payment 1 of 3 (when they sign), balance → Payment 2 of 3 (when the lights are up), takedown → Payment 3 of 3 (in January). Terms clauses 2 and 7 swap to the Pay-in-3 wording |

Nothing changes shape in the database or on the server's PayPal path: `partCents(p, part)` (functions/proposalMath.js) and `totals()` (src/proposals/model.js) return the thirds, the labels come from `partLabel(p, part)` (model.js and functions/payments.js), and `accountSummary` carries `kind` and `plan` so `/account/` names the payments. Fingerprints: `canonical()` includes `plan` (and `kind`) only when set, so older proposals are untouched.

## Where it shows

- Staff editor: Kind and Payment plan selects (replacing the add-on tick), a hint line per choice, no Deposit % for Pay in 3, no ＋ Takedown button for a lease, the summary "Pay in 3: $… · $… · $…", the Payments box named Payment 1/2/3 with matching "Ask for payment 2 of 3" texts.
- Contract (`ProposalDocument`): three payment rows; a lease's next-season line; the terms built by `defaultTerms({ kind, plan }, base)` in src/proposals/terms.js, which swaps the numbered clauses inside the owner's own Settings terms (his other edits carry over).
- Customer page and account: Pay buttons titled Payment 1/2/3 of 3; "Make your first payment below to hold your install date".
- Server emails and PayPal descriptions: "Payment 2 of 3 paid: …".
- Preview: `/proposal/?demo=payin3`.

## Rules for staff (also in the guide and the sales assistant)

New installs only, bought or leased; never a re-install. New customers: offer it when up-front cost is the hesitation. Current customers: only if they ask about payment options or say they can't afford it this year.

## Not done

- A Pay-in-3 *invoice* (an add-on billed by invoice in thirds): invoices stay one payment.
- Reminders for payments 2 and 3: staff ask for them from the Payments box as for the balance and takedown today.
- Settings terms for leases/Pay in 3 separately from the purchase terms: the clause swap covers it.

## Tests

`tests/proposals.test.mjs` (thirds, rounding, tax inside, lease next season, labels, placeholders, fingerprint), `tests/depositParity.test.mjs` (server = page for a purchase and a lease in thirds).
