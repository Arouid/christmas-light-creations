# Growth: SEO, design and marketing

Three kinds of work bring customers in, each with its own Claude session (owner 2026-10-15: “keep the SEO, Design, Marketing organized and synergizing”). This page says who owns what, where each one's work lives, and the rules all three share. When a session takes on something new, it adds it here.

## Who owns what

| Area | Owns | Home | Open items |
|---|---|---|---|
| **SEO** (being found) | Google, Bing and AI assistants; titles, descriptions and structured data; area pages and `/cost/` for search; sitemap, robots, IndexNow; profile fields on Google Business Profile, Yelp, Bing Places, Nextdoor and directories; search positions | `docs/serp-log.md`, `docs/listings.md`, `docs/specs/indexnow.md`, `tests/seo.test.mjs`; report https://claude.ai/artifact/H1WySYPH6N7k6Vz5NoUpXQ | TODO #79, #70 |
| **Design** (how pages look and work) | Layout, header and menus, buttons, forms, accessibility, the designer's and account page's usability | design report https://claude.ai/artifact/XGuBN4E8T1Dxk9TGDPvAQs | TODO N |
| **Marketing** (what we say, where, when) | Season plan, posts (Google, Facebook, Nextdoor), Google Ads copy, the rebook email, the reviews plan, the 📣 Marketing checklist in the staff app, Nextdoor monitoring | `docs/marketing/` (start at its README), `src/data/marketingPlan.js` | the season plan's open questions |

## One home for each thing

| What | Lives in | Others link to it, never copy it |
|---|---|---|
| Every claim about the business (services, offers, dates, warranty) | `src/data/content.js`, `src/data/areas.js` | listings, posts, ads, emails |
| Profile field texts (Google description and services, Yelp, Nextdoor) | `docs/listings.md` (SEO) | marketing |
| Posts, ads, emails | `docs/marketing/` (marketing) | SEO, listings |
| How we sound | `docs/marketing/brand-voice.md` | all |
| Photos and their places | `gallery` in content.js; profile pictures in `assets-source/listings/` | all |
| Search positions and what the indexes hold | `docs/serp-log.md` (SEO) | marketing's Monday log quotes the latest |
| Decisions | `docs/decisions.md` | all |

## Rules all three follow

- A claim goes on the website (content.js) before it goes in a listing, post, ad or email.
- No dollar prices beyond the published offers, and none on `/cost/` until the owner fills its ranges.
- No star rating or review count anywhere until about 10 Google reviews.
- Reviews and Nextdoor recommendations are asked for the same way from everyone, with nothing offered. Never ask for Yelp reviews (Yelp forbids it).
- Nothing that sells tree wrapping or mini lights (owner 2026-10-14: “we lose money on them typically”). No gift-wrapping pitch while it's switched off.
- Photos are the owner's own installs, captioned with the place he named. Reviews are quoted as written.
- Same name, phone and website everywhere: Christmas Light Creations, 281-819-0163, https://christmas-light-creations.com.
- The AI-crawler policy stays: training bots blocked, search and answer bots allowed.

## How the three feed each other

| When | Then |
|---|---|
| Design changes a public page's words, headings or layout | `tests/seo.test.mjs` stays green; tell SEO if titles, headings or area pages change |
| Marketing needs a claim the site doesn't make yet | it goes into content.js first, so the site, listings and posts agree |
| SEO finds a gap (missing directory, thin area page, AI answers that skip us) | the owner's task goes in marketing's season plan; SEO tracks the field work in TODO #79 |
| Marketing writes a Google post | it goes in `docs/marketing/google-business-posts.md`; `docs/listings.md` only holds profile fields |
| Anyone pushes | IndexNow pings only the public pages that changed |

## Regular checks

| When | What | Who |
|---|---|---|
| Every morning 7:05 | Nextdoor check in the owner's Chrome: messages, recommendations, comments, neighbors asking for installers; reply drafts, never sends (scheduled task `nextdoor-morning-check`) | Claude reads, owner replies |
| Every day | 📣 Marketing → Every day in the staff app | owner and staff |
| Mondays | Marketing numbers and the week's jobs | marketing |
| Monthly | The same four searches, logged in `docs/serp-log.md` | SEO |
| Fri 2026-10-16 | Google profile cleanup and the missing-reviews case (scheduled task) | owner |
| Tue 2026-10-20 | Bing index recheck (scheduled task) | SEO |
