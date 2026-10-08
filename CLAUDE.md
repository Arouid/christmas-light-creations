# Christmas Light Creations website

Marketing site for christmas-light-creations.com, a family-owned Christmas light installation business in Pearland, TX. Replaces the old WordPress/X-Theme site on GoDaddy.

## Stack

- React 19 + Vite + Tailwind CSS 4 (`@tailwindcss/vite`), plain JavaScript (no TypeScript)
- Lint: oxlint (`.oxlintrc.json`)
- Static site, single page with anchored sections, no router
- Hosted on GitHub Pages, deployed by `.github/workflows/deploy.yml` on push to `main`; custom domain in `public/CNAME`; DNS at GoDaddy

## Commands

| Command | What |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 (`.claude/launch.json`) |
| `npm run check` | Lint (zero warnings) + production build |
| `npm run build` | Build to `dist/` |

## Working rules

- Run `npm run check` before every commit; don't commit if it fails.
- Commit after each working change, with a clear message.
- After a change, look at it in the browser pane at phone width (375px) and check the console for errors. A passing build doesn't prove the page renders. If the page looks stale, restart the dev server.
- Check framework APIs (React, Vite, Tailwind 4, GitHub Pages) against their current docs, not memory.
- Log what was actually checked in `docs/verified.md` (dated); keep unverified items in `docs/test-checklist.md`; record decisions in `docs/decisions.md`.

## Site rules

- Mobile first: design for phones, then scale up with `sm:`/`md:`/`lg:`. No horizontal scroll at 375px. Tap targets at least 44px.
- All copy, photos, reviews and FAQ live in `src/data/content.js`. Components hold layout only.
- Images live in the repo under `public/images/` (nothing loaded from the old WordPress CDN). Full-size originals go in `assets-source/`, which isn't shipped.
- Colors come from the theme tokens in `src/index.css` (`night`, `glow`, `berry`, `pine`). Fonts: Fraunces (display), Inter (body).
- No tracking or analytics scripts, no cookie banners.
- Keep the phone number (281-819-0163) one tap away on every screen.
- Don't reword customer reviews; quote them as written.
- Old WordPress URLs (`/faq/`, `/photos/`, `/info/`, `/get-an-estimate/`) must keep redirecting (`public/<path>/index.html`).
- Estimate form posts to `VITE_FORM_ENDPOINT` (GitHub repo variable). With it unset, the form shows a call button.

## The user

Finess. Prefers concise explanations with tables, and short plain-language summaries of what changed and what to test.
