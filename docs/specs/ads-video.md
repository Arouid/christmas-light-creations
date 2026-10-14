# Google Ads video (Performance Max) — motion-design cut

Status: cut 1 (slideshow feel) and cut 2 (motion-graphics kit) rejected 2026-10-11; scene 1 of cut 2 shipped as the **5-second ad** (Teaser compositions, silent, in git). **Cut 3 is the story ad** (owner's idea, same day): the birthday surprise, told as a text thread, the plan, the reveal. Reworked through 2026-10-13 with the owner's Uppbeat music, effects and footage; trimmed to 30.5 s with one closing card after a Gemini review the owner ran (below). Waiting for the owner's verdict with sound, and the music pick.
Owner's brief: "more than just some gallery photos stitched together"; the first slideshow cut
(`scripts/ads-video.py`, 2026-10-11) "looks pretty cheap".

## What it is for

A 5-second ad (scene 1 alone) and a 30-second video, rendered in three shapes (16:9, 9:16, 1:1) for the Performance Max
asset group (YouTube in-stream, Shorts, square feeds). Google trims nothing, but viewers skip
after 5 s, so the first 5 s carry the name of the service and the second line of the story. The
phone number and the website close it and stay on screen 6 s.

## Owner's notes on cut 1 (2026-10-11) and what changed

| Note | Change |
|---|---|
| Design mock put lights on a house that already had lights, misaligned; dead space; empty background | The mock is now the design tool full frame: a photo on the canvas, a panel (Roofline / Windows / Trees, bulb colour) and the cursor switching the bulb colour (warm → cool white → red) on the photo itself. Colour variants are made from a bulb mask (`prepare-assets`). A fake "lights off" version was tried and dropped: the halos never looked real. |
| Gold sparkles distracting | Removed everywhere. |
| Too much bloom / brightness in scene 1; the "switch on" poorly expressed | Scene 1 is now the cottage logo switching on (vector, neon flicker, snow) on the music's first hit: an effect we fully control, and it ties to the end card the owner liked. No bloom on photos. |
| Same font as the website | Headlines are Fraunces **extrabold** with the site's tight tracking (`type` in data.js), as the site's h1; Inter for the rest. Cut 1 used weight 700 with normal tracking. |
| Radar ring looks like sonar | Replaced by a map: Galveston Bay as water, the 20 towns at their real coordinates lighting up with names, Houston faint for orientation, Pearland pinned. |
| More production value; "generate scenes"; drone shots | Film look over everything (vignette + fine grain), slow push-ins and sideways drifts with a slight 3D tilt, a soft light sweep at every cut, graphics where photos were weak (illustrated street whose lights come on bulb by bulb behind the season and offer scenes). No footage exists and Claude cannot generate video; a phone or drone clip of a finished house slots into scene 2 via `photos.hero.clip`. |
| Pictures aren't professional, only a few good ones; fill the weak spots, be creative | Only photos 34, 57 and 58 are used; the rest of the story is graphics. |
| Music: Carol of the Bells | Pixabay track by JuliusH (licence in the README), chosen for no Content ID badge; the cottage switched on at the first hit (~3.5 s). Then dropped (owner, same day: "ditch the music"); `music.file` is empty, the track stays documented. |

## Owner's notes on cut 2 (2026-10-11) and the turn to a story

| Note | Read |
|---|---|
| Map "doesn't look like south Houston" | The bay was a hand-drawn blob. Real shapes need Census map data; the owner dismissed that download. Map dropped. |
| Season cards "look like a warehouse commercial"; estimate ring "looks cheap"; "uh the red?" on the recoloured bulbs | Rings, icon cards, stamps and UI mocks read as a template kit; the bulb tint recoloured only the cores, the warm halos stayed. All dropped. |
| "Husband meets the installer secretly because it's his wife's birthday; install while everyone's gone; she comes home and sees the lights." "Holiday commercials, but with Christmas lights." "If this doesn't work out, generate AI assets and actors." | Cut 3 tells that story with what exists: the business texts customers, so the secret plan is a text thread; the plan beats in the cottage world (the cottage comes on at "timer set for dusk"); the one real photo as the reveal; the ask; the end card. No actors. Claude cannot generate video here; the reveal and the ask take a dropped-in clip (`photos.home.clip`, `photos.pitch.clip`) if the owner generates one elsewhere. |

## Sound and footage (2026-10-13, owner's Uppbeat Pro)

Music: "Wintertime Waltz" (Albert Behar) from the top, quiet under the first texts, peaking at
15–17 s as she pulls up and the house appears (chosen 2026-10-13 from four tracks the owner
downloaded, by loudness shape; a Sugar Plum Fairies comparison render exists). Fades out over the
last 2.5 s. Effects: a pop as each bubble lands, typing under the dots,
a switch click + harp pluck as the cottage comes on (end card, the 5-second ad; the first flicker file was ~20 dB too quiet: owner "can't hear it switch on"), the chime again
as the house appears, a very low wind loop under everything. Then thinned for the full ad (`adMix`): pops at 60 %, the
switch-on at 85 %, a car door slam synced to the door-closing shot and a second slam just before the cut (owner:
"so we'll have two"), and ambience beds under the moving footage only, never under the still house photos (owner: "we need
the video scenes to sound like they're real in between non real shots"; "don't have the ambient
sounds playing on the still frames"): the wipers clearly audible and a muffled street under her in the car (owner:
"add the windshield wiper sound to the scene around 12 seconds and give it some ambient noise"), the quiet street under her
reaction and the door, no typing, no reveal chime, no wind, because the music carries it (owner: the effects
"fit poorly for the full ad", then "turn the volume up on the sfx some, everything but the ambient": `sfx.volume`
0.8 → 1.0, beds unchanged); the 5-second ad keeps the full levels. Footage in four slots (texting,
drive, reaction, bokeh), all under one grade (`look.grade`: saturation 0.8, contrast 1.06, blacks
lifted toward navy, gold warmth) so the sources read as one film. Files and licences in
`assets-source/ads/video/README.md`.

## Storyboard, cut 3: the birthday surprise (30 fps; scenes cross-dissolve 8 frames)

| # | Seconds | Scene | What moves | Words | Picture |
|---|---|---|---|---|---|
| 1 | 0–7.6 | **Tuesday 8:14 pm** | Night; warm bokeh lights behind (Uppbeat clip, dimmed; the owner preferred it to hands on a phone). A text thread: typing dots, then each bubble springs in. Customer bubbles dark on the left with a person silhouette as avatar, ours gold on the right with the cottage as avatar. | "Can you do my house Thursday while she's at work? It's her birthday 🎂" / "Done by 4. We'll be gone before she's home." / "🤫 She has no idea." | none |
| 2 | 7.6–9.7 | **Time card** | One line over falling-snow footage: Thursday 3:48 pm · Done. Timer set for dusk. The three-beat version (with a clock, then with the cottage popping on) was cut on 2026-10-13: "this scene just feels so forced into it"; the texts already tell the plan, and the mascot in the middle of a realistic story broke the tone. `story.plan` with several entries and `planCottage` bring the old versions back. The dark cottage that switched on here in the first version was cut on 2026-10-13 (owner: a still background between footage was jarring); the owner then asked for the beats one at a time again and something in the right-hand space. | Thursday 9:02 am · Everyone's gone. / 9:30 am · We're on the roof. / 3:48 pm · Done. Timer set for dusk. | snow footage |
| 3 | 9.5–20.9 | **5:41 pm** | Her in the red car at night, looking out (Uppbeat clip, 2.5 s, the wipers and a muffled street under it; the sharper city-driving clip was "too jarring"), the time. The dusk timer's switch click as the house appears (12.2 s). "She's home." fades as the door shot starts. Real falling snow (overlay clip, screen-blended) over her reaction only; over the house it "looks like an overlay" (owner), so it's off there. The closing shot and the end card have it. The house opens out of the dark in a soft iris and settles (pull-back, brightening); the line lands at the bottom; then her in the car turning to look out of the window (Uppbeat clip, 2.2 s). No light sweep into this scene. Without the clips: black, the time, the reveal, the line. | She's home. | 32 + two clips |
| 4 | 20.6–24.8 | **Thursday 5:52 pm** | The thread again, two bubbles, gold bokeh behind (Uppbeat clip). | "She cried. Thank you." / "Happy birthday to her. 🎄" | none |
| 5 | (off) | **The ask** | Skipped since 2026-10-13 (`endCardAsk`): its words moved onto the closing card. With `endCardAsk: false`: stone house, slow push-in; big line, the estimate line, the offer pill (while enabled), 5 s. | Surprise someone this year. / Free 30-minute estimate. We can keep a secret. / 10% off installs done by October 31 | 34 (or a clip) |
| 6 | 24.5–30.5 | **The closing card** | The photoreal cottage pops its lights on (the only time in the ad), real falling snow behind it (Uppbeat clip, screen-blended over the navy); the campaign line big, the ask under it, the offer and estimate pills, the phone number large, the website. Held 6 s. | We can keep a secret. / Surprise someone this year. / 10% off installs done by October 31 · Free 30-minute estimate / 281-819-0163 / christmas-light-creations.com | logo |

## Gemini's review (2026-10-13, the owner ran the 35 s cut through Gemini)

| Gemini's note | Checked against the frames | Change |
|---|---|---|
| A vertical seam on the right third at 0:08 (into the time card) | Real: the light sweep at every scene change was a diagonal gradient inside a tall box, which ended short of the box's sides and left a hard vertical edge (visible at 8.3, 22.3 and 31.3 s). | The sweep is a side-to-side gradient, transparent at both ends, skewed for the diagonal look. |
| "She's home." frozen bottom-left through the second thread (0:16–0:26) | Partly: it stayed to 22.5 s, over her reaction and the door shot, and left with the dissolve; it never sat over the thread. | The line fades out once the door shot is in (gone about 0.6 s after it starts). |
| The headline ghost-fades over the closing card (0:30–0:31) | The 8-frame cross-dissolve from the ask to the end card. | Gone with the one closing card. |
| Two closing screens "stutter"; make one 5–6 s card: ask, offer + estimate, number, site on the cottage | Agreed. | `endCardAsk`: the pitch scene is skipped, the closing card carries the words, 6 s. The three-gable house (34) is off while it is on. The first version dropped "We can keep a secret." with the pitch scene; the owner: "We can keep a secret is the whole idea", so it is the card's headline now (`words.tagline`), the ask under it. |

## The campaign: "We can keep a secret." (owner, 2026-10-13)

The owner wants "a bunch of 'We can keep a secret' ads": the line is the campaign's signature,
the way "He went to Jared" was (his words: "She went to Jared == We can keep a secret"). So every
ad ends on the same beat, the same way: the cottage pops on, the line lands, the number. The
story in front of it changes. Ideas offered (not built; the owner picks), all from pieces that
exist, the words to be his:

| Ad | Length | What happens before the line |
|---|---|---|
| The bumper | 6 s | Bokeh, one bubble pops in: "🤫 She has no idea." Cut: the cottage pops on, the line, the number. |
| The 15-second story | 15 s | Two bubbles, her in the car, the house opens, "She's home.", the card. For the non-skippable slot. |
| The anniversary | 30 s | "Can you do our house while she's at her sister's? Twenty years Saturday." Same reveal, the card. |
| The kids | 30 s | "Can you come while the kids are at school? They've been begging." The house, the card. |
| The parents' house | 30 s | "My parents land Friday. Can you do their place before we pick them up?" The house, the card. |
| Her turn | 30 s | "Don't tell my husband. He thinks we're doing it ourselves this year." The house, the card. |
| Mom's house | 30 s | "Can you do my mom's house? She says she's too old for the ladder." The house, the card. |

How they would be built: a `video/src/stories.js` with one named entry per ad (the thread, the
time card, the line, which scenes play), `render-all.mjs --story=<name>` writing
`clc-ad-<shape>-<name>.mp4`; the base story stays in `data.js`; the closing card is shared, so the
line is always the same.
| A click or chime as the lit house appears (the dusk timer) | The reveal chime had been turned off (owner: effects "fit poorly"). | The switch click alone, at 45 % (`adMix.revealClick`). |
| Trim 2–3 s to about 30 s | 35.3 s before. | 30.5 s: 7.6 / 2.4 / 11.4 / 4.2 / 6 s scenes; the music start moved (2.9 s) so the waltz's peak still lands on the house. |

Cut 2's scene files (headline, estimate ring, design tool, season cards, map, offer stamp, the
illustrated street) were deleted in cut 3; git history (commit b485d58) has them.

## The photoreal cottage (2026-10-13)

The owner asked for "a real life rendering of the cottage logo"; Claude has no image generator, so
it wrote the prompt and the owner generated it in Gemini (square and 16:9 renders in
`assets-source/Gemini/`). The 5-second ad, the end card, the YouTube banner and the profile picture
now use it (`cottageImage`, `cottageImageWide` in data.js); the vector logo stays as the fallback.
The switch-on: `prepare-assets` builds a "lights off" copy of each render (a colour mask finds the
neon, the warm door and window and the green chimney, excluding anything blue-leaning like the
sky and snow; those pixels go dark grey, a wider soft mask takes the coloured glow off the snow)
and the ads crossfade from it to the lit render with the flicker, so the cottage is visible
throughout and only its lights pop on (owner: "just darken the lights, door, window… and pop
those lights on"). The cottage is a cut-out (`cutout.mjs`: sky keyed from the picture's edges,
largest remaining component kept, soft edge, faded mound bottom), not a feathered rectangle: the
feathered version showed the render's own sky as a patch ("plastered over the top of everything").
The YouTube banner went through three versions the same day: text-heavy ("infomercially"), the
cottage logo with one line ("isn't gonna vibe with younger audiences"), the house photo, then the
photoreal cottage small in the phone strip.

## The 5-second ad (owner's pick from cut 2)

Scene 1 on its own: 2 s of the dark cottage in the snow, the switch-on (flicker, glow, warm
flash), the name and "Pearland, TX · since 2011", held to the last frame. 150 frames, silent,
three shapes (`Teaser16x9`, `Teaser9x16`, `Teaser1x1`), files `clc-teaser-5s-*.mp4`. Settings:
`teaser.seconds` and `teaser.onAt` in data.js. Open question for the owner: add the phone
number or website at the end, or keep it as a pure brand bumper.

## Storyboard, cut 2 (30 fps; scenes cross-dissolve 8 frames with a light sweep)

| # | Seconds | Scene | What moves | Words | Photo |
|---|---|---|---|---|---|
| 1 | 0–5.5 | **Switch on** | Winter night, snow. The cottage logo stands dark (one-colour white at 20 %). On the music's first hit it flickers on (colour logo, neon glow, a brief warm flash) and the business name springs in. | Christmas Light Creations / Pearland, TX · since 2011 | logo |
| 2 | 5.5–9 | **Who we are** | The three-gable brick house, slow push-in. Headline lands word by word (spring), gold rule draws itself, sub-line slides in. | Christmas light installation / for homes and businesses around south Houston | 34 (or the owner's clip) |
| 3 | 9–12 | **Free estimate** | Gold ring draws 0→360° around "30 min"; "Free estimate" stamps in; ladder icon struck through. Stone house drifts behind with a slight tilt. | Free estimate / No ladder needed | 57 |
| 4 | 12–16.5 | **Design online** | The /design/ tool full frame: house photo on the canvas, panel with Roofline ✓ / Windows / Trees and the colour chips. Cursor clicks Cool white (bulbs turn cool), then Red (bulbs turn red), "Get my free estimate" button. Headline lands over the canvas. | Design your lights online first | 58 + tinted variants |
| 5 | 16.5–19 | **All season** | Illustrated street (house silhouettes) whose C9 string comes on bulb by bulb; three cards (NOV Installed, DEC Serviced all season, JAN Taken down) light up along a gold line. Snow. | Installed · Serviced all season · Taken down | graphic |
| 6 | 19–22 | **Where** | Map: Galveston Bay as water on a dotted grid, Houston faint, the 20 towns pop in at their real positions with names, Pearland gets the pin. | Where we install / South Houston | graphic |
| 7 | 22–24 | **Offer** | "10 % OFF" stamp slams in and shakes, the line types in, a calendar flips to OCT 31; the street behind lit green. Dropped when `offer.enabled` is off. | Installs done by October 31 | graphic |
| 8 | 24–28 | **End card** | Unchanged from cut 1 (the owner liked it): logo flickers on, snow, phone number large, website, estimate line. Held 4 s. | 281-819-0163 / christmas-light-creations.com / Free 30-minute estimate | logo |

## Shapes

- 16:9 (1920×1080): photos fill the frame; type sits in the lower third or centred.
- 9:16 (1080×1920): photos sit in a 4:5 window in the upper half (rooflines whole, never a
  9:16 slice), type in the lower half; the design mock is a phone.
- 1:1 (1080×1080): photos fill with the focus point kept; type centred and smaller.
- One layout function per scene takes the format and returns positions; no scene is designed
  twice.

## Rules

- Everything editable from `video/src/data.js`: photos (file + focus point + roofline points),
  every word, scene lengths, colours, the offer switch. The same object is the composition's
  default props, so Remotion Studio's props panel edits it live.
- Fonts: Fraunces extrabold with tight tracking for headlines (as the site's h1) and Inter for
  the rest, from `public/fonts/`, loaded with `@remotion/fonts`.
- Colours: navy #050b1a, gold #ffcf4d, magenta #f038ee, green #5fe757, white #f5f7fa.
- Music: only a clearly licence-free track (Pixabay Content License or CC0); the track, source
  and licence are recorded in `assets-source/ads/video/README.md`. The file lives in
  `video/public/music/` (not in git: the repo is public and the licence forbids redistributing it).
- Rendered MP4s stay out of git (`assets-source/ads/video/*` is ignored except the README).

## Acceptance (what the owner sees)

- `npm run video:studio` opens Remotion Studio in the browser pane; the three compositions
  (Ad16x9, Ad9x16, Ad1x1) can be scrubbed and the words changed in the props panel.
- `npm run video:render` writes the three `clc-teaser-5s-*.mp4` (5 s) and the three `clc-ad-*.mp4`
  (H.264, 30 fps, about 33 s) into `assets-source/ads/video/`.
- Watching the 16:9 render: the story reads without sound (thread → plan → reveal → thanks →
  ask); nothing looks like a template kit; the phone number is readable for the last 4 s; the
  vertical cut never cuts a roofline.
