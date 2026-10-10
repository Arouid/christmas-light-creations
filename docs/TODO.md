# To-do

Open items for the website, staff app and accounts. Newest decisions are in `decisions.md`, things checked working in `verified.md`. Updated 2026-10-09.

## Waiting on Scott / staff

| # | Task | Notes |
|---|---|---|
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
| 14 | Delete the TEST leads (incl. "TEST email check" from 2026-10-09): staff app → mark **Spam / test** → Delete | |
| 16 | **Republish Firestore rules** (new `pastRequests` list), then Import → pick `old-site-backup/past-requests-all.csv` (done once; **import it again**: now 889 people incl. the price calculator) | Firebase console → Firestore → Rules → paste `firestore.rules` → Publish |
| 17 | **Reply to the Oct 7 old-site request** (its email to you failed): itemized quote for an insurance claim | Past requests tab (shown first, red note) |
| 20 | **Republish Firestore rules** again (new `signs` list; leads can store their map location) | Firebase console → Rules → paste `firestore.rules` → Publish |
| 21 | **Republish Firestore rules** again (new `routes` list) | Firebase console → Rules → paste `firestore.rules` → Publish |
| 23 | Add each installer's Google email to the Firestore `staff` list so they can open their route link | Firebase console → Firestore → staff → add document (id = their email) |
| 24 | **Google Cloud free trial ends ~Jan 6, 2027** ($300 credit, 90 days from Oct 8): upgrade to a full account before then (by ~Dec 20) or Maps, Street View, drive times and alert emails can stop | console.cloud.google.com → banner → Upgrade |
| 25 | **Install CLC Staff on each phone** and sign in once: iPhone Safari → Share → Add to Home Screen; Android Chrome → Install app. Tell Claude if sign-in fails inside the iPhone app | staff app link: christmas-light-creations.com/leads/ |
| 26 | **Designer / proposals / deposits** (Strandr-style mockups, e-signed proposals, PayPal deposits): send Claude your ideas, deposit amount, existing contract (or OK to draft), and what a subscription would bill for | On hold until owner says go |
| 27 | **Republish Firestore rules** (designs + design images) — copied to clipboard 2026-10-09 | Firebase console → Rules → paste → Publish |
| 28 | **Try the light designer** on 2–3 real customer photos and send Claude feedback on what looks fake; set price per foot in ⚙ Settings | Customer card → 🎨 Light designs |
| 29 | **Republish Firestore rules** (proposals) — copied to clipboard 2026-10-09 | Firebase console → Rules → paste → Publish |
| 30 | **Attorney review** of contract items 7–8 (deposit non-refundable; refund option if we can’t install by Dec 1; standard limited liability). Countersigner name and alert emails are set | Owner |
| 31 | **Customer accounts** (/account/): (a) ~~deploy functions, rules, push~~ done 2026-10-09; (b) ~~turn on Email link sign-in~~ done 2026-10-09; (c) check the site is an authorized domain; then (d) on your phone try both **Sign in with Google** and an emailed link for your own email, see your test proposals, pay an open balance | (b) Firebase console → Authentication → Sign-in method → Email/Password → enable **Email link (passwordless sign-in)** → Save (turn on Email/Password too if asked; passwords are never used). (c) Authentication → Settings → Authorized domains: `christmas-light-creations.com` listed. **Rules change (new `customerLogins` list, staff read only)**: OK, then Claude publishes and runs `npm run check:rules`. Until then the "Customer login" line on Accounts stays hidden; nothing else is affected |
| 32 | **Add-ons / yearly price** (live since 2026-10-09). In the staff app: Accounts → "Add-on notes to check" → for each customer confirm the drafts, set Original rate (first-year full price) where missing (or type the re-install price, set per-year amounts or add a price change where it wasn't 50%; add missing past seasons in Edit details), and tick "Customer can see this" once the breakdown and that customer's Seasons (amount + paid) are right | No rules change needed |
| 35 | **Spam protection (App Check) setup**: (1) console.cloud.google.com → Security → reCAPTCHA → Create key: type **Web**, domain `christmas-light-creations.com`, leave **checkbox challenge off** → ~~send key ID to Claude~~ done 2026-10-09 (key in `src/lib/firebase.js`); (2) Firebase console → App Check → Apps → your web app → **reCAPTCHA Enterprise** → paste the key → Save; (3) ~~deploy + push~~ done 2026-10-09; (4) after ~3 days Claude checks App Check metrics with you, then turns on enforcement (Firestore in console; functions by deploy) | Free up to 10,000 checks/month (Google's no-cost quota), well above our traffic |
| 34 | **Old records onto customers**: Accounts → "From old records: N customers" → Add all (old payments into Seasons, old phones/emails linked); then check the "name match: check" ones one by one. Then **Import tab → Customer history → pick `old-site-backup/customer-history.json`** (again if done before) so the texts/calls/emails from the linked numbers move onto the customers | Only empty season boxes are filled; nothing typed is overwritten |
| 15 | Read the stock email templates (Emails tab) and fix wording: payment lines say PayPal invoice + Zelle/Venmo/Cash App/check/cash; timer, takedown dates and 10% early rule taken from the website | Edit → Save for everyone |

## Claude, when asked

| # | Task | Notes |
|---|---|---|
| C | Google Ads: keywords, negatives, 3 ads, settings | |
| E | Gift wrapping section + "What do you need?" on the estimate form | After #11 |
| F | Export customers to a spreadsheet | |
| G | Auto-reply email to website estimate requests | Needs Firebase extension + Gmail App Password; email auth DNS is done |
| I | "Customer login" link on the public site (footer) once accounts are tested | /account/ is noindex; a footer link is fine |
| J | Subscriptions (PayPal Subscriptions, enabled on the Live app) on the account page | Account is keyed by verified email; spec first |
| K | Security follow-ups after #34: check the PayPal order before capturing; transaction around marking paid; lowercase email field so `sendAccountLink` stops reading every proposal; CSP meta on /proposal/ and /account/ | `docs/security-review.md` risks 2, 7, 8, 10 |
| H | Privacy page (the form collects personal info) | |

## Dated reminders

| When | What |
|---|---|
| ~2026-11-08 | Review DMARC reports; if clean, change `_dmarc` to `p=quarantine` |
| Nov 7, 2026 | GoDaddy hosting ends (nothing to do, just confirm the site is unaffected) |
| Early July 2027 | Domain renews Jul 23, 2027 via PayPal: make sure the payment method still works |
