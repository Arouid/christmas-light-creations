# Invoices

> Status: implemented, live 2026-10-09 (owner's end-to-end test pending: TODO #37) · Decided 2026-10-09 by Scott (owner)

## The problem

Returning customers are billed every season (re-install, takedown, add-ons, service). Today Scott sends PayPal invoices by hand from PayPal, then updates the customer's Seasons by hand when they pay. PayPal refused the Invoicing API for our Live app (2026-10-09), so the site can't create PayPal invoices. Payments themselves already work on the site (PayPal Orders: PayPal, Venmo, card), so we build our own invoices on top of them.

## What we want

**Staff (staff app)**
- **New invoice** on any customer (Accounts → customer page, and the customer detail panel). No proposal needed.
- An invoice has: line items (description + amount; a negative line for a discount is allowed), season, what it's for (**Lights up** install/re-install, **Takedown**, **Add-on**, **Service**, **Other**), a note to the customer, due date.
- **Save draft** or **Send**: sending gives it its number, emails it to the customer from info@ with a **Pay now** link, and shows Text it / Email it / Copy link like proposals.
- **Invoices** tab (next to Accounts): **Open / Overdue / Paid / Drafts** with the dollar total of each. Each customer's page also lists their own invoices.
- **Mark paid** for money taken outside the site (cash, check, Zelle, Venmo, CashApp, Square, PayPal sent directly), with date and an optional note; **Undo** if it was a mistake.
- **Void** an invoice (the link then says it's cancelled). Drafts can be deleted; sent ones stay as the record.
- **Email again** on an open invoice. Reminders can be turned off per invoice.
- **Bulk**: Season tab → filter → **🧾 Invoice these N** makes one **draft** per customer (installs: the season's install total, else rate, else the yearly price; takedowns: the season's takedown rate). Customers new this season, already paid, already invoiced, or not being serviced are listed but unticked, with the reason. Staff check the drafts, then **Send all drafts** on the Invoices tab.

**Customer**
- Private page `/invoice/?t=<link token>`: our logo, invoice number, dates, bill-to, line items, total, note, status (Due / Overdue / Paid ✓ / Cancelled), **Pay** with PayPal, Venmo or card (same buttons as proposals), **Save or print (PDF)**, phone number one tap away.
- Their account (`/account/`) lists their invoices: open ones with the Pay button and what's due, paid ones as Paid ✓ with a link to the receipt view. No lifetime total.
- Emails from info@: the invoice (Pay now button), reminders while unpaid, and a receipt when it's paid.

**When an invoice is paid** (online or Mark paid)
- The invoice shows Paid ✓ with how and when.
- For Lights up / Takedown invoices, that season's billing on the customer record is filled: amount, Paid = Yes, payment type, payment date (only empty boxes; Paid "No" becomes "Yes").
- Staff get a "paid" email; the customer gets a receipt.
- Anything that fails (PayPal, an email, the season fill) shows in the red website-problem banner and the alert email.

**Due date**: on receipt by default (due the day it's sent); staff can pick 7 or 14 days or a date.

**Reminders**: a daily job (9 am Central) emails the customer 7 and 14 days after the due date if still unpaid, then stops; never on the same day as another email to them; stops as soon as it's paid or voided; staff can turn reminders off per invoice.

## What we DON'T do

| Left out | Why |
|---|---|
| PayPal's own invoices (paypal.com/invoice) | Invoicing API refused for our Live app |
| Partial payments, deposits on invoices, payment plans | Full amount only; proposals already handle deposits |
| Sales tax lines, quantities × rates | Not on our proposals either; one amount per line keeps it simple |
| Automatic invoices without staff pressing Send | Staff always look before a customer is billed |
| Refunds from the site | Done in PayPal; staff mark it in a note |
| Invoices for website leads | Only customers are billed; make them a customer first |
| Late fees | Not asked for |
| Lifetime totals of what a customer paid | Owner rule (customers shouldn't read "that's a lot") |

## Edge cases

- **No email on the customer**: the invoice can still be sent; no email goes out, staff are told to Text it / Copy link. Reminders skip it.
- **Items changed while the customer has the Pay window open**: the server checks the PayPal order against the stored invoice before charging; a mismatch is refused, nothing charged ("refresh and try again").
- **Double click / two phones paying**: one capture at a time per invoice (lock), second one refused.
- **Marked paid by staff while the customer pays online**: the online payment is refused before charging if staff got there first; if PayPal already took the money, it's recorded anyway and an IMPORTANT problem says "paid twice, refund one".
- **Voided while open in the customer's browser**: Pay is refused before charging.
- **Due date in the past when sent**: shows Overdue right away; reminders follow the schedule from the due date.
- **Season boxes already filled** (staff typed them, or a proposal payment): kept; only empty boxes are filled.
- **Draft link opened**: page says it isn't ready yet.
- **Email bounces / SMTP down**: reported as a website problem; the invoice is still sent (link works).
- **Sandbox (test) payments**: shown as (test) everywhere, like proposals.

## Decisions

| Date | Decision | By |
|---|---|---|
| 2026-10-09 | Build our own invoices on the PayPal Orders flow (no Stripe, no PayPal Invoicing API) | Owner |
| 2026-10-09 | Amount charged always comes from the stored invoice on the server, never from the browser; order checked before capture; capture lock per invoice (same as proposal payments) | Security review rules |
| 2026-10-09 | Invoice id = unguessable link token (like proposals); public can open one only by its exact link, never list | Same pattern as proposals |
| 2026-10-09 | Number given when first **sent** (deleted drafts leave no gaps); kept forever, also on voided ones | Claude (standard practice) |
| 2026-10-09 | Only the server records online payments, numbers, emails sent and reminders; staff record offline payments only | Security |
| 2026-10-09 | Math and rules in one pure module shared by the server and the staff/customer pages (`functions/invoices.js`), so they can't disagree | Claude |
| 2026-10-09 | Numbers `CLC-2026-0001`: year sent (Central time) + 4-digit count, restarting at 0001 each January 1 | Owner |
| 2026-10-09 | Due on receipt by default | Owner |
| 2026-10-09 | Reminders 7 and 14 days past due, then stop | Owner |
| 2026-10-09 | Bulk re-install invoices for a season, as drafts staff review before sending | Owner |
| 2026-10-09 | Invoices get their own tab in the staff app | Owner |
| 2026-10-09 | Only Lights up and Takedown invoices fill season billing (add-on / service / other don't, since the season's install total is the whole season's bill) | Claude |
| 2026-10-09 | Sending an install/takedown invoice sets that season's Invoice box to "CLC Invoice Sent" when it's empty or "Not Yet Invoiced" | Claude |
| 2026-10-09 | Customer gets a receipt email when paid (online or Mark paid), staff a "paid" email | Claude |

## Acceptance criteria

1. [test] Totals, numbering, payable/overdue rules, reminder schedule and season fills give the expected results, including negative lines, $0/negative totals refused, already-paid and voided refused. → `tests/invoices.test.mjs`
2. [test] Rules: the public can open an invoice by id but not list them, can't write anything but "viewed"; staff can't write the number, the online payment, the lock or reminders; strangers and customer accounts get nothing. → `npm run test:rules`; live: `npm run check:rules` refuses listing invoices.
3. [agent] Staff screens at 375px (`/leads/?demo`): New invoice, list with Open/Overdue/Paid totals, Mark paid, Void; no horizontal scroll, no console errors. Customer page `/invoice/?demo` and `/account/?demo` the same.
4. [human] Owner creates an invoice for a test customer with his own second email and sends it: the email arrives from info@ with the number, total and a Pay now button; the link opens on his phone. Known-good control: the signed-agreement email he already gets.
5. [human] Paying it (card or someone else's PayPal) or Mark paid: the invoice shows Paid ✓, the customer's Seasons row for that season shows the amount, Yes, method and date, staff get a "paid" email, the customer gets a receipt, and it shows as paid on their /account/.
6. [human] An unpaid test invoice with a due date set in the past gets a reminder email the next morning; once paid, no more reminders.
7. [human] Staff list shows the test invoices under Open / Overdue / Paid with the right totals.

## Contract

`invoices/{token}` (token = 24-char link token, also the doc id):

| Field | Who writes | Notes |
|---|---|---|
| `status` | staff, server | `draft` · `open` (sent, unpaid) · `paid` · `void`. Overdue = open and past due (not stored) |
| `customerId`, `customer {name, email, phone, address}` | staff | snapshot when created/edited |
| `season` (`'2026'`), `kind` (`install` · `takedown` · `addon` · `service` · `other`) | staff | |
| `items [{ id, description, cents }]` | staff | 1–30 lines; total must be > $0 |
| `note`, `dueDate` (`YYYY-MM-DD`), `remindersOff` | staff | |
| `offline {method, date, note, by}` | staff | Mark paid; removed on Undo |
| `number` (e.g. `CLC-2026-0001`), `sentAt` | server | given when first sent |
| `payment {status, cents, orderId, captureId, payerEmail, env, paidAt}` | server | online payment |
| `paymentLock {orderId, at}` | server | 2-minute capture lock |
| `emails [{type, to, at}]`, `seasonFilled`, `emailKeys` | server | sent emails (invoice/again/reminder/receipt), season fill done, lowercase email for /account/ |
| `viewedAt` | public | first time the link was opened |
| `createdAt`, `updatedAt`, `updatedBy` | staff | stamped like every staff write |

Server functions (us-south1): `createInvoiceOrder` / `captureInvoiceOrder` (callables, public, PayPal custom_id `inv:<token>`), `invoiceChanged` (trigger: number + email on send, email again, paid → season fill + emails), `invoiceReminders` (daily schedule), `myAccount` also returns the customer's invoices.

## Links

- Payments and the security rules they follow: `functions/payments.js`, `docs/decisions.md` (2026-10-09 security follow-ups)
- Season billing fields: `src/lib/oldPayments.js`, `src/leads/CustomerDetail.jsx`
- Yearly price (for bulk re-install invoices): `docs/specs/add-ons.md`, `src/lib/addOns.js`
- Customer accounts: `functions/account.js`, `src/account/AccountPage.jsx`
