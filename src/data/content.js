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
  // Text with a message already typed ("?&body=" works on both iPhone and Android).
  smsWith: (body) => `sms:+12818190163?&body=${encodeURIComponent(body)}`,
  signText: 'Hi! I saw your sign. I’d like a free Christmas light estimate for my home at: ',
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
  // Owner's own words (shortened and reordered with him, 2026-10-09). One string per paragraph.
  words: [
    'Brother, partner, best friend.',
    'We’ve worked side by side since we were kids, and we never stopped. For years you were right there next to me: every home, every scorching October, every freezing January, building this business together.',
    'You were my part of home. I just wish this wasn’t our last job together.',
  ],
}

// Estimate form: "How did you hear about us?" (shown on each lead to staff).
export const HEARD_FROM = ['Road sign', 'Google search', 'Google Maps / Business listing', 'Google ad', 'Facebook', 'Nextdoor', 'Saw your lights / yard sign', 'Friend or neighbor', 'Returning customer', 'Other']

export const nav = [
  { label: 'Services', href: '#services' },
  { label: 'How it works', href: '#how' },
  { label: 'Photos', href: '#gallery' },
  { label: 'FAQ', href: '#faq' },
]

// Footer: customers' own account (agreements, payments) and the privacy policy.
export const footerLinks = [
  { label: 'Customer login', href: `${base}account/` },
  { label: 'Privacy', href: `${base}privacy/` },
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
    title: 'Removal',
    body: 'From January 3rd (done by the 13th) we take everything down, label it and box it up for you to store until next season. We call in late summer to schedule next year.',
  },
]

export const pricingNotes = [
  { label: 'Removal', value: 'Set price', note: 'shown in your estimate, due in January' },
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

// FAQ, rewritten from scratch with the owner (2026-10-09). Keep answers short
// and true to how we work now; no prices, percentages or formulas that would
// tie our hands (owner: "I don't want to ball and chain myself").
export const faq = [
  {
    group: 'Getting started',
    items: [
      ['What do you do?', 'We design, install, maintain and take down Christmas lights for homes and businesses across Pearland, Manvel, Friendswood, League City, the Bay Area and Galveston County. You never touch a ladder.'],
      ['How do I get a price?', 'Request a free estimate. We measure your home in about 30 minutes without climbing on the roof, and you don’t need to be home unless we need to get through a gate. In a hurry? Text us a few photos for a rough price. We’ll text or email your estimate, and you can sign it online.'],
      ['How do you price it?', 'Every home is different. We look at how much you want lit, the size and shape of your home, and how tricky it is to reach, then give you one clear price. What’s in your estimate is what you pay.'],
      ['Do you work on tile roofs?', 'No. Clay and other tile roofs are too fragile to work on safely.'],
      ['Do you do businesses?', 'Yes: storefronts, restaurants, neighborhood entrances and more.'],
    ],
  },
  {
    group: 'Installing',
    items: [
      ['When can you install?', 'Installs start October 15th and fill up fast. Book early: installs done by the end of October get an early install discount.'],
      ['How long does it take? Do I need to be home?', 'About 2 hours for most homes. You don’t need to be home. Just make sure we can reach your outdoor outlets and get through any gate.'],
      ['What’s included?', 'Everything: lights, clips, cords, timers, design, installation and all-season service. It’s all measured and cut to fit your home, with no extra strands hanging off the roof.'],
      ['What kind of lights do you use?', 'Commercial-grade LED only: brighter, cheaper to run, and sealed in plastic so they don’t break.'],
    ],
  },
  {
    group: 'Paying',
    items: [
      ['How do I pay?', 'A deposit when you sign holds your install date. The rest is due once your lights are up, and removal is paid in January. Pay online by PayPal, Venmo or card from the link we send you, or by Zelle, check or cash.'],
      ['Can I see my account online?', 'Yes. Sign in at christmas-light-creations.com/account with the email we send your estimates to (no password). You’ll see your agreements, what’s due and what you’ve paid, and you can pay online.'],
    ],
  },
  {
    group: 'During the season',
    items: [
      ['What if something goes out?', 'Call or text and we’ll fix it free, with no limit: burned-out or unglued bulbs, timers, tripped outlets. Usually the same day locally, within 48 hours during the busiest weeks. If we can’t fix it, we replace it at no charge.'],
    ],
  },
  {
    group: 'Removal & next year',
    items: [
      ['When do you take them down?', 'Between January 3rd and 13th. We take everything down, label it and box it up, and you store the boxes until next season.'],
      ['Is there a cost for removal?', 'Yes, a set price shown in your estimate, due in January.'],
      ['Do I own the lights?', 'Yes. Once they’re paid for, they’re yours. Every year after, we put them back up for about half the original price. We call in late summer to get you on the schedule.'],
      ['Why did my price change?', 'If you add lights (an arch, a tree, more roofline), the new part is charged in full that year. After that it adds about half its price to your yearly re-install. Your online account shows the full breakdown.'],
    ],
  },
]

// Shown under forms when App Check (reCAPTCHA) is on; Google's badge is hidden
// in index.css, and their terms ask for this line instead.
export const recaptchaNote = {
  before: 'This site is protected by reCAPTCHA and the Google ',
  privacy: 'https://policies.google.com/privacy',
  terms: 'https://policies.google.com/terms',
  after: ' apply.',
}

// Privacy policy (/privacy/). Plain words; keep it true to what the site does.
// Owner to review (and the attorney along with the contract terms).
export const privacy = {
  updated: 'October 9, 2026',
  intro: 'We’re a family business. We only collect what we need to quote, install, service and bill your lights, and we never sell it. Here’s exactly what that means.',
  sections: [
    {
      title: 'What we collect',
      items: [
        '**When you ask for an estimate:** your name, email, phone, address, how you’d like us to contact you, your message, and how you heard about us.',
        '**When you’re a customer:** your contact and property details (like a gate code), what we installed, your season schedule, prices and what you’ve paid, and notes we need to do the job.',
        '**When you sign a proposal:** your typed name, your drawn signature, the date and time, the browser you signed on, and a fingerprint of the exact document you agreed to.',
        '**When we bill you:** the invoices we send you (what for, amounts, due date), which emails we sent about them, when you first opened the invoice or proposal link, and how and when you paid.',
        '**When you pay online:** the amount, date and PayPal reference, and the email PayPal gives us. Card and bank details go to PayPal, never to us.',
        '**When we text, call or email each other:** we keep that conversation history (including the emails we send you) with your customer record so anyone on our team can help you. If we don’t know you yet, your text or email waits in a list our team goes through (obvious junk mail isn’t kept). When you write to us or ask for an estimate, our team’s phones may show a short notification (your name and the first words) so you hear back sooner.',
        '**When you sign in to your account:** your email address and when you signed in. With “Sign in with Google”, Google tells us your name and email; we never see your Google password.',
      ],
    },
    {
      title: 'How we use it',
      items: [
        'To contact you about your estimate, schedule installs, service calls and takedowns, send proposals, invoices and receipts, and answer your questions.',
        'If an invoice is still unpaid, we email at most two reminders (7 and 14 days after it was due), then stop.',
        'To show you your agreements, invoices, yearly price and payments in your account.',
        'To keep our own business records (agreements and payments).',
        'We don’t use advertising or tracking cookies, we don’t run analytics on this site, and we don’t sell or rent your information to anyone.',
      ],
    },
    {
      title: 'Who else handles it',
      items: [
        '**Google** (Firebase, Google Workspace, Google Voice, Google Maps): stores our customer records, sends and receives our email and texts, and shows addresses on a map for our crew.',
        '**PayPal** (including Venmo and card payments): processes online payments under PayPal’s own privacy policy.',
        '**Google reCAPTCHA:** on our estimate form, proposal and account pages, it checks that requests come from a real visitor and not a spam robot. Google’s privacy policy and terms apply to it.',
        'Our pages load fonts from Google Fonts, and the home page asks our own server (on Google Cloud) for the line about how booked we are and the next open install dates (only dates, nothing about anyone). That’s all: no other outside services see your visit.',
      ],
    },
    {
      title: 'What your browser keeps',
      items: [
        'If you sign in to your account, your browser keeps you signed in until you sign out. If you ask for a sign-in link, we remember the email in your browser so the link works when you open it. If you came from one of our road signs, the page remembers which sign for that visit. Nothing else is stored.',
      ],
    },
    {
      title: 'How long we keep it',
      items: [
        'Estimate requests and customer records stay while you’re a customer and for a reasonable time after, so we can help you if you come back. Signed agreements and payment records are kept as business records.',
      ],
    },
    {
      title: 'Your choices',
      items: [
        'Ask us anytime what we have about you, to fix something, or to delete it. We’ll delete what we can; signed agreements and payment records we need to keep as business records.',
        'To stop texts or emails from us, just tell us (reply “stop”, or call).',
      ],
    },
    {
      title: 'Questions',
      items: ['Email info@christmas-light-creations.com or call 281-819-0163. If this policy changes, the date at the top changes too.'],
    },
  ],
}

// Booking urgency on the home page: real dates only, so it's always true.
// discountEnd must match staff Settings → Early-install discounts.
// {n} = days left, {season} = season year. Logic in src/lib/urgency.js.
export const urgency = {
  installStart: { month: 10, day: 15 },
  discountEnd: { month: 10, day: 31 },
  bookingClose: { month: 12, day: 15 }, // after this, we book for next season
  badge: {
    before: 'Booking now · Early install discount through Oct 31',
    countdown: 'Early install discount: {n} days left',
    lastDay: 'Early install discount ends today',
    season: 'Booking now for the {season} season',
    next: 'Booking for the {season} season',
  },
  line: {
    early: 'October dates fill first. Request yours today.',
    season: 'Dates fill fast this time of year. Request yours today.',
    next: 'Get on the list early for next season.',
  },
  // Staff's "how full we are" line (⚙ Settings) hides itself if not updated for this long.
  statusMaxDays: 14,
  // "Check availability": the next real open install days (functions/availability.js).
  availability: {
    button: 'Check availability',
    title: 'Next open install dates',
    pick: 'Request this date',
    note: 'Dates go fast in season. Pick one and we’ll confirm it when we send your estimate.',
    full: 'Our calendar is full for now. Call us and we’ll find you a day.',
    loading: 'Checking the calendar…',
    request: 'Preferred install date: {date}',
  },
}
