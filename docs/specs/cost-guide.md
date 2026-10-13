# Cost guide: /cost/

Owner, 2026-10-13: how do we move up Google for "christmas light installation pearland tx" (position 6) and "christmas light installers pearland" (5, `docs/serp-log.md`)? The highest-intent local search, "how much does Christmas light installation cost", had no page on this site and none on any first-page competitor. This page answers it.

## What it is

A public page at `/cost/` ("What Christmas light installation costs in Pearland"), built like `/terms/`: `cost/index.html` is a Vite input, the words are `costGuide` in `src/data/content.js`, the page is `src/cost/CostPage.jsx`. Unlike the policy pages it is drawn into its HTML at build time (`scripts/prerender.mjs`, list in `scripts/pages.mjs`) so Google and a phone read it without JavaScript, and React takes it over after the first paint (`src/cost/main.jsx`, same as the home page and `/design/`).

Sections, in order: what sets the price (roofline feet, trees and extras, roof pitch and height, buy or lease, takedown and storage); typical prices; one exact price (the four steps, linking the estimate form and the designer); three ways to pay (the home page's `lightOptions`) and the price promise (`priceBeat`); the early-install discount and the lifetime warranty (`lifetimeWarranty`); doing it yourself or hiring it out, honest both ways; eight price questions; a closing ask. The "Every price includes" list is the home page's `included`, so the two pages can't disagree. The phone number is in the header, the footer and a fixed bar on phones.

## The one rule: no dollar amounts until the owner says so

The owner's rule for the FAQ (2026-10-09, "I don't want to ball and chain myself"): no prices that tie our hands. So:

- `costGuide.ranges.rows` is **empty** and the page says, honestly, why there is no price list, offers one exact price free, and a rough price by text from a photo.
- `tests/costGuide.test.mjs` refuses any `$` amount anywhere in `costGuide` while `rows` is empty.
- Asked 2026-10-13, the owner answered: **"No ranges, keep the wording as is."** So the page stays this way. Should that ever change, `rows` gets `{ home, price, note }` entries and the table shows (the test then only checks each row names a home and a `$` price).
- The percentages on the page are the ones already on the home page (10% early-install, about half for a re-install, the lease steps, beat by 10%). Nothing new was promised. "Usually within a day of the measure" for the exact price was kept by the same answer.

## Where it is linked

- The footer of every public page: `footerLinks` in content.js (home and `/design/` map it; the area pages' footer in `scripts/build-areas.mjs` now maps the same list; the guide's own footer leaves itself out).
- The home FAQ's "How do you price it?" answer links it. FAQ answers are drawn by `Rich.jsx` now (**bold** and [links], shared with the policy pages), so an answer may carry a link.
- `sitemap.xml` (`sitemapUrls` in `scripts/pages.mjs`), so IndexNow pings it on the next deploy; Google reads the sitemap.

## Structured data

A `FAQPage` JSON-LD block with the page's eight questions (`faqSchema` in `src/lib/costGuide.js`, answers flattened to plain text, `<` escaped so the data can't close the script tag). Google shows FAQ rich results only for government and health sites since 2023, so this is a plain statement of the questions for every engine, not a rich-result play.

## What we DON'T do

- No prices, "starting at" or per-foot rates. No dates that go stale (the discount is described by the calendar it follows every year).
- No second page per town. One guide; the area pages link it through the footer.
- No copy of the home page's FAQ: the questions here are the price ones only.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-13 | Prerendered like the home page, not a plain policy page | It exists to rank: Google and phones must read it without JavaScript |
| 2026-10-13 | No typical ranges on the page; the test enforces it | Owner's "no ball and chain" rule; asked that day, the owner said "No ranges, keep the wording as is" |
| 2026-10-13 | Reuses `included`, `lightOptions`, `priceBeat`, `lifetimeWarranty` from the home page | Two pages with two versions of the same promise would drift |
| 2026-10-13 | The FAQ pricing answer links the guide; FAQ answers gained **bold** and [links] | One click from the question people actually open |

## Acceptance criteria

- `npm run build` writes `dist/cost/index.html` with the page drawn in (`data-day` on `#root`), the FAQPage JSON-LD, the `noai, noimageai` meta and the canonical; `dist/sitemap.xml` lists `/cost/`.
- At 375 px: no horizontal scroll, a Call button in the header and in the bottom bar, every button at least 44 px tall.
- The built page hydrates without a console error (no "hydration mismatch").
- Search Console, a month after the deploy: queries containing "cost" or "how much" show the page (TODO).
