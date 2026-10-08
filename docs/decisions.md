# Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | React 19 + Vite + Tailwind CSS 4, plain JavaScript | User asked for React/Tailwind/JS; Vite builds a static site GitHub Pages can serve |
| 2026-10-08 | One long page with anchored sections, no router | Small site, best on phones, no 404 tricks needed on GitHub Pages |
| 2026-10-08 | Old WordPress URLs (/faq/, /photos/, /info/, /get-an-estimate/) redirect to sections | Keep Google results and bookmarks working |
| 2026-10-08 | All copy in `src/data/content.js` | Edit text without touching layout |
| 2026-10-08 | Estimate form posts to a form service (`VITE_FORM_ENDPOINT`); call button if unset | GitHub Pages can't process forms |
| 2026-10-08 | Deploy via GitHub Actions on push to `main`, custom domain via `public/CNAME` | Leaving GoDaddy hosting |
| 2026-10-08 | Review quote "Change and his crew" kept verbatim | Possible typo for "Chance", waiting on owner |
