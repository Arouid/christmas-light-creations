# Win-back 2026: old-site requests before October 31

Owner (2026-10-15): "when is small business going to work on past leads", then "small business can draft all the emails and then staff can choose who to send to?", and a worry that the emails could land in spam. This is the plan: one drafted email per group, who gets it, in what order, how many a day, and what we count. **Claude sends nothing.** Staff choose who gets each email and send it from the staff app (Leads → Old-site requests), and only after Scott has read and OK'd the four emails (📣 Marketing job `w1-winback-ok`). The jobs are in the 📣 Marketing tab, week by week (`src/data/marketingPlan.js`). Owner's page with the emails as sent: https://claude.ai/artifact/PNELH7FqoebqKuLwgBvN7t

Counts come from the local backup (`old-site-backup/past-requests-plus.csv`, 2026-10-14) run through the app's own cleaning (`cleanRow`, `mergePeople`, `pastArea`). The live tab shows the real numbers: each group tab and each filter chip carries its count. It leaves out current customers (matched by email, phone or name), anyone with a status (Not interested, Moved, Deceased, Personal / junk) and anyone already emailed this season, so expect fewer than below.

## Groups and their emails, most likely to book first

| # | Who | People | Can be emailed | Email | Follow-up |
|---|---|---|---|---|---|
| 1 | **Win-backs**: paid us or were invoiced before, not customers now | 324 | 179 (136 have no email, 9 outside our area) | “We miss you” | One, after 5 days. The 46 of them who paid $1,000+ come first in the list; the 21 of them with a phone get a call from Scott if they haven't answered |
| 2 | **Recent requests**, 2021 to 2026, never booked | 445 | 432 (84 known in our area, 348 area unknown, 13 outside) | “Still want lights?” | One, after 5 days |
| 3 | **Older requests**, 2020 and before | 949 | 928 (2020: 207 · 2019: 176 · 2018: 129 · 2017: 165 · 2016: 67 · 2015: 65 · 2013: 61 · 2012: 58) | “It's been a while” (says what's new since: the designer, Pay in 3) | None. Last, in November, only if Scott says go after the Nov 2 read-out |

**Left out:** "Texted us" (643 numbers, no email: texts go only to people who asked us by text, one at a time in Google Voice), spam and bots (dropped at import, or set to Junk / spam), anyone outside our service area (38: a ZIP or town in their address or message that isn't one of the 20 places), current customers, and anyone already emailed this season (they sit under **Emailed**, not **To contact**).

Most old requests never gave an address (the old form didn't ask), so "area unknown" is kept: the email names the area we serve, and anyone farther out can say so.

## How staff choose who gets it

- **A whole group:** Leads → Old-site requests → the group tab (Win-backs or Past requests) → **To contact** → narrow it with the year, the area (In our area / Area unknown) or the search box → **✉ Email these N**. The queue starts on the right email for the group and year (“We miss you”, “Still want lights?” from 2021 on, “It's been a while” for 2020 and before); any of the four can be picked from its Template list instead.
- **Leaving someone out:** the queue shows each person's email before it goes: **Skip** leaves that person out (they stay under To contact). There is no tick list to untick people before starting; to leave out many, narrow the list first, or set a status on them (Not interested, Personal / junk).
- **One person:** open their card → **Email** (it starts on their group's email), or **Text** if their request says they prefer texts.
- **The day's number:** **Send the rest**, then **Stop** when the day's count is reached; the list picks up where it stopped and never sends anyone the same email twice.

## The days: small batches first

Spam filters judge info@ by how much it sends at once, how many addresses bounce and whether people mark it as spam. SPF, DKIM and DMARC are all published (DNS check on 2026-10-15, the 2026-10-08 test passed all three), so the risk is volume and stale addresses. So: the people least likely to call it spam go first (they paid us), about 50 a day to start, more only while bounces stay under 1 in 20 and nobody complains, and the oldest addresses last. The app's own limit is 300 a day for every email together; the win-back never goes near it and never runs on the rebook-email days (Thu Oct 15, around Nov 9).

| Day | Who | Where (Leads → Old-site requests) | Email | About |
|---|---|---|---|---|
| Thu Oct 15 – Fri Oct 16 | Scott | More ▾ / ☰ → Emails → Estimates: read the four | | OK or changes |
| Mon Oct 19, before the batch | Team | Inbox check: the OK'd “We miss you” to your own Gmail and Outlook address (Emails → Copy subject / Copy message, sent from info@ in Gmail) | | 2 |
| Mon Oct 19, 8 am | Team | Win-backs → To contact → Send the rest, Stop at 50 (the top paid the most) | We miss you | 50 |
| Tue Oct 20 | Team | Same, the next 50 | We miss you | 50 |
| Wed Oct 21 | Team | Same, the rest, if few bounced | We miss you | 80 |
| Thu Oct 22 | Team | Past requests → To contact → year 2026, then 2025, 2024, 2023 | Still want lights? | 120 |
| Fri Oct 23 | Team | Past requests → To contact → 2022 | Still want lights? | 145 |
| Sat Oct 24 | Team | Past requests → To contact → 2021 | Still want lights? | 165 |
| Thu Oct 22 – Sat Oct 24 | Scott | Win-backs → Emailed (the top paid the most) | a phone call | 21 |
| Mon Oct 26 | Team | Win-backs → Emailed → ✉ Email these | Win-back follow-up | up to 180 |
| Tue Oct 27 | Team | Past requests → Emailed → 2026 to 2023 | Win-back follow-up | up to 120 |
| Wed Oct 28 | Team | Past requests → Emailed → 2022 | Win-back follow-up | up to 145 |
| Thu Oct 29 | Team | Past requests → Emailed → 2021 | Win-back follow-up | up to 165 |
| Mon Nov 2 | Claude, then Scott | The read-out below; go or no-go for the older requests | | |
| Nov 2 to about Nov 11 (if go) | Team | Past requests → To contact → 2020 (two days), 2019, 2018, 2017, then 2016 and 2015; 2013 and 2012 only if those stayed clean; not on the rebook-B day | It's been a while (no 10% line by then) | at most 150 a day |

Thu to Sat batches wait if more than 1 in 20 of the win-back emails bounced or anyone complained. If answers come in faster than the team can reply the same day, skip a day.

## Rules

- **One email, at most one follow-up.** The follow-up goes only to groups 1 and 2, at least 5 days after the first (the app holds back anyone emailed less than 5 days ago and says how many), and it says it's the last.
- **Any answer stops it.** Set a status the same day (📣 Marketing → Every day): Interested or Estimate booked (then **+ Make customer** once they book, which also starts their account), Not interested for a "no thanks" (never emailed again; every email says so), Moved / bad info for a bounce. A status takes them out of **To contact** and **Emailed**. An unhappy answer goes to Scott for a call, no follow-up.
- **No purchased lists.** Only people who asked us for an estimate or paid us.
- **Texts** only to people whose request says *prefers Text*, by hand: the card's **Text** button copies the words (with the 10% line until Oct 31) and opens Google Voice.
- **Outside our area** is never in ✉ Email these (`src/lib/serviceArea.js`: the 20 places and their ZIP codes).
- **Bounces:** each shows the red banner and the bounce line on the record; set Moved / bad info, then tap Dealt with. Count them for the day's go / wait.
- **Mailing address (Scott's call, 📣 Marketing → Waiting on Scott):** CAN-SPAM asks for a postal address (street or PO box) in emails that sell to people who aren't customers now. The branded footer says "Pearland, TX" only.

## What to count (Mondays)

| Number | Where | Monday field |
|---|---|---|
| Emailed so far | The line under the Win-backs / Past requests tabs | |
| Answers | Same line: interested + estimate booked + no thanks | Win-back answers (total) |
| Estimates booked | Same line | Win-back estimates booked (total) |
| Bounces | Red banners, Home → System status | in the week's notes |
| Inbox or spam | The Mon Oct 19 Gmail and Outlook check | in the week's notes |
| Booked installs | Old-site requests → Already customers (people made customers from the list) | the Nov 2 read-out |

## The emails

The words live in the app, not here (`src/lib/emailTemplates.js`: `comeback` “We miss you”, `winback` “Still want lights?”, `winback-older` “It's been a while”, `winback-last` “Win-back follow-up”), so there is one copy to keep right; `winbackTemplate()` there says which one a person starts on. Read them in the staff app: More ▾ (☰ on a phone) → Emails → Estimates. The 10% sentence is the `{earlyOffer}` line: it reads "Installs done by October 31st get 10% off, and October dates go first." through October 31 and disappears by itself from November 1 (the date comes from `urgency.discountEnd` in content.js).

### Why every line is true

| Line | Where the site says it |
|---|---|
| The estimate is free, about 30 minutes, no roof climbing, you don't need to be home | FAQ "How do I get a price?" |
| Draw your lights on a photo of your home with our free designer | FAQ "How do I get a price?", `/design/`, the perks row "Design your lights free" |
| Installs done by October 31st get 10% off, October dates go first | `costGuide.early`, FAQ "Is there a discount for booking early?" |
| We light homes across Pearland, Manvel, Friendswood, League City, the Bay Area and Galveston County | FAQ "What do you do?" |
| Putting your lights back up costs less than new | FAQ "Do I own the lights?" (about half the original price) |
| Your account shows your install date and invoices; next year it's one tap | FAQ "Can I see my account online?"; the account page's "Yes, put my lights back up" (one tap, no call). Win-backs have no account until they're made customers, so the email says "once you're back on our list" |
| We'll tell you the next open install date | The site's "Check availability" (next open install dates) |
| Still family-owned | `highlights` "Family-owned & insured", since 2011 |
| Since then: a free light designer, Pay in 3 at the same price on any new install | `/design/` and FAQ "What's Pay in 3?" (both new in 2026, so true for anyone who asked in 2020 or before) |
| Lifetime warranty: anything we supplied that wears out is replaced brand new, free, for as long as you're a customer | `included`, the top bar "Lifetime warranty on every light" |

## How the Small Business plugin shaped it

- **reactivate**: rank by what people were worth (Win-backs are listed by what they paid; the top ones get Scott's call, not just an email); the first email to former customers owns the gap ("If something wasn't right last time, we'd like to hear that too"); the email to older requests says what has changed since; the only offer is the one already on the site; any answer stops the sequence, and a complaint goes to Scott. Its three messages over four weeks became one email and one follow-up (the owner's rule, and the offer ends Oct 31).
- **lead-triage**: old requests carry no fresh signals (no opens, no recent activity), so they're cold outreach and are ordered by facts instead of a score: paid before, how recent, in our area. The call list is the $1,000+ win-backs.
- Not used: the plugin's own Gmail sending and CRM logging. The staff app sends, records each email on the person, and the statuses are the log.
