# Verified log

What was actually checked working, and how. Newest first.

| Date | What | How |
|---|---|---|
| 2026-10-08 | Phase 2 (demo data, 375px): Make customer links an existing same-name customer (count unchanged) and creates a new one with address/website note/2026 status; lead then shows "Customer record ✓"; Service: log call appears in To do, status Done stamps today and moves it to Done, card shows gate; customer page lists its calls; typing a known neighborhood shows that neighborhood's gate code and notes | Browser pane `/leads/?demo` + `npm test` (9 tests) |
| 2026-10-08 | Real import: 114 customers in the app = 114 names on both Scheduling and Accounts tabs; statuses showing in list | Owner screenshot + Sheets read |
| 2026-10-08 | Live rules: strangers refused on leads, staff and customers (10/10) | `npm run check:rules` |
| 2026-10-08 | Staff app (demo data, 375px): Season board counts update on status change, area filter, "Ask" text prefilled; customer detail opens with gate code banner, sections; typing + Tab saves a text field ("Saved ✓"), dropdown saves; Import of made-up CSVs with a multi-line note: preview counts, 2026 rate / 2025 takedown payment placed right, app-edited gate code not overwritten, new customer added | Browser pane `/leads/?demo` + `npm test` (6 importer tests) |
| 2026-10-08 | DNS switched: @ has the 4 GitHub Pages A records (GoDaddy ns71 + Google/Cloudflare/Quad9 public DNS); http://christmas-light-creations.com serves the new site; www redirects to the apex | nslookup/Resolve-DnsName + curl |
| 2026-10-08 | "Where we work" section shows all 17 towns in 3 groups at 375px, no sideways scroll; schema JSON valid with 17 areaServed | Browser pane + JSON parse |
| 2026-10-08 | "Leave us a Google review" button shows under reviews at 375px, opens g.page review link (HTTP 302 to Google) in a new tab | Browser pane + curl |
| 2026-10-08 | Live on GitHub Pages at arouid.github.io/christmas-light-creations/: page renders at 375px, styles load, all 24 images load (HTTP 200), no console errors, form shows the submit button | Browser pane + curl |
| 2026-10-08 | Address check: "1 Test Street, Pearland" now returns "Address not found"; owner's real home address returns a photo with the camera facing the house | Browser pane on localhost, `findStreetView()` + rendered photo |
| 2026-10-08 | Staff Google sign-in (exatrum@gmail.com) on /leads/ shows the TEST lead with counts; Street View photo renders in the open card | Owner, Chrome, localhost (screenshot) |
| 2026-10-08 | ~~KNOWN ISSUE: made-up address got a photo of a nearby warehouse~~ fixed, see next entry | Same screenshot |
| 2026-10-08 | Street View key works from localhost and christmas-light-creations.com, refused from other sites; photo endpoint returns a JPEG | curl with Referer headers against a public Pearland address |
| 2026-10-08 | Live Firestore rules refuse all 8 bad attempts (public read of leads/staff, wrong status, extra field, no address, bad email, pre-filled notes, staff write) | `npm run check:rules` against clc-leads-site |
| 2026-10-08 | Real form submit saves a lead to Firestore (proves custom rules are published; default rules would refuse) and shows "Thanks, we got it!" | Browser pane, localhost, TEST lead "TEST Delete Me" |
| 2026-10-08 | `/leads/` with sample data at phone width: list, status change updates counts, search + filters, no sideways scroll | Browser pane, 375px |
| 2026-10-08 | With Firebase unconfigured, home form shows "Call 281-819-0163 for your estimate"; honeypot hidden | Browser pane |
| 2026-10-08 | `npm run check` passes with leads page (2 pages built) | Ran locally |
| 2026-10-08 | All 24 images (21 gallery, hero, 2 logos) load from the project, none from the old WordPress CDN | Browser pane, forced all images to load, checked each |
| 2026-10-08 | `npm run check` passes (lint with zero warnings + build) | Ran locally |
| 2026-10-08 | Phone width (375px): no sideways scroll, hero, services, gallery, form render | Browser pane, mobile viewport |
| 2026-10-08 | All gallery images and logo load (none broken) | Browser pane, scrolled whole page, checked every `<img>` |
