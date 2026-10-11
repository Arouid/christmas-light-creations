"""Build the Google Ads (Performance Max) video ad from the business's own photos.

Output: three silent H.264 MP4s (30 fps, under 15 s) in assets-source/ads/video/:
  clc-ad-16x9.mp4  1920x1080  (YouTube / in-stream)
  clc-ad-9x16.mp4  1080x1920  (Shorts / vertical)
  clc-ad-1x1.mp4   1080x1080  (square feeds)
Slow Ken Burns on six photos, three captions in the site's fonts and colours
(Fraunces + Inter, navy #050b1a, gold #ffcf4d), then a navy end card with the logo,
phone number and website.

Run from the repo root (ffmpeg comes from the imageio-ffmpeg pip package):
  pip install --user imageio-ffmpeg          # once
  python scripts/ads-video.py                # all three formats
  python scripts/ads-video.py --photos 57,34,60,46,14,53 --formats 16x9
  python scripts/ads-video.py --preview      # 1 fps draft, fast, for checking framing

Photo numbers refer to assets-source/ads/contact-sheet-index.txt (photos-incoming/).
Change PHOTOS / CAPTIONS below to re-cut the ad with different pictures or words.
"""

import argparse
import os
import subprocess
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'assets-source', 'ads', 'contact-sheet-index.txt')
OUT_DIR = os.path.join(ROOT, 'assets-source', 'ads', 'video')
FONT_DIR = os.path.join(ROOT, 'public', 'fonts')
LOGO_LANDSCAPE = os.path.join(ROOT, 'assets-source', 'ads', 'logo-landscape-1200x300.png')
LOGO_SQUARE = os.path.join(ROOT, 'assets-source', 'ads', 'logo-square-1200.png')

NAVY = (5, 11, 26)       # night-950
GOLD = (255, 207, 77)    # glow-400
WHITE = (245, 247, 250)

FPS = 30
CLIP = 2.3        # seconds each photo is on screen (including the crossfades)
FADE = 0.5        # crossfade length
END_HOLD = 3.2    # end card, after its fade-in
PHONE = '281-819-0163'
SITE = 'christmas-light-creations.com'

# Photo number -> focus point (x, y as fractions of the picture) the crop stays centred on.
# Keep y low enough that the roofline / tree tops stay in frame in the tall crops.
# (number, fx, fy, zoom-in or zoom-out)
PHOTOS = [
    (57, 0.50, 0.42, 'in'),
    (34, 0.55, 0.45, 'out'),
    (60, 0.50, 0.46, 'in'),
    (46, 0.50, 0.45, 'out'),
    (14, 0.50, 0.45, 'in'),
    (53, 0.58, 0.45, 'out'),
]

# One caption per pair of photos: (headline in Fraunces gold, sub-line in Inter white).
CAPTIONS = [
    ('Christmas light installation', 'Homes and businesses around south Houston'),
    ('Free 30-minute estimate', 'No ladder needed. Design your lights online first.'),
    ('Installs done by October 31 get 10% off', 'Installed, serviced all season, taken down in January'),
]

FORMATS = {
    '16x9': dict(size=(1920, 1080), band=0, head=84, sub=40, margin=96, logo='landscape'),
    '1x1': dict(size=(1080, 1080), band=0, head=58, sub=34, margin=72, logo='square'),
    # Vertical: the photo sits in a 4:5 window with navy bands above (small logo) and below (captions),
    # so a landscape photo keeps its whole roofline instead of being sliced to a 9:16 strip.
    '9x16': dict(size=(1080, 1920), band=285, head=62, sub=36, margin=72, logo='square'),
}


def log(*a):
    print(*a, flush=True)


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
    except ImportError:
        sys.exit('imageio-ffmpeg is missing: pip install --user imageio-ffmpeg')
    return imageio_ffmpeg.get_ffmpeg_exe()


def load_index():
    idx = {}
    for line in open(INDEX, encoding='utf-8'):
        n, _, path = line.rstrip('\n').partition('\t')
        if n.strip().isdigit():
            idx[int(n)] = os.path.join(ROOT, path.replace('\\', '/'))
    return idx


def ensure_ttf(name, build_dir):
    """Pillow can't read woff2; convert the site's font once with fontTools."""
    ttf = os.path.join(build_dir, name + '.ttf')
    if not os.path.exists(ttf):
        from fontTools.ttLib import TTFont
        f = TTFont(os.path.join(FONT_DIR, name + '.woff2'))
        f.flavor = None
        f.save(ttf)
    return ttf


def font_display(ttf, size):
    f = ImageFont.truetype(ttf, size)
    f.set_variation_by_axes([144, 600])   # Fraunces: optical size 144, weight 600
    return f


def font_body(ttf, size, weight=500):
    f = ImageFont.truetype(ttf, size)
    f.set_variation_by_axes([weight])
    return f


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=font) <= max_w or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def ease(t):
    return t * t * (3 - 2 * t)


class Photo:
    """A source picture pre-scaled so the widest crop is a little bigger than the output."""

    def __init__(self, path, fx, fy, direction, win):
        W, H = win
        im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
        w, h = im.size
        # widest crop with the window's aspect
        if w / h > W / H:
            ch = h
            cw = h * W / H
        else:
            cw = w
            ch = w * H / W
        scale = (W / 0.88) / cw          # zoomed-in frames (crop 0.88) still map ~1:1
        if scale < 1:
            im = im.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)
        else:
            scale = 1.0
        self.im = im
        self.w, self.h = im.size
        self.cw, self.ch = cw * scale, ch * scale
        self.fx, self.fy = fx, fy
        self.win = win
        self.z0, self.z1 = (1.0, 0.88) if direction == 'in' else (0.88, 1.0)
        self.drift = 0.03 if direction == 'in' else -0.03

    def frame(self, t):
        """t in 0..1 over the clip."""
        k = ease(t)
        z = self.z0 + (self.z1 - self.z0) * k
        cw, ch = self.cw * z, self.ch * z
        cx = self.fx * self.w + self.drift * k * self.w * 0.5
        cy = self.fy * self.h
        x0 = min(max(cx - cw / 2, 0), self.w - cw)
        y0 = min(max(cy - ch / 2, 0), self.h - ch)
        W, H = self.win
        return self.im.transform(self.win, Image.Transform.AFFINE,
                                 (cw / W, 0, x0, 0, ch / H, y0),
                                 resample=Image.Resampling.BILINEAR)


def gradient_layer(W, H, top, bottom, strength=0.82):
    """RGBA navy fade from `top` (transparent) to `bottom` (strength), for caption legibility."""
    alpha = np.zeros((H, W), dtype=np.float32)
    ys = np.arange(top, bottom)
    alpha[top:bottom, :] = ((ys - top) / max(bottom - top, 1))[:, None] ** 1.3 * strength
    alpha[bottom:, :] = strength
    layer = np.zeros((H, W, 4), dtype=np.uint8)
    layer[..., :3] = NAVY
    layer[..., 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(layer, 'RGBA')


def caption_layer(fmt, head, sub, fonts):
    W, H = fmt['size']
    band = fmt['band']
    margin = fmt['margin']
    fh = font_display(fonts['fraunces'], fmt['head'])
    fs = font_body(fonts['inter'], fmt['sub'])
    if band:
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    else:
        layer = gradient_layer(W, H, int(H * 0.45), H)
    d = ImageDraw.Draw(layer)
    max_w = W - 2 * margin
    head_lines = wrap(d, head, fh, max_w)
    sub_lines = wrap(d, sub, fs, max_w)
    lh_h = int(fmt['head'] * 1.12)
    lh_s = int(fmt['sub'] * 1.4)
    block = len(head_lines) * lh_h + 10 + len(sub_lines) * lh_s
    if band:
        # centred in the bottom band
        y = H - band + (band - block) // 2
        align = 'center'
    else:
        y = H - margin - block
        align = 'left'
    for line in head_lines:
        x = (W - d.textlength(line, font=fh)) / 2 if align == 'center' else margin
        d.text((x, y), line, font=fh, fill=GOLD)
        y += lh_h
    y += 10
    for line in sub_lines:
        x = (W - d.textlength(line, font=fs)) / 2 if align == 'center' else margin
        d.text((x, y), line, font=fs, fill=WHITE)
        y += lh_s
    return layer


def end_card(fmt, fonts):
    W, H = fmt['size']
    card = Image.new('RGB', (W, H), NAVY)
    d = ImageDraw.Draw(card)
    if fmt['logo'] == 'landscape':
        logo = Image.open(LOGO_LANDSCAPE).convert('RGB')
        lw = int(W * 0.68)
        logo = logo.resize((lw, int(lw * logo.height / logo.width)), Image.Resampling.LANCZOS)
        phone_size, site_size, gap = int(H * 0.12), int(H * 0.05), int(H * 0.05)
    else:
        logo = Image.open(LOGO_SQUARE).convert('RGB')
        lw = int(min(W, H) * 0.62)
        logo = logo.resize((lw, lw), Image.Resampling.LANCZOS)
        phone_size, site_size, gap = int(W * 0.10), int(W * 0.045), int(W * 0.04)
    fp = font_display(fonts['fraunces'], phone_size)
    fs = font_body(fonts['inter'], site_size, 500)
    fo = font_body(fonts['inter'], int(site_size * 0.9), 400)
    offer = 'Free 30-minute estimate'
    block = logo.height + gap + phone_size + int(site_size * 1.6) + int(site_size * 1.5)
    y = (H - block) // 2
    card.paste(logo, ((W - logo.width) // 2, y))
    y += logo.height + gap
    d.text(((W - d.textlength(PHONE, font=fp)) / 2, y), PHONE, font=fp, fill=GOLD)
    y += int(phone_size * 1.25)
    d.text(((W - d.textlength(SITE, font=fs)) / 2, y), SITE, font=fs, fill=WHITE)
    y += int(site_size * 1.6)
    d.text(((W - d.textlength(offer, font=fo)) / 2, y), offer, font=fo, fill=(190, 198, 214))
    return card


def top_band_logo(fmt):
    """Small landscape logo for the top band of the vertical format."""
    W, H = fmt['size']
    band = fmt['band']
    logo = Image.open(LOGO_LANDSCAPE).convert('RGB')
    lw = int(W * 0.62)
    logo = logo.resize((lw, int(lw * logo.height / logo.width)), Image.Resampling.LANCZOS)
    layer = Image.new('RGB', (W, H), NAVY)
    layer.paste(logo, ((W - lw) // 2, (band - logo.height) // 2))
    return layer


def blend(a, b, t):
    return (a.astype(np.float32) * (1 - t) + b.astype(np.float32) * t)


def composite(frame_f32, layer_rgba, k):
    """Alpha-composite an RGBA layer (scaled by k) over a float32 frame."""
    if k <= 0:
        return frame_f32
    rgb = layer_rgba[..., :3].astype(np.float32)
    a = layer_rgba[..., 3:4].astype(np.float32) / 255 * k
    return frame_f32 * (1 - a) + rgb * a


def render(name, fmt, photos, fonts, out_path, preview=False):
    W, H = fmt['size']
    band = fmt['band']
    fps = 1 if preview else FPS
    starts = [i * (CLIP - FADE) for i in range(len(photos))]
    last_end = starts[-1] + CLIP
    end_fade_start = last_end - FADE
    total = end_fade_start + FADE + END_HOLD
    n_frames = int(round(total * fps))
    log(f'{name}: {W}x{H}, {len(photos)} photos, {total:.1f} s, {n_frames} frames')

    win = (W, H - 2 * band) if band else (W, H)
    sources = [Photo(path, fx, fy, d, win) for (path, fx, fy, d) in photos]
    captions = [np.asarray(caption_layer(fmt, h, s, fonts)) for (h, s) in CAPTIONS]
    card = np.asarray(end_card(fmt, fonts)).astype(np.float32)
    bands = np.asarray(top_band_logo(fmt)) if band else None

    cmd = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
           '-movflags', '+faststart', '-an', out_path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    for f in range(n_frames):
        t = f / fps
        # which photo(s) are on screen
        frame = None
        for i, s in enumerate(starts):
            if s <= t < s + CLIP:
                local = (t - s) / CLIP
                img = np.asarray(sources[i].frame(local))
                if frame is None:
                    frame = img.astype(np.float32)
                else:
                    frame = blend(frame, img, (t - s) / FADE)   # crossfade into the next photo
        if frame is None:
            frame = np.zeros((win[1], win[0], 3), dtype=np.float32)
        if band:
            full = bands.astype(np.float32).copy()
            full[band:band + win[1], :, :] = frame
            frame = full
        # captions: one per pair of photos, fading in/out
        for c, layer in enumerate(captions):
            i = 2 * c
            if i >= len(photos):
                break
            c_start = starts[i] + 0.35
            c_end = starts[i + 2] - 0.1 if i + 2 < len(photos) else end_fade_start - 0.1
            if c_start <= t <= c_end:
                k = min(1.0, (t - c_start) / 0.45, (c_end - t) / 0.45)
                frame = composite(frame, layer, ease(max(0.0, k)))
        # end card
        if t >= end_fade_start:
            k = min(1.0, (t - end_fade_start) / FADE)
            frame = blend(frame, card, ease(k))
        proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
        if f % 60 == 0:
            log(f'  frame {f}/{n_frames}  ({time.time() - t0:.0f}s)')
    proc.stdin.close()
    proc.wait()
    if proc.returncode:
        sys.exit(f'ffmpeg failed for {name}')
    log(f'  wrote {out_path} ({os.path.getsize(out_path) / 1e6:.1f} MB, {time.time() - t0:.0f}s)')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--photos', help='comma-separated photo numbers from the contact-sheet index (default: the six in the script)')
    ap.add_argument('--formats', default='16x9,9x16,1x1')
    ap.add_argument('--out', default=OUT_DIR)
    ap.add_argument('--preview', action='store_true', help='1 fps draft for checking framing')
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    build = os.path.join(args.out, 'build')
    os.makedirs(build, exist_ok=True)
    fonts = {'fraunces': ensure_ttf('fraunces-latin', build), 'inter': ensure_ttf('inter-latin', build)}
    idx = load_index()
    picks = PHOTOS
    if args.photos:
        nums = [int(n) for n in args.photos.split(',')]
        known = {n: (fx, fy, d) for (n, fx, fy, d) in PHOTOS}
        picks = [(n, *known.get(n, (0.5, 0.45, 'in' if i % 2 == 0 else 'out'))) for i, n in enumerate(nums)]
    photos = [(idx[n], fx, fy, d) for (n, fx, fy, d) in picks]
    for n, *_ in picks:
        if n not in idx:
            sys.exit(f'photo {n} is not in {INDEX}')
    for name in args.formats.split(','):
        fmt = FORMATS[name]
        suffix = '-preview' if args.preview else ''
        render(name, fmt, photos, fonts, os.path.join(args.out, f'clc-ad-{name}{suffix}.mp4'), args.preview)


if __name__ == '__main__':
    main()
