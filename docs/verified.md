# Verified log

What was actually checked working, and how. Newest first.

| Date | What | How |
|---|---|---|
| 2026-10-08 | `/leads/` with sample data at phone width: list, status change updates counts, search + filters, no sideways scroll | Browser pane, 375px |
| 2026-10-08 | With Firebase unconfigured, home form shows "Call 281-819-0163 for your estimate"; honeypot hidden | Browser pane |
| 2026-10-08 | `npm run check` passes with leads page (2 pages built) | Ran locally |
| 2026-10-08 | All 24 images (21 gallery, hero, 2 logos) load from the project, none from the old WordPress CDN | Browser pane, forced all images to load, checked each |
| 2026-10-08 | `npm run check` passes (lint with zero warnings + build) | Ran locally |
| 2026-10-08 | Phone width (375px): no sideways scroll, hero, services, gallery, form render | Browser pane, mobile viewport |
| 2026-10-08 | All gallery images and logo load (none broken) | Browser pane, scrolled whole page, checked every `<img>` |
