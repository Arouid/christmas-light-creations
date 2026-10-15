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
| `All mail Including Spam and Trash-002.mbox` (info@'s Takeout, 2026-10-14) | Every info@ email up to Oct 14 2026, so the same kinds as above that the labelled mailboxes missed (added 2026-10-15) |
| Drive Takeout zip (info@, 2026-10-14) | The yearly customer sheets, read by `scripts/old-site/customerLists.mjs`: the 2022 revenue workbook ("Changes 2022 list"), the 2023 list (Accounts tab of "2024 Customer List original") and the 2024 list ("Untitled spreadsheet"). Each paid line is a payment with the sheet's own method (Zelle, check, Venmo, cash, Cash App, PayPal, card = Square). Phones, addresses and emails come from the scheduling, Pipedrive and mass-email sheets, matched by full name |
| `info-contacts-2026-10-14.csv` | info@'s contacts, converted from the Takeout vCard with `scripts/old-site/vcf-to-csv.mjs`: names for a few more Voice numbers |

The Takeout's Gmail settings were read too (2026-10-15): its filters only add labels (Voice Mails, SMS Messages, Paypal, Random…) and its blocked addresses are cold pitches, so no filter hides customer mail.

Our own addresses (never "the customer"): anything @christmas-light-creations.com, changeadams3 / changeadams / change.adams / lacie.jaye.mccloud / clc.voicemail.01 @gmail.com. Our numbers: 281-819-0163 and the old 281-819-0288.

## Build

```
node scripts/old-site/voice-history.mjs old-site-backup/takeout-*.zip old-site-backup/Archived-002.mbox "old-site-backup/All mail Including Spam and Trash-002.mbox"
node --max-old-space-size=8192 scripts/old-site/old-history.mjs old-site-backup/takeout-*.zip old-site-backup/Archived-002.mbox "old-site-backup/All mail Including Spam and Trash-002.mbox" old-site-backup/old-contacts.csv old-site-backup/info-contacts-2026-10-14.csv
```

About a minute in all. The Google Contacts exports (Google CSV) at the end name more Voice numbers; a Takeout zip with a `Drive/` folder brings its .xlsx customer sheets in by itself. The outputs of the build before the 2026-10-15 Takeout are kept in `old-site-backup/before-2026-10-15/`.

Outputs `customer-history.json` (Import → Customer history), `past-requests-plus.csv` (Import → Past requests and win-backs) and, since 2026-10-14, `review-alerts.csv`: every Google “left a review” notification in the mailboxes (date, reviewer, stars, quoted words), oldest first, for the missing-reviews case with Google support (`docs/TODO.md` #70). Nothing from it is imported into the app.

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
| 2026-10-15 | info@'s full Takeout added: all mail (spam and trash included), the Drive customer sheets, its contacts. A sheet's paid line is a payment like a PayPal one (win-back, history, season fill); the same line on two sheets counts once | Owner: "We want to do what we did with the exports. This has a lot of new historical data in it". Customers who paid by check, Zelle, Venmo or cash were missing from Win-backs |
| 2026-10-15 | The 2022 workbook is a calendar year of money in: its installs are the 2022 season; its takedowns are the 2021 install's, paid in January 2022. Money received in 2022 is dated 2022 and its Payment date says 2022; Seasons files a takedown under the install it belongs to, as with January PayPal takedowns. The 2023 and 2024 lists hold one season each, their takedowns paid the January after | Owner: "2022 takedown would be for a 2021 install", "if they paid in 2022 its important that theyre listed under 2022, if not my taxes will be whack" |
| 2026-10-15 | Cross-reference with the PayPal/Square emails (`joinSheetPayments`): a sheet line the mail already shows (same person, season and install/takedown; the same method, or the same amount within $1 whatever method the sheet says) is dropped, the email is the record. An undated line takes the date of its matching invoice ("PayPal invoice sent 11/3/2022"), but the payment day stays unknown | Owner: "try to cross reference for timestamps on invoices and payments received"; "If jane doe says she paid, cross reference for payments from her for any of our accepted methods". Matching by method only had dropped ~60 real 2022 card payments against fall-2022 installs |
| 2026-10-15 | Every sheet payment's date is checked against the person's texts and emails and tagged (`checkSheetDates`): our "payment received / got your check / thank you for your payment" or their "I paid / sent the Zelle / check is under the mat" within the season's install (Jul–Dec) or takedown (Jan–Apr) months gives an undated line its day ("Date from our text of 11/21/2022: “…”"); a sheet date with such a message within two weeks gets "Date checked: …"; else "Date from the sheet (no text or email about it found)". Questions, plans and hedges ("will", "once", "I think") don't count; a message naming another dollar amount doesn't count. People are found by the line's email and phone and by any phone or email anywhere under the same full name (contact books, Voice names, PayPal/Square emails, estimate requests) | Owner: "any payment that has a fingerprint in email or text or anywhere for that matter should have its date checked and tagged", "and filed under that date/year"; "we send out payment confirmation emails for the last few years too" (found as replies and texts, not as a separate email series) |
| 2026-10-15 | With no day found: a stand-in date (install day, else Dec 1 for installs, Jan 15 after the season for takedowns) with "Payment date not on the sheet", which never fills a Payment date (`UNDATED`); when the sheet names the year ("Paid in 2022 (payment date not on the sheet)") the Payment date gets that year alone (`PAID_IN`). A sheet line's own label ("2021 takedown (customer list…") decides install or takedown, whatever a quoted message says (`paymentPart`) | A made-up day must not look real, but the year has to be right for taxes |
| 2026-10-15 | The Past requests import reads any row of kind payment or invoice as a payment, whatever its source (`cleanRow`) | Before, only PayPal and Square rows were; a Zelle row would have been read as an estimate request |

## Acceptance

1. [test] Parsers (PayPal new/old/partial, invoices, Square, form layouts, emails), matching, win-back merge → `tests/oldHistory.test.mjs`, `tests/voiceTakeout.test.mjs`.
2. [human] Owner imports `customer-history.json`: a long-time customer shows old payments and emails; a customer who never paid by PayPal shows none. Observer: owner.
3. [human] Owner imports `past-requests-plus.csv`: Win-backs lists people they recognise as former customers, none current. Observer: owner.
4. [test] Customer sheets: dates, amounts, methods, both layouts, the season and the 2022 calendar-year rule, the cross-reference with mail payments and invoices, the payment-message detector and the date check with its tags, a Zelle row through the import, the season fill (no stand-in day, the paid year) → `tests/customerLists.test.mjs`.
5. [human] After the 2026-10-15 import, someone who paid by check or Zelle in 2023 shows "Paid $X by Check" in their history with a "Date checked" or "Date from the sheet" line, and Win-backs shows people who paid that way and aren't customers now; a 2021 takedown from the 2022 sheet shows "Paid in 2022" and, after Add all, Seasons 2021 takedown with Payment date 2022. Observer: owner (`docs/test-checklist.md` #178).

## Known gaps

- Same full name on two people: entries go to the first customer with that name.
- Personal mail between the owners and someone who is also a customer is attached to that customer.
- Quotes sent as plain emails (no form, no invoice) are only in the email history, not in the win-back list.
- The 2022 workbook has names and amounts only: those payments match a customer by full name alone, unless another sheet gives the same name a phone or email. Few of its lines get a day: the text history holds only about 48 texts from 2022 (the Voice export covers 2023 on), and no 2022 card (Square) emails are in the mailbox.
- A message says when someone said they paid, not when the bank got it ("We mailed check # … on December 9" is dated by the email, Dec 17); the quote is on the line so staff can see.
- The 2025 season isn't in the Drive sheets (it lives in the current customer sheet the app imported); the 2023 list never recorded takedown payments.
