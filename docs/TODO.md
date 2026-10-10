# To-do

Open items for the website, staff app and accounts. Newest decisions are in `decisions.md`, things checked working in `verified.md`. Updated 2026-10-09 (evening).

## Waiting on Scott / staff

| # | Task | Notes |
|---|---|---|
| 4 | **Voice account setup**: record a new voicemail greeting; add linked numbers if calls should ring cells | voice.google.com as clc.voicemail.01 |
| 5 | **Each staff phone/computer**: sign into clc.voicemail.01 (Voice app + browser) | Katie: ⚙ "My own Google Voice number" if she uses hers |
| 6 | **Test Text button** end to end (copy number → Send new message → paste → send) | First real test after the number moved |
| 7 | **Review campaign** to last year's customers | Season tab → ✉ Email these → Review request, or ★ Review texts |
| 9 | Watch for **Google support's reply** on merging the duplicate Business Profile | Don't edit/remove either listing until then |
| 11 | **Gift wrapping** answers | `docs/specs/gift-wrapping.md`; photos → `gift-wrap-incoming/` |
| 12 | Optional: $5 budget alert in Google Cloud/Firebase | |
| 13 | Optional: GitHub domain verification TXT (locks the domain to this GitHub) | github.com → Settings → Pages → Add a domain |
| 17 | **Reply to the Oct 7 old-site request** (its email to you failed): itemized quote for an insurance claim | Past requests tab (shown first, red note) |
| 25 | **Install CLC Staff on each phone** and sign in once: iPhone Safari → Share → Add to Home Screen; Android Chrome → Install app. Tell Claude if sign-in fails inside the iPhone app | staff app link: christmas-light-creations.com/leads/ |
| 26 | **Light designer: finish it + new features** (proposals, PayPal deposits/balances, customer accounts are done). Send Claude the list: what's missing or annoying in the designer today, and the new features you want | Then a spec (docs/specs/designer.md) before building |
| 30 | **Attorney review** of contract items 7–8 (and a quick look at the new privacy page, christmas-light-creations.com/privacy/) (deposit non-refundable; refund option if we can’t install by Dec 1; standard limited liability). Countersigner name and alert emails are set | Owner |
| 31 | **Customer accounts** (live; sign-in and account checked on your phone): last check, **pay an open balance** from /account/ with a card or someone else's PayPal (your own PayPal is the merchant, so PayPal blocks it), then refund it in PayPal | |
| 32 | **Add-ons / yearly price** (live; mostly done as of 2026-10-09 evening, finish the rest). In the staff app: Accounts → "Add-on notes to check" → for each customer confirm the drafts, set Original rate (first-year full price) where missing (or type the re-install price, set per-year amounts or add a price change where it wasn't 50%; add missing past seasons in Edit details), and tick "Customer can see this" once the breakdown and that customer's Seasons (amount + paid) are right | No rules change needed |
| 35 | **Spam protection (App Check) setup**: (1) console.cloud.google.com → Security → reCAPTCHA → Create key: type **Web**, domain `christmas-light-creations.com`, leave **checkbox challenge off** → ~~send key ID to Claude~~ done 2026-10-09 (key in `src/lib/firebase.js`); (2) ~~Firebase console → App Check → Apps → register with reCAPTCHA Enterprise / Fraud Defense~~ done (status Registered, key matches, TTL 1 hour; owner screenshot 2026-10-09); (3) ~~deploy + push~~ done 2026-10-09; (4) after ~3 days Claude checks App Check metrics with you, then turns on enforcement (Firestore in console; functions by deploy) | Free up to 10,000 checks/month (Google's no-cost quota), well above our traffic |
| 36 | **Database backups** (owner: not now, 2026-10-09): delete protection (free), 7-day point-in-time recovery and daily backups kept 2 weeks (about $1/month or less, billing is upgraded, so it can be turned on any time). Today nothing can be undone after about an hour | Say the word and Claude turns them on |

## Claude, when asked

| # | Task | Notes |
|---|---|---|
| C | Google Ads: keywords, negatives, 3 ads, settings | |
| E | Gift wrapping section + "What do you need?" on the estimate form | After #11 |
| F | Export customers to a spreadsheet | |
| G | Auto-reply email to website estimate requests | Needs Firebase extension + Gmail App Password; email auth DNS is done |
| J | Subscriptions (PayPal Subscriptions, enabled on the Live app) on the account page | Account is keyed by verified email; spec first |

## Dated reminders

| When | What |
|---|---|
| ~2026-10-13 | App Check: Firebase console → App Check → APIs → Cloud Firestore / Cloud Functions metrics ~100% verified? Then Claude turns on enforcement (#35) |
| ~2026-11-08 | Review DMARC reports; if clean, change `_dmarc` to `p=quarantine` |
| Nov 7, 2026 | GoDaddy hosting ends (nothing to do, just confirm the site is unaffected) |
| Early July 2027 | Domain renews Jul 23, 2027 via PayPal: make sure the payment method still works |
