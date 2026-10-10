// Staff guide (the ? button in the staff app): what the app does and where.
// Plain words for the team; update it whenever a feature changes.
// tab: the #hash the "Open" link goes to (none = no link).

export const GUIDE_UPDATED = 'October 9, 2026'

// The jobs people actually do, each pointing at where to do it.
export const TASKS = [
  ['A new estimate request came in', 'You get an email alert. Open **Leads**: call or text them, set the status (Called, Estimate sent…), add notes. When they say yes, tap **Make customer**.'],
  ['Find anyone fast', '**Accounts** → type a name, street, phone (any format), email, neighborhood or gate code. Opens their whole account with a photo of the house.'],
  ['Send a price / contract', 'Customer → **🎨 Light designs** (optional mockup) → **📝 Proposals & contracts** → **📝 New proposal** → **Send to customer**. They sign on their phone; you **Countersign**.'],
  ['Get paid', 'The deposit is paid by PayPal/Venmo/card when they sign. For the rest, open the proposal → Payments → **Ask for install balance** (or takedown payment) → **Text it** / **Email it**. You get a "paid" email.'],
  ['Plan installs or takedowns', '**Season** (filter by area, early/regular) → **＋ Route these N**, or **Routes** → New route → **⚡ Optimize** → **Send to the installer**.'],
  ['A customer’s lights are out', '**Service** → Log call → pick the customer and the problem → Done when fixed (then ask for a review).'],
  ['Text a customer', 'Tap **Text**: the message is copied and Google Voice opens as the business number. Paste and send.'],
  ['Email a customer', 'Tap **Email**: Gmail opens as info@ with a template filled in. Check it and send.'],
  ['Ask for a Google review', 'Shows up after an install is completed, a service call is done, or a lead is booked: **Text/Email review link**. Never offer anything for a review.'],
  ['A red “website problem” banner showed up', 'Tap it: it says in plain words what broke (a request alert email, a payment, the text sync). Deal with it (or forward it to whoever looks after the website), then tap **Dealt with ✓**. The alert list also gets an email, and every Monday an “all OK” email; if that stops coming, say so.'],
  ['A customer asks “why did my price go up?”', 'Their account → **💲 Yearly price & add-ons** shows the breakdown. Tick **Customer can see this** so they can see it on their own account too.'],
]

export const SECTIONS = [
  {
    id: 'accounts', icon: '🔎', title: 'Accounts', tab: 'accounts',
    summary: 'Google-style search over every customer, website lead and old request. The best place to start.',
    items: [
      'Search by name, street, phone in any format, email, neighborhood or gate code. Recently viewed people stay at the bottom.',
      'An account shows a Street View photo, contact info and gate code, and one-tap **Call / Text / Email / Map / ＋ Route / Edit details**.',
      '**Customer login** line: whether they’ve signed in to their own account online, and when.',
      '**Seasons**: every year’s install and takedown, price, paid or not.',
      '**💲 Yearly price & add-ons**: original price, add-ons by year, price changes; flags when it doesn’t match this season’s rate.',
      '**🗂 From old records**: old PayPal/Square payments and old phone numbers waiting to be added to this customer (only fills empty boxes).',
      'Also: service calls, light designs, proposals, text & call history (texts, calls, voicemails, emails, old payments), website requests.',
      'On the search page: **Add-on notes to check** and **From old records** lists show who still needs a look.',
    ],
  },
  {
    id: 'leads', icon: '📥', title: 'Leads (website estimate requests)', tab: 'leads',
    summary: 'Everyone who filled in the estimate form on the website. Staff get an email the moment one arrives.',
    items: [
      'Set the status: **New → Called → Estimate sent → Booked**, or **Lost**. Notes save for everyone; you see who changed what.',
      'Street View photo of the house on each card.',
      '**Make customer** turns a lead into a customer (or links the existing one).',
      'Junk or a test? Mark it **Spam / test**, then **Delete**. Real requests can’t be deleted by accident.',
      'Booked leads show a **review request** button.',
    ],
  },
  {
    id: 'customers', icon: '👥', title: 'Customers', tab: 'customers',
    summary: 'Every household, replacing the Google Sheet. On a computer it’s a sortable table; on a phone, a list.',
    items: [
      'Tap a customer → **Edit details**: contact, property (gate code, location block, install type), lights (color, takedown notes), account (since, original rate, payment method) and **each season** (status, dates, install billing, takedown billing).',
      '**＋ Add a past season** (bottom of Edit details) for a year that isn’t on file yet.',
      'Typing saves on its own (“Saved ✓”).',
      'Early installs: a suggested early discount appears by the install date; tap to apply.',
    ],
  },
  {
    id: 'season', icon: '📅', title: 'Season', tab: 'season',
    summary: 'This season at a glance: who’s confirmed, scheduled, installed, taken down.',
    items: [
      'Switch between **Installs** and **Takedowns**; filter by area, early/regular, week.',
      'Change a status right in the list: everyone sees it within seconds.',
      '**✉ Email these N** sends a template to each person one at a time (their own Gmail draft from info@); already-sent people are skipped.',
      '**＋ Route these N** puts the filtered list on a route.',
      '**＋ New tab** (top bar) saves a filter as its own tab for everyone, e.g. “Needs scheduling”.',
    ],
  },
  {
    id: 'routes', icon: '🚚', title: 'Routes', tab: 'route',
    summary: 'Install, takedown and service routes with real drive times. Installers run them from their phone.',
    items: [
      '**＋ New route**: day, crew, leave time. Add stops from customer cards (＋ Route), the Season list, search or any address.',
      '**⚡ Optimize route**: best order by drive time, from home base and back.',
      '**Send to the installer** by Text or Email: stops, gate codes, phone numbers, notes and Google Maps links.',
      'Installer screen: **Navigate**, Call, Text, gate code, notes, **✓ Done**, or **↷ Skip, carry over** (with a reason; it goes on the next route).',
    ],
  },
  {
    id: 'map', icon: '🗺', title: 'Map', tab: 'map',
    summary: 'Every customer as a pin, colored by this season’s status. Pulsing red = open service call.',
    items: [
      'Filter by saved tab, installs/takedowns or area; satellite view; **Full screen** for a wall screen.',
      'Tap a pin: name, status, gate code, miles from home base, **Open customer / Directions / Street View**.',
      '**Put N addresses on the map** finds customers that don’t have a pin yet.',
    ],
  },
  {
    id: 'proposals', icon: '📝', title: 'Light designs & proposals', tab: null,
    summary: 'Mockups on the customer’s own house photo, e-signed proposals and online payments. On any customer or lead.',
    items: [
      '**🎨 New design from a photo**: draw light lines, rectangles (windows) and ovals; pinch to zoom; drag a pin to move it, drag a line to bend it; **Erase** lights behind a tree; **Measure** with a satellite view for real feet.',
      '**📝 New proposal**: fill items from a design (feet × price per foot), takedown line, discount, deposit %. Tick **Add-on to their existing lights** for an add-on (it raises their yearly price from next season once signed).',
      '**Send to customer**, then send the link by **Text it** / **Email it** (or Copy link). Status shows Sent → Viewed → Signed. **Countersign** after they sign; **Open signed copy** to print or save a PDF.',
      'Payments box on the proposal: the deposit is due when they sign; **Ask for install balance** when the lights are up and **Ask for takedown payment** in January (then Text it / Email it; **Take back** if asked by mistake). Customers pay by PayPal, Venmo or card; the app records it and emails staff.',
      'Cash or check? Record it in the customer’s **Seasons** (Edit details → install/takedown billing). Online payments can only be recorded by PayPal itself.',
      'Mistakes: **Make changes** reopens a sent proposal as a draft (send it again after), **Void** one that’s dead, **Delete** drafts. Signed or really-paid ones stay as the record.',
    ],
  },
  {
    id: 'service', icon: '🛠', title: 'Service', tab: 'service',
    summary: 'Service calls: burned-out bulbs, timers, tripped GFCIs, lights down.',
    items: [
      '**Log call**: pick the customer and the problem, add details. To do / Scheduled / Done.',
      'Each call shows the address, gate code and Call / Text / Map.',
      'When it’s Done, that’s a good moment to ask for a review.',
    ],
  },
  {
    id: 'past', icon: '♻️', title: 'Past requests', tab: 'past',
    summary: 'Everyone from the old records who isn’t a customer now: people to win back.',
    items: [
      '**Win-backs**: paid or were invoiced before. **Past requests**: asked for an estimate, never booked. **Texted us**: texted or called a lot.',
      'Statuses: To contact, Emailed, Interested, Not interested, plus **Deceased** and **Personal / junk** (those are never contacted).',
      'Text/Email start with the “We miss you” templates.',
      '“Already a customer” cards link to that customer.',
    ],
  },
  {
    id: 'signs', icon: '📍', title: 'Signs', tab: 'signs',
    summary: 'Track road signs and which corners bring in requests.',
    items: [
      '**Place a sign** from your phone’s location (or cross streets) with the cost.',
      'Each corner shows requests it brought in (QR code scans, “saw your sign”) and the revenue from those customers.',
    ],
  },
  {
    id: 'emails', icon: '✉️', title: 'Emails', tab: 'emails',
    summary: 'The email templates everyone uses, from estimate to thank-you.',
    items: [
      '**Edit** a template and save it for everyone. Placeholders like {first} fill in per customer.',
      'Emails always open in Gmail as info@ so you check before sending.',
    ],
  },
  {
    id: 'gates', icon: '🔑', title: 'Gates', tab: 'gates',
    summary: 'Neighborhood gate codes. A customer without their own code shows their neighborhood’s.',
    items: ['Edit a code or add a neighborhood; it shows on customer cards, routes and the map.'],
  },
  {
    id: 'import', icon: '⬇️', title: 'Import', tab: 'import',
    summary: 'Bring in updates from the Google Sheet, and export contacts for Google Voice.',
    items: [
      '**1 · Google Sheet updates**: download the Scheduling and Accounts tabs as CSV and pick them. Where the sheet and the app disagree, you see the list and the **app’s value stays** unless you choose the sheet.',
      '**Export contacts for Google Voice** so texts show names.',
      '**2 · Old records** (one-time, already done): old texts, emails, payments and requests.',
    ],
  },
  {
    id: 'settings', icon: '⚙', title: 'Settings (⚙ top right)', tab: null,
    summary: 'Shared settings for the whole team, plus a couple just for your device.',
    items: [
      '**Install the app** on your phone (Android: Install; iPhone: Share → Add to Home Screen).',
      '**New-request alerts**: who gets the email when a website request comes in.',
      '**Business texting**: the Google Voice account; **on this device, text from** the business number or your own.',
      '**How booked we are (home page)**: a short, true line like “October is 80% booked” under the main buttons on the website. Update it weekly; it hides itself after 14 days.',
      '**Home base** (for distances and routes), **price per foot** for designs, **early-install discounts**.',
      '**Proposals & contracts**: deposit %, takedown % and minimum (set both to 0 if takedown is ever included), countersigner, contract terms.',
    ],
  },
  {
    id: 'customer-side', icon: '🙋', title: 'What customers see', tab: null,
    summary: 'So you can answer their questions.',
    items: [
      '**Their proposal link**: the design mockup with before/after, the price, the contract; they sign with their finger and pay the deposit.',
      '**Their own account** at christmas-light-creations.com/account/: sign in with Google or an emailed link (no password). They see their proposals, what’s due (and pay it), and, once you tick **Customer can see this**, their yearly price breakdown and what they paid each season. Never a lifetime total.',
      'Takedown that costs $0 shows as **Free**. We don’t store lights: customers keep them, labeled and boxed.',
      'Payments: PayPal, Venmo or card online; Zelle, check, cash and others are recorded by staff in Seasons.',
    ],
  },
]
