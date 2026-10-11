# Google Ads video ad (Performance Max)

Short silent video made from the business's own photos, for the Performance Max
campaign's asset group. Without a video Google auto-generates a slideshow; these
replace it. Built 2026-10-11 by `scripts/ads-video.py`.

The MP4s are not in git (`.gitignore`: this folder except this README). Rebuild them
with the script whenever they are missing or the photos or words change.

## Files

| File | Size | Use in Google Ads |
|---|---|---|
| `clc-ad-16x9.mp4` | 1920×1080, landscape | YouTube in-stream, TV, desktop |
| `clc-ad-9x16.mp4` | 1080×1920, vertical | YouTube Shorts, phone feeds |
| `clc-ad-1x1.mp4` | 1080×1080, square | Discover, Gmail, square feeds |

All three: H.264, 30 fps, no audio, 14.5 s, 7–10 MB each.

What's in them, in order:

| Seconds | Photo (contact-sheet number) | Caption |
|---|---|---|
| 0–4 | 57 stone house, then 34 three-gable brick house | Christmas light installation / Homes and businesses around south Houston |
| 4–8 | 60 house with lit trees, then 46 green & white house | Free 30-minute estimate / No ladder needed. Design your lights online first. |
| 8–11 | 14 wrapped trees, then 53 League City restaurant | Installs done by October 31 get 10% off / Installed, serviced all season, taken down in January |
| 11–14.5 | navy end card | logo, 281-819-0163, christmas-light-creations.com, Free 30-minute estimate |

Each photo has a slow zoom (Ken Burns) and a half-second crossfade into the next.
Fonts are the site's (Fraunces for headlines in gold #ffcf4d, Inter for the sub-lines),
background navy #050b1a. The vertical version shows the photo in a 4:5 window with the
small logo above and the captions below, so rooflines are never sliced off.

The third caption is the October offer. When the offer ends, change `CAPTIONS` in the
script (for example to "Book early for the best install dates") and rebuild.

## Rebuild

Needs Python 3 with Pillow, numpy and fontTools (already on this PC) and ffmpeg from the
`imageio-ffmpeg` pip package (installed 2026-10-11, user scope; no system ffmpeg):

```bash
pip install --user imageio-ffmpeg
```

Then from the repo root:

```bash
python scripts/ads-video.py
```

Options:

| Command | What |
|---|---|
| `python scripts/ads-video.py` | all three formats into this folder (about 2 minutes) |
| `python scripts/ads-video.py --preview` | 1 fps drafts (`*-preview.mp4`) in a few seconds, to check framing |
| `python scripts/ads-video.py --formats 16x9` | one format only (`16x9`, `9x16`, `1x1`) |
| `python scripts/ads-video.py --photos 57,34,60,46,14,53` | other photos, by their number in `../contact-sheet-index.txt` |

The photos come from `photos-incoming/` (never committed). To change which part of a
photo stays in frame, edit the focus point for that photo in `PHOTOS` at the top of the
script (x, y as fractions; keep y around 0.4–0.45 so the roof stays in the tall crops).
The script converts the site's woff2 fonts to TTF into `build/` on first run.

To look at frames without a video player:

```bash
python -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())"
```

then `<that exe> -i clc-ad-16x9.mp4 -vf fps=1 build/frames/f-%02d.jpg`.

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
