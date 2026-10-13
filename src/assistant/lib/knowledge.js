// What the sales assistant may say about the business: the public site copy
// (src/data/content.js) plus the tone of our stock emails. Pure; shared by
// scripts/build-assistant-knowledge.mjs (which writes functions/assistant/knowledge.json
// for the server) and the test that keeps that file current.
// Spec: docs/specs/sales-assistant.md.
import { business, faq, highlights, included, pricingNotes, serviceAreaGroups, serviceCalls, steps, urgency } from '../../data/content.js'
import { STOCK_TEMPLATES } from '../../lib/emailTemplates.js'
import { textWithLinks } from '../../lib/rich.js'

const SITE = 'https://christmas-light-creations.com'

// Templates whose wording shows how we talk (greeting, length, sign-off).
const TONE_SAMPLES = ['got-message', 'estimate-thanks', 'got-it-schedule', 'service-timer']

export function salesKnowledge() {
  return {
    business: { name: business.name, phone: business.phone, email: 'info@christmas-light-creations.com', website: 'https://christmas-light-creations.com', city: business.city, since: business.since, homesServed: business.homesServed, reviewLink: business.reviewLink },
    serviceAreas: serviceAreaGroups.map((g) => ({ region: g.region, towns: [...g.towns] })),
    highlights: highlights.map((h) => `${h.title}: ${h.body}`),
    included: [...included],
    serviceCalls: [...serviceCalls],
    steps: steps.map((s) => `${s.title}: ${s.body}`),
    pricingNotes: pricingNotes.map((p) => `${p.label}: ${p.value} (${p.note})`),
    dates: { installStart: urgency.installStart, discountEnd: urgency.discountEnd, bookingClose: urgency.bookingClose },
    // Answers may carry [links](/path/) (Rich.jsx); the assistant gets words plus the full address.
    faq: faq.flatMap((g) => g.items.map(([q, a]) => ({ group: g.group, q, a: textWithLinks(a, SITE) }))),
    toneSamples: STOCK_TEMPLATES.filter((t) => TONE_SAMPLES.includes(t.id)).map((t) => ({ when: t.when, subject: t.subject, body: t.body })),
  }
}
