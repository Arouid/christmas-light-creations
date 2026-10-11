# Google Ads video (Performance Max) — motion-design cut

Status: storyboarded and built 2026-10-11 in `video/` (Remotion); waiting for the owner's verdict.
Owner's brief: "more than just some gallery photos stitched together"; the first slideshow cut
(`scripts/ads-video.py`, 2026-10-11) "looks pretty cheap".

## What it is for

One 27-second silent video, rendered in three shapes (16:9, 9:16, 1:1) for the Performance Max
asset group (YouTube in-stream, Shorts, square feeds). Google trims nothing, but viewers skip
after 5 s, so the first 5 s carry the name of the service and the second line of the story. The
phone number and the website close it and stay on screen 4 s.

## Storyboard (30 fps; scenes overlap 8 frames in a cross-dissolve, so 29 s of scenes play in about 27 s)

| # | Seconds | Scene | What moves | Words | Photo |
|---|---|---|---|---|---|
| 1 | 0–4 | **Switch on** | The three-gable brick house starts almost black (brightness 15 %). A soft wipe sweeps left to right over 1.6 s and the lights "come on" with a bloom (blurred bright copy, screen-blended, flaring then settling) and a sparkle dust overlay. Slow push-in the whole time. | none yet (the picture is the hook) | 34 |
| 2 | 4–8 | **Who we are** | Kinetic type: "Christmas light installation" lands word by word (spring, from below, slight overshoot), then "for homes and businesses around south Houston" slides in under it. A gold rule draws itself between the lines. Photo drifts right behind a navy gradient, sparkle overlay. | Christmas light installation / for homes and businesses around south Houston | 57 |
| 3 | 8–12 | **Free estimate** | A big gold ring draws itself (0→360°) around "30 min"; "Free estimate" stamps in; "No ladder needed" with a small ladder icon that gets a strike-through drawn across it. Photo darkened behind. | Free 30-minute estimate / No ladder needed | 60 |
| 4 | 12–16.5 | **Design online** | A phone (vertical) or browser window (landscape, square) mock of the site's /design/ page: a house photo loads, a cursor/finger taps "Add roofline", a light string draws itself along the roofline bulb by bulb with glow, a price pill pops in ("Looks like this"), then the headline. | Design your lights online first / christmas-light-creations.com/design | 58 (in the mock) |
| 5 | 16.5–20 | **All season** | A timeline Nov → Dec → Jan slides in as three cards: "Installed" (bulb icon), "Serviced all season" (wrench, a bulb that flickers and is replaced), "Taken down in January" (box). The cards light up one after another along a gold line. Photo (wrapped trees) drifts behind. | Installed · Serviced all season · Taken down in January | 14 |
| 6 | 20–23 | **Where** | "South Houston" at the centre of a simple dotted map; the 20 towns from `serviceAreaGroups` pop in as glowing pills in three rings (Pearland side, Bay side, Galveston County & south), staggered 60 ms apart, each with a dot that lights. | the town names | none (navy) |
| 7 | 23–25 | **Offer** | A round "10 % OFF" stamp slams in (scale 3→1, rotates −8°, shake), "Installs done by October 31" types in underneath, a small calendar page flips to OCT 31. Short on purpose: this scene is cut when the offer ends (`offer.enabled` in the data file). | 10 % off · Installs done by October 31 | none (photo 46 very dark behind) |
| 8 | 25–29 | **End card** | The cottage logo fades in with a neon flicker (three stutters, then steady) and a soft snowfall; the phone number rolls in large; website and "Free 30-minute estimate" under it. Held 4 s. | 281-819-0163 / christmas-light-creations.com / Free 30-minute estimate | logo |

Scene 7 off → about 25 s; the end card still holds 4 s.

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
- Fonts: Fraunces (display) and Inter (body) from `public/fonts/`, loaded with `@remotion/fonts`.
- Colours: navy #050b1a, gold #ffcf4d, magenta #f038ee, green #5fe757, white #f5f7fa.
- Music: only a clearly licence-free track (Pixabay content licence or CC0). None picked yet, so
  the render is silent; `music` in the data file takes a file dropped into `video/public/music/`.
- Rendered MP4s stay out of git (`assets-source/ads/video/*` is ignored except the README).

## Acceptance (what the owner sees)

- `npm run video:studio` opens Remotion Studio in the browser pane; the three compositions
  (Ad16x9, Ad9x16, Ad1x1) can be scrubbed and the words changed in the props panel.
- `npm run video:render` writes `clc-ad-16x9.mp4`, `clc-ad-9x16.mp4`, `clc-ad-1x1.mp4`
  (H.264, 30 fps, about 27 s) into `assets-source/ads/video/`.
- Watching the 16:9 render: no two consecutive scenes are a plain photo crossfade; the phone
  number is readable for the last 4 s; the vertical cut never cuts a roofline.
