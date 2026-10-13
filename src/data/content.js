// All site copy lives here so text can be edited without touching layout code.
// (Years and dates on prerendered pages come from useToday in lib/prerendered.js.)

import { REVIEW_URL } from '../../functions/brand.js'

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
  // Google review link for the main Business Profile (listing without a store
  // code); one place for the site, the staff templates and the server (docs/specs/review-ask.md).
  reviewLink: REVIEW_URL,
  // The neon cottage from the 2012 site (assets-source/2012-backdrop); square, transparent.
  logo: `${base}images/clc-cottage.png`, // square cottage: documents, app icons, small spots
  logoWide: `${base}images/clc-logo-wide.png`, // cottage + name (owner's pick 2026-10-11): site header and footer
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
  { label: 'Design yours', href: `${base}design/` },
  { label: 'How it works', href: '#how' },
  { label: 'Photos', href: '#gallery' },
  { label: 'FAQ', href: '#faq' },
]

// Footer: the cost guide, customers' own account (agreements, payments), the
// privacy policy and the terms of use. Also the area pages' footer
// (scripts/build-areas.mjs) and the cost guide's own.
export const footerLinks = [
  { label: 'What it costs', href: `${base}cost/` },
  { label: 'Customer login', href: `${base}account/` },
  { label: 'Privacy', href: `${base}privacy/` },
  { label: 'Terms of use', href: `${base}terms/` },
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
    icon: 'house-lights',
  },
  {
    title: 'Professional-grade lights',
    body: 'No store-bought strands. Commercial bulbs that shine brighter and last longer. Worn out by the Texas sun? Replaced new, free, for as long as you’re a customer.',
    icon: 'c9-bulb',
  },
  {
    title: 'Free service calls',
    body: 'Burned-out bulb or tripped GFCI? We come back at no cost, usually the same day.',
    icon: 'wrench-bulb',
  },
  {
    title: 'Family-owned & insured',
    body: `Serving south Houston since ${business.since}, fully insured, safety first.`,
    icon: 'shield-heart',
  },
]

export const included = [
  'All labor, material and service calls',
  'Clips, cords, timers, plugs, lights and wire',
  'Everything measured and custom-fit to your home',
  'No extra bulbs dangling off the roof or balled up in the gutter',
  '100% guarantee through the season',
  'Lifetime warranty: anything we supplied that wears out is replaced brand new, free, for as long as you’re a customer',
]

export const serviceCalls = ['Burned-out bulbs', 'Malfunctioning timers', 'Tripped GFCI outlets', 'Unglued bulbs']

export const steps = [
  {
    title: 'Free estimate',
    icon: 'measuring-wheel',
    body: 'We measure your roofline with a measuring wheel, about 30 minutes, no roof climbing. You don’t have to be home unless we need to get through a gate. Short on time? Send phone photos for a rough quote.',
  },
  {
    title: 'Installation',
    icon: 'ladder',
    body: 'Installs start October 15th and usually take about 2 hours. Book early: we discount installs done before the end of October.',
  },
  {
    title: 'All-season service',
    icon: 'bulb-clock',
    body: 'Anything goes out, we fix or replace it free, typically same day locally (48 hours max during peak weeks).',
  },
  {
    title: 'Removal',
    icon: 'box-lights',
    body: 'From January 3rd (done by the 13th) we take everything down, label it and box it up for you to store until next season. We call in late summer to schedule next year.',
  },
]

export const pricingNotes = [
  { label: 'Removal', value: 'Set price', note: 'shown in your estimate, due in January' },
  { label: 'Re-install', value: '50%', note: 'of the original price every year after' },
  { label: 'Service calls', value: '$0', note: 'no limit, all season long' },
]

// Three ways to have lights (owner's copy OK 2026-10-12, docs/specs/leasing.md).
// Pay in 3 is a pilot this season; its contract terms stay off the site until the attorney's review.
export const lightOptions = [
  { title: 'Buy', body: 'Own your lights. We put them back up every year for 50% of the original price.' },
  { title: 'Lease', body: 'We keep the lights; pick a new look any year. 10% off for every year you come back, up to 50% off.' },
  { title: 'Pay in 3', tag: 'New this season', body: 'Split a new install, bought or leased, into three equal payments that cover everything: one when you sign, then one a month on the 1st or the 15th, your pick. No long-term commitment.' },
]

// Price promise (owner 2026-10-12): beat any professional holiday-lighting
// company's written quote by 10%; handymen and landscapers don't count.
// What customers get on top of the lights (owner 2026-10-12: "highlight all
// these features our customers get"). Shown under the options on the home page.
export const customerPerks = {
  title: 'Everything in one place: your account and app',
  intro: 'Every customer gets an account (no password) and a phone app, so you never have to wonder where things stand.',
  items: [
    ['🛡️', 'Lifetime warranty', 'Lights worn out by the Texas sun are replaced brand new, free, for as long as you’re a customer.'],
    ['🧾', 'Agreements and bills online', 'Sign online, see what’s paid and what’s due, and pay with PayPal, Venmo or a card in two taps.'],
    ['💳', 'Buy, lease or pay in 3', 'Pick the way that suits you, at the same price. Three equal payments, nothing extra.'],
    ['🎄', 'Your dates, your crew', 'Your install and takedown day on your account, a text the day before, and photos of the install.'],
    ['🛠', 'Report a problem in a tap', 'A bulb out? Tap Report a problem and the crew’s phones light up. Service calls are free all season.'],
    ['⛈', 'Weather heads-ups', 'Storm, wind or freeze coming? We email ahead with what to check and what we do if your date has to move.'],
    ['🏡', 'Tell us once', 'Gate code, pets, sprinklers, your HOA’s dates: save them on your account and every visit goes smoothly.'],
    ['📱', 'The app on your phone', 'Add it to your home screen: opens full-screen, no password, always up to date.'],
  ],
}

// The lifetime warranty, highlighted (owner 2026-10-12: "our customers deserve it").
export const lifetimeWarranty = {
  title: 'Lifetime warranty',
  body: 'From each install until your next one with us, season after season, anything we supplied that wears out is replaced brand new, free. When the Texas sun has finally destroyed the plastic housings, five or more years in, you get all-new lights. In 15 years we have never charged a cent for it.',
}

export const priceBeat = {
  title: 'We’ll beat any competitor’s price by 10%',
  body: 'Show us a legitimate written proposal from another professional Christmas-light company (their own estimate, with their name on it) for the same lights and service, and we’ll beat it by 10%. Handymen and landscapers don’t count.',
}

// Two things to shout about under the hero buttons (owner 2026-10-12: "the
// designer and Pay in 3 should be highlighted"). href 'design/' is the light
// designer (prefixed with the site base); '#…' scrolls on the page.
export const heroHighlights = [
  { icon: '🎨', title: 'Design your lights free', body: 'Draw them on a photo of your own house.', href: 'design/' },
  { icon: '💳', title: 'Pay in 3', tag: 'New', body: 'Three equal payments. No commitment.', href: '#options' },
  { icon: '🛡️', title: 'Lifetime warranty', body: 'Worn-out lights replaced new, free, while you’re a customer.', href: '#warranty' },
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
      ['How do I get a price?', 'Request a free estimate. We measure your home in about 30 minutes without climbing on the roof, and you don’t need to be home unless we need to get through a gate. In a hurry? Text us a few photos for a rough price. You get a “Got your request” email right away, then your exact price by text or email, and you sign online. Want to see it first? Draw your lights on a photo of your home with our free designer.'],
      ['How do you price it?', `Every home is different. We look at how much you want lit, the size and shape of your home, and how tricky it is to reach, then give you one clear price. What’s in your estimate is what you pay. Curious what moves the number? Read [what Christmas light installation costs in Pearland](${base}cost/).`],
      ['Do you work on tile roofs?', 'No. Clay and other tile roofs are too fragile to work on safely.'],
      ['Do you do businesses?', 'Yes: storefronts, restaurants, neighborhood entrances and more.'],
    ],
  },
  {
    group: 'Installing',
    items: [
      ['When can you install?', 'Installs start October 15th and fill up fast. Book early: installs done by the end of October get an early install discount.'],
      ['How long does it take? Do I need to be home?', 'About 2 hours for most homes. You don’t need to be home: your account shows your install day once it’s set, and we text the day before. Just make sure we can reach your outdoor outlets and get through any gate. Save your gate code, pets and anything to avoid in the yard on your account page and the crew sees it on the day.'],
      ['What if it rains on my install day?', 'Rain, lightning and strong wind keep our crew off the roof, so your date may move to the next clear day. When bad weather is coming we email you a heads-up the afternoon before, and we text you if the date moves. You keep your early-install discount.'],
      ['Is there a warranty on the lights?', 'Yes, for life, for as long as you stay a customer: when we install your lights, you’re covered from that install until your next one with us, season after season. Five or more years in, when the Texas sun has finally worn out the plastic housings, we replace everything brand new at no charge. In 15 years we have never charged a cent for it. Decide not to have us install one year, and the coverage ends there. The season guarantee covers everything else: anything goes out, we fix it free, usually the same day.'],
      ['What’s included?', 'Everything: lights, clips, cords, timers, design, installation and all-season service. It’s all measured and cut to fit your home, with no extra strands hanging off the roof.'],
      ['What kind of lights do you use?', 'Commercial-grade LED only: brighter, cheaper to run, and sealed in plastic so they don’t break.'],
    ],
  },
  {
    group: 'Paying',
    items: [
      ['How do I pay?', 'A deposit when you sign holds your install date. The rest is due once your lights are up, and removal is paid in January. Sign in to your account (no password) and tap Pay: PayPal, Venmo or a card. Zelle, Cash App, check or cash work too. Or spread it with Pay in 3.'],
      ['Do you price-match?', 'We beat it. Show us a legitimate written proposal from another professional Christmas-light company (their own estimate, with their name on it) for the same lights and service, and we’ll beat it by 10%. That’s for real holiday-lighting companies with insurance, not a handyman or a landscaper, and not a number someone quoted over the phone.'],
      ['Is sales tax included?', 'Texas sales tax is added as its own line when you buy new lights or lease them: a first-year install, an add-on, every lease payment. Re-installs of lights you already own aren’t taxed, and neither are service calls.'],
      ['Can I lease the lights instead of buying them?', 'Yes. With a lease we keep the lights, and every year you choose a brand-new design or keep the one you had. Year one is full price; every year you come back takes another 10% off the original price, up to 50% off. Nothing to store, test or replace.'],
      ['What’s Pay in 3?', 'Any new install, bought or leased, paid in three equal payments instead of a deposit and a balance: the first when you sign, then one a month on the 1st or the 15th (you choose when you sign; we email you a payment link that morning). Everything is included, takedown too. No long-term commitment. It isn’t for re-installs of lights you already own. Ask us when you request your estimate.'],
    ],
  },
  {
    group: 'Your account & app',
    items: [
      ['Can I see my account online?', 'Yes. Sign in at christmas-light-creations.com/account with the email we send your estimates to: Sign in with Google, or we email you a one-tap link, no password. You’ll see your agreements, what’s due and what you’ve paid (and pay online), your install and takedown day, your yearly price, and you can report a problem with your lights, save your gate code, pets and HOA dates, choose which emails you get, and search the Help answers.'],
      ['Is there an app?', 'Yes. On your account page tap Get the app: on Android tap Install; on an iPhone open it in Safari, tap Share, then Add to Home Screen. It opens full-screen, no password, always up to date. Phone notifications of any kind only work from the installed app; without it you get email.'],
      ['What emails will I get, and can I turn them off?', 'Your estimate and signed agreement, invoices and payment reminders, a text the day before we come, and weather heads-ups when storms, strong wind or a freeze are coming (what usually goes wrong and the one thing that fixes it). Weather heads-ups and tips can be switched off under Email preferences on your account page; agreements, bills, payment reminders and scheduling always come through. If one lands in spam, mark it Not spam so you don’t miss your install day.'],
      ['Something’s confusing. Who do I ask?', 'Your account page has a Help box with a search: signing in, paying, lights out, trees, dates and weather, boxes, HOA dates, the app. If that doesn’t cover it, call or text 281-819-0163 and a person answers, usually the same day.'],
    ],
  },
  {
    group: 'During the season',
    items: [
      ['What if something goes out?', 'First press RESET on the outdoor outlet your lights plug into (the GFCI, the one with two small buttons): after rain that fixes most of it. Still out? Tap Report a problem on your account page, or call or text, and we fix it free, with no limit: burned-out or unglued bulbs, timers, tripped outlets. Usually the same day locally, within 48 hours during the busiest weeks. If we can’t fix it, we replace it at no charge.'],
      ['A branch pulled my lights down. Is that covered?', 'No. Branches that touch or hang over your roofline, gutters or walls pull lights down in wind, so please trim them back before we install and keep them trimmed, especially if it has happened before. Re-hanging lights a tree pulled down is a paid service call, scheduled after our booked installs. Everything else that goes out is free.'],
    ],
  },
  {
    group: 'Removal & next year',
    items: [
      ['When do you take them down?', 'Between January 3rd and 13th; we text the day before. Set an empty box or bin out on the porch and we pack your lights into it, labeled, for you to store until next season (for a re-install, set the labeled boxes out the same way). If your HOA wants lights down by a certain date, save it on your account page and we plan around it.'],
      ['Is there a cost for removal?', 'Yes, a set price shown in your estimate, due in January.'],
      ['Do I own the lights?', 'If you buy them, yes: once they’re paid for, they’re yours, and every year after we put them back up for about half the original price. If you lease, we keep them and you get a fresh design any year. Either way, we call in late summer to get you on the schedule.'],
      ['Can you hang lights I already own?', 'No. We only install lights that came from us, so we can guarantee every bulb all season.'],
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
  updated: 'October 13, 2026',
  intro: 'We’re a family business. We only collect what we need to quote, install, service and bill your lights, and we never sell it. Here’s exactly what that means.',
  sections: [
    {
      title: 'What we collect',
      items: [
        '**When you ask for an estimate:** your name, email, phone, address, how you’d like us to contact you, your message, and how you heard about us. If you used our light designer and send your design with the request, we also keep your design and the photo of your home you used, for 30 days (longer only if we use it for your proposal).',
        '**When you’re a customer:** your contact and property details (like a gate code, your HOA and any date your lights must be down by, things in the yard we should avoid, and pets), what we installed, your season schedule, prices and what you’ve paid, and notes we need to do the job. You can fill in or change the property details yourself on your account page.',
        '**When you sign a proposal:** your typed name, your drawn signature, the date and time, the browser you signed on, and a fingerprint of the exact document you agreed to.',
        '**When we bill you:** the invoices we send you (what for, amounts, due date), which emails we sent about them, when you first opened the invoice or proposal link, and how and when you paid.',
        '**When you pay online:** the amount, date and PayPal reference, and the email PayPal gives us. Card and bank details go to PayPal, never to us.',
        '**When we text, call or email each other:** we keep that conversation history (including the emails we send you, those we’ve scheduled to send you later, and which of us called, texted or emailed you, so we don’t double up, and whether an email we sent you came back undelivered, so we can fix the address) with your customer record so anyone on our team can help you. If we don’t know you yet, your text or email waits in a list our team goes through (obvious junk mail isn’t kept). When you write to us or ask for an estimate, our team’s phones may show a short notification (your name and the first words) so you hear back sooner; if an email to you comes back undelivered, they show your name and why.',
        '**When you sign in to your account:** your email address, when you signed in, and, if you open the account as the installed app, the kind of device (for example “iPhone”). With “Sign in with Google”, Google tells us your name and email; we never see your Google password. If you report a problem with your lights from your account, what you picked and the note you typed go on your customer record as a service call, and our team’s phones get the same short notification as for a text.',
        '**When you message us from your account (Chat with us):** what you write, and our replies, are kept as one conversation on your customer record (the last 200 messages), so anyone on our team can pick it up. Our team’s phones get the same short notification as for a text, and when we answer you get an email with the reply. We never share that conversation with anyone else.',
      ],
    },
    {
      title: 'How we use it',
      items: [
        'To contact you about your estimate, schedule installs, service calls and takedowns, send proposals, invoices and receipts, and answer your questions. When you ask for an estimate on the website, you get one automatic “Got your request” email right away.',
        'Weather heads-ups: when the forecast for our area has thunderstorms, strong wind or a freeze, we email customers with a visit that day that the date may move, and customers whose lights are up what to check (at most one such email per bad day, and one every 5 days). You can turn the heads-ups and tips off on your account page; agreements, bills, payment reminders and scheduling emails always come. We read the forecast from the National Weather Service; nothing about you is sent to them.',
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
        '**Anthropic (Claude):** when one of our team asks for help writing a reply to you, your conversation with us (texts, emails and messages from your account) and the details on your record (name, address, what we installed, prices and schedule, never gate codes or payment details) are sent to Anthropic’s Claude service to suggest a draft. A person on our team reads, edits and sends every reply; nothing is sent to you automatically. Anthropic does not use this to train its models. Our team can also ask Claude questions about our own records (for example which invoices are due or what a customer asked us before); the same kinds of details are sent for that, with the same limits, and Claude can only read, never change or send anything.',
        '**Google Ads:** we advertise on Google, so our public pages (not your account or agreement pages) load Google’s ad tag. It tells Google when a visit from one of our ads led to an estimate request, so we know the ads work. Google sets its own cookies for this and its privacy policy applies; it doesn’t see what you type into the form.',
        'Our fonts come from our own website (no font service sees your visit), and the home page asks our own server (on Google Cloud) for the line about how booked we are and the next open install dates (only dates, nothing about anyone). That’s all: no other outside services see your visit.',
      ],
    },
    {
      title: 'What your browser keeps',
      items: [
        'If you sign in to your account, your browser keeps you signed in until you sign out. If you ask for a sign-in link, we remember the email in your browser so the link works when you open it. If you came from one of our road signs, the page remembers which sign for that visit. A photo you open in our light designer stays on your device and is gone when you leave the page, unless you send it with an estimate request. Google’s ad tag (above) sets its own cookies on our public pages. Nothing else is stored.',
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

// Terms of use (/terms/, same shell as the privacy page). Plain words, under
// 400 of them: what's ours, what the designer is for, estimates aren't offers.
// Not the installation agreement (that's src/proposals/terms.js, signed with
// the proposal). Owner to review (and the attorney along with the contract).
export const termsOfUse = {
  updated: 'October 13, 2026',
  intro: 'These are the terms for using this website and our free light designer. They aren’t your installation agreement: that’s the written proposal you sign, which has its own terms.',
  sections: [
    {
      title: 'What’s ours',
      items: [
        'This website, the light designer, the sample house, the pictures the designer makes, and our photos, logo and words are **© Christmas Light Creations**, Pearland, Texas. All rights reserved.',
        'Pictures you save or send from the designer carry our logo and web address. Keep them, show them around, post them: just leave the mark on.',
      ],
    },
    {
      title: 'What the designer is for',
      items: [
        'The designer is free so you can try looks on your own home and ask us for an estimate. Use it for your home (or someone’s you’re treating) and keep the pictures for personal use.',
        'Please don’t copy, download, scrape or reverse-engineer the designer, its code, the sample house or the site’s words and photos; sell or republish them; use them in advertising; or use any of it to build or train a competing tool or service. Automated visits (bots, scrapers) aren’t allowed, apart from search engines indexing our public pages.',
        `A photo you upload stays yours. You confirm you have the right to use it, and by sending it with an estimate request you let us use it to prepare your estimate and proposal. Our [privacy page](${base}privacy/) says how long we keep it.`,
      ],
    },
    {
      title: 'Estimates and prices',
      items: [
        'Nothing on this website or in the designer is a price or an offer. An estimate request is just a request: we’re not booked until we send you a written price and you accept it. The designer shows a look, not a measurement, and the installed lights may sit a little differently on your home.',
      ],
    },
    {
      title: 'The site as it is',
      items: [
        'We keep the site and the designer working as well as we can, but we provide them as they are: they may change or go away without notice, and we aren’t responsible for a problem caused by using them, as far as Texas law allows.',
      ],
    },
    {
      title: 'Questions',
      items: ['Email info@christmas-light-creations.com or call 281-819-0163. Texas law applies to these terms. If they change, the date at the top changes too.'],
    },
  ],
}

// Cost guide (/cost/, docs/specs/cost-guide.md): the page that answers "how
// much does Christmas light installation cost", the highest-intent local
// search (no first-page competitor has one, docs/serp-log.md). Owner's rule
// (2026-10-09, "I don't want to ball and chain myself"): no dollar amounts.
// So `ranges.rows` is EMPTY, the page says we quote each home, and the test
// refuses a $ amount anywhere in here while it is. To publish ranges the
// owner picks them; then rows get { home, price, note } and the table shows.
// The percentages are the ones already on the home page (10% early-install,
// about half for a re-install, the lease steps, beat by 10%), nothing new.
export const costGuide = {
  title: 'What Christmas light installation costs in Pearland',
  eyebrow: 'Pricing guide · Pearland, TX',
  intro: 'Every home we light gets one exact price, measured on its own roofline, so there’s no price list to copy here. Instead, here is what moves that price up or down, what every price includes, and how to get yours, free.',
  cta: { estimate: 'Get your exact price', call: `Call ${business.phone}` },
  drivers: {
    title: 'What sets the price',
    intro: 'Five things decide most of it. Two homes on the same street can come out quite different once you add them up.',
    items: [
      { icon: '📏', title: 'Roofline feet', body: 'The biggest factor. We measure every edge the lights follow: eaves, gables, peaks and the garage. A long single-story roofline can take more feet than a compact two-story one.' },
      { icon: '🌳', title: 'Trees and extras', body: 'Wrapping a trunk and its branches takes more light and more time than a straight run of roofline, so each tree is priced on its own. Wreaths, lit shrubs, columns, windows and walkway lights add on the same way.' },
      { icon: '🏠', title: 'Roof pitch and height', body: 'Steep pitches, second stories and spots we can only reach by ladder take longer and more care, so they cost a little more than a low, walkable roof. Clay and other tile roofs we don’t do at all: too fragile to work on safely.' },
      { icon: '🔁', title: 'Buy or lease', body: 'Buy, and the first year is the full price of the lights and the install; every year after, putting them back up is about half of that. Lease, and we keep the lights: year one is full price too, then 10% off the original price for every year you come back, up to 50% off, with a brand-new design whenever you want one.' },
      { icon: '📦', title: 'Takedown and storage', body: 'Takedown is a set price, shown in your estimate and paid in January. Between January 3rd and 13th we take everything down, label it and box it. Lights you own stay with you until next season; leased lights come back to us.' },
    ],
  },
  ranges: {
    title: 'Typical prices',
    // Shown while rows is empty: honest about why there is no list.
    empty: 'We don’t publish a price list, and we’d rather say why than hide it: a range wide enough to be true for every home in Pearland wouldn’t tell you much about yours. What you get instead is one exact price for your own home, free, with nothing to pay until you sign.',
    hurry: `In a hurry? Text a photo of the front of your house to [${business.phone}](${business.smsHref}) and we’ll text back a rough price.`,
    // Owner-approved ranges go here, e.g. { home: 'Single-story, roofline only', price: '$…–$…', note: 'bought, first year' }.
    rows: [],
    rowsIntro: 'What most homes like these come to, before extras. Yours is measured, so it may land outside these.',
    includedTitle: 'Every price includes',
    tax: 'Texas sales tax is added as its own line when you buy new lights or lease them. Re-installs of lights you already own and service calls aren’t taxed.',
  },
  exact: {
    title: 'One exact price, within a day',
    intro: 'No packages, no “starting at”. Here’s how you get your number.',
    steps: [
      `[Request a free estimate](${base}#estimate) online, or call or text ${business.phone}. Want to see the look first? [Draw your lights on a photo of your home](${base}design/), free.`,
      'We measure from the ground with a measuring wheel, about 30 minutes, no roof climbing. You don’t need to be home unless we need to get through a gate.',
      'You get one exact price by text or email, usually within a day of the measure, and you sign online. What’s in your estimate is what you pay.',
      'A deposit when you sign holds your install date. The rest is due once your lights are up, and takedown is paid in January.',
    ],
  },
  pay: {
    title: 'Three ways to pay',
    intro: 'Pick whichever suits you. Pay in 3 costs nothing extra.',
  },
  early: {
    title: 'Book early and take 10% off',
    body: 'Installs start October 15th, and October dates go first. An install done by the end of October gets the early-install discount: 10% off. If a storm moves your date, you keep it.',
  },
  diy: {
    title: 'Doing it yourself or hiring it out',
    intro: 'The honest answer: for a single-story home with a low roof, a sturdy ladder and a free weekend, hanging your own lights is the cheapest way to do it. Here is what each way really costs you.',
    yourself: {
      title: 'Doing it yourself',
      items: [
        'Store strands, clips, timers and outdoor cords, bought again every year or two: the Texas sun eats the plastic.',
        'A Saturday on the ladder in October heat, and another in January to take it all down.',
        'Your own repairs when a strand goes dark the week before Christmas.',
        'The fall risk, which is real on a second story or a steep pitch.',
        'The look: store strands come in fixed lengths, so there’s usually a bit dangling off the end or balled up in the gutter.',
      ],
    },
    hired: {
      title: 'Having us do it',
      items: [
        'Commercial-grade LED bulbs, measured and cut to fit your roofline exactly, nothing dangling.',
        'About two hours of install, and you don’t need to be home.',
        'Free service calls all season, usually the same day.',
        'Takedown in January, labeled and boxed for you.',
        'The lifetime warranty: worn-out lights replaced new, free, for as long as you’re a customer. You never buy strands again.',
        'More than a cart of store strands the first year; the re-install every year after is about half the original price.',
      ],
    },
    verdict: 'If your roof is high, steep or busy with gables, or you just want it to look custom and stay off the ladder, hiring it out pays for itself the first evening the timer clicks on. If it isn’t, enjoy your Saturday. We mean that.',
  },
  faq: {
    title: 'Price questions, answered',
    items: [
      ['How much does Christmas light installation cost in Pearland?', 'It’s priced per home, not per package: the roofline feet, the trees, how high the crew has to reach and whether you buy or lease set it. Request a free estimate and you get one exact price. In a hurry, text us a photo of your house for a rough price first.'],
      ['Is the estimate free?', 'Yes. We measure from the ground in about 30 minutes, you don’t need to be home unless we need a gate opened, and there’s nothing to pay until you sign.'],
      ['What’s included in the price?', 'Everything: the lights, clips, cords and timers, the design, the install, and free service calls all season. Takedown is its own set price, shown in your estimate and paid in January.'],
      ['What does it cost to put the same lights back up next year?', 'If you bought them, about half the original price every year. If you lease, 10% off the original price for every year you come back, up to 50% off.'],
      ['Can I pay in installments?', 'Yes: Pay in 3. Any new install, bought or leased, in three equal payments: the first when you sign, then one a month on the 1st or the 15th, your pick. Everything is included and there’s no long-term commitment.'],
      ['Is sales tax included?', 'Texas sales tax is added as its own line when you buy new lights or lease them. Re-installs of lights you already own and service calls aren’t taxed.'],
      ['Do you price-match?', 'We beat it. Show us a legitimate written proposal from another insured professional Christmas-light company for the same lights and service, and we’ll beat it by 10%. Handymen and landscapers don’t count.'],
      ['Is there a discount for booking early?', 'Yes. Installs done by the end of October get 10% off. Installs start October 15th, and those dates go first.'],
    ],
  },
  closing: {
    title: 'Ready for your number?',
    body: `Request your free estimate, or call ${business.phone} and talk to a person.`,
  },
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
  // The slim bar above the header (owner 2026-10-12: "utilize the top of the site banner"): one line by the calendar.
  topBar: {
    before: 'Install by Oct 31 and save 10% · Lifetime warranty on every light',
    countdown: '{n} days left to save 10% on an early install · Pay in 3 at the same price',
    lastDay: 'Last day: the 10% early-install discount ends tonight',
    season: 'Installing now · Pay in 3 at the same price · Lifetime warranty',
    takedown: 'Takedowns Jan 3–13 · Booking the {season} season now',
    offseason: 'Booking the {season} season · Buy, lease or pay in 3 · Lifetime warranty',
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

// "Design your lights" page (/design/, docs/specs/public-designer.md).
// No prices or feet anywhere on it (owner, 2026-10-10).
export const designPage = {
  heroLink: 'Try our free light designer on your own home',
  title: 'Design your Christmas lights',
  intro: 'See the look before you book. Try lights on our sample house, or on a photo of your own home. Free, no sign-up, and your photo stays on your phone unless you send it to us.',
  open: 'Open the designer',
  edit: 'Keep designing',
  upload: 'Use a photo of my home',
  uploadAgain: 'Use a different photo',
  sampleNote: 'Our sample house',
  ownNote: 'Your home',
  estimate: 'Get my free estimate with this design',
  saveLabel: 'Get my estimate →',
  saveLabelShort: 'Estimate →', // phones: the header row has to fit without scrolling
  noSight: 'The designer is a drawing tool, so it doesn’t work with a screen reader. If you can’t see the picture, call us and describe the look you want:',
  backHome: 'Back to the main site',
  how: [
    ['✏️', 'Lights', 'tap corner to corner along a roofline, then Done.'],
    ['▭', 'Rectangle / ◯ Oval', 'drag around a window, door or wreath.'],
    ['👆', 'Select', 'tap a strand to change it; tap an empty spot to start drawing.'],
    ['🎨', 'Colors', 'warm white, multicolor, red & white and more.'],
    ['🌙', 'Night', 'slide to see it after dark. Hold “before” to compare.'],
  ],
  tipsTitle: 'Tips for a great photo of your home',
  tips: [
    'Stand across the street so the whole front of the house fits, roof to ground.',
    'Face the house straight on, not from a corner.',
    'Hold your phone sideways (landscape).',
    'Daylight or early dusk works best; skip night photos.',
    'Move cars out of the driveway if you can, and keep people out of the shot.',
  ],
  errors: {
    'too-small': 'That photo is too small to design on. Take a new one with your phone’s camera (the whole house, from across the street).',
    unreadable: 'This photo type can’t be opened here. Take a regular photo or a screenshot of it, then try again.',
    'too-big': 'That photo is too detailed to send. Try a different photo, or take a screenshot of it.',
  },
  portraitTip: 'Tip: holding your phone sideways fits more of the house.',
  formTitle: 'Get your free estimate',
  formIntro: 'Tell us where you are and we’ll measure and send a price. Your design comes with your request, so we see exactly the look you want.',
  attached: 'Your design is attached',
  attach: 'Send my design with the request',
  message: 'I designed my lights on your website (attached).',
}

// Gift wrapping (docs/specs/gift-wrapping.md): the owner's second service,
// shown on the website only while ⚙ Settings → Gift wrapping is on
// (settings/app.giftWrapping; off until the owner says go, 2026-10-13).
// Kept out of `nav` and `faq` on purpose: those are drawn into the built
// HTML and read by the sales assistant, and neither may mention it while
// it is off. The owner's answers (pricing, drop-off, dates, supplies) still
// aren't in: the words below promise nothing specific, and `details` is
// where those answers go once given.
export const giftWrapping = {
  nav: { label: 'Gift wrapping', href: '#gift-wrapping', after: '#gallery' },
  eyebrow: 'New this season',
  title: 'Gift wrapping, done beautifully.',
  intro: 'The same family that lights your home can wrap your gifts: crisp corners, real ribbon, bows that stay put. Hand us the pile and get back presents ready to go under the tree.',
  // Photos (the owner's: plaid, navy snowflake, red polka-dot bows) go here once processed with
  // scripts/process-photos.mjs: { src: `${base}images/gift-wrap/….jpg`, alt: '…' }. Shown only when filled.
  photos: [],
  steps: [
    ['Tell us what you have', 'Roughly how many gifts, what sizes, and when you need them back. Ask in the estimate form, or text us a photo of the pile.'],
    ['We send you a price', 'One clear price for the lot before you commit. Tell us a color or a theme and we choose paper, ribbon and bows to match.'],
    ['Hand them over, get them back wrapped', 'We arrange the hand-off with you, then your gifts come back wrapped and ready to give.'],
  ],
  // Fill in from the owner's answers (price by size, drop-off days, the last day before Christmas, your own paper). Shown only when filled.
  details: [],
  cta: 'Ask about gift wrapping',
  // An extra FAQ group, shown with the others while the switch is on.
  faq: {
    group: 'Gift wrapping',
    items: [
      ['Do you really wrap gifts?', 'Yes. Christmas lights by day, gift wrapping by night: the same family, the same season, and we love doing both. Crisp corners, real ribbon, bows that stay put.'],
      ['How much does gift wrapping cost?', 'It depends on how many gifts you have and their sizes. Tell us roughly what you have and we send you one clear price for the lot, before you commit.'],
      ['How do my gifts get to you?', 'We arrange it with you when we send your price: drop them off with us, or we collect them when we’re at your home for your lights.'],
      ['Can I get lights and gift wrapping together?', 'Yes. Pick “Both” on the estimate form and we price them together. Lights customers get first dibs on wrapping dates.'],
    ],
  },
  // "What do you need?" on the estimate form (the three choices are SERVICES in functions/giftWrapping.js).
  form: {
    legend: 'What do you need? *',
    placeholder: 'How many gifts, roughly what sizes, colors you like, when you need them…',
  },
}

// The estimate section's designer line (owner 2026-10-13: "we're not offering our
// light designer here"). A link, not a third button: the form stays the one ask.
export const estimateSection = {
  designer: { before: 'Want to see it first? ', link: 'Draw your lights on a photo of your house', after: ', free, and send the picture with your request.' },
}
