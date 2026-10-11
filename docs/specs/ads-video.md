# Google Ads video (Performance Max) — motion-design cut

Status: cut 1 built 2026-10-11, owner's notes the same day, cut 2 built from them. Owner on cut 2: scene 1 is "dope" → shipped on its own as the **5-second ad** (Teaser compositions, silent); music dropped everywhere; the rest of cut 2 waits for his notes.
Owner's brief: "more than just some gallery photos stitched together"; the first slideshow cut
(`scripts/ads-video.py`, 2026-10-11) "looks pretty cheap".

## What it is for

A 5-second ad (scene 1 alone) and a 28-second video, rendered in three shapes (16:9, 9:16, 1:1) for the Performance Max
asset group (YouTube in-stream, Shorts, square feeds). Google trims nothing, but viewers skip
after 5 s, so the first 5 s carry the name of the service and the second line of the story. The
phone number and the website close it and stay on screen 4 s.

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
  (H.264, 30 fps, about 28 s) into `assets-source/ads/video/`.
- Watching the 16:9 render: no two consecutive scenes are a plain photo crossfade; no sparkles,
  no bloom; the phone number is readable for the last 4 s; the vertical cut never cuts a roofline;
  the cottage comes on with the music's first hit.
