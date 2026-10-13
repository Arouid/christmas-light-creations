# Google Ads video ads (Performance Max)

Two ads made in **Remotion** (React video), built in `video/` (storyboard and history:
`docs/specs/ads-video.md`):

- **The 5-second ad**: the cottage logo switching on in the snow, the name. Owner-approved
  2026-10-11, the three MP4s are in git (tag `ad-teaser-5s-v1`).
- **The story ad** (about 33 s, cut 3, 2026-10-11, owner's idea): a husband texts the business to
  install while his wife is at work on her birthday; the plan; she comes home to the lights.
  Told as a text thread in the brand's night-and-snow world, the cottage coming on when the
  timer is set, one real photo for the reveal, the ask, the end card. Silent.

The story ad's MP4s are not in git (`.gitignore`: this folder except this README and the
5-second files). Rebuild them whenever they are missing or the words, photos or offer change.

## Files

| File | Size | What | Use in Google Ads |
|---|---|---|---|
| `clc-teaser-5s-16x9.mp4` | 1920×1080, landscape | **the 5-second ad**, silent | YouTube bumper (6 s max), in-stream, TV |
| `clc-teaser-5s-9x16.mp4` | 1080×1920, vertical | same | Shorts, phone feeds |
| `clc-teaser-5s-1x1.mp4` | 1080×1080, square | same | Discover, Gmail, square feeds |
| `clc-ad-16x9.mp4` | 1920×1080, landscape | **the story ad**, about 33 s, silent | YouTube in-stream, TV, desktop |
| `clc-ad-9x16.mp4` | 1080×1920, vertical | same | YouTube Shorts, phone feeds |
| `clc-ad-1x1.mp4` | 1080×1080, square | same | Discover, Gmail, square feeds |

All H.264, 30 fps, no audio (music off since 2026-10-11: owner, "ditch the music"; the track
below stays on disk and can be turned back on in `data.js` → `music.file`).

The story ad, scene by scene:

| Seconds | Scene | What happens |
|---|---|---|
| 0–8.5 | Text thread, Tuesday 8:14 pm | Customer: "Can you do my house Thursday while she's at work? It's her birthday 🎂" · Us: "Done by 4. We'll be gone before she's home." · Customer: "🤫 She has no idea." Typing dots before each bubble. |
| 8.5–15 | The plan | Three beats: "Thursday 9:02 am · Everyone's gone." "9:30 am · We're on the roof." "3:48 pm · Done. Timer set for dusk." The cottage beside them is dark and switches on with the last beat. |
| 15–21.5 | 5:41 pm | Black, then the three-gable house (photo 34) opens out of the dark and settles; "She's home." |
| 21.5–26 | Text thread, Thursday 5:52 pm | "She cried. Thank you." · "Happy birthday to her. 🎄" |
| 26–31 | The ask | Over the stone house (57): "Surprise someone this year." / "Free 30-minute estimate. We can keep a secret." / the October offer line (while `offer.enabled`). |
| 31–35 | End card | Unchanged: logo flickers on, snow, 281-819-0163, the site, Free 30-minute estimate. |

Every word of the story is in `video/src/data.js` → `story` (bubbles with their timing, the three
beats, the two lines, the ask). Photos: only 34 (the reveal) and 57 (the ask).

## Music, sound effects and footage (Uppbeat, 2026-10-13)

The owner has an Uppbeat Pro subscription (Solo Professional licence: paid advertising allowed
for a one-person business; published videos stay licensed after cancelling; downloads may not be
used in new videos after the subscription ends, see docs/decisions.md). Downloads go in three
folders, all gitignored (licensed files, not redistributable); `prepare-assets` copies them into
`video/public/` and probes each clip's length into `video/src/clips.json`:

| Folder | What | Named in `data.js` |
|---|---|---|
| `assets-source/ads/music/` | the music bed (MP3 or WAV) | `music.file` |
| `assets-source/ads/sfx/` | sound effects | `sfx.pop`, `sfx.typing`, `sfx.lightsOn`, `sfx.car`, `sfx.reveal`, `sfx.ambience` |
| `assets-source/ads/clips/` | footage (MP4, 1080p or 4K, landscape) | `clips.texting`, `clips.drive`, `clips.reaction`, `clips.snow`; `photos.home.clip`, `photos.pitch.clip` |

Shopping list (what each slot is for, and what to search):

| Slot | Plays when | Look for | Length |
|---|---|---|---|
| `music.file` | under the whole story ad, fades out over the last 2.5 s | warm, emotional, piano or strings, holiday without jingle bells; quiet opening, a swell about 15 s in for the reveal. Uppbeat searches: "emotional christmas piano", "heartwarming holiday", "magical winter" | 35 s or more |
| `sfx.pop` | each text bubble lands | "message pop", "notification bubble", "sent" | under 1 s |
| `sfx.typing` | the typing dots (optional) | "keyboard typing phone", "text typing" | about 1 s |
| `sfx.lightsOn` | the cottage flickers on (plan beat 3, end card, the 5-second ad) | "neon flicker", "light switch buzz", "magical shimmer" | 1–2 s |
| `sfx.car` | start of the 5:41 pm scene | "car pulls up driveway", "car arriving", "car door close" | 2–4 s |
| `sfx.reveal` | the house opens out of the dark | "magical chime", "soft sparkle whoosh", "christmas bell swell" | 1–3 s |
| `sfx.ambience` | low under everything, looped | "winter night wind", "snow ambience", "quiet suburban night" | any |
| `clips.texting` | behind the first text thread, dimmed | hands holding a phone at night, screen glow, dark room or porch | 5–10 s |
| `clips.drive` | opens the 5:41 pm scene before the house appears | headlights on a dark residential street, or through the windshield turning onto a street, dusk or night | 4–6 s |
| `clips.reaction` | closes the 5:41 pm scene | a woman's face lighting up: hands to mouth, happy surprise, happy tears, warm light, night | 3–5 s |
| `clips.snow` | behind the second thread, dimmed | falling snow at night, or soft bokeh Christmas lights | 5–10 s |
| `photos.home.clip` | instead of the reveal photo | a house with Christmas lights at night, wide, slow push | 5 s or more |

Any slot left empty keeps the current look (snow night, the photo). When the drive and reaction
clips are in, add about 4.5 s to `scenes.home` in `data.js` (the scene then runs drive → reveal →
reaction). Record every file here with its Uppbeat track or clip name and artist:

| File | Slot | Uppbeat title, artist | Licence |
|---|---|---|---|
| (none yet) | | | Uppbeat Pro (Solo Professional), downloaded 2026-10-13 |

Claude cannot generate video or actors itself; it cuts whatever is dropped in.

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

Writes the six MP4s into this folder (the 5-second ones take ~20 s each, the full ad 2–3
minutes each on the office PC; Remotion bundles the scenes, renders every frame in headless
Chrome and encodes with its own ffmpeg). Only some: `npm --prefix video run render -- teaser`,
`-- ad`, `-- 9x16`, or combined (`-- teaser 9x16`).

Before either command, `video/scripts/prepare-assets.mjs` runs on its own and copies what the
video needs into `video/public/` (gitignored): the photos named in `data.js` from
`photos-incoming/` (resized to 1920 wide, EXIF and GPS stripped), the cottage logo SVG from
`assets-source/logo-vector/` and the site's two fonts. First run of Remotion downloads a
headless Chrome (~150 MB) into `video/node_modules/.remotion`; nothing else is installed.

Setup once on a new PC: `cd video && npm install`.

To look at frames without a video player: `npm --prefix video run frames` puts one frame a
second of each MP4 into `video/out/frames/<name>/` (`-- teaser 2` for the short ones, two a second).

## Changing things

| Want | Where |
|---|---|
| The story's words (bubbles, beats, lines) and when each bubble lands | `video/src/data.js` → `story` |
| Phone, site, offer line, the 5-second ad's name lines | `data.js` → `words` |
| Photos (by contact-sheet number), the point to keep in frame, a clip instead | `data.js` → `photos` |
| Scene lengths | `data.js` → `scenes` (seconds) |
| Drop the October offer when it ends | `data.js` → `offer.enabled: false`, then render |
| The 5-second ad's length and switch-on moment | `data.js` → `teaser` |
| How a scene moves | `video/src/scenes/<Scene>.jsx` |
| Brand colours | `data.js` → `colors` |

## Music

Only clearly licence-free music (Pixabay Content License, CC0 or similar). To swap: drop the
file into `video/public/music/`, set `music.file` in `data.js`, render, and record it here:

| Track | Source | Licence |
|---|---|---|
| "Little Swallow (Carol Of The Bells) – Ukrainian New Years Song" by JuliusH, 1:04, instrumental | https://pixabay.com/music/special-occasions-little-swallow-carol-of-the-bells-ukrainian-new-years-song-5821/ (downloaded 2026-10-11 to `video/public/music/carol-of-the-bells-juliush.mp3`, not in git) | Pixabay Content License: free for commercial use, no attribution required, not for resale as-is. Picked over the other Carol of the Bells tracks because its page shows no "Content ID Registered" badge (those can trigger YouTube copyright claims on an ad). The melody itself (Leontovych, 1914) is public domain. |

The track is 64 s. It is currently **off** (`music.file: ''`). When on, the full ad uses its
first 28 s and fades out over the last 2.5 s (`music` in `data.js`: file, volume, startFrom);
the 5-second ad is always silent.

## Licence

Remotion is free for a for-profit business with up to 3 employees (checked 2026-10-11,
`docs/decisions.md`). If the business grows past that, buy a company licence at remotion.pro
before rendering again.

## Upload to YouTube (owner)

Google Ads takes videos only from YouTube. One-time, about 10 minutes:

1. Go to youtube.com signed in as the **info@** Google account (the one that owns the
   Google Ads account). If it asks to create a channel, accept the default name
   (Christmas Light Creations) and skip the optional steps.
2. Click **Create** (camera icon, top right) → **Upload videos** → pick `clc-teaser-5s-16x9.mp4`
   (and later the full `clc-ad-16x9.mp4` once it is approved).
3. Title: `Christmas Light Creations – Pearland, TX`. Description: the phone number and
   the website. Audience: **No, it's not made for kids**.
4. Visibility: **Unlisted** (not Private: Google Ads can't read private videos; not
   Public: it doesn't need to appear on the channel). Save, and copy the video link.
5. Repeat for the `9x16` file (add "vertical" to the title) and the `1x1` file ("square").
   Three links per ad. Processing takes a minute or two.

## Add to the campaign (owner)

1. Google Ads → **Campaigns** → the Performance Max campaign → **Asset groups** →
   the asset group → **Edit assets**.
2. Scroll to **Videos** → **+ Video** → paste a YouTube link (or search by title once
   the channel is linked). Add all three.
3. Save. Google checks the video (usually within a day). Once approved, you can remove
   the auto-generated slideshow if one appears under Videos.

If Google Ads says it can't find the video: wait a few minutes for YouTube processing,
and check the visibility is Unlisted, not Private.
