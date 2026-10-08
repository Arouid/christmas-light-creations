# Verified log

What was actually checked working, and how. Newest first.

| Date | What | How |
|---|---|---|
| 2026-10-08 | Staff Google sign-in (exatrum@gmail.com) on /leads/ shows the TEST lead with counts; Street View photo renders in the open card | Owner, Chrome, localhost (screenshot) |
| 2026-10-08 | KNOWN ISSUE: a made-up address ("1 Test Street, Pearland") still got a photo of some nearby warehouse; Google guesses rather than failing | Same screenshot |
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
