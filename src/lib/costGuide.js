// The cost guide's structured data and its one rule (docs/specs/cost-guide.md).
import { plainText } from './rich.js'

// FAQPage schema for the page's own questions; answers as plain text.
export const faqSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plainText(a) } })),
})

// JSON for an inline <script type="application/ld+json">: a "<" can't end the tag early.
export const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c')

// Every string in the guide that names a dollar amount ($1,200, $ 800, $950–$1,400).
// The owner hasn't published ranges: with `ranges.rows` empty there must be none.
export function dollarAmounts(value, found = []) {
  if (typeof value === 'string') { if (/\$\s?\d/.test(value)) found.push(value) }
  else if (Array.isArray(value)) value.forEach((v) => dollarAmounts(v, found))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => dollarAmounts(v, found))
  return found
}
