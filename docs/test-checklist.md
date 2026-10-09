# Test checklist (not yet verified)

| # | Check | Expected | Status |
|---|---|---|---|
| 1 | Desktop width (1280px+) | Nav bar with links, multi-column sections, no bottom call bar | Not checked |
| 2 | Tap "Call" on a real phone | Dialer opens with 281-819-0163 | Not checked |
| 3 | Tap "Text us" on a real phone | Messages opens to 281-819-0163 | Not checked |
| 4 | Gallery: tap a photo, swipe arrows, close | Full-screen viewer, next/prev, closes | Not checked |
| 5 | Estimate form submits | "Thanks, we got it!" and the lead appears at /leads/ within seconds | Done locally (see verified log); recheck on live domain |
| 10 | Staff sign-in at /leads/ (Google) on a phone | List loads | Done on desktop Chrome; phone not yet |
| 11 | Non-staff Google account at /leads/ | "Not on the staff list" with their email, no data | Ready to test |
| 12 | Change status / save notes as staff | Saves; other staff see it live; "Last changed by" shows | Ready to test |
| 13 | Firestore rules reject bad writes (missing fields, status not `new`, public read) | Permission denied | Done: `npm run check:rules` (see verified log) |
| 14 | Street View photo in an open lead card (after key is set) | House photo shows; tap opens Street View; "No Street View here" for addresses without imagery | Ready to test (key set) |
| 6 | GitHub Pages deploy | Action goes green, site loads at the github.io URL | Done (see verified log) |
| 7 | Custom domain + HTTPS after DNS switch | christmas-light-creations.com loads with padlock | Certificate issued 2026-10-08; tick Enforce HTTPS |
| 8 | Old URLs redirect (/faq/, /photos/, /info/, /get-an-estimate/) | Lands on matching section | Not checked |
| 9 | Photos still load after GoDaddy is cancelled | All images show | Should pass: images now in repo (see verified log) |
| 15 | Mark a lead Booked, tap "Text review link" on a phone | Messages opens with the thank-you text and review link filled in | Not checked |
| 16 | Import the real Scheduling + Accounts CSVs (signed in as staff) | 114 customers (matches sheet) | Done 2026-10-08 |
| 17 | Re-import the same files | Count unchanged, no duplicates | Not checked |
| 18 | Two staff on phones: one changes a status on Season | Other sees it within seconds | Not checked |
| 19 | Non-staff cannot read/write customers | `npm run check:rules` all refused | Done 2026-10-08 |
| 20 | Publish updated rules, then import the Gate Codes CSV | 16 neighborhoods on Gates tab | Done 2026-10-08 (owner saw 16) |
| 21 | Real service call logged on a phone | Shows on Service tab and the customer's page for all staff | Not checked |
| 22 | Make customer from a real lead | Customer created, lead shows "Customer record ✓" | Not checked |
| 23 | Publish rules with `views`, create a real custom tab | Tab appears for every staff member | Owner created one 2026-10-08; other staff not checked |
| 24 | Publish rules (settings), set home base, "Put 114 addresses on the map" | ~114 pins; approximate list shows any typos | Not checked |
| 25 | Map on a wall monitor, Full screen | HUD readable from across the room | Not checked |
| 26 | Staff signed in to Google Voice taps Text on a customer | Voice opens that customer's conversation; Ctrl+V pastes the prepared message; sends from the business number | Not checked |
| 27 | Email these N from a custom tab | Gmail draft from info@, everyone in Bcc, template text | Not checked |
| 28 | Submit estimate with "How did you hear about us?" | Lead card shows "Heard from: …" | Blocked: rules not republished |
| 29 | Google Admin → Authenticate email shows "Authenticating email" | DKIM signing on | Owner to click Start authentication |
| 30 | ~2026-11-08: review DMARC reports; if clean, change `_dmarc` to `p=quarantine` | Spoofed mail gets junked | Not due yet |
| 31 | Early July 2027: domain auto-renews (PayPal still valid) | Renewed Jul 23, 2027 | Not due |
| 32 | Publish rules (messages), import the Voice history JSON | Customers show their past texts/calls | Waiting on Takeout export |
| 30 | Customer account: pay an open balance from /account/ | PayPal completes, row turns Paid, staff get the paid email | Sign-in and list OK (owner); payment needs a non-merchant PayPal, Venmo or card |
| 33 | Sign in with Google at /account/ (Gmail on a proposal, then one that isn't) | Proposals listed; other account shows "No proposals under this email"; /leads/ still says not on staff list | Waiting: functions deploy |
| 34 | Staff Accounts page after a customer signs in | "Customer login: last signed in <date, time> · first <date> (Google/email link)"; others "never" | Waiting: deploy + rules |
| 35 | Add-on proposal: tick "Add-on to their existing lights", send, sign | Add-on appears on the customer's 💲 Yearly price with the undiscounted install price, source "signed proposal" | Ready to test (live) |
| 36 | Tick "Customer can see this" on a real customer, open their /account/ | "Your yearly price" matches the staff breakdown and "What you've paid" matches the Seasons table; unticked → neither card | Ready to test (live) |
| 37 | Customer with only a customer record (no proposal) asks for a sign-in link | Link arrives; account shows name/address and (if allowed) yearly price | Ready to test (live) |
| 31 | Account link opened on a different device | Asks for the email, then signs in | Not checked |
| 32 | Account link requested for an email with no proposal | Same "Check your email" message, no email sent | Not checked |
| 38 | After deploying the USD fix: pay a small real balance on a test proposal from another PayPal/Venmo/card | Paid ✓ recorded, staff email arrives | Not checked |
| 39 | Live functions refuse fake calls (myAccount without sign-in → unauthenticated; createDepositOrder with an unknown token → not-found; wrong part → invalid-argument) | Refused | Not checked (blocked in the 2026-10-09 review session) |
