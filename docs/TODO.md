# To-do

Open items for the website, staff app and accounts. Newest decisions are in `decisions.md`, things checked working in `verified.md`. Updated 2026-10-09 (evening).

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
| 17 | **Reply to the Oct 7 old-site request** (its email to you failed): itemized quote for an insurance claim | Past requests tab (shown first, red note) |
| 23 | Add each installer's Google email to the Firestore `staff` list so they can open their route link | Firebase console → Firestore → staff → add document (id = their email) |
| 24 | **Google Cloud free trial ends ~Jan 6, 2027** ($300 credit, 90 days from Oct 8): upgrade to a full account before then (by ~Dec 20) or Maps, Street View, drive times and alert emails can stop | console.cloud.google.com → banner → Upgrade |
| 25 | **Install CLC Staff on each phone** and sign in once: iPhone Safari → Share → Add to Home Screen; Android Chrome → Install app. Tell Claude if sign-in fails inside the iPhone app | staff app link: christmas-light-creations.com/leads/ |
| 26 | **Designer / proposals / deposits** (Strandr-style mockups, e-signed proposals, PayPal deposits): send Claude your ideas, deposit amount, existing contract (or OK to draft), and what a subscription would bill for | On hold until owner says go |
| 28 | **Try the light designer** on 2–3 real customer photos and send Claude feedback on what looks fake; set price per foot in ⚙ Settings | Customer card → 🎨 Light designs |
| 30 | **Attorney review** of contract items 7–8 (deposit non-refundable; refund option if we can’t install by Dec 1; standard limited liability). Countersigner name and alert emails are set | Owner |
| 31 | **Customer accounts** (live; sign-in and account checked on your phone): last check, **pay an open balance** from /account/ with a card or someone else's PayPal (your own PayPal is the merchant, so PayPal blocks it), then refund it in PayPal | |
| 32 | **Add-ons / yearly price** (live since 2026-10-09). In the staff app: Accounts → "Add-on notes to check" → for each customer confirm the drafts, set Original rate (first-year full price) where missing (or type the re-install price, set per-year amounts or add a price change where it wasn't 50%; add missing past seasons in Edit details), and tick "Customer can see this" once the breakdown and that customer's Seasons (amount + paid) are right | No rules change needed |
| 35 | **Spam protection (App Check) setup**: (1) console.cloud.google.com → Security → reCAPTCHA → Create key: type **Web**, domain `christmas-light-creations.com`, leave **checkbox challenge off** → ~~send key ID to Claude~~ done 2026-10-09 (key in `src/lib/firebase.js`); (2) Firebase console → App Check → Apps → your web app → **reCAPTCHA Enterprise** → paste the key → Save; (3) ~~deploy + push~~ done 2026-10-09; (4) after ~3 days Claude checks App Check metrics with you, then turns on enforcement (Firestore in console; functions by deploy) | Free up to 10,000 checks/month (Google's no-cost quota), well above our traffic |
| 34 | **Old records onto customers**: Add all done. If not yet: **Import tab → 2 · Old records → Customer history → `old-site-backup/customer-history.json` → Import** (all old texts/calls/emails/payments onto customers; no duplicates), then spot-check Lori Draeger's history goes back to 2016. Then tick "Customer can see this" per customer once their Seasons look right (#32) | |
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
