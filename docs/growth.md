# Growth: SEO, design and marketing

Three kinds of work bring customers in, each with its own Claude session (owner 2026-10-15: “keep the SEO, Design, Marketing organized and synergizing”). This page says who owns what, where each one's work lives, and the rules all three share. When a session takes on something new, it adds it here.

## Who owns what

| Area | Owns | Home | Open items |
|---|---|---|---|
| **SEO** (being found) | Google, Bing and AI assistants; titles, descriptions and structured data; area pages and `/cost/` for search; sitemap, robots, IndexNow; profile fields on Google Business Profile, Yelp, Bing Places, Nextdoor and directories; search positions | `docs/serp-log.md`, `docs/listings.md`, `docs/specs/indexnow.md`, `tests/seo.test.mjs`; report https://claude.ai/artifact/H1WySYPH6N7k6Vz5NoUpXQ | TODO #79, #70 |
| **Design** (how pages look and work) | Layout, header and menus, buttons, forms, accessibility, the designer's and account page's usability | design report https://claude.ai/artifact/XGuBN4E8T1Dxk9TGDPvAQs | TODO N |
| **Marketing** (what we say, where, when) | Season plan, posts (Google, Facebook, Nextdoor), Google Ads copy, the rebook email, the reviews plan, the 📣 Marketing checklist in the staff app, Nextdoor monitoring and the Nextdoor/Yelp notices in 💬 (`functions/listingNotices.js`) | `docs/marketing/` (start at its README), `src/data/marketingPlan.js` | the season plan's open questions |

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

## Claude plugins (onboarded 2026-10-15)

The owner chose four plugins (“OKAY ONBOARD”). One rule for all of them: Claude reads and drafts; anything that posts, sends, spends money or changes an ad account waits for the owner's yes to that one action. In Claude Code the owner's own settings (`~/.claude/settings.json`) make every AdCopilot change tool and PayPal's invoice and payment-link tools ask first, even in auto mode; AdCopilot's read-only tools run without asking. Open owner steps: TODO #83.

| Plugin | Used for | State 2026-10-15 | Rules |
|---|---|---|---|
| **AdCopilot** (Google Ads + Search Console) | Ads audits, search terms and negatives, conversion setup, budget pacing, locations; Search Console positions next to the ads | Signed in; the Google Ads account and both Search Console properties connected. Analytics and Tag Manager left unconnected: the site has neither on purpose. Pro trial until 2026-10-22 (owner decides) | Reads run freely; each change is proposed, applied only on the owner's yes, then read back. New campaigns are built paused and the owner switches them on. It can add locations but never remove them (that is the owner's click in Google Ads). Ad copy still comes from `docs/marketing/google-ads-copy.md` |
| **Small Business** (Anthropic) | Winning back old leads (the owner's pick) | PayPal connector attached; read-only use. The plugin's own Gmail and Calendar links fail to sign in from Claude Code; info@'s Gmail is to be added as a claude.ai connector | Skips what the staff app already does: review asks, rebook, invoices, reminders. Invoices and payment links are made only in the staff app (`docs/specs/invoices.md`), never through the PayPal connector. Win-back messages are drafts for staff to send from the app |
| **Social Media Skills** | Words and planning: captions, hooks, calendars, seasonal moments | Loads; nothing to connect | No AI-generated images or video presented as our installs: photos are the owner's own, captioned with the places he named. Its scheduling steps name WoopSocial; Posty does that job here. Drafts go in `docs/marketing/` |
| **Posty** | Scheduling posts: YouTube first; Facebook once the page is recovered; it doesn't do Nextdoor or Yelp | Not signed in: this Claude Code session can't start its sign-in; to be connected from claude.ai → Customize → Connectors | A preview first; nothing scheduled or posted without the owner's yes for that post |

## Regular checks

| When | What | Who |
|---|---|---|
| Every morning 7:05 | Nextdoor check in the owner's Chrome: messages, recommendations, comments, neighbors asking for installers; reply drafts, never sends (scheduled task `nextdoor-morning-check`) | Claude reads, owner replies |
| Weekdays 8:07 | AdCopilot morning check of Google Ads: yesterday against the 7-day average, budget pacing, costly searches, ad problems, changes in the last 24 hours; read-only, ends with one yes/no fix (scheduled task `adcopilot-morning-check` on the office PC, runs while the Claude app is open; the cloud routine of the same name is paused because it can't reach AdCopilot) | Claude reads, owner decides |
| Every day | 📣 Marketing → Every day in the staff app (the reviews habits and the Nextdoor line, with its Nextdoor ↗ button) | owner and staff |
| As they arrive (after TODO #82's deploy) | Nextdoor notices (a neighbor's message, recommendation, comment, mention) in 💬 as 🏘️ Nextdoor, answered on Nextdoor; Yelp's messages and quote requests the same way as 📍 Yelp (Yelp's notifications go to info@ since 2026-10-15; `docs/specs/listing-notices.md`) | staff (💬), marketing (the matcher) |
| Mondays | Marketing numbers and the week's jobs | marketing |
| Monthly | The same four searches, logged in `docs/serp-log.md` | SEO |
| Fri 2026-10-16 | Google profile cleanup and the missing-reviews case (scheduled task) | owner |
| Tue 2026-10-20 | Bing index recheck (scheduled task) | SEO |
