# Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | React 19 + Vite + Tailwind CSS 4, plain JavaScript | User asked for React/Tailwind/JS; Vite builds a static site GitHub Pages can serve |
| 2026-10-08 | One long page with anchored sections, no router | Small site, best on phones, no 404 tricks needed on GitHub Pages |
| 2026-10-08 | Old WordPress URLs (/faq/, /photos/, /info/, /get-an-estimate/) redirect to sections | Keep Google results and bookmarks working |
| 2026-10-08 | All copy in `src/data/content.js` | Edit text without touching layout |
| 2026-10-08 | ~~Estimate form posts to a form service~~ replaced, see below | |
| 2026-10-08 | Deploy via GitHub Actions on push to `main`, custom domain via `public/CNAME` | Leaving GoDaddy hosting |
| 2026-10-08 | Review quote "Change and his crew" is correct (owner confirmed: his name is Change) | Not a typo |
| 2026-10-08 | Photos and logo copied into `public/images/`; logo shrunk 510 KB -> 12 KB; 1024px original in `assets-source/` | Site must survive cancelling GoDaddy; logo shows ~40px tall |
| 2026-10-08 | Estimate requests saved to Firebase Firestore; staff list at `/leads/` with status + notes; Google sign-in; staff allowlist in a `staff` collection | Owner wants a list for ~3 sales people; Firebase free tier doesn't pause in the off-season (Supabase's does) |
| 2026-10-08 | Firestore rules: public can only create (validated fields, status `new`), staff can read and change only status/notes, nobody deletes via the app | Keep customer data private and stop junk writes |
| 2026-10-08 | Honeypot field on the form; App Check not yet | Cheap spam filter now; add App Check if spam shows up |
| 2026-10-08 | Street View photo on each lead card (Street View Static API, key in `src/lib/streetView.js`, locked to the domain + that API). Free metadata call first; photo only loads when a card is open | Staff see the roofline before calling; keeps billed photo loads low |
| 2026-10-08 | Geocode the lead address first (Maps JavaScript API Geocoder) and only show a photo for an exact house match; aim the camera at the house | Google returns a guessed nearby photo for typos/made-up addresses. The Geocoding web endpoint refuses website-locked keys, so it goes through the JS API |
| 2026-10-08 | Build base path comes from `actions/configure-pages` (`BASE_PATH`); image paths use `import.meta.env.BASE_URL` | Site works on the temporary github.io sub-path before DNS moves, and at the root after |
| 2026-10-08 | Google review link = main Business Profile (listing without store code); duplicate listing (store code 06048161972742367270) to be merged into it via Google support, not deleted | Duplicates likely caused the lost reviews; a merge can move reviews, a delete loses them |
| 2026-10-08 | "Leave us a Google review" button on the site; "Text/Email review link" on Booked leads. No incentives offered for reviews | Rebuild reviews from ~250 repeat customers; incentives break Google policy |
