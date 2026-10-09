# To-do

Open items for the website, staff app and accounts. Newest decisions are in `decisions.md`, things checked working in `verified.md`. Updated 2026-10-08.

## Waiting on Scott / staff

| # | Task | Notes |
|---|---|---|
| 1 | **Export Lacie's old Google Voice data** (texts, calls, voicemails) | takeout.google.com signed in as Lacie → Deselect all → Voice → .zip → put it in `old-site-backup/`. Then Claude matches it to customers and builds the import file. |
| 4 | **Voice account setup**: record a new voicemail greeting; add linked numbers if calls should ring cells | voice.google.com as clc.voicemail.01 |
| 5 | **Each staff phone/computer**: sign into clc.voicemail.01 (Voice app + browser) | Katie: ⚙ "My own Google Voice number" if she uses hers |
| 3 | Change info@'s sender name from "CustomerService" to "Christmas Light Creations" | Gmail ⚙ → Accounts → Send mail as → edit info |
| 6 | **Test Text button** end to end (copy number → Send new message → paste → send) | First real test after the number moved |
| 7 | **Review campaign** to last year's customers | Season tab → ✉ Email these → Review request, or ★ Review texts |
| 9 | Watch for **Google support's reply** on merging the duplicate Business Profile | Don't edit/remove either listing until then |
| 10 | Business Profile: photos (10+), services list, description, special hours | Text drafted in chat 2026-10-08 |
| 11 | **Gift wrapping** answers | `docs/specs/gift-wrapping.md`; photos → `gift-wrap-incoming/` |
| 12 | Optional: $5 budget alert in Google Cloud/Firebase | |
| 13 | Optional: GitHub domain verification TXT (locks the domain to this GitHub) | github.com → Settings → Pages → Add a domain |
| 14 | Delete the TEST lead in Firestore → leads | |
| 16 | **Republish Firestore rules** (new `pastRequests` list), then Import → pick `old-site-backup/past-requests-all.csv` (done once; **import it again**: now 889 people incl. the price calculator) | Firebase console → Firestore → Rules → paste `firestore.rules` → Publish |
| 17 | **Reply to David Lauriano** (Oct 7 request via the old site; its email to you failed): La Marque, wants an itemized quote to remove/replace 3 Govee permanent light systems for an insurance claim | Past requests tab (shown first, red note) |
| 19 | **Turn on new-request alerts** (one-time, ~10 min): 1) app password for info@, 2) `npx firebase-tools login`, 3) set the secret, Claude deploys, 4) ⚙ Settings → New-request alerts: Scott, Lacie, Katie's emails, 5) test request | See Claude's steps in chat |
| 20 | **Republish Firestore rules** again (new `signs` list; leads can store their map location) | Firebase console → Rules → paste `firestore.rules` → Publish |
| 15 | Read the stock email templates (Emails tab) and fix wording: payment lines say PayPal invoice + Zelle/Venmo/Cash App/check/cash; timer, takedown dates and 10% early rule taken from the website | Edit → Save for everyone |

## Claude, when asked

| # | Task | Notes |
|---|---|---|
| A | Build the Voice history import file from the Takeout zip | After #1; also a CSV of numbers that match no customer |
| B | Customer contacts file for clc.voicemail.01 (Google Contacts CSV from the 114 customers) | So texts/calls show names |
| C | Google Ads: keywords, negatives, 3 ads, settings | |
| D | Sort by distance + route planner in the staff app | Math done and tested (`src/lib/geo.js`) |
| E | Gift wrapping section + "What do you need?" on the estimate form | After #11 |
| F | Export customers to a spreadsheet | |
| G | Auto-reply email to website estimate requests | Needs Firebase extension + Gmail App Password; email auth DNS is done |
| H | Privacy page (the form collects personal info) | |

## Dated reminders

| When | What |
|---|---|
| ~2026-11-08 | Review DMARC reports; if clean, change `_dmarc` to `p=quarantine` |
| Nov 7, 2026 | GoDaddy hosting ends (nothing to do, just confirm the site is unaffected) |
| Early July 2027 | Domain renews Jul 23, 2027 via PayPal: make sure the payment method still works |
