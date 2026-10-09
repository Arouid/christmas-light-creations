# Christmas Light Creations website

Marketing site for christmas-light-creations.com, a family-owned Christmas light installation business in Pearland, TX. Replaces the old WordPress/X-Theme site on GoDaddy.

## Stack

- React 19 + Vite + Tailwind CSS 4 (`@tailwindcss/vite`), plain JavaScript (no TypeScript)
- Lint: oxlint (`.oxlintrc.json`)
- Static site: public page (`index.html`) + staff Leads page (`leads/index.html`), no router
- Firebase (Firestore + Google Auth) for estimate requests; config in `src/lib/firebase.js`
- Hosted on GitHub Pages, deployed by `.github/workflows/deploy.yml` on push to `main`; custom domain in `public/CNAME`; DNS at GoDaddy

## Commands

| Command | What |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 (`.claude/launch.json`) |
| `npm run check` | Lint (zero warnings) + tests + production build |
| `npm test` | Headless tests in `tests/` |
| `npm run check:rules` | Live check that Firestore refuses strangers (anonymous) |
| `npm run build` | Vite build + area pages and sitemap (`scripts/build-areas.mjs`) into `dist/` |

## Working rules

- Run `npm run check` before every commit; don't commit if it fails.
- Commit after each working change, with a clear message.
- After a change, look at it in the browser pane at phone width (375px) and check the console for errors. A passing build doesn't prove the page renders. If the page looks stale, restart the dev server.
- While the dev server runs, write `src/` files with the Write/Edit tools, not shell redirection (`cat > file`): Vite can read the file mid-write and keep serving a broken module ("does not provide an export named …") until restarted.
- Check framework APIs (React, Vite, Tailwind 4, GitHub Pages) against their current docs, not memory.
- Keep `docs/TODO.md` current: add new open items, remove finished ones.
- Tailwind buttons: never add a second `bg-…` to a shared class string (`${btn} bg-glow-400`); the first one can win and the button shows the wrong color. Keep a shape-only class and add exactly one background per button.
- Log what was actually checked in `docs/verified.md` (dated); keep unverified items in `docs/test-checklist.md`; record decisions in `docs/decisions.md`.

## Site rules

- Staff app on desktop (`lg:`): Customers and Season are sortable tables (`DataTable.jsx`), customer detail is a right side panel; phones keep lists and a full-screen detail.
- Area pages: content in `src/data/areas.js`; keep them few and genuinely local (no near-duplicate town pages). Adding one updates the sitemap and homepage links automatically.
- Mobile first: design for phones, then scale up with `sm:`/`md:`/`lg:`. No horizontal scroll at 375px. Tap targets at least 44px.
- All copy, photos, reviews and FAQ live in `src/data/content.js`. Components hold layout only.
- Images live in the repo under `public/images/` (nothing loaded from the old WordPress CDN). Full-size originals go in `assets-source/`, which isn't shipped.
- Colors come from the theme tokens in `src/index.css` (`night`, `glow`, `berry`, `pine`). Fonts: Fraunces (display), Inter (body).
- No tracking or analytics scripts, no cookie banners.
- Keep the phone number (281-819-0163) one tap away on every screen.
- Service areas: `serviceAreaGroups` in content.js and `areaServed` in index.html must match the Google Business Profile's service areas exactly.
- Don't reword customer reviews; quote them as written.
- Old WordPress URLs must keep redirecting: the `REDIRECTS` map in `scripts/build-areas.mjs` (21 old pages, from the old site's database). Anything else missing shows `public/404.html` (estimate + call buttons).
- Estimate form saves to Firestore `leads`; staff read and update them at `/leads/` (Google sign-in, allowlist in the `staff` collection). Access rules live in `firestore.rules`; any new lead field must be added there and in `LEAD_FIELDS` in `src/lib/firebase.js`. With Firebase not configured, the form shows a call button and `/leads/` shows sample data.
- New Firestore collections need `firestore.rules` republished by the owner (paste in Firebase console). Until then that list is refused; it must not lock staff out (only leads/customers decide access). Say so before shipping a feature that adds a collection.
- Load Firebase with dynamic `import()` only, so the public page stays light.
- Street View on lead cards: `src/lib/streetView.js`. The Maps key is locked to the site's domains + localhost:5173 and to Maps JavaScript, Geocoding and Street View Static APIs (Google Cloud, project clc-leads-site).
- Staff app at `/leads/` has tabs Leads / Customers / Season / Import (spec: `docs/specs/customers.md`). Customers live in Firestore `customers`; ids are name slugs so re-imports update. Use `/leads/?demo` in dev to check the UI with sample data (no sign-in). Importer mapping is pure (`src/lib/importSheet.js`) and tested in `tests/`.
- `/leads/` is `noindex` and disallowed in `robots.txt`; never link it from the public site.
- Customer accounts at `/account/` (noindex, robots-disallowed): Google or email-link sign-in (never grants staff access); data only via the `myAccount` function (proposals whose customer.email matches the verified email, any case), payments via the same PayPal callables. `myAccount` also records sign-ins in `customerLogins/{email}` (server-only writes, staff read) for the Accounts page. `/account/?demo` in dev shows sample data.

## The user

Finess. Prefers concise explanations with tables, and short plain-language summaries of what changed and what to test.
