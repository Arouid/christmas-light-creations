// The back prints that get the phone footer (scripts/shirt-add-phone.mjs) and are listed as their -phone versions in
// print-ready (scripts/shirt-print-ready.mjs): [file without extension (from assets-source/shirts/), footer ink, the art
// has no name of its own]. Chest and sleeve pieces are left out.
const WHITE = '#FFFFFF', CREAM = '#F7F1E3', LIT_CREAM = '#F5E2C1', GOLD = '#FFCF4D', NAVY = '#1F304B'
export const BACKS = [
  // navy shirts
  ['designs/badge-on-navy', WHITE], ['designs/bulbs-on-navy', WHITE], ['designs/scene-on-navy', WHITE], ['designs/sign-on-navy', WHITE],
  ['designs/sunburst-on-navy', WHITE], ['designs/varsity-on-navy', WHITE],
  ['recraft/collegiate-font-on-navy', GOLD], ['recraft/holiday-lights-badge-on-navy', WHITE, true], ['recraft/install-crew-fixed-on-navy', WHITE],
  ['recraft/lit-2011-on-navy', LIT_CREAM], ['recraft/mascot-line-on-navy', WHITE, true], ['recraft/mascot-gold-on-navy', GOLD, true],
  ['recraft/mascot-medal-on-navy', WHITE], ['recraft/magnet-badge-back-on-navy', WHITE], ['recraft/magnet-panel-back-on-navy', WHITE],
  ['recraft/magnet-lights-back-on-navy', WHITE],
  ['recraft/new-lit-house-on-navy', CREAM], ['recraft/new-wreath-2011-on-navy', CREAM], ['recraft/new-services-on-navy', CREAM], ['recraft/new-minimal-on-navy', CREAM],
  // gold or mustard shirts
  ['designs/badge-on-gold', NAVY], ['designs/bulbs-on-gold', NAVY], ['designs/sunburst-on-gold', NAVY], ['designs/varsity-on-gold', NAVY],
  ['recraft/collegiate-font-on-gold', NAVY], ['recraft/install-crew-fixed-on-gold', NAVY], ['recraft/retro-clc-on-gold', NAVY],
  ['recraft/mascot-gold-on-gold', NAVY, true], ['recraft/mascot-line-on-light', NAVY, true],
  ['recraft/magnet-badge-back-on-gold', NAVY], ['recraft/magnet-panel-back-on-gold', NAVY], ['recraft/magnet-lights-back-on-gold', NAVY],
  ['recraft/new-lit-house-on-gold', NAVY], ['recraft/new-wreath-2011-on-gold', NAVY], ['recraft/new-services-on-gold', NAVY], ['recraft/new-minimal-on-gold', NAVY],
  ['recraft/new-mustard-name-on-gold', NAVY], ['recraft/big-cottage-mustard-limited-dtg', NAVY, true], ['recraft/big-cottage-mustard-dtf', NAVY, true],
  // cream, white or light shirts
  ['recraft/2011-ornament', NAVY, true], ['recraft/lit-2011-on-white', NAVY], ['recraft/mascot-medal-on-white', NAVY],
  ['recraft/retro-clc-color', NAVY], ['recraft/retro-clc-5-color', NAVY],
]

