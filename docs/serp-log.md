# Search positions log

Where the site shows for the searches that matter, checked by hand so there is something to compare next time (owner 2026-10-13: "check SERPs ranking today for google/bing vs last month"; there was no earlier record). Method: the browser pane, signed out, Google with `hl=en&gl=us` (no location personalisation, so the real Pearland result can differ a little), Bing's index read through DuckDuckGo's plain results page (`html.duckduckgo.com`, which runs on Bing; the pane's own bing.com answers were garbage that day). Organic positions count blue links only; ads and the map pack are noted separately. Google Search Console (Performance → compare date ranges) is the authoritative history once it has data.

| Date | Search | Google organic | Google map pack | Bing organic (via DDG) |
|---|---|---|---|---|
| 2026-10-13 | christmas light installation pearland tx | **6** (lsxmaslights, houstonxmaslighting, Yelp, a Facebook post, wehangchristmaslights ahead) | listed (with Top of Houston, All About Outdoor Lighting) | not on page 1 (Kingdom, Ambiance, Christmas Lights Specialist, League City Christmas Lights, Legacy, Warriors for Light, Yelp, holidaylightingdirectory, The Perfect Light) |
| 2026-10-13 | christmas light installers pearland | **5** (lsxmaslights, houstonxmaslighting, Yelp, a Pearland Facebook group post ahead) | not captured | not on page 1 (Kingdom, holidaylightingdirectory, League City Christmas Lights, Yelp, Legacy, Specialist, dandelco, Perfect Light, houstonxmaslighting, Window Genie) |

## What the indexes hold (2026-10-13)

- **Google** `site:` → about 24 pages: the new home page and FAQ, the four area pages (Pearland, Friendswood, Manvel, League City) with their new titles, plus old WordPress URLs still listed with old titles (`/info/`, `/photos/`, `/pearland-christmas-light-installation/`, `/spt-cable-whats-the-difference/`). Those now serve the `noindex` redirect stubs and should drop out on their own.
- **Bing** `site:` → only old WordPress URLs with old titles (`/signup/`, `/info/`, `/get-an-estimate/`, `/photos/`, `/free-estimates/`, `/faq/`, `/test/`, `/shadow-creek-ranch/`, `/led-or-incandescent/`), the home page under its old title. Bing has not recrawled since the new site went live. Fix: Bing Webmaster Tools + sitemap (TODO #70); IndexNow pings on each deploy would keep it current.

## Next check

Same four searches, same method, add a row. Worth adding the area searches once Bing has recrawled: "christmas light installation friendswood", "… league city", "… manvel".
