# Old history import (texts, calls, emails, payments, estimate requests)

Owner, 2026-10-09: "anything in any of those backups that has anything to do with any of our current customers I want it", and the rest as a list to win business back, split into win-backs and past requests.

## What staff see

- **Customer → Text & email history**: old texts (both ways since 2023, incoming before), calls with length, missed calls, voicemails, emails with them, 💲 payments (PayPal/Square, amount, invoice, what was installed), 🧾 invoices sent, 📝 estimate requests. Back to 2012.
- **Past requests tab**, three views:
  - **Win-backs**: paid us or were invoiced before, not current customers. Card shows "Paid $X · 2016–2021" and every payment; Text/Email start with the "We miss you" templates.
  - **Past requests**: asked for an estimate (old website, estimate emails), never paid.
  - **Texted us**: a saved Voice contact, or 3+ incoming texts, with no form or payment.
  Anyone already in Customers is flagged as before (email, phone or name).
  Filed-away statuses (owner, 2026-10-09): **Deceased** (own chip), **Personal (family/friends)** and **Junk / spam** (chip "Personal / junk"). No Call/Text/Email/Make customer, never in "Email these", and they win over "already a customer".

## Sources (all in `old-site-backup/`, not in git)

| File | Used for |
|---|---|
| Voice Takeout zip | Texts both ways, calls, missed, voicemails (2023–26); contact names |
| Mail Takeout zip (11 mailboxes) + `Archived-002.mbox` | Voice notification emails (2012–22), emails with people, PayPal/Square, estimate form emails |
| `past-requests-all.csv` | Old website requests (WordPress) |

Our own addresses (never "the customer"): anything @christmas-light-creations.com, changeadams3 / changeadams / change.adams / lacie.jaye.mccloud / clc.voicemail.01 @gmail.com. Our numbers: 281-819-0163 and the old 281-819-0288.

## Build

```
node scripts/old-site/voice-history.mjs old-site-backup/takeout-*.zip old-site-backup/Archived-002.mbox
node scripts/old-site/old-history.mjs old-site-backup/takeout-*.zip old-site-backup/Archived-002.mbox
```

Add a Google Contacts export (Google CSV, e.g. `old-site-backup/old-contacts.csv`) to the second command to name more Voice numbers.

Outputs `customer-history.json` (Import → Customer history) and `past-requests-plus.csv` (Import → Past requests and win-backs).

## Matching (Import tab, `src/lib/messageImport.js`)

Each entry carries `match: { phones, emails, names }`. First customer found by phone, then email, then exact full name (case and punctuation ignored). Emails: one entry per customer it was with, id `em-<hash of Message-ID>-<customerId>`, the same as the live sync. Only customers get entries (`firestore.rules` needs `customerId`); the rest are counted and, for phone entries, offered as a CSV. Re-importing is safe: same ids.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-09 | Payments, invoices and estimate requests go in `messages` as kinds `payment`, `invoice`, `request` | One history per customer, no rules change |
| 2026-10-09 | Name-only matches allowed (exact full name) | Payments often carry only name + email; owner wants everything on the customer |
| 2026-10-09 | Card payments with no name take the name from the invoice they paid; 51 (2012–15) stay anonymous and aren't imported | Nothing ties them to a person |
| 2026-10-09 | Newsletters, no-reply senders and platforms (PayPal, Google, Facebook…) aren't "emails with a person" | Can't be about a customer; keeps the file small |
| 2026-10-09 | Win-back = any PayPal/Square payment or invoice; "Texted us" kept separate from past requests | Owner: "split them best we can" |

## Acceptance

1. [test] Parsers (PayPal new/old/partial, invoices, Square, form layouts, emails), matching, win-back merge → `tests/oldHistory.test.mjs`, `tests/voiceTakeout.test.mjs`.
2. [human] Owner imports `customer-history.json`: a long-time customer shows old payments and emails; a customer who never paid by PayPal shows none. Observer: owner.
3. [human] Owner imports `past-requests-plus.csv`: Win-backs lists people they recognise as former customers, none current. Observer: owner.

## Known gaps

- Same full name on two people: entries go to the first customer with that name.
- Personal mail between the owners and someone who is also a customer is attached to that customer.
- Quotes sent as plain emails (no form, no invoice) are only in the email history, not in the win-back list.
