# Customers & season (Phase 1)

Status: building, 2026-10-08. Owner: Scott (Finess). Replaces the "2026 Customer List" Google Sheet for day-to-day use; the sheet stays as a backup this season.

## What

A staff-only app at `/leads/` (same Google sign-in and `staff` allowlist as Leads) with four tabs:

| Tab | Purpose |
|---|---|
| Leads | Existing estimate requests (unchanged) |
| Customers | One record per household: contact, property (address, gate code, location block, install type), lights (color, takedown notes), account (since, payment method, price notes), and a history by season |
| Season | Everyone for one season by install or takedown status, filtered by location block and early/regular, with tap-to-text "want lights again?" |
| Import | Load the sheet's **Scheduling** and **Accounts** tabs (downloaded as CSV) into Customers |

All 4 staff can see and edit everything, including prices and payments. Nobody can delete a customer from the app.

## Data (Firestore `customers/{id}`)

- `id` = slug of the full name, so re-importing updates the same record instead of duplicating.
- Customer-level fields keep the sheet's values as text (prices like "$460.00", dates like "11/26/2025") so nothing is lost or reinterpreted.
- `seasons.{year}`: statuses, week/day/planned date, notes, and `install` / `takedown` billing.
- Season year: July–December belongs to that year, January–June to the previous year (January takedowns are part of the previous season).
- Status words are the sheet's own; unknown imported values are kept and shown as extra options.

### Sheet → app mapping (decided 2026-10-08)

- Scheduling tab: contact, property, lights, current-year statuses and notes, previous-year status/day/week/date.
- Accounts tab, matched by Full Name: current rate/discount/total go to the **current** season; Invoice/Paid/Payment columns (dated Nov 2025–Jan 2026) go to the **previous** season.
- "2026 Install / Takedown Notes" goes to the customer-level `takedownNotes` (zip-tie instructions carry over year to year).
- Blank sheet cells are skipped on import, so a re-import never erases something typed in the app. A non-blank sheet value does overwrite the app value.

## Acceptance (who observes)

1. Staff member on a phone opens Customers, searches a street name, opens the customer, taps Call: dialer opens. (staff)
2. Changing the install status on the Season tab shows up for another staff member within seconds without refreshing. (two staff)
3. Import of the real Scheduling + Accounts CSVs creates ~119 customers; preview lists any names found in only one tab. (owner)
4. Re-importing the same files changes nothing and creates no duplicates. (owner, count stays the same)
5. A non-staff Google account cannot read or write `customers`. (`npm run check:rules`)

## Not in Phase 1

Service calls log, gate codes by neighborhood, Lead → Customer, mass-email lists, route map, export. See the Phase 2/3 plan in the conversation of 2026-10-08.
