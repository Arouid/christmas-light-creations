// A gallery photo in two sizes (scripts/gallery-thumbs.mjs): the 1600 px web copy and its 800 px
// phone copy in images/gallery/800/. Grids offer both through srcset and let the browser pick by
// screen width; the lightbox keeps the big one. The one older photo is 1102 px wide, not 1600:
// the browser then just gets a little less than it asked for.
export const thumb = (src) => src.replace('/images/gallery/', '/images/gallery/800/')

export const gallerySrcSet = (src) => `${thumb(src)} 800w, ${src} 1600w`

// Grid widths: two columns on phones, three from md (768 px); the first photo spans two.
export const GRID_SIZES = '(min-width: 768px) 33vw, 50vw'
export const GRID_SIZES_WIDE = '(min-width: 768px) 66vw, 100vw'
