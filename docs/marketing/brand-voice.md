# Brand voice: how Christmas Light Creations sounds

Drawn from the site's own copy (`src/data/content.js`, the live home page, the area pages in `src/data/areas.js`) on 2026-10-14. Use it for posts, ads, emails and profile texts. When the site's words change, this follows them, not the other way round.

## In one line

**The neighbor who has done this since 2011 and tells you straight.** Plain, specific, a little warm, never loud.

## Four voice traits

| Trait | We are | We are not | Sounds like (site copy) | Doesn't sound like |
|---|---|---|---|---|
| **Specific** | Numbers and real details: minutes, dates, what's in the box | Vague praise, "stunning", "magical" | "We measure your roofline with a measuring wheel, about 30 minutes, no roof climbing." | "Experience the magic of the holidays!" |
| **Honest, even when it costs us** | Saying what we don't do and why | Hype, fake scarcity, "#1" | "For a single-story home with a low roof, a sturdy ladder and a free weekend, hanging your own lights is the cheapest way to do it." | "The best Christmas light company in Texas!" |
| **Family-warm** | Grateful, local, first person plural | Sappy, guilt, pleading | "Thank you! It means a lot to our family." | "Please, we really need your review!!" |
| **Calm confidence** | Short sentences that settle the question | Pushy, knocking other companies by name | "Do you price-match? We beat it." / "You never lift a finger." | "Don't get ripped off by the other guys." |

A fifth, used sparingly: **dry humor in the video ads** ("Don't let Halloween get in the way of Christmas.", the whisper ad's "I booked the lights."). In text posts, one light line at most.

## What we always come back to (messaging pillars)

1. **Done for you, start to finish.** Free estimate, design, install, free service calls all season, takedown January 3rd to 13th, labeled and boxed. Proof: the How it works steps, "One call. Whole season covered."
2. **It looks right and it lasts.** Measured and custom-fit, commercial-grade LED, clips made for wind, nothing dangling; the lifetime warranty ("In 15 years we have never charged a cent for it.").
3. **Easy to say yes.** You don't need to be home, text a photo for a rough price, draw your lights with the free designer, Pay in 3 at the same price, we beat a professional competitor's written quote by 10%.
4. **Local and family-owned since 2011.** Pearland is home; 250+ homes each season; neighbors who come back every year.

Campaign line for the ads (owner, 2026-10-13): **"We can keep a secret."** It ends every video ad. In posts it fits the "you don't need to be home" message (surprise someone, come home to lights).

## Style rules (as the site does it)

| Rule | Do | Example |
|---|---|---|
| Headlines | Sentence case, ending in a full stop | "Questions, answered." "Claim your spot before we fill up." |
| Punctuation | Colons and commas; **no em dashes** (the site has none); one exclamation mark at most per piece | "Free, no sign-up, and your photo stays on your phone." |
| Contractions | Yes | "you don't", "we're", "it's" |
| Numbers | Numerals | "30 minutes", "2 hours", "10% off", "250+ homes" |
| Dates | "October 15th" in sentences, "Oct 31" in short lines | "Install by Oct 31 and save 10%" |
| Phone | 281-819-0163, never split across lines | In GBP post text: no phone number at all (the profile has a Call button) |
| Emoji | None in ads and profile texts; one or two in social posts, never in place of words | |
| Hashtags | Three or four, local: #PearlandTX #LeagueCityTX #FriendswoodTX #ChristmasLights | |
| Place names | The owner's names from `gallery` in content.js, exactly | "Shadow Creek Ranch, Pearland", "Victory Lakes, League City" |

## Words

| Use | Not | Why |
|---|---|---|
| Christmas lights | holiday illumination, décor packages | It's what people search and say |
| free estimate | consultation, assessment | The site's word |
| install / takedown (noun), take down (verb) | hang job, removal service | Site usage ("Takedowns Jan 3–13") |
| service call | maintenance visit | The site's word; always "free" |
| lifetime warranty (lowercase in sentences) | guarantee for life | Plus its condition: "for as long as you're a customer" |
| Pay in 3 | financing, payment plan, credit | It's three equal payments, not a loan |
| light designer, free designer | app, AI tool | It's a drawing tool on a photo |
| commercial-grade LED | premium, luxury | The real spec |
| Christmas Light Creations (CLC only after the full name, or quoting a customer) | Christmas Lights Creations | A retailer with a near-identical name ranks for our brand |

## Never

- Prices or dollar amounts beyond the published offers (10% early-install discount, Pay in 3 at the same price, re-install at 50% of the original, $0 service calls, beat a written quote by 10%). The cost guide stays price-free (owner's rule).
- A Google star rating or review count anywhere until there are about 10 reviews (`tests/seo.test.mjs` refuses `aggregateRating`).
- Made-up reviews, numbers, customer stories, or reworded quotes. The three on the site are quoted as written, including "Change and his crew".
- "#1", "best", "only", "top-rated": two competitors use "#1"; we let specifics do it.
- Naming or knocking a competitor.
- Selling tree wrapping (owner 2026-10-14: "we lose money on them typically") or gift wrapping (off until the owner says go). Photos with wrapped trees are fine as photos; the words stay on rooflines.
- Permanent lights as our service. We can say what the FAQ says: we replace failed permanent systems with seasonal lights and write an estimate the insurance company can use.
- Anything AI-generated presented as a house we lit. Only the gallery photos (the owner's own installs) show our work. The photoreal Gemini cottage is the logo, rendered: fine as the logo, never as "our work". No fake skies, snow overlays or AI fill on gallery photos.
- Stock photos or music outside the rules in `assets-source/stock/envato/README.md` (one Elements download per named project, never as a logo, music never for TV or radio).
- Asking for a review with anything offered, or only of happy customers (`docs/specs/review-ask.md`).

## Quick check before anything goes out

1. Is every claim on the website today? (Search content.js for it.)
2. Any dollar figure that isn't a published offer? Take it out.
3. Photo from `public/images/gallery/`, caption carrying its `place`?
4. No phone number in a Google post; the phone number one tap away everywhere else.
5. Read it out loud: does it sound like a neighbor, not an ad agency?
