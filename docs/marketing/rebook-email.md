# Rebook email to past customers (season 2026)

A draft for staff to save as their own template and send from the staff app. **Nothing is sent until a person sends it.** It improves on the stock "Re-install invite" (`reinstall` in `src/lib/emailTemplates.js`) by leading with the one-tap button on the account page, which is live: `rebookMe` answered 401 (deployed, refusing strangers) to an anonymous probe on 2026-10-14.

## How to add it (staff)

1. Staff app → **Emails** → **+ New template**, group **Our templates**.
2. Label: **Back up this season? (one tap)**. When: *Returning customers not yet on this season's list.*
3. Paste the subject and body below exactly; the `{…}` words fill in per customer.
4. To send: **Season** → filter to last season's customers whose status this season isn't Confirmed or Scheduled → **✉ Email these N** → pick the template → check the first one → **Send the rest** (or **⏰ Schedule the rest** for 8:00 am). At most 300 a day from the app; anyone already sent is skipped.

## Version A: October (send the week of Oct 15)

**Subject:** {first}, want your lights back up this season?

```
Hi {first},

It's {business}. Installs start October 15th, and we'd love to light up your home again this season.

The fastest way to get on the list: open your account at {website}/account/ and tap "Yes, put my lights back up". Pick the week that suits you, add a note if anything has changed, and you're on the list, no call needed. Sign in with this email address or the phone number we have for you; there's no password.

Rather reply? Answer this email, or text {businessPhone} with "yes" and any timing that works best.

A few reminders:
- Installs done by October 31st get 10% off, and October dates go first.
- Service calls are free all season, and anything we supplied that wears out is replaced brand new under our lifetime warranty.
- Takedown is January 3rd to 13th, labeled and boxed for next year.

Thank you for having us back.

{me}{myTitle}
{business}
{businessPhone}
```

## Version B: November (only to people who didn't answer A; send once, around Nov 9)

**Subject:** Still want your lights up this season, {first}?

```
Hi {first},

Just checking in: you're not on this season's install list yet, and dates fill fast this time of year.

One tap does it: open {website}/account/ and tap "Yes, put my lights back up", pick a week, and we'll text you your install date as the schedule fills in. Or reply here, or text {businessPhone}.

If you're skipping this year, no worries at all, and Merry Christmas from all of us.

{me}{myTitle}
{business}
{businessPhone}
```

Two emails per person per season, then stop. Version B doesn't repeat the 10% line (it ends October 31).

## Text version (for customers who prefer texts; staff send from Google Voice)

```
Hi {first}, it's Christmas Light Creations! Want your lights back up this season? Tap "Yes, put my lights back up" on your account: christmas-light-creations.com/account/ (no password), or just reply YES. Installs done by Oct 31 get 10% off.
```

After October 31, drop the last sentence.

## Why every line is true

| Line | Where the site says it |
|---|---|
| Installs start October 15th | `steps`, FAQ "When can you install?" |
| One tap, pick a week, a note | `Rebook` on `/account/` (week chips, note field, "Yes, put my lights back up") |
| Sign in with email or phone, no password | FAQ "Can I see my account online?" |
| 10% off by Oct 31, October dates go first | `costGuide.early`, `urgency` |
| Free service calls, lifetime warranty | `highlights`, `lifetimeWarranty` |
| Takedown Jan 3rd to 13th, labeled and boxed | `steps` (Removal), FAQ |
| "We'll text you your install date as the schedule fills in" | The rebook button's own confirmation |
| "Dates fill fast this time of year" | `urgency.line.season` |

What it leaves out on purpose: prices (lease and bought customers pay differently; their account shows theirs when staff turned it on), tree wrapping, gift wrapping, anything about reviews (the review ask is separate and automatic, `docs/specs/review-ask.md`).
