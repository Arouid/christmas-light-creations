# Test checklist (not yet verified)

| # | Check | Expected | Status |
|---|---|---|---|
| 1 | Desktop width (1280px+) | Nav bar with links, multi-column sections, no bottom call bar | Not checked |
| 2 | Tap "Call" on a real phone | Dialer opens with 281-819-0163 | Not checked |
| 3 | Tap "Text us" on a real phone | Messages opens to 281-819-0163 | Not checked |
| 4 | Gallery: tap a photo, swipe arrows, close | Full-screen viewer, next/prev, closes | Not checked |
| 5 | Estimate form submits | "Thanks, we got it!" and the lead appears at /leads/ within seconds | Done locally (see verified log); recheck on live domain |
| 10 | Staff sign-in at /leads/ (Google) on a phone | List loads | Ready to test |
| 11 | Non-staff Google account at /leads/ | "Not on the staff list" with their email, no data | Ready to test |
| 12 | Change status / save notes as staff | Saves; other staff see it live; "Last changed by" shows | Ready to test |
| 13 | Firestore rules reject bad writes (missing fields, status not `new`, public read) | Permission denied | Done: `npm run check:rules` (see verified log) |
| 14 | Street View photo in an open lead card (after key is set) | House photo shows; tap opens Street View; "No Street View here" for addresses without imagery | Ready to test (key set) |
| 6 | GitHub Pages deploy | Action goes green, site loads at the github.io URL | Blocked: no repo yet |
| 7 | Custom domain + HTTPS after DNS switch | christmas-light-creations.com loads with padlock | Blocked: DNS not switched |
| 8 | Old URLs redirect (/faq/, /photos/, /info/, /get-an-estimate/) | Lands on matching section | Not checked |
| 9 | Photos still load after GoDaddy is cancelled | All images show | Should pass: images now in repo (see verified log) |
