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
| `clc-ad-16x9.mp4` | 1920×1080, landscape | **the story ad**, about 35 s, with music and sound | YouTube in-stream, TV, desktop |
| `clc-ad-9x16.mp4` | 1080×1920, vertical | same | YouTube Shorts, phone feeds |
| `clc-ad-1x1.mp4` | 1080×1080, square | same | Discover, Gmail, square feeds |

All H.264, 30 fps. The story ad has music and sound effects (Uppbeat, below); the 5-second ad
has the lights-on effect only, no music.

The story ad, scene by scene:

| Seconds | Scene | What happens |
|---|---|---|
| 0–8.5 | Text thread, Tuesday 8:14 pm (warm bokeh behind it) | Customer: "Can you do my house Thursday while she's at work? It's her birthday 🎂" · Us: "Done by 4. We'll be gone before she's home." · Customer: "🤫 She has no idea." Typing dots before each bubble. |
| 8.5–11 | Time card | One line over the snow footage: "Thursday 3:48 pm · Done. Timer set for dusk." (The three-beat scene with the cottage popping on was cut: owner, "this scene just feels so forced into it". More entries in `story.plan` bring the beats back; `planCottage: true` brings the cottage.) |
| 11–23 | 5:41 pm | Her in the red car at night (clip, wipers under it), the big two-storey house (photo 32, owner's pick) opens out of the dark and settles, "She's home.", her reaction in the car (1.2 s, same woman, real snow in front), then the car door closes as she gets out (2.6 s; the slam lands at about 20.9 s, synced to the shot, and a second door closes at about 22.0 s, just before we cut away: two of them got out, owner's ask). Beds: the wipers and a muffled street under her in the car, the quiet street under her reaction and the door, nothing under the still house (owner). |
| 23–27.5 | Text thread, Thursday 5:52 pm | "She cried. Thank you." · "Happy birthday to her. 🎄" |
| 27.5–32.5 | The ask | Over the three-gable house (34), snow falling: "Surprise someone this year." / "Free 30-minute estimate. We can keep a secret." / the October offer line (while `offer.enabled`). |
| 32.5–36 | End card | The photoreal cottage pops its lights on (click + harp), real snow, 281-819-0163, the site, Free 30-minute estimate. |

Every word of the story is in `video/src/data.js` → `story` (bubbles with their timing, the three
beats, the two lines, the ask). Photos: 32 (the reveal; a 1024×576 file, upscaled) and 34 (the ask).

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
| `music/wintertime-waltz-albert-behar-main-version-46196-02-05.wav` | `music.file` (from 0: quiet under the first texts, peaks at 15–17 s as the house appears) | "Wintertime Waltz", Albert Behar (2:05) | Uppbeat Pro (Solo Professional), downloaded 2026-10-13 |
| `music/dance-of-the-sugar-plum-fairies-kevin-macleod-main-version-9984-01-46.wav` | alternative (a 16:9 comparison render `clc-ad-16x9-music-sugarplum.mp4`) | "Dance of the Sugar Plum Fairies", Kevin MacLeod (1:46) | same |
| `music/it-s-christmas-corals-main-version-35993-01-57.wav` | not used (loud from the first second, no build) | "It's Christmas", Corals (1:57) | same |
| `music/anticipation-and-joy-giulio-fazio-main-version-29590-00-58.wav` | not used now (was the first bed; its swell at 22 s needed re-timing after every edit: startFrom 4.3) | "Anticipation And Joy", Giulio Fazio (58 s) | same |
| `sfx/windshield-wipers-jeff-kaale-1-00-07.wav` | `sfx.carInterior` (the wipers under her driving shot, `sfx.wipersVolume` 0.7: about level with the music) | "Windshield Wipers", Jeff Kaale | same |
| `sfx/city-street-ambience-light-wind-traffic-jam-fx-quiet-park-ambience-on-a-spring-morning-1-0m13s.wav` | `sfx.nightOutside` (muffled under her in the car, full under her reaction and the door; never under the still house) | "City Street Ambience Light Wind", Traffic Jam FX | same |
| `sfx/car-fuel-pump-inserted-jeff-kaale-1-00-03.wav` | not used | "Car Fuel Pump Inserted", Jeff Kaale | same |
| `sfx/notification-bubble-pop-message-epic-stock-media-1-00-00.mp3` | `sfx.pop` | "Notification Bubble Pop Message", Epic Stock Media | same |
| `sfx/smartphone-typing-message-gfx-sounds-2-2-00-04.mp3` | `sfx.typing` (first second, faded) | "Smartphone Typing Message", GFX Sounds | same |
| `sfx/switch-turned-on-epic-stock-media-1-00-00.wav` | `sfx.lightsOn` (the click as the cottage comes on) | "Switch Turned On", Epic Stock Media | same |
| `sfx/alert-magic-chime-pluck-albert-behar-harp-chime-pluck-1-0m06s.wav` | `sfx.lightsChime` (the harp pluck right after the click; owner's pick) | "Alert Magic Chime Pluck", Albert Behar | same |
| `sfx/fantasy-game-whoosh-harp-sweep-bosnow-harp-impact-big-upbeat-1-0m03s.wav` | not used (tried as the sweep after the click) | "Fantasy Game Whoosh Harp Sweep", Bosnow | same |
| `sfx/car-door-slammed-shut-fascinatedsound-1-00-01.wav` | `sfx.car` (synced to the door clip: `home.doorSlamAt`; played again `home.secondSlamFromEnd` seconds before the scene ends; the bang sits 0.33 s into the file) | "Car Door Slammed Shut", Fascinatedsound | same |
| `sfx/light-switch-button-soft-betacut-1-00-00.wav` | not used yet (a softer switch, an alternative to the click) | "Light Switch Button Soft", Betacut | same |
| `sfx/harp-chime-alert-magical-bright-bosnow-harp-logo-with-chimes-impact-upbeat-1-0m03s.mp3` | `sfx.reveal` (as the house appears) | "Harp Chime Alert Magical Bright", Bosnow | same |
| `sfx/fluorescent-tube-light-flicker-bosnow-1-00-47.mp3` | not used (about 20 dB quieter than the rest: inaudible as the switch-on) | "Fluorescent Tube Light Flicker", Bosnow | same |
| `sfx/wind-ambience-howling-during-snowstorm-vincentmets-1-00-20.mp3` | `sfx.ambience` (looped, very low) | "Wind Ambience Howling During Snowstorm", Vincentmets | same |
| `clips/warm-golden-bokeh-background-55540-1080.mp4` | `clips.texting` (behind the first thread; the owner preferred bokeh to the hands-on-phone clip) | "Warm Golden Bokeh Background" (6.5 s, looped) | same |
| `clips/person-smiling-in-car-at-night-red-light-105845-1080.mp4` | `clips.drive` (from 0.5 s: her in the red car, looking out; owner's pick, same shoot as the reaction clip; the city-driving clip was "too jarring") | "Person Smiling In Car At Night Red Light" (12 s) | same |
| `clips/falling-snowflakes-on-dark-bokeh-background-114577-1080.mp4` | `clips.plan` (behind the three beats) | "Falling Snowflakes On Dark Bokeh Background" (26 s) | same |
| `clips/falling-snowflakes-overlay-86734-1080.mp4` | `clips.end` (behind the end card) and `clips.snowOverlay` (in front of her reaction in the car and the closing shot; strength `snowOverlayOpacity`), screen-blended so the black goes away | "Falling Snowflakes Overlay" (56 s) | same |
| `clips/person-closes-car-door-at-night-105855-1080.mp4` | `clips.door` (from 0.3 s, 1.7 s: she closes the car door; the slam lands 1 s in) | "Person Closes Car Door At Night" (14.8 s) | same |
| `clips/person-smiling-in-warm-ambient-light-95610-1080.mp4` | `clips.reaction` (from 0.5 s: her face lit by the lights, outside the car) | "Person Smiling In Warm Ambient Light" (7.4 s) | same |
| `clips/person-in-car-on-rainy-night-105878-1080-#1.mp4` | not used now (was the reaction, inside the car, before the door shot went in) | "Person In Car On Rainy Night" (14.7 s) | same |
| `clips/shimmering-gold-bokeh-lights-54198-1080.mp4` | `clips.snow` (behind the second thread) | "Shimmering Gold Bokeh Lights" (9.6 s, looped) | same |
| other files in `clips/` and `sfx/welding-arc-…` | not used (downloaded as candidates) | | same |

All footage and photos go through one grade (`look.grade` in `data.js`: saturation 0.8,
contrast 1.06, blacks lifted toward navy 0.55, gold warmth 0.22) so the five sources read as
one film; the owner's idea ("hide flaws with some color grading").

Claude cannot generate video or actors itself; it cuts whatever is dropped in.

## Motion-graphics downloads (Uppbeat, 2026-10-13)

`assets-source/ads/Mothion Graphics/` (2.4 GB, gitignored) holds the owner's Uppbeat downloads:
two snowfall overlay movies (one ProRes 4444 **with alpha**, 1080p, 5.5 s loop; one 4K
Animation-codec 8.5 s), a 1.9 GB snowfall pack (70 4K MP4s on black: close, mid, far, bird's-eye,
mix, blizzard, slow motion), 30 light-leak transitions (4K, about 1 s each), 5 vintage film
overlays (4K, 15 s) and a rain-on-glass kit (DaVinci Resolve `.drfx` + window PNGs: not usable in
Remotion as is). A few representative files are extracted into `assets-source/ads/motion/`
(also gitignored) for use. Likely uses: the alpha snow loop in front of scenes instead of the
screen-blended clip (true transparency, so it works over bright areas too), a light-leak
transition in place of the drawn light sweep, the film overlay instead of the drawn grain. Not
wired yet.

## The photoreal cottage (Gemini, 2026-10-13)

The owner had Gemini render the cottage logo photoreal (snow-draped roof, magenta neon trim,
green chimney, warm door) from a prompt Claude wrote with the logo attached. Two renders live in
`assets-source/Gemini/` (in git; the owner's own generated images): a square one
(`…1oiptx….jpg`, 2048²) and a 16:9 one (`…9rw9cv….jpg`, 2752×1536). `prepare-assets` copies
them to `video/public/gemini/`. Named in `data.js` as `cottageImage` and `cottageImageWide`.

Where they appear: the 5-second ad and the story's end card (16:9 uses the wide render full
frame with the words on the sky to its left; vertical and square use the square render feathered
into the navy; the switch-on crossfades from a "lights off" copy that `prepare-assets` makes by
darkening only the neon, the door, the window and the chimney, so the cottage stays and just its
lights pop on: owner, 2026-10-13). The cottage is placed as a **cut-out** (`video/scripts/cutout.mjs`:
the render's dark blue sky is keyed from the edges, the biggest remaining piece, the cottage on its
mound, is kept with a soft edge and a faded bottom; written as `…-cut.png` / `…-cut-off.png`), so
the scene's own sky and snow show around it instead of the render's (owner: the feathered version
looked "plastered over the top"), the YouTube banner
(`assets-source/ads/youtube-banner-2048x1152.png`: the square render small in the middle so it
sits in the strip phones and desktops show) and the profile picture
(`assets-source/ads/youtube-profile-1080.png`). Clear `cottageImage` in `data.js` to go back to the
vector logo.

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

In the full ad the effects sit under the music at a fraction of their level (`adMix` in `data.js`:
pops at 60 %, the switch-on at 85 %, the car doors at 100 %, no typing, no reveal chime, no wind; owner 2026-10-13: "the
sound efx fit poorly for the full ad", then "turn the volume up on the sfx some, everything but the ambient", so
`sfx.volume` went 0.8 → 1.0 and the beds stayed at 0.35). The 5-second ad has no music and uses the full levels, so its
next render will be a quarter louder than the one in git (`ad-teaser-5s-v4`).

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
