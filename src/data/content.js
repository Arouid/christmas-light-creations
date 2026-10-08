// All site copy lives here so text can be edited without touching layout code.

export const currentYear = new Date().getFullYear()

export const business = {
  name: 'Christmas Light Creations',
  short: 'CLC',
  phone: '281-819-0163',
  phoneHref: 'tel:+12818190163',
  smsHref: 'sms:+12818190163',
  city: 'Pearland, TX',
  since: 2011,
  homesServed: '250+',
  // Google review link for the main Business Profile (listing without a store code).
  reviewLink: 'https://g.page/r/CWKRhzePqUvIEAI/review',
  logo: `${import.meta.env.BASE_URL}images/clc-logo.png`,
}

export const nav = [
  { label: 'Services', href: '#services' },
  { label: 'How it works', href: '#how' },
  { label: 'Photos', href: '#gallery' },
  { label: 'FAQ', href: '#faq' },
]

// Must match the service areas on the Google Business Profile (max 20 there).
export const serviceAreaGroups = [
  { region: 'Pearland side', towns: ['Pearland', 'Friendswood', 'Brookside Village', 'League City', 'Webster'] },
  { region: 'Bay side', towns: ['Pasadena', 'Deer Park', 'La Porte', 'Seabrook', 'El Lago', 'Kemah'] },
  { region: 'Galveston County & south', towns: ['Alvin', 'Manvel', 'Santa Fe', 'Texas City', 'Bacliff', 'San Leon'] },
]

export const serviceAreas = serviceAreaGroups.flatMap((g) => g.towns)

export const highlights = [
  {
    title: 'We handle it all',
    body: 'Materials, design, installation, service calls and removal. You never lift a finger.',
    icon: 'sparkle',
  },
  {
    title: 'Professional-grade lights',
    body: 'No store-bought strands. Commercial bulbs that shine brighter and last longer.',
    icon: 'bulb',
  },
  {
    title: 'Free service calls',
    body: 'Burned-out bulb or tripped GFCI? We come back at no cost, usually the same day.',
    icon: 'wrench',
  },
  {
    title: 'Family-owned & insured',
    body: `Serving south Houston since ${business.since}, fully insured, safety first.`,
    icon: 'shield',
  },
]

export const included = [
  'All labor, material and service calls',
  'Clips, cords, timers, plugs, lights and wire',
  'Everything measured and custom-fit to your home',
  'No extra bulbs dangling off the roof or balled up in the gutter',
  '100% guarantee through the season',
]

export const serviceCalls = ['Burned-out bulbs', 'Malfunctioning timers', 'Tripped GFCI outlets', 'Unglued bulbs']

export const steps = [
  {
    title: 'Free estimate',
    body: 'We measure your roofline with a measuring wheel, about 30 minutes, no roof climbing. You don’t have to be home unless we need to get through a gate. Short on time? Send phone photos for a rough quote.',
  },
  {
    title: 'Installation',
    body: 'Installs start October 15th and usually take about 2 hours. Book early: we discount installs done before the end of October.',
  },
  {
    title: 'All-season service',
    body: 'Anything goes out, we fix or replace it free, typically same day locally (48 hours max during peak weeks).',
  },
  {
    title: 'Removal & storage',
    body: 'From January 3rd (done by the 13th) we take everything down, label, wrap and bin it for you to keep. We call in late summer to schedule next year.',
  },
]

export const pricingNotes = [
  { label: 'Removal', value: '≤ 15%', note: 'of the install price, included in your estimate' },
  { label: 'Re-install', value: '50%', note: 'of the original price every year after' },
  { label: 'Service calls', value: '$0', note: 'no limit, all season long' },
]

export const testimonials = [
  {
    quote: 'We have been using CLC since 2012 and have had outstanding service. Change and his crew are professional, prompt, and easy to work with.',
    name: 'L. McCloud',
  },
  {
    quote: 'I’ve used Christmas Light Creations for several years and have been very pleased. They respond quickly to calls regarding light outages.',
    name: 'J. Laban',
  },
  {
    quote: 'We have been using Christmas Light Creations for years. They do a great job installing the lights and are always there if you have any issues.',
    name: 'P. Stanford',
  },
]

const photo = (file) => `${import.meta.env.BASE_URL}images/gallery/${file}`
export const gallery = [
  { src: photo('Classic-League-City.jpg'), alt: 'Classic white roofline lights in League City' },
  { src: photo('Colored-RW-Pearland.jpg'), alt: 'Red and white lights on a Pearland home' },
  { src: photo('Classic-Highland-Glen.jpg'), alt: 'Classic lights in Highland Glen' },
  { src: photo('Colored-LED-MULTI-Pearland.jpg'), alt: 'Multicolor LED lights in Pearland' },
  { src: photo('Classic-Silverlake.jpg'), alt: 'Classic lights in Silverlake' },
  { src: photo('Classic-West-Ranch.jpg'), alt: 'Classic lights in West Ranch' },
  { src: photo('Colored-LED-MULTI-Highland-Glen.jpg'), alt: 'Multicolor LED lights in Highland Glen' },
  { src: photo('Classic-2-Ivy-Front.jpg'), alt: 'Classic white lights, front view' },
  { src: photo('Classic-Highland-Glen-6.jpg'), alt: 'Classic roofline lights in Highland Glen' },
  { src: photo('Classic-Highland-Glen-3.jpg'), alt: 'Classic lights on a two-story home' },
  { src: photo('Classic-Highland-Glen-4.jpg'), alt: 'Classic lights with lit trees' },
  { src: photo('Classic-Highland-Glen-5.jpg'), alt: 'Classic white lights at dusk' },
  { src: photo('new2.jpg'), alt: 'Holiday lighting installation' },
  { src: photo('new3.jpg'), alt: 'Holiday lighting installation' },
  { src: photo('new4.jpg'), alt: 'Holiday lighting installation' },
  { src: photo('new-1.jpg'), alt: 'Holiday lighting installation' },
  { src: photo('Classic-Wally.jpg'), alt: 'Classic white lights' },
  { src: photo('lights.jpg'), alt: 'Lit roofline at night' },
  { src: photo('20161128_183305-1.jpg'), alt: 'Lit home at night' },
  { src: photo('20161128_183208.jpg'), alt: 'Lit home at night' },
  { src: photo('20141204_200327-2.jpg'), alt: 'Lit home at night' },
]

export const faq = [
  {
    group: 'General',
    items: [
      ['What do you do?', 'We install and remove Christmas lighting for homes and businesses, from Pearland and Manvel (past 288) down to Kemah, Alvin, Texas City, Santa Fe and everywhere in between.'],
      ['When can you install my lights?', 'Our season starts October 15th and gets busier until the holidays. Installing early earns a discount based on how early, typically good through the end of October.'],
      ['Do you install on tiled roofs?', 'No. Clay and other tile roofs are too fragile for us to work on safely.'],
    ],
  },
  {
    group: 'Pricing',
    items: [
      ['So how much does it cost?', 'Every home is different, so we won’t quote a number we can’t stand behind. We measure (you don’t need to be home unless we need the backyard) and send the estimate by phone or email.'],
      ['How do you determine the cost?', 'We measure ground runs and straight roof lines with a measuring wheel, count shingles up each gable (about every other tab is 1 ft), and add a foot at each corner for overhang. Those totals set the price.'],
      ['Is LED more expensive than incandescent?', 'Generally, yes. LED bulbs can cost up to 6× as much as traditional incandescent.'],
    ],
  },
  {
    group: 'Service',
    items: [
      ['Do service calls cost anything?', 'No, and there’s no limit.'],
      ['What counts as a service call?', 'Anything to do with our lights or material: burned-out bulbs, bad or reset timers, tripped GFCIs, unglued bulbs, and anything else that comes up.'],
      ['What if you can’t fix it?', 'We replace it, no questions asked and no extra charge. Typically same day in our immediate area; we reserve a 48-hour window during the busiest weeks.'],
    ],
  },
  {
    group: 'Removal',
    items: [
      ['Do you take the lights down?', 'Absolutely. Removal starts January 3rd and wraps up by January 13th.'],
      ['Is there a cost for removal?', 'On most installs, yes: no more than 15% of the install price, built into your estimate and due at removal. We label, wrap and bin your lights for you to keep, and every year after, re-installing is 50% of the original price.'],
      ['How do you take them down?', 'Fast, safe and careful. Rocks, trees and concrete can occasionally break an incandescent bulb; LEDs are sealed in plastic and don’t break.'],
    ],
  },
]
