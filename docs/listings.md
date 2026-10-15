# Listing texts (Google, Yelp, Bing, directories)

The words we use on profiles outside the website, so every listing says the same thing (SEO audit 2026-10-14, TODO #79). Every claim here is also on the website (`src/data/content.js`, `src/data/areas.js`); when the website changes, change these too. No prices, no phone numbers or links inside descriptions (the profiles have their own phone and website fields), and nothing that sells tree wrapping (owner 2026-10-14: “we lose money on them typically”).

Pictures: `assets-source/listings/` (`node scripts/listing-images.mjs`): `profile-1080.png` for profile pictures (round or square), `cover-*-2000x1000.jpg` for wide covers (Victory Lakes first).

Accounts: Yelp and Nextdoor are signed up through **info@christmas-light-creations.com** (owner 2026-10-15), so their notices arrive there. The staff app's message sync drops mail from yelp.com and nextdoor.com as service mail (`SERVICE_DOMAINS` in `functions/messageSync.js`) until it learns to pick out messages and quote requests.

Same name, phone and website everywhere: **Christmas Light Creations**, **281-819-0163**, **https://christmas-light-creations.com**.

## Where it's used

| Place | State (2026-10-14) |
|---|---|
| Google Business Profile | Primary category **Lighting contractor** (was Landscaping), 7 services listed (owner's screenshot). Left: service descriptions, business description, hours, new photos (upload first, delete the old after), the designer post |
| Yelp (`yelp.com/biz/christmas-light-creations-pearland`) | Set up as far as the free listing goes (owner 2026-10-15: “as best we can without paying them”): claimed, Specialties and History below, website, hours, photos. No paid Yelp ads or upgrades. Never ask customers for Yelp reviews (Yelp forbids it); the review request links Google only |
| Bing Places | Syncs from Google: press **Sync** after the Google changes |
| Nextdoor | Business page being set up by the owner (2026-10-15): categories **Lighting installation** and **Home decor service** (no holiday or Christmas category exists there). Description = the short one below. Nextdoor allows sharing its “Ask for recommendations” link with customers |
| Holiday Lighting Directory, Thumbtack, Angi, BBB | To do: reuse the short description and services below |

## Short description (Google “From the business”, 750 max; also Thumbtack/Angi/Nextdoor)

> Christmas Light Creations is a family-owned Christmas light installer in Pearland, TX, lighting homes and businesses since 2011 across Pearland, Friendswood, League City, Manvel, the Bay Area and Galveston County. Every install is measured and custom-fit to your roofline with commercial-grade lights, clips, cords and timers. Service calls are free all season, and in January we take everything down, label it and box it for next year. Worn-out lights are replaced new, free, for as long as you're a customer. Want to see it first? Our free online light designer lets you draw lights on a photo of your own home before you book. Free estimates, and you don't need to be home.

## Services (Google: price left on “No price”)

| Service | Description (300 max) |
|---|---|
| Christmas light installation | Professional Christmas lights measured and custom-fit to your roofline, with commercial-grade bulbs, clips, cords and timers included. Free estimates, and you don't need to be home. Installs start October 15 across Pearland, Friendswood, League City and the Bay Area. |
| Christmas light removal & storage | From January 3 (done by the 13th) we take everything down, label it and box it up for you to store until next season. Removal is a set price shown in your estimate. |
| Holiday lighting design | We plan the look with you: warm white or multicolor, rooflines, peaks and windows. See it first with our free online designer on a photo of your own home. |
| Roofline lighting | Every eave, gable and peak measured with a wheel and lit with commercial clips made for wind, so the lines are straight and nothing dangles off the roof. We don't install on tile or clay roofs. |
| Commercial holiday lighting | Rooflines for restaurants, childcare centers and other businesses: installed, serviced all season and taken down after the holidays. |
| Christmas light service & repair | Bulb out, timer acting up or a tripped GFCI? Service calls are free all season for our customers, usually the same day, 48 hours at most in peak weeks. (Not marked “Free” in the price field: that would show to non-customers too.) |
| Tree & landscape holiday lighting (only if kept) | Trees, shrubs and walkway lights as an add-on to your roofline, each priced on its own. |

## Google post: the designer

> See your house lit before you book. Our free light designer lets you draw Christmas lights on a photo of your own home and send the design with your estimate request. It takes a few minutes on your phone.

Button **Learn more** → `https://christmas-light-creations.com/design/`. Photo: a JPG or PNG screenshot of the designer on a real house (Google takes no WebP). No prices or phone number in post text.

## Yelp

**Specialties**

> Professional Christmas light installation for homes and businesses in Pearland, Friendswood, League City, Manvel, the Bay Area and Galveston County. Every roofline is measured with a wheel and custom-fit, with commercial-grade bulbs, clips, cords and timers included. Free service calls all season, usually the same day. In January we take everything down, label it and box it for next year, and worn-out lights are replaced new, free, for as long as you're a customer. See the look first with our free online light designer: draw lights on a photo of your own home. Free estimates, and you don't need to be home.

**History**

> Established in 2011. Christmas Light Creations started in Pearland in 2011 as a family Christmas light installation business, and Pearland is still home: more of our customers live here than anywhere else, and many have had us back every season for years. Today we light 250+ homes each season across south Houston.

**Meet the Business Owner** (Scott M., his own words)
