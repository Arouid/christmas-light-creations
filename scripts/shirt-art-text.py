"""Glyph outlines for scripts/shirt-art.mjs: turns a line of text into SVG path data
with the site's own font files (public/fonts/*.woff2 are variable fonts), so the
shirt artwork needs no installed fonts, like the lettering in the logo SVGs.

usage: python scripts/shirt-art-text.py <font.woff2> <wght> <text>
prints JSON: {"upem", "capHeight", "glyphs": [{"char", "advance", "d"}]}
(font units, y up; the caller scales and flips)."""
import json
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

font_path, wght, text = sys.argv[1], float(sys.argv[2]), sys.argv[3]
font = TTFont(font_path)
glyph_set = font.getGlyphSet(location={'wght': wght})
cmap = font.getBestCmap()
out = {'upem': font['head'].unitsPerEm, 'capHeight': font['OS/2'].sCapHeight, 'glyphs': []}
for ch in text:
    name = cmap.get(ord(ch))
    if name is None:
        raise SystemExit(f'no glyph for {ch!r} in {font_path}')
    glyph = glyph_set[name]
    pen = SVGPathPen(glyph_set)
    glyph.draw(pen)
    out['glyphs'].append({'char': ch, 'advance': glyph.width, 'd': pen.getCommands()})
json.dump(out, sys.stdout)
