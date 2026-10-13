// Things every customer must be told plainly, not only in the contract
// (owner 2026-10-12). Shared by the server's emails (functions/index.js), the
// email templates, the account page and the proposal page. Pure.
//
// Trees (owner): "we are not responsible if trees pull the lights off their
// home. It's their responsibility to trim them if they think it will happen
// or know that it's happened in the past." A tree call-out takes so long
// that another customer can end up rescheduled, so a re-hang is a paid
// service call that waits behind booked installs.
export const TREE_TITLE = 'Trees and your lights'
export const TREE_NOTICE = 'Branches that touch or hang over your roofline, gutters or walls pull lights down in wind. Please trim them back before we install and keep them trimmed through the season, especially if it has happened before. Lights a tree pulls down are not covered by our free service calls: re-hanging them is a paid service call, scheduled after our booked installs, so it can take a few days in the busy weeks.'
// The one-line version for reminder texts and bullet lists.
export const TREE_SHORT = 'Branches touching the roofline? Please trim them back: lights a tree pulls down are not covered, and the re-hang is a paid visit.'

// Storm tips (weather heads-ups, docs/specs/auto-emails.md): what usually
// goes wrong, and the one thing that fixes most of it.
export const GFCI_TIP = 'Heavy rain can trip the outdoor outlet your lights plug into (the GFCI, the one with the two little buttons). If your lights are out after the rain, press its RESET button once it is dry. If they stay out, text or call us and we will come fix it at no charge.'
export const WIND_TIP = `Strong wind can pull a strand loose. ${TREE_SHORT} If a strand is down and no tree was involved, text us a photo and we will re-hang it at no charge.`
export const FREEZE_TIP = 'A freeze is fine for the lights and the timer keeps running. If the lights are out after it, press RESET on the outdoor outlet once it has thawed, then text us if they stay out.'
