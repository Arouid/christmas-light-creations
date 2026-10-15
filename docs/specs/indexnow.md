# IndexNow: Bing recrawls what each push changed

Owner, 2026-10-13: "how do we get shown on ChatGPT if someone looks for Christmas light installers". ChatGPT, Copilot and most assistants search through Bing's index. That day Bing's `site:` still listed only the old WordPress pages with their old titles (`docs/serp-log.md`); the new site had been live for weeks and Bing had not come back.

## The problem

Bing recrawls a small site when it feels like it: weeks or months. Google follows the sitemap and Search Console and had already picked up the new pages. Without a nudge, Bing (and so ChatGPT and Copilot) keeps describing the business from pages that no longer exist, and every future change waits just as long.

The first version (2026-10-13) worked: Bing ranked the site 5th and 2nd the next day. But it pinged all 11 URLs on every push (5 pushes in 40 minutes on 2026-10-14, mostly staff-app and docs changes) and stamped every `<lastmod>` with the build date, so neither told Bing what had actually changed (SEO audit 2026-10-14, TODO M).

## What we do

- **One ping per deploy, of the pages that changed.** After GitHub Pages has published, the deploy job POSTs the changed pages' URLs to `https://api.indexnow.org/indexnow` as `{ host, key, keyLocation, urlList }`. That one request reaches every IndexNow engine: Bing, Yandex, Naver, Seznam (Google does not take part; it keeps reading the sitemap). A push that changed no public page (staff app, docs, functions) sends nothing.
- **Changed = reads differently.** In the build job, right after `npm run build` and before the Pages artifact is made (the live site still has the old pages), `node scripts/indexnow.mjs --compare` reads each sitemap page from `dist/` and from the live site and compares them as a search engine reads them (`pageText`): the words, title, description, links, image names and alt texts, JSON-LD. Left out, because they change with every build or every day without the page changing: scripts (except JSON-LD), styles, inline icons, stylesheet and preload links, `class` and `style` attributes, the hashes in `/assets/` names, the build day (`data-day`), comments, whitespace, and the number in each days-left template of content.js `urgency` (any string with `{n}`; the home page counts down Oct 15–30). A page the live site doesn't have, or that can't be read, counts as changed; so does a URL the live sitemap lists and the new one dropped (the engines learn it's gone).
- **Real `<lastmod>` dates.** The same step rewrites `dist/sitemap.xml` before it is published: a changed page gets today (UTC, like the build); an unchanged one keeps the date the live sitemap gives it (today if it has none or an odd one). The first deploy after this keeps the live dates (2026-10-15, the last whole-site stamp); from then on a page's date moves only when that page does.
- **The list travels with the sitemap.** The step writes `changed-pages.json` (gitignored; `compared`, `changed`, `unchanged`, `removed`, `unreachable`); the build job uploads it with `dist/sitemap.xml` as the small `sitemap` artifact, and the deploy job downloads both back into place. The ping sends `changed` + `removed`; an empty list logs `no page changed … nothing sent`.
- **The key is a file.** `public/3bcc247f6ab0920d551117209063808d.txt`, body = its name, served at the site root (`npm run build` copies `public/` into `dist/`). That is how IndexNow proves the ping comes from the site's owner; the key is public by design and secret nowhere.
- **It can't break a deploy.** No network in the build job: every page counts as changed (all are pinged) and unchanged dates fall back to today. No `changed-pages.json` (the compare step failed): every URL of `dist/sitemap.xml`, else of the live sitemap, as before. A refused or failed ping prints a warning annotation and exits 0; the compare step and the three post-deploy steps carry `continue-on-error`. The deploy job is done when Pages says so.
- **It says what happened.** The compare step logs `IndexNow: compared 11 pages with https://christmas-light-creations.com: changed / /cost/; unchanged 9` (and which pages were dropped or unreadable); the ping logs `IndexNow: HTTP 200 (submitted) for 2 URLs from changed-pages.json (2026-10-15)`; a 403 says the key file isn't at the root, a 422 that the URLs don't belong to the host.

## What we DON'T do

- **No per-page pings from the app.** Only sitemap pages, only on deploy. The public pages change only through a push, so that is every change there is; the staff and customer apps are `noindex` and never pinged.
- **Nothing for Google.** Google ignores IndexNow; the sitemap (now with real dates) and Search Console (owner) stay the way in.
- **No pings from a developer's machine.** The script sends only in the workflow (or when someone runs it by hand). `node scripts/indexnow.mjs --dry-run` after `npm run build` compares the local build with the live site and prints what this push would send (from `changed-pages.json` if one is there); `--compare --dry-run` prints the comparison and each `<lastmod>`; neither sends or writes anything. On a Central-time evening a local build can differ from CI on the home page's countdown (CI draws the UTC day); `TZ=UTC npm run build` matches it. Pinging before the key file is live would make the engine cache a bad key.
- **No comparison in `npm run build`.** The build stays offline and the same everywhere; only the workflow step reads the live site.
- **No new dependency.** Plain Node (`fetch`, `node:fs`), no package.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-13 | api.indexnow.org rather than bing.com/indexnow | One request fans out to every engine; Bing's own endpoint only tells Bing |
| 2026-10-13 | ~~The whole sitemap on every push, not only changed pages~~ (replaced 2026-10-14, below) | 10 URLs; the protocol takes 10,000 per request; working out a diff would be more code than the ping |
| 2026-10-13 | The sitemap travels as a workflow artifact from the build job to the deploy job | The deploy job never sees `dist/`; the Pages artifact is a tar the deploy action consumes; the live sitemap can lag the CDN for a minute right after a deploy, so a new page could be missed |
| 2026-10-13 | The key file is found in `public/` by shape (`<key>.txt` whose body is the key), not hard-coded twice | One source of truth; rotating the key is replacing one file |
| 2026-10-13 | `continue-on-error` on checkout, download and the ping, plus exit 0 in the script | A ping is a courtesy; a red deploy for it would send someone to look at a working site |
| 2026-10-14 | Only the pages that changed, compared with the live site in the build job (TODO M) | Resubmitting 11 unchanged URLs on every staff-app or docs push tells the engines nothing |
| 2026-10-14 | Compare built HTML with live HTML, not git diffs of source files | A content.js line can show on 8 pages or none; only the built page says which. The live site is the true "before", whatever the last deploy was |
| 2026-10-14 | Compare what a search engine reads, not only the visible words | A new description, title, alt text or JSON-LD is worth a recrawl; class, style and asset-hash changes are not. Checked: a Windows build of the live commit compares equal with the Linux CI build on all 11 pages (same UTC day) |
| 2026-10-14 | The days-left number is masked through content.js `{n}` templates | Otherwise the home page reads as changed on every push of the Oct 15–30 countdown; a change of wording (countdown → last day) still counts |
| 2026-10-14 | `<lastmod>` from the same comparison, kept from the live sitemap | No extra state to store: the live sitemap holds the previous dates; when it can't be read, today (as before) |
| 2026-10-14 | When unsure, ping: an unreadable or missing live page counts as changed | Without network the step falls back to all pages; an extra ping costs nothing, a missed one waits for Bing's own crawl |
| 2026-10-14 | Live pages fetched with a `?indexnow=<time>` query | GitHub Pages' CDN caches pages up to 10 minutes; a push right after another would compare with stale pages (a duplicate ping: harmless, but noise) |

## Acceptance criteria

1. [test] `tests/indexnow.test.mjs`: the sitemap shape the build writes → the URL list (trimmed, entities decoded, no duplicates); the body has exactly `host`, `key`, `keyLocation`, `urlList`, with `keyLocation` at the site root; foreign hosts are dropped and the list is capped at 10,000; the key format is checked before anything is sent; `public/` holds exactly one key file and its body is the key. Changed pages: two builds of the same page read the same (other hashes, build day, classes, whitespace); new words, description, alt text or JSON-LD read differently; the content.js countdown on two days of the window reads the same, and countdown → last day differs; missing or unreadable live pages and dropped URLs are pinged; `<lastmod>` keeps the live date only for unchanged pages and lands in the sitemap the build wrote.
2. [build] After `npm run build`, `dist/3bcc247f6ab0920d551117209063808d.txt` exists and holds the key; `node scripts/indexnow.mjs --dry-run` compares with the live site and prints only the pages the unpushed commits change (nothing to send after a docs-only change).
3. [human] After the next push to `main`: the build job's **Changed pages** step lists the pages that push changed; the deploy run's IndexNow step logs HTTP 200 or 202 for those, or `no page changed … nothing sent` for a staff-app or docs push; `https://christmas-light-creations.com/sitemap.xml` keeps the earlier `<lastmod>` on pages the push didn't change (checklist #161); Bing Webmaster Tools → IndexNow lists the submissions (checklist #130).

## Contract

- `scripts/indexnow.mjs`: pure `sitemapUrls(xml)`, `sitemapDates(xml)`, `pageText(html, templates)`, `countdowns(urgency)`, `changedPages({ urls, built, live, liveUrls, templates })`, `lastmods({ urls, changed, live, today })`, `withLastmods(xml, dates)`, `indexNowBody({ key, urls, site })`, `keyOfFile(name, body)`, `validKey(key)`, `MEANINGS`. The runner (only when invoked directly): `--compare` reads `dist/` and the live site, rewrites `dist/sitemap.xml` and writes `changed-pages.json`; no flag reads `public/` for the key and `changed-pages.json` (else every URL of `dist/sitemap.xml`, else of the live sitemap), POSTs once with `Content-Type: application/json; charset=utf-8` (nothing when the list is empty), logs `::notice::` on 200/202 and `::warning::` otherwise; always exit 0. `--dry-run` sends and writes nothing.
- `.github/workflows/deploy.yml`: the build job runs `npm run build`, then the **Changed pages** step (`node scripts/indexnow.mjs --compare`, `continue-on-error`), then the Pages artifact, then uploads `dist/sitemap.xml` + `changed-pages.json` as artifact `sitemap` (1 day; the artifact's root is the workspace, the common folder of the two paths); the deploy job, after `deploy-pages`, checks out the repo, downloads the artifact into the workspace (both files back in place) and runs `node scripts/indexnow.mjs`.
- A page whose words change every day by design would be pinged on every push: give its changing part a content.js template with `{n}` (as `urgency`) or add it to what `pageText` leaves out, with a test.
- Rotating the key: delete the old `public/<key>.txt`, add a new one (32 hex is plenty; the protocol allows 8 to 128 letters, digits or dashes), update the two mentions in `CLAUDE.md` and here. The test fails if `public/` holds zero or two key files.

## Links

Protocol: https://www.indexnow.org/documentation (key, key file, JSON body, answers). Sitemap `<lastmod>`: https://www.sitemaps.org/protocol.html. Bing Webmaster Tools: https://www.bing.com/webmasters (IndexNow page in the left menu). `docs/serp-log.md` (what the indexes held on 2026-10-13), TODO #70 (Webmaster Tools and Bing Places, owner), test-checklist #130 and #161.
