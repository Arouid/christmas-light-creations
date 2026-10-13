// The little markup content.js strings may carry: **bold** and [links](url).
// Drawn by components/Rich.jsx; flattened here for places that want plain
// text (structured data, emails).
export const LINK = /\[([^\]]+)\]\(([^)]+)\)/g

export const plainText = (text) => String(text).replace(/\*\*/g, '').replace(LINK, '$1')

// Plain text that keeps each link's address in brackets, for places with no
// hyperlinks (the sales assistant's knowledge): "[the guide](/cost/)" becomes
// "the guide (https://…/cost/)" when the link is a path on this site.
export const textWithLinks = (text, site = '') =>
  String(text).replace(/\*\*/g, '').replace(LINK, (m, label, href) => `${label} (${href.startsWith('/') ? site + href : href})`)
