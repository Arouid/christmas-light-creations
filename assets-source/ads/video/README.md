# Google Ads video ad (Performance Max)

Motion-design ad made in **Remotion** (React video): the house switches on, kinetic type, a ring
that draws itself, a mock of the /design/ page placing lights, Nov→Dec→Jan cards, the towns
served, the October stamp and a neon end card with the phone number. Built 2026-10-11 in
`video/` (storyboard: `docs/specs/ads-video.md`). It replaced the photo slideshow from
`scripts/ads-video.py` (owner: "more than just some gallery photos stitched together"); the
Python script still works as a fallback.

The MP4s are not in git (`.gitignore`: this folder except this README). Rebuild them whenever
they are missing or the words, photos or offer change.

## Files

| File | Size | Use in Google Ads |
|---|---|---|
| `clc-ad-16x9.mp4` | 1920×1080, landscape | YouTube in-stream, TV, desktop |
| `clc-ad-9x16.mp4` | 1080×1920, vertical | YouTube Shorts, phone feeds |
| `clc-ad-1x1.mp4` | 1080×1080, square | Discover, Gmail, square feeds |

All three: H.264, 30 fps, 27 s with the October offer (25 s without), silent.

| Seconds | Scene | Words |
|---|---|---|
| 0–4 | house switches on (wipe + bloom + sparkle) | – |
| 4–8 | kinetic headline | Christmas light installation / for homes and businesses around south Houston |
| 8–11.5 | ring draws around 30 min, ladder struck through | Free estimate / No ladder needed |
| 11.5–16 | /design/ page mock: string drawn along the roofline | Design your lights online first |
| 16–19 | three cards light up along a line | Installed · Serviced all season · Taken down |
| 19–22 | towns pop in by region | South Houston + the 20 towns |
| 22–24 | 10 % OFF stamp, calendar flips to OCT 31 | Installs done by October 31 |
| 24–27 | logo flickers on, snow, phone number | 281-819-0163 / christmas-light-creations.com / Free 30-minute estimate |

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

Silent on purpose. A music bed goes in only if it is clearly licence-free (Pixabay content
licence, CC0 or similar): drop the file into `video/public/music/`, set `music.file` in
`data.js` (and `music.volume`), render, and record the track, source URL and licence here:

| Track | Source | Licence |
|---|---|---|
| none yet | | |

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
