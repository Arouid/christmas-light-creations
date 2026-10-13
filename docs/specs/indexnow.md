# IndexNow: Bing recrawls after every push

Owner, 2026-10-13: "how do we get shown on ChatGPT if someone looks for Christmas light installers". ChatGPT, Copilot and most assistants search through Bing's index. That day Bing's `site:` still listed only the old WordPress pages with their old titles (`docs/serp-log.md`); the new site had been live for weeks and Bing had not come back.

## The problem

Bing recrawls a small site when it feels like it: weeks or months. Google follows the sitemap and Search Console and had already picked up the new pages. Without a nudge, Bing (and so ChatGPT and Copilot) keeps describing the business from pages that no longer exist, and every future change waits just as long.

## What we do

- **One ping per deploy.** After GitHub Pages has published, the deploy job POSTs every `<loc>` of `sitemap.xml` to `https://api.indexnow.org/indexnow` as `{ host, key, keyLocation, urlList }`. That one request reaches every IndexNow engine: Bing, Yandex, Naver, Seznam (Google does not take part; it keeps reading the sitemap).
- **The key is a file.** `public/3bcc247f6ab0920d551117209063808d.txt`, body = its name, served at the site root (`npm run build` copies `public/` into `dist/`). That is how IndexNow proves the ping comes from the site's owner; the key is public by design and secret nowhere.
- **The sitemap is the list.** The build job uploads `dist/sitemap.xml` as a small `sitemap` artifact; the deploy job downloads it and `scripts/indexnow.mjs` reads it. If the artifact is missing, the script reads the live `https://christmas-light-creations.com/sitemap.xml` instead.
- **It can't break a deploy.** A refused or failed ping prints a warning annotation on the run and exits 0; the three post-deploy steps also carry `continue-on-error`. The deploy job is done when Pages says so.
- **It says what happened.** The step logs `IndexNow: HTTP 200 (submitted) for 10 URLs from dist/sitemap.xml`; a 403 says the key file isn't at the root, a 422 that the URLs don't belong to the host.

## What we DON'T do

- **No per-page pings from the app.** Only the sitemap, only on deploy. The public pages change only through a push, so that is every change there is; the staff and customer apps are `noindex` and never pinged.
- **Nothing for Google.** Google ignores IndexNow; the sitemap and Search Console (owner) stay the way in.
- **No pings from a developer's machine.** The script sends only in the workflow (or when someone runs it by hand); `--dry-run` prints the body and sends nothing. Pinging before the key file is live would make the engine cache a bad key.
- **No new dependency.** Plain Node (`fetch`, `node:fs`), no package.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-13 | api.indexnow.org rather than bing.com/indexnow | One request fans out to every engine; Bing's own endpoint only tells Bing |
| 2026-10-13 | The whole sitemap on every push, not only changed pages | 10 URLs; the protocol takes 10,000 per request; working out a diff would be more code than the ping |
| 2026-10-13 | The sitemap travels as a workflow artifact from the build job to the deploy job | The deploy job never sees `dist/`; the Pages artifact is a tar the deploy action consumes; the live sitemap can lag the CDN for a minute right after a deploy, so a new page could be missed |
| 2026-10-13 | The key file is found in `public/` by shape (`<key>.txt` whose body is the key), not hard-coded twice | One source of truth; rotating the key is replacing one file |
| 2026-10-13 | `continue-on-error` on checkout, download and the ping, plus exit 0 in the script | A ping is a courtesy; a red deploy for it would send someone to look at a working site |

## Acceptance criteria

1. [test] `tests/indexnow.test.mjs`: the sitemap shape the build writes → the URL list (trimmed, entities decoded, no duplicates); the body has exactly `host`, `key`, `keyLocation`, `urlList`, with `keyLocation` at the site root; foreign hosts are dropped and the list is capped at 10,000; the key format is checked before anything is sent; `public/` holds exactly one key file and its body is the key.
2. [build] After `npm run build`, `dist/3bcc247f6ab0920d551117209063808d.txt` exists and holds the key; `node scripts/indexnow.mjs --dry-run` prints the body with every sitemap URL.
3. [human] After the next push to `main`: the deploy run's IndexNow step logs HTTP 200 or 202; `https://christmas-light-creations.com/3bcc247f6ab0920d551117209063808d.txt` serves the key; Bing Webmaster Tools → IndexNow lists the submission (checklist #130); within days Bing's `site:` shows the new titles (`docs/serp-log.md`).

## Contract

- `scripts/indexnow.mjs`: pure `sitemapUrls(xml)`, `indexNowBody({ key, urls, site })`, `keyOfFile(name, body)`, `validKey(key)`, `MEANINGS`; the runner (only when invoked directly) reads `public/` for the key and `dist/sitemap.xml` (else the live sitemap), POSTs once with `Content-Type: application/json; charset=utf-8`, logs `::notice::` on 200/202 and `::warning::` otherwise, always exit 0.
- `.github/workflows/deploy.yml`: build job uploads `dist/sitemap.xml` as artifact `sitemap` (1 day); deploy job, after `deploy-pages`, checks out the repo, downloads the artifact into `dist/` and runs `node scripts/indexnow.mjs`.
- Rotating the key: delete the old `public/<key>.txt`, add a new one (32 hex is plenty; the protocol allows 8 to 128 letters, digits or dashes), update the two mentions in `CLAUDE.md` and here. The test fails if `public/` holds zero or two key files.

## Links

Protocol: https://www.indexnow.org/documentation (key, key file, JSON body, answers). Bing Webmaster Tools: https://www.bing.com/webmasters (IndexNow page in the left menu). `docs/serp-log.md` (what the indexes held on 2026-10-13), TODO #70 (Webmaster Tools and Bing Places, owner), test-checklist #130.
