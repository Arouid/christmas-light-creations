# Envato Elements (subscribed 2026-10-14)

What we may do with Envato Elements items, read from the Elements License (last revised 2026-10-06,
help.elements.envato.com → Licensing and Legal → Envato Elements License) and the Download Items
article, so nobody has to re-read them. The raw downloads live in `downloads/` here and are
**never committed** (licensed to us, not ours; the repo is public). What ships goes through
`public/images/` or the ad renders, as with the Vecteezy files.

## The licence in six lines

| Rule | What it means for us |
|---|---|
| **One download = one licence for one project** | Download an item *for* a specific end product (an ad, a page, a flyer). Using the same item in a second project means re-downloading it from My Downloads and registering it to the new project. Name projects clearly ("CLC ad: cottage 5 s", "CLC site: holiday icons 2026"). |
| **Perpetual once the project is finished** | Finish the end product while the subscription is active and that use stays licensed forever, even after cancelling. Unfinished projects lose the licence on cancellation. |
| **Modify freely, but it has to become something larger** | Edit, recolour, cut, combine. The end product must be more than the item: a video with the track in it, a page with the icon on it. Re-selling or re-distributing an item, even modified, even free, is out. |
| **Never as a logo or trademark** | Same rule as Vecteezy: no item may become the logo, nor may we claim trademark rights over an item. Our own lettering set in an Elements font is fine; the font file itself can't ship. |
| **Music: no TV or radio, nor their online substitutes** | Streaming TV, VOD channels and streaming radio count as broadcast and need a separate licence. Web, YouTube, social and online ads are not in that definition, so our Google Ads videos and site videos are fine. Films can't get a theatrical release. |
| **Fonts and add-ons are per person, per device** | Installed on at most two computers per seat, only by the subscriber, uninstalled when the subscription ends. Text set with them keeps its licence. |

Also: no merchandise where the item *is* the value (a poster of the image); a shirt or sign where
the item sits inside our own design is allowed. Items can contain third-party pieces under their
own licence (a theme's demo photos, a GPL plugin): check the download's licence folder.

## How to use it without tripping over the rules

1. Search Elements, pick the item, open its page.
2. **Download at the moment you commit to the project**, and pick the project name in the
   prompt (new project = new name). The licence certificate is created then.
3. Save the file under `assets-source/envato/downloads/<project>/` (ignored by git).
4. Note the item in the project's own README or spec (item name + Elements URL + project name), so
   the licence can be found again in **My Downloads** if YouTube or anyone asks.
5. Reusing the item elsewhere later: My Downloads → the item → Download → *new* project.

YouTube and Content ID: music items are fingerprinted, so a video can get a claim (a claim is not
a strike and not an infringement finding). Two ways to clear it: **Claim Clear**
(elements.envato.com/claim-clear) registers up to three YouTube channels so future videos with
covered tracks clear automatically, or clears one video by its URL; for tracks it doesn't cover,
dispute the claim with the licence certificate (My Downloads → the item → View licenses → copy or
download it, then YouTube's dispute → "License" → paste the certificate). Keep every certificate.

## What the catalog has (October 2026)

Video templates (After Effects, Premiere Pro, DaVinci Resolve, Final Cut, Apple Motion: logo reveals,
intros, promos, titles, lower thirds, slideshows, vertical videos), stock video and drone footage,
motion graphics (overlays, transitions, backgrounds), music by mood, sound effects, graphics
(illustrations, icons, backgrounds, mockups, presentation and social templates), photos, fonts,
add-ons (brushes, presets, LUTs), 3D, web and WordPress templates, plus AI generators (image,
video, music, voice) whose output has its own AI terms: read those before using any of it on the
site, and keep in mind the site's own rule that nothing AI-generated is used as a customer-facing
photo of our work.

## Where it fits our projects

- **Ads** (`assets-source/ads/`): music beds and sound effects for the YouTube/Google Ads videos
  (owner's approved direction for the two current ads is *no music*; anything new decides per ad),
  overlays and transitions for the Remotion/ffmpeg renders, stock b-roll where we lack footage.
- **Site** (`public/images/holiday/` via `scripts/holiday-icons.mjs`): icon sets and illustrations
  repainted to the palette, same as the Vecteezy ones; never a logo.
- **Print** (`assets-source/print/`, `shirts/`): backgrounds and textures inside our own layouts.
- **Fonts**: only for print and image renders on the owner's PC; the site keeps Fraunces and Inter.
