// Staff guide (the ? button in the staff app): what the app does and where.
// Plain words for the team; update it whenever a feature changes.
// tab: the #hash the "Open" link goes to (none = no link).

export const GUIDE_UPDATED = 'October 10, 2026'

// The jobs people actually do, each pointing at where to do it.
export const TASKS = [
  ['Before you call, text or email someone', 'Glance at **Home → Recent activity**: if someone already emailed, invoiced or called them, or is **on it**, leave it to them. On a new message in **💬** (or Unmatched on Leads), tap **I’ve got it** so everyone sees you’re answering it.'],
  ['A new estimate request came in', 'You get an email alert (and a phone notification if you turned them on in **💬**). Open **Leads**: call or text them, set the status (Called, Estimate sent…), add notes. When they say yes, tap **Make customer**.'],
  ['A request says “🎨 sent a design”', 'They designed their lights on the website (christmas-light-creations.com/design/). Open the lead → **🌐 Show their design** → **🎨 Open in designer** → measure and adjust → **Save** (it becomes one of their designs) → **📝 New proposal** from it.'],
  ['Find anyone fast', '**Accounts** → type a name, street, phone (any format), email, neighborhood or gate code. Opens their whole account with a photo of the house.'],
  ['Send a price / contract', 'Customer → **🎨 Light designs** (optional mockup) → **📝 Proposals & contracts** → **📝 New proposal** → **Send to customer**. They sign on their phone; you **Countersign**.'],
  ['Get paid', 'The deposit is paid by PayPal/Venmo/card when they sign. For the rest, open the proposal → Payments → **Ask for install balance** (or takedown payment) → **Text it** / **Email it**. No proposal (returning customers)? Send an **invoice**. You get a "paid" email.'],
  ['Bill a customer (invoice)', '**Invoices** → **＋ New invoice** → type their name, street or phone and tap them (or from their account: **🧾 Invoices** → **＋ New invoice**). Then: what it’s for, season, lines (a discount is a minus line), due → **Send to customer**. It’s emailed from info@ with a Pay button (PayPal, Venmo, card) and gets a number like CLC-2026-0001. No email on file? **Text it**. Reminders go out 7 and 14 days after the due date until it’s paid.'],
  ['Bill everyone for the season', '**Season** → filter (installs or takedowns) → **🧾 Invoice these N** → check the list (unticked ones say why) → **Make N drafts**. Then **Invoices** → Drafts → check the amounts → **Send all drafts**.'],
  ['They paid cash, check or Zelle', 'Open their invoice → **Mark paid…** → how, when, check # → Mark paid. They get a receipt and their Seasons billing fills in. Wrong invoice? **Undo “Mark paid”**. No invoice? Type it in their Seasons (Edit details).'],
  ['Plan installs or takedowns', '**Season** (filter by area, early/regular) → **＋ Route these N**, or **Routes** → New route → **⚡ Optimize** → **Send to the installer**.'],
  ['A customer’s lights are out', '**Service** → Log call → pick the customer and the problem → Done when fixed (then ask for a review).'],
  ['A customer texted, called or emailed', 'The **💬** button (top right) shows a red count of new texts, voicemails, missed calls, emails and website estimate requests since you last looked. Tap it: newest first, new ones marked; tap one to open their account and full history (unknown numbers and emails from new people open the Unmatched list on Leads).'],
  ['Get a notification on my phone', 'Tap **💬** → **Turn on** → Allow → **Send a test**. Do it once on each phone or computer. From then on you get a notification within about 5 minutes of every customer text, voicemail, missed call or email; tap it to open their account. iPhone: install the app first (Safari → Share → Add to Home Screen) and turn it on from there. **Turn off** in the same place.'],
  ['Text a customer', 'Tap **Text**: the message is copied and Google Voice opens as the business number. Paste and send.'],
  ['Email a customer', 'Tap **Email**, pick a template (it fills in their name, dates and prices), check it, then **Send from info@**. It goes out right away without leaving the app and shows in their **Text & email history** with your name; their reply comes to info@. Need an attachment or Cc? **Open in Gmail instead**.'],
  ['Ask for a Google review', 'Shows up after an install is completed, a service call is done, or a lead is booked: **Text/Email review link**. Never offer anything for a review.'],
  ['A red “website problem” banner showed up', 'Tap it: it says in plain words what broke (a request alert email, a payment, the text sync). Deal with it (or forward it to whoever looks after the website), then tap **Dealt with ✓**. The alert list also gets an email, and every Monday an “all OK” email; if that stops coming, say so.'],
  ['A customer picked a date on the website', 'Their request says “Preferred install date: …” at the top. It’s a request, not a booking: confirm the date when you send the estimate, then put it in their Season planned date so the website stops offering it.'],
  ['A customer asks “why did my price go up?”', 'Their account → **💲 Yearly price & add-ons** shows the breakdown. Tick **Customer can see this** so they can see it on their own account too.'],
]

export const SECTIONS = [
  {
    id: 'home', icon: '🛰', title: 'Home (mission control)', tab: 'home',
    summary: 'Where the app opens: what the team did lately, what needs attention, today’s routes and the season at a glance.',
    items: [
      '**Recent activity**: who emailed, invoiced, sent a proposal, changed a lead, logged or finished a service call, or started a text or call, and when; plus customers who signed or paid on the website. Tap one to open that account. It’s there so nobody does the same thing twice.',
      'Texts and calls show as **started**: the app sees you tap Text or Call, not whether the text went or the call was answered.',
      '**I’ve got it** (in 💬 and Unmatched): everyone sees “Katie is on it” on that message. Someone else can **Take it over**: then it says “Lacie took it over from Katie” (Katie sees “… from you”) and Recent activity gets “Lacie took over the message from …”.',
      '**Counters**: new messages (yours), new website requests, unpaid invoices (and how many overdue), open service calls. Tap one to go there.',
      '**Today’s routes**: each route with stops done, skipped and left. **Season**: installs and takedowns by step, and money collected (season billing marked paid) next to last season.',
      '**System status** lights: text/email sync, website problems, payments, the request-alert email list, the activity log, and notifications on this device. Green is good; amber means look; red means something broke (tap the red banner).',
      '**⛶ Wall screen**: full screen with big numbers for a TV in the shop; it updates by itself. **✕** or Esc to leave.',
      'Names show as first name + last initial (Scott M., Lacie M., Katie P.), also at the top right instead of your email. Anyone new (or a different name): **⚙ Settings → Staff names**.',
    ],
  },
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
    id: 'invoices', icon: '🧾', title: 'Invoices', tab: 'invoices',
    summary: 'Our own invoices (instead of PayPal invoices): emailed from info@, paid online by PayPal, Venmo or card, or marked paid by you.',
    items: [
      '**＋ New invoice**: search the customer (name, street, phone or email) and tap them to start their invoice.',
      'Inside an invoice, **📒 Their account: what they owe** shows that season’s billing (install total and discount, takedown, paid or not), anything unpaid from earlier seasons, their other invoices, proposal payments not paid yet and their yearly price. Tap **＋ Re-install…** / **＋ Takedown…** (or **＋ Add all**) to put those lines in; **Open their full account** shows their whole account on top of the invoice (**← Back to the invoice** returns to it as you left it).',
      'Boxes at the top: **Open** (unpaid), **Overdue**, **Paid**, **Drafts**, each with its total. Search by name, street or number; pick a season.',
      'Tap an invoice to see what went out (invoice emailed, reminders, receipt), when the customer opened it, and to **Text it**, **Copy link**, **Email again**, **Mark paid…**, **Void**, or turn reminders off.',
      'Numbers come from the website when you press Send: CLC-2026-0001, CLC-2026-0002… (a new count each January). Voided ones keep their number; only never-sent drafts can be deleted.',
      'You can change an unpaid invoice after sending: the customer’s link shows the new amount right away (press **Email again** if they should get a new email). Paid ones can’t be changed.',
      'When it’s paid (online or Mark paid): Lights up and Takedown invoices fill that season’s billing in **Seasons** (amount, Paid Yes, how, when; only empty boxes), the customer gets a receipt and you get a “paid” email. Sending one also sets the season’s Invoice box to “CLC Invoice Sent”.',
      '**Drafts → Send all drafts** sends every draft that’s complete (the bulk drafts from Season).',
      'Reminders: emailed 7 and 14 days after the due date if still unpaid, then they stop.',
    ],
  },
  {
    id: 'leads', icon: '📥', title: 'Leads (website estimate requests)', tab: 'leads',
    summary: 'Everyone who filled in the estimate form on the website. Staff get an email the moment one arrives.',
    items: [
      'Set the status: **New → Called → Estimate sent → Booked**, or **Lost**. Notes save for everyone; you see who changed what.',
      'Street View photo of the house on each card.',
      '**Make customer** turns a lead into a customer (or links the existing one).',
      '**🎨 sent a design**: they used the free designer on the website (/design/, no prices shown there). Their picture is under Light designs; **Open in designer**, then Save, to make it one of theirs for a proposal.',
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
      '**✉ Email these N** sends a template to each person, one email each from info@: check each and tap **Send ✓ Next** (or **Skip**), or **Send the rest** after one confirm. People with a blank in the template (e.g. no install rate on file) are skipped and listed; already-sent people are skipped. At most 300 emails a day from the app.',
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
      'Cash or check for a proposal payment? Record it in the customer’s **Seasons** (Edit details → install/takedown billing). For an invoice, use **Mark paid…** on the invoice. Online payments can only be recorded by PayPal itself.',
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
      '**Send…**: tick who gets it, then each email is shown before it goes from info@ (or **Send the rest** in one go). Each one lands in that person’s Text & email history.',
      'Emails are sent from the app as info@; **Open in Gmail instead** is always there for attachments or Cc.',
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
    id: 'messages', icon: '💬', title: 'New messages (💬 top right)', tab: null,
    summary: 'Every text, voicemail, missed call and email a customer sends, so nothing waits unseen. Plus phone notifications if you want them.',
    items: [
      'The red number counts what arrived **since you last opened the list**. It’s yours: opening it doesn’t clear it for anyone else. On the installed app it also shows on the app icon (most phones).',
      'The list shows the last 7 days, newest first, with the person’s name (or their number or email if we don’t know them yet) and the first words. **New** marks what arrived since your last look. Website estimate requests are in it too (📝).',
      'Tap one: their account opens with the full Text & call history. Unknown numbers and emails from new people open the **Unmatched** list on Leads: **Link to customer**, **Reply in Gmail** or **Dismiss**.',
      'Emails from someone we don’t know yet are kept unless they look like junk: no-reply and notification senders, PayPal/Google-type services, and newsletters with an unsubscribe link. Those stay only in Gmail.',
      'Texts, voicemails and emails arrive within about 5 minutes (the info@ sync); estimate requests at once. Our own replies aren’t listed.',
      '**📲 Phone notifications on this device**: **Turn on** once per phone or computer, then **Send a test**. Everyone who turned it on gets every new customer message. **Turn off** (or **Remove** an old phone) in the same place. Quiet at night? Use your phone’s Do Not Disturb.',
      'iPhone/iPad: works only in the installed app (Safari → Share → Add to Home Screen), iOS 16.4 or later. If it says notifications are blocked, allow them in the phone’s settings for CLC Staff.',
    ],
  },
  {
    id: 'settings', icon: '⚙', title: 'Settings (⚙ top right)', tab: null,
    summary: 'Shared settings for the whole team, plus a couple just for your device.',
    items: [
      '**Install the app** on your phone (Android: Install; iPhone: Share → Add to Home Screen).',
      '**New-request alerts**: who gets the email when a website request comes in.',
      '**Business texting**: the Google Voice account; **on this device, text from** the business number or your own.',
      '**Install availability**: the website’s “Check availability” shows the next real open install days. Set installs on a normal day, the days you work, and change single days (**6** on helper days, **0** for rain or a day off). A day fills up from the Season planned dates and route stops, so keep those current.',
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
      '**Their invoice link** (christmas-light-creations.com/invoice/…): the invoice with a Pay button, Save or print (PDF), and after paying, their receipt.',
      '**Their own account** at christmas-light-creations.com/account/: sign in with Google or an emailed link (no password). They see their proposals and invoices, what’s due (and pay it), paid invoices with receipts, and, once you tick **Customer can see this**, their yearly price breakdown and what they paid each season. Never a lifetime total.',
      'Takedown that costs $0 shows as **Free**. We don’t store lights: customers keep them, labeled and boxed.',
      'Payments: PayPal, Venmo or card online; Zelle, check, cash and others are recorded by staff in Seasons.',
    ],
  },
]
