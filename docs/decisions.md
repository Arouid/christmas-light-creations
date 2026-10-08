# Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | React 19 + Vite + Tailwind CSS 4, plain JavaScript | User asked for React/Tailwind/JS; Vite builds a static site GitHub Pages can serve |
| 2026-10-08 | One long page with anchored sections, no router | Small site, best on phones, no 404 tricks needed on GitHub Pages |
| 2026-10-08 | Old WordPress URLs (/faq/, /photos/, /info/, /get-an-estimate/) redirect to sections | Keep Google results and bookmarks working |
| 2026-10-08 | All copy in `src/data/content.js` | Edit text without touching layout |
| 2026-10-08 | ~~Estimate form posts to a form service~~ replaced, see below | |
| 2026-10-08 | Deploy via GitHub Actions on push to `main`, custom domain via `public/CNAME` | Leaving GoDaddy hosting |
| 2026-10-08 | Review quote "Change and his crew" kept verbatim | Possible typo for "Chance", waiting on owner |
| 2026-10-08 | Photos and logo copied into `public/images/`; logo shrunk 510 KB -> 12 KB; 1024px original in `assets-source/` | Site must survive cancelling GoDaddy; logo shows ~40px tall |
| 2026-10-08 | Estimate requests saved to Firebase Firestore; staff list at `/leads/` with status + notes; Google sign-in; staff allowlist in a `staff` collection | Owner wants a list for ~3 sales people; Firebase free tier doesn't pause in the off-season (Supabase's does) |
| 2026-10-08 | Firestore rules: public can only create (validated fields, status `new`), staff can read and change only status/notes, nobody deletes via the app | Keep customer data private and stop junk writes |
| 2026-10-08 | Honeypot field on the form; App Check not yet | Cheap spam filter now; add App Check if spam shows up |
| 2026-10-08 | Street View photo on each lead card (Street View Static API, key in `src/lib/streetView.js`, locked to the domain + that API). Free metadata call first; photo only loads when a card is open | Staff see the roofline before calling; keeps billed photo loads low |
