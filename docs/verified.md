# Verified log

What was actually checked working, and how. Newest first.

| Date | What | How |
|---|---|---|
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
