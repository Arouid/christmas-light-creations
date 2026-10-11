# Google Ads video ad (Performance Max)

Motion-design ad made in **Remotion** (React video), second cut 2026-10-11 after the owner's
notes on the first (no gallery feel, no sparkles, no bloom, the site's type, a real map, more
production value, Carol of the Bells). Built in `video/` (storyboard: `docs/specs/ads-video.md`).
The photo slideshow from `scripts/ads-video.py` is kept only as a fallback.

The MP4s are not in git (`.gitignore`: this folder except this README). Rebuild them whenever
they are missing or the words, photos or offer change.

## Files

| File | Size | Use in Google Ads |
|---|---|---|
| `clc-ad-16x9.mp4` | 1920×1080, landscape | YouTube in-stream, TV, desktop |
| `clc-ad-9x16.mp4` | 1080×1920, vertical | YouTube Shorts, phone feeds |
| `clc-ad-1x1.mp4` | 1080×1080, square | Discover, Gmail, square feeds |

All three: H.264, 30 fps, about 28 s with the October offer (26 s without), with music.

| Seconds | Scene | Words |
|---|---|---|
| 0–5.5 | winter night, snow, the cottage logo in the dark; it switches on (neon flicker) on the music's first hit | Christmas Light Creations · Pearland, TX · since 2011 |
| 5.5–9 | the three-gable brick house (photo 34), slow push-in, headline lands word by word | Christmas light installation / for homes and businesses around south Houston |
| 9–12 | ring draws around 30 min, ladder struck through, stone house (57) drifting behind | Free estimate / No ladder needed |
| 12–16.5 | the /design/ tool, full frame: house photo (58) on the canvas, the cursor picks Cool white then Red and the bulbs change colour | Design your lights online first |
| 16.5–19 | illustrated street whose lights come on bulb by bulb; three cards light along a line | Installed · Serviced all season · Taken down |
| 19–22 | a map: Galveston Bay, the 20 towns at their real positions lighting up, Pearland pinned | Where we install · South Houston |
| 22–24 | 10 % OFF stamp, typed line, calendar flips to OCT 31, green-lit street behind | Installs done by October 31 |
| 24–28 | logo flickers on, snow, phone number (the scene the owner liked, unchanged) | 281-819-0163 / christmas-light-creations.com / Free 30-minute estimate |

Photos used: only 34, 57 and 58 (the strong ones). Weak spots are graphics instead.
Real footage: drop a phone or drone clip (MP4) of a finished house into
`assets-source/ads/clips/` and name it as `clip` on `photos.hero` in `video/src/data.js`; it
replaces the hero photo in scene 2.

## Open the studio (scrub, change words, see it live)

From the repo root:

```bash
npm run video:studio
```

Opens Remotion Studio at http://localhost:3010 (also `video-studio` in `.claude/launch.json`,
so Claude can open it in the browser pane). Pick **Ad16x9**, **Ad9x16** or **Ad1x1** on the
left, press space to play, drag the timeline to scrub. The **Props** panel on the right edits
every word, photo number, timing and the `offer.enabled` switch live; to keep a change, put it
in `video/src/data.js` (the panel starts from that file).

## Render

```bash
npm run video:render
```

Writes the three MP4s into this folder (about 2–3 minutes each on the office PC; Remotion
bundles the scenes, renders every frame in headless Chrome and encodes with its own ffmpeg).
One shape only: `npm --prefix video run render -- 9x16`.

Before either command, `video/scripts/prepare-assets.mjs` runs on its own and copies what the
video needs into `video/public/` (gitignored): the photos named in `data.js` from
`photos-incoming/` (resized to 1920 wide, EXIF and GPS stripped), the cottage logo SVG from
`assets-source/logo-vector/` and the site's two fonts. First run of Remotion downloads a
headless Chrome (~150 MB) into `video/node_modules/.remotion`; nothing else is installed.

Setup once on a new PC: `cd video && npm install`.

To look at frames without a video player: `npm --prefix video run frames` puts one frame a
second of each MP4 into `video/out/frames/<shape>/`.

## Changing things

| Want | Where |
|---|---|
| Words, phone, towns | `video/src/data.js` → `words` |
| Photos (by contact-sheet number) and the point to keep in frame | `data.js` → `photos` |
| Scene lengths | `data.js` → `scenes` (seconds) |
| Drop the October offer when it ends | `data.js` → `offer.enabled: false`, then render |
| Roofline the design mock draws on | `data.js` → `photos.design.roofline` (fractions of the photo) |
| How a scene moves | `video/src/scenes/<Scene>.jsx` |
| Brand colours | `data.js` → `colors` |

## Music

Only clearly licence-free music (Pixabay Content License, CC0 or similar). To swap: drop the
file into `video/public/music/`, set `music.file` in `data.js`, render, and record it here:

| Track | Source | Licence |
|---|---|---|
| "Little Swallow (Carol Of The Bells) – Ukrainian New Years Song" by JuliusH, 1:04, instrumental | https://pixabay.com/music/special-occasions-little-swallow-carol-of-the-bells-ukrainian-new-years-song-5821/ (downloaded 2026-10-11 to `video/public/music/carol-of-the-bells-juliush.mp3`, not in git) | Pixabay Content License: free for commercial use, no attribution required, not for resale as-is. Picked over the other Carol of the Bells tracks because its page shows no "Content ID Registered" badge (those can trigger YouTube copyright claims on an ad). The melody itself (Leontovych, 1914) is public domain. |

The track is 64 s; the ad uses its first 28 s and fades out over the last 2.5 s (`music` in
`data.js`: file, volume, startFrom).

## Licence

Remotion is free for a for-profit business with up to 3 employees (checked 2026-10-11,
`docs/decisions.md`). If the business grows past that, buy a company licence at remotion.pro
before rendering again.

## Upload to YouTube (owner)

Google Ads takes videos only from YouTube. One-time, about 10 minutes:

1. Go to youtube.com signed in as the **info@** Google account (the one that owns the
   Google Ads account). If it asks to create a channel, accept the default name
   (Christmas Light Creations) and skip the optional steps.
2. Click **Create** (camera icon, top right) → **Upload videos** → pick `clc-ad-16x9.mp4`.
3. Title: `Christmas Light Creations – Pearland, TX`. Description: the phone number and
   the website. Audience: **No, it's not made for kids**.
4. Visibility: **Unlisted** (not Private: Google Ads can't read private videos; not
   Public: it doesn't need to appear on the channel). Save, and copy the video link.
5. Repeat for `clc-ad-9x16.mp4` (add "vertical" to the title) and `clc-ad-1x1.mp4`
   ("square"). Three links in total. Processing takes a minute or two.

## Add to the campaign (owner)

1. Google Ads → **Campaigns** → the Performance Max campaign → **Asset groups** →
   the asset group → **Edit assets**.
2. Scroll to **Videos** → **+ Video** → paste a YouTube link (or search by title once
   the channel is linked). Add all three.
3. Save. Google checks the video (usually within a day). Once approved, you can remove
   the auto-generated slideshow if one appears under Videos.

If Google Ads says it can't find the video: wait a few minutes for YouTube processing,
and check the visibility is Unlisted, not Private.
