# To-do

Open items for the website, staff app and accounts. Newest decisions are in `decisions.md`, things checked working in `verified.md`. Updated 2026-10-08.

## Waiting on Scott / staff

| # | Task | Notes |
|---|---|---|
| 1 | **Export Lacie's old Google Voice data** (texts, calls, voicemails) | takeout.google.com signed in as Lacie → Deselect all → Voice → .zip → put it in `old-site-backup/`. Then Claude matches it to customers and builds the import file. |
| 3 | Google Admin → Authenticate email → **Start authentication** (DKIM) | DNS records are live already |
| 4 | **Voice account setup**: record a new voicemail greeting; add linked numbers if calls should ring cells | voice.google.com as clc.voicemail.01 |
| 5 | **Each staff phone/computer**: sign into clc.voicemail.01 (Voice app + browser) | Katie: ⚙ "My own Google Voice number" if she uses hers |
| 6 | **Test Text button** end to end (copy number → Send new message → paste → send) | First real test after the number moved |
| 7 | **Review campaign** to last year's customers | Season tab → ✉ Email these → Review request, or ★ Review texts |
| 8 | Skim `old-site-backup/past-estimate-requests-likely-real.csv` (~1,172 past requests) for a "we'd still love to light your home" email | Remove junk and current customers first |
| 9 | Watch for **Google support's reply** on merging the duplicate Business Profile | Don't edit/remove either listing until then |
| 10 | Business Profile: photos (10+), services list, description, special hours | Text drafted in chat 2026-10-08 |
| 11 | **Gift wrapping** answers | `docs/specs/gift-wrapping.md`; photos → `gift-wrap-incoming/` |
| 12 | Optional: $5 budget alert in Google Cloud/Firebase | |
| 13 | Optional: GitHub domain verification TXT (locks the domain to this GitHub) | github.com → Settings → Pages → Add a domain |
| 14 | Delete the TEST lead in Firestore → leads | |

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
