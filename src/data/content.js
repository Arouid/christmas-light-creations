// All site copy lives here so text can be edited without touching layout code.

export const currentYear = new Date().getFullYear()

// Vite sets BASE_URL ('/' or the github.io sub-path); plain Node (tests) has none.
const base = import.meta.env?.BASE_URL ?? '/'

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
  logo: `${base}images/clc-logo.png`,
}

// In memory of the owner's brother and business partner. The owner's own
// words; don't edit them. The section stays hidden until `name` is filled in.
export const memorial = {
  name: 'Bradley Medel',
  photo: { src: `${base}images/memorial-bradley.jpg`, alt: 'Bradley Medel smiling with family at an aquarium', width: 1400, height: 788 },
  words: 'My brother and my business partner. We worked side by side since we were kids who thought we were adults. Every job I’ve ever had, and for the last ten years, you’ve been right there next to me. Every home, every scorching October, and freezing January we were out there building this business. You were my part of home and I just wish this wasn’t the last job we’ll do together.',
}

// Estimate form: "How did you hear about us?" (shown on each lead to staff).
export const HEARD_FROM = ['Google search', 'Google Maps / Business listing', 'Google ad', 'Facebook', 'Nextdoor', 'Saw your lights / yard sign', 'Friend or neighbor', 'Returning customer', 'Other']

export const nav = [
  { label: 'Services', href: '#services' },
  { label: 'How it works', href: '#how' },
  { label: 'Photos', href: '#gallery' },
  { label: 'FAQ', href: '#faq' },
]

// Must match the service areas on the Google Business Profile (max 20 there).
export const serviceAreaGroups = [
  { region: 'Pearland side', towns: ['Pearland', 'Friendswood', 'Brookside Village', 'League City', 'Webster'] },
  { region: 'Bay side', towns: ['Clear Lake', 'Pasadena', 'Deer Park', 'La Porte', 'Seabrook', 'El Lago', 'Kemah'] },
  { region: 'Galveston County & south', towns: ['Alvin', 'Manvel', 'Dickinson', 'Santa Fe', 'Texas City', 'Bacliff', 'San Leon', 'Galveston'] },
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

const photo = (file) => `${base}images/gallery/${file}`
export const gallery = [
  { src: photo('warm-white-two-story-stone-home.jpg'), alt: 'Warm white lights tracing every gable, window and the garage of a two-story stone home' },
  { src: photo('iowa-colony-clear-led-gables.jpg'), alt: 'Clear LED lights outlining three gables on a brick home in Iowa Colony' },
  { src: photo('estate-wrapped-oaks-gazebo.jpg'), alt: 'Wrapped oak trees, a lit gazebo and pathway lights at an estate entrance' },
  { src: photo('two-story-wrapped-trees-arched-door.jpg'), alt: 'Two-story home with wrapped trees and a lit arched front door' },
  { src: photo('blue-wrapped-trees-nativity.jpg'), alt: 'Blue and multicolor wrapped trees with a lit nativity and roofline' },
  { src: photo('friendswood-warm-white-ivy-home.jpg'), alt: 'Warm white roofline and garden lights on an ivy-covered home in Friendswood' },
  { src: photo('white-stone-two-story-warm-white.jpg'), alt: 'Warm white lights on a two-story stone and brick home' },
  { src: photo('pearland-highland-glen-two-story.jpg'), alt: 'Warm white lights on a two-story home in Lakes of Highland Glen, Pearland' },
  { src: photo('warm-white-roofline-lit-trees.jpg'), alt: 'Warm white roofline with two wrapped trees and a lit walkway' },
  { src: photo('warm-white-roofline-garden-beds.jpg'), alt: 'Roofline, windows and garden beds outlined in warm white lights' },
  { src: photo('league-city-commercial-restaurant.jpg'), alt: 'Commercial holiday lighting on a restaurant in League City' },
  { src: photo('pearland-multicolor-led.jpg'), alt: 'Multicolor LED lights on a Pearland home' },
  { src: photo('pearland-highland-glen-dusk.jpg'), alt: 'Warm white lights at dusk on a brick home in Lakes of Highland Glen, Pearland' },
  { src: photo('warm-white-brick-home-two-car-garage.jpg'), alt: 'Warm white roofline and ground lights on a brick home with a two-car garage' },
  { src: photo('warm-white-garage-and-windows.jpg'), alt: 'Lights outlining the garage, windows and roofline of a two-story brick home' },
  { src: photo('warm-white-single-story-home.jpg'), alt: 'Warm white roofline on a single-story brick home' },
  { src: photo('league-city-roofline-and-yard.jpg'), alt: 'Roofline and yard-edge lights on a League City home' },
  { src: photo('pearland-highland-glen-garage.jpg'), alt: 'Roofline and garage lights in Lakes of Highland Glen, Pearland' },
  { src: photo('friendswood-west-ranch.jpg'), alt: 'Warm white roofline lights in West Ranch, Friendswood' },
  { src: photo('pearland-red-and-white.jpg'), alt: 'Red and white lights on a two-story Pearland home' },
  { src: photo('pearland-highland-glen-multicolor.jpg'), alt: 'Multicolor LED lights in Lakes of Highland Glen, Pearland' },
  { src: photo('community-entrance-sign.jpg'), alt: 'Holiday lighting on a neighborhood entrance sign' },
  { src: photo('commercial-building-red-lights.jpg'), alt: 'Red holiday lights along the roofline of a commercial building' },
  { src: photo('pearland-highland-glen-walkway.jpg'), alt: 'Roofline, wreath and walkway lights in Lakes of Highland Glen, Pearland' },
  { src: photo('blue-wrapped-oaks-estate.jpg'), alt: 'Live oaks wrapped in blue lights along an estate drive' },
  { src: photo('nativity-trees-roofline.jpg'), alt: 'Roofline, lit shrubs and a nativity scene on a brick home' },
  { src: photo('lit-driveway-and-roofline.jpg'), alt: 'Roofline and lit driveway edges on a single-story home' },
  { src: photo('twin-gables-under-full-moon.jpg'), alt: 'Twin gables outlined in warm white lights under a full moon' },
  { src: photo('gated-estate-gazebo-lights.jpg'), alt: 'Gated estate entry with a lit gazebo, walls and pathway' },
  { src: photo('wrapped-trees-arched-entry.jpg'), alt: 'Wrapped tree trunks, arched entry and walkway lights at dusk' },
  { src: photo('pink-and-white-roofline.jpg'), alt: 'Pink and white lights outlining the roofline, arches and garage of a brick home' },
  { src: photo('multicolor-windows-and-roofline-dusk.jpg'), alt: 'Multicolor lights framing every window and roofline of a two-story home at dusk' },
  { src: photo('green-led-two-story-home.jpg'), alt: 'Green LED lights outlining the gables, windows and garage of a two-story home' },
]

export const faq = [
  {
    group: 'General',
    items: [
      ['What do you do?', 'We install and remove Christmas lighting for homes and businesses, from Pearland and Manvel (past 288) down to Kemah, Alvin, Texas City, Santa Fe and everywhere in between.'],
      ['When can you install my lights?', 'Our season starts October 15th and gets busier until the holidays. Installing early earns a discount, good through the end of October.'],
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
