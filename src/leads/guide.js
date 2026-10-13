// Staff guide (the ? button in the staff app): what the app does and where.
// Plain words for the team; update it whenever a feature changes.
// tab: the #hash the "Open" link goes to (none = no link).

export const GUIDE_UPDATED = 'October 13, 2026'

// 📣 What's new (owner 2026-10-12: "send the release notes to Katie"): the
// short list at the top of the ? guide, with a "New" mark on ? and a banner
// in the app until each phone has opened it (tourState.js, keyed by `date`).
// Keep it to the last batch; the full history is docs/decisions.md.
export const WHATS_NEW = {
  date: '2026-10-13',
  title: 'What’s new (October 13)',
  items: [
    '**Chat with customers in their account**: they type a message on their account page, it shows in **💬** as 🗨️ *Account message* and buzzes your phone; you answer in the **💬 Chat** box at the top of their account (Accounts → their name) and they get an email with your reply. Claude’s Suggest a reply reads the chat too.',
    '**Notes** (More ▾ → Notes): your own notes, private unless you tick Share with the team; shared ones show to everyone under your name.',
    '**My checklist on Home**: today, this week and this season, with Open buttons; ticks clear by themselves (daily / Monday).',
    '**Emails you send are signed by you**: From “Katie at Christmas Light Creations” and “Thank you, Katie, Customer care” at the bottom. Names and titles (Owner, Co-owner, Customer care) in ⚙ Settings → Staff names. The address stays info@.',
    '**Every customer email is branded** (logo, phone, “found us in spam? mark it Not spam”): invoices, agreements, reminders, sign-in links, your own emails from the app.',
    '**“Got your request”** goes to every website estimate request by itself, within seconds, and shows in the lead’s history.',
    '**Still-waiting reminders**: a notification and an email to the alert list every hour (8 am–8 pm) when a message, request or problem report has sat 2+ hours with nobody on it.',
    '**Weather heads-ups** at 4:30 pm when storms, strong wind or a freeze are coming: customers on a route that day hear their date may move, customers with lights up get the storm tips, you get the list of stops. **⚙ Settings → Automatic emails** has the switches.',
    '**Pay in 3**, **leases** and **sales tax** on estimates; the Pay link emailed the morning each payment is due.',
    '**Texas agreement** rewritten (12 clauses: weather, access, gutters, wasp nests, boxes, HOA dates, cancellation, liability), folded behind “Read the agreement”.',
    '**Lifetime warranty**: from each install until their next install with us, worn-out lights are replaced new, free. On the site, in the agreement, in Help.',
    '**Trees**: branches pulling lights down aren’t covered; the re-hang is a paid visit after booked installs. Told on the proposal, the account page, the reminders and the storm tips.',
    '**Customers’ account page**: Report a problem, their property details (gate code, HOA date, things to avoid, pets, shown on the route), Email preferences, a Help search, a ☰ menu, Get the app. Staff see **📱 has the app** on the login line.',
    '**Day-before reminders** tell returning customers to set their boxes out and ask for the gate code when we have none. Takedown invoices and the invoice page carry the seasonal terms.',
    '**Price promise** on the site: we beat a legitimate written proposal from another real lighting company by 10%.',
    '**Phone menu** on the staff app (☰) and the customer account; the website got an offer bar, the perks section and the warranty.',
    '**The tour** (? → 🧭 Take the tour) has 13 stops now, including what the app does by itself.',
  ],
}

// The jobs people actually do, each pointing at where to do it.
export const TASKS = [
  ['Find my way around on a phone', 'Tap **☰** (top left). At the top, **Find anyone**: type a name, street or phone and go. Then Home, Accounts, Map, 🤖 Ask Claude and 💬 Messages, and the rest in groups (tap a group name to open or close it; the app remembers). The **?** guide, **⚙ Settings** and **Sign out** are at the bottom. The name next to CLC Staff tells you where you are. On a computer the sections stay in a row across the top.'],
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
  ['Let Claude plan install days', '**Season** (Installs) → **✨ Plan with Claude (N)**: N is everyone who said yes this season (Wants lights? = Confirmed) but has no planned date or week yet. Pick the date range (two weeks by default), untick anyone, **Make a plan**. In under a minute you get a day for each person with a one-line reason: their notes, timeframe and recent texts first, ⭐ early installs before the discount deadline, never more than the day’s capacity (⚙ Settings → Install availability, minus what routes and planned dates already book), grouped by area. Move anyone to another day or drop them (days over capacity turn red). Want Claude to redo part of it? Type a note in **Tell Claude a change** (“move Alice to the 20th with Debbie”, “keep Monday open”, “Kay and Leann must stay together”) and tap **↻ Re-plan**: your note wins, everyone else stays put, the people who moved show **Changed**, and the explanation says what changed and why. Tap **✕** on anyone to take them out (they go to Not placed and aren’t written); **↻ Re-plan: fill N spots** then finds replacements from the people not placed, or says nobody fits. Then **Apply**: it writes Planned date, Day, Week of (and Install Scheduled) exactly as if you typed them, and offers **✉ Email these** with “You are on the schedule”. Nothing is written until Apply, nothing sent until you press Send. Claude can be wrong: read the reasons. Same off switch as Ask Claude.'],
  ['A customer’s lights are out', '**Service** → Log call → pick the customer and the problem → Done when fixed (then ask for a review).'],
  ['Add photos of an install', 'Open the customer (**Accounts** → their name, or **Customers** → tap them) → **📷 Photos** → **📷 Take photo** (camera) or **🖼 From gallery** (one or several). The picture is shrunk on your phone and listed under this season with the date and your name; tap one to see it full size. **Remove** only your own; Scott can remove anyone’s. If it says photos aren’t turned on yet, Storage still needs enabling (Scott).'],
  ['Record what’s installed', 'Customer → **Edit details** → **🎄 What’s up**: one line per thing (what, how much, colour, notes: “Roofline C9 · 180 ft · warm white”, “wrapped oaks · 2”, “Wreath · 36 in”) and **Lights stored** (where at their house, how many boxes). Signed proposal on file and the list still empty? **📝 Prefill from the signed proposal** fills it from the line items; fix anything, it saves as you go. The list shows on their Accounts page and as the **What’s up** column on Season and Customers. Prices stay under 💲 Yearly price & add-ons.'],
  ['A customer reported a problem from their account', 'Customers can tap **Report a problem** in their own account (christmas-light-creations.com/account/). It lands on **Service** as an open call marked **🛠 Reported from their account**, in **💬** as a *Problem report* (tap **I’ve got it**), in Recent activity, and you get the phone notification and alert email. The customer was told “we’ll be out within 2 days; call if it’s urgent”. Work it like any call: Scheduled → Done; they can’t send a second one while this one is open. Their account also shows them their install date (from Planned date / Day / Week of and the install status) and the takedown status, so keep those boxes current.'],
  ['A customer wrote from their account (🗨️ Account message)', 'Customers can type to us on their account page (christmas-light-creations.com/account/ → **Chat with us**). It shows in **💬** as 🗨️ *Account message* with “Needs someone”, buzzes your phone, and emails the alert list when it starts a new conversation. Tap it: their account opens with the **💬 Chat** box at the top (also under **Edit details**): the whole thread, newest at the bottom, and a reply box. **Send reply**: it’s saved on their account, they get an email “New message from Christmas Light Creations” with your words and a button back to the chat, and Recent activity shows “replied in the account chat to”. You can start a thread yourself too. If nobody answers for 2 hours the still-waiting reminder counts it like a text. Want Claude’s help? **✨ Suggest a reply** on the 💬 row reads the chat and drafts a short answer you can paste in.'],
  ['A customer texted, called or emailed', 'The **💬** button (top right) shows a red count of texts, voicemails, missed calls, emails and website estimate requests **nobody has taken yet**. Tap it: newest first, “Needs someone” on the ones nobody has; tap **I’ve got it** on the one you’ll answer (the count goes down for everyone); tap one to open their account and full history (unknown numbers and emails from new people open the Unmatched list on Leads).'],
  ['Get a notification on my phone', 'Tap **💬** → **Turn on** → Allow → **Send a test**. Do it once on each phone or computer. From then on you get a notification within about 5 minutes of every customer text, voicemail, missed call or email; tap it to open their account. iPhone: install the app first (Safari → Share → Add to Home Screen) and turn it on from there. **Turn off** in the same place.'],
  ['A customer filled in their property details', 'On their account page customers can type their **gate code, HOA and lights-down-by date, things in the yard to avoid, and pets**. It saves straight onto their record (**Edit details** → Contact), shows in **Recent activity** (“updated their property details”), and the crew sees a red **Heads-up** line with the things to avoid and pets on the stop in the route, plus the gate code. HOA deadlines go into takedown planning (Plan with Claude puts those people first).'],
  ['A customer wants the app on their phone','Send them to **christmas-light-creations.com/account/**: sign in (Google, or the emailed link), then tap **Get the app** → **Install on Android** (iPhone: Safari → Share → Add to Home Screen). It’s their account page full-screen with its own icon, so it’s always up to date. On an iPhone they sign in with Google inside the app (emailed links open in Safari instead).'],
  ['Text a customer', 'Tap **Text**: the message is copied and Google Voice opens as the business number. Paste and send.'],
  ['Text customers on install day', 'Three ready-made texts, each copied and pasted into Google Voice (the app can’t send texts by itself). **The evening before**: **Routes** → open the route → **Day-before reminders** → **⏰ Email N reminders at 6:00 pm**: everyone with an email gets “We’re coming tomorrow” with their arrival window (from ⚡ Optimize) through Send later; people with no email get a **📱 Text** button. **On the day**, from **Home → Today’s routes** or the installer screen: **🚗 On our way** on the next stop (it says about how many minutes out), then **✓ Done** offers the **All done** text (“take a look tonight”, or the takedown wording). Each tap shows **told 10:42 am** on the stop, goes in their **Text & email history** as “opened in Voice” and in Recent activity. Every text ends with “Reply STOP to opt out”: if someone replies STOP, set **Opted out of texts** on their record (Edit details → Contact) and the buttons hold off. Wording: **⚙ Settings → Install-day texts** (the emails are in the Emails tab).'],
  ['Sign emails with my name', 'Emails you send from the app go out as **“Katie at Christmas Light Creations” <info@…>** and the stock sign-off ends **Thank you, Katie, Customer care · Christmas Light Creations · 281-819-0163**: the name and the title come from **⚙ Settings → Staff names** (defaults: Scott M. Owner, Lacie M. Co-owner, Katie P. Customer care). The address stays info@, so replies land in the shared inbox and in the customer’s history. Scheduled emails carry the name of whoever scheduled them; chat replies too. The app’s automatic emails (receipts, reminders, “Got your request”, weather) stay signed by the business. The **{me}** placeholder is your first name and **{myTitle}** adds “, Customer care” after it; both blank (and the line dropped) when no name is set.'],
  ['Keep notes and share them with Scott', '**More ▾ → Notes** (phones: ☰ → Tools → Notes) → **＋ New note**. Yours are private; tick **Share with the team** and it shows to Scott, Lacie and Katie under your name, read-only for them. Use it for customer quirks, questions for Scott, ideas for the FAQ. A permission error on Save means the database rules for notes are not published yet (Scott).'],
  ['My checklist on Home', '**Home → My checklist**: Today (clears every morning), This week (clears Monday) and This season. Tick as you go; **Open** jumps to where the job is done. Ticks are on this device only. Move or resize the panel with **⠿ Arrange**. The words come from Katie’s customer-care list; ask Scott to change them.'],
  ['Email a customer', 'Tap **Email**, pick a template (it fills in their name, dates and prices), check it, then **Send from info@**. It goes out right away without leaving the app and shows in their **Text & email history** with your name; their reply comes to info@. Need an attachment or Cc? **Open in Gmail instead**.'],
  ['Send an email later', 'Tap **Email**, pick the template → **⏰ Send later…** → pick **Tomorrow 8:00 am**, **Tomorrow 1:00 pm**, **Monday 8:00 am** or **Pick date & time** (Central time, up to 60 days) → **Schedule**. It goes from info@ within 5 minutes of that time and shows in their history and Recent activity under your name. For a whole list, use **⏰ Schedule the rest** in **✉ Email these N**. Until it goes, anyone can **Edit** or **Cancel** it in **Scheduled emails** on Home or at the top of their **Text & email history**. One that couldn’t go says **Didn’t go** (and the red banner says why): give it a **New time…** or **Remove** it.'],
  ['Let Claude draft the reply', 'On a message in **💬**, in Unmatched, or at the top of someone’s **Text & email history**: tap **✨ Suggest a reply**. In a few seconds you get what they’re asking, a suggested next step (answer, send an estimate, schedule, or hand to a person) and a draft in our voice. Edit it, then **✉️ Email this** or **Text this**: it goes through the normal Email / Text screens and nothing is sent until you press Send. Claude never quotes a price that isn’t on file, never promises a date and never invents a discount, but read every draft: it can be wrong. Upset customer or anything about damage or money back: it writes a short “a person will call you” and marks it red.'],
  ['Teach the sales assistant', '**⚙ Settings → What the sales assistant knows**: type the facts and answers you want ✨ Suggest a reply to use (a new offer, how you answer a common question, what to say about businesses or tile roofs), one per line → **Save**. The next draft uses them. Whatever you write, it still never gives a price or a date, and nothing is sent without a person.'],
  ['Ask Claude a question about the database','Open **🤖 Ask Claude** (a tab on a computer; in the ☰ menu on a phone) and ask in plain words: “Which invoices are overdue?”, “What did Pat Sample ask us last year?”, “Who’s on Thursday’s route?”, “Is the text sync working?”. Claude looks it up (customers, website requests, invoices, routes, message history, system status) and answers in a few seconds, with the records it used as links under the answer; tap one to open it. Follow-up questions keep the thread. When the answer is about one person, **✨ Draft a reply to them** opens the normal Suggest a reply flow. It is read-only: it can’t change a record or send anything, and it can be wrong, so open the record before acting. Your thread stays while the app is open, even when you switch tabs; **Clear** starts over. The owner can turn it off in **⚙ Settings → Ask Claude**.'],
  ['Ask for a Google review', 'Shows up after an install is completed, a service call is done, or a lead is booked: **Text/Email review link**. Never offer anything for a review.'],
  ['A red “website problem” banner showed up', 'Tap it: it says in plain words what broke (a request alert email, a payment, the text sync). Deal with it (or forward it to whoever looks after the website), then tap **Dealt with ✓**. The alert list also gets an email, and every Monday an “all OK” email; if that stops coming, say so.'],
  ['An email bounced (❌ Bounced)', 'Gmail sent it, but their mail server sent it back: usually a typo in the address, or a closed account. You see **❌ Bounced** and the reason on that email in their **Text & email history**, a red banner, a phone notification (if you turned them on) and a red **Outgoing email** light on Home. Open their account, tap **Edit details** and fix the email under Contact, then send it again. The ⚠ warning next to their email goes away by itself once the address changes. **Mailbox full**: try again in a few days, or call them. A website lead’s email can’t be edited: call or text them, or make them a customer and fix it there. The Email box warns before you send to a bounced address, and **Send the rest** skips them.'],
  ['A customer picked a date on the website', 'Their request says “Preferred install date: …” at the top. It’s a request, not a booking: confirm the date when you send the estimate, then put it in their Season planned date so the website stops offering it.'],
  ['Someone has a cheaper quote', 'We beat a **legitimate written proposal** from another **professional Christmas-light company** by 10% for the same lights and service. They have to show us the proposal itself (a photo of their estimate with the company’s name on it; not a number from a phone call), you check it’s like for like, then price ours 10% under it. **Handymen and landscapers don’t count**: say so kindly and sell the difference (insured, commercial lights, free service calls, takedown and storage). The website and the sales assistant say the same.'],
  ['Offer Pay in 3', 'Any **new** install, bought or leased, can be paid in three equal payments that cover everything (install and takedown): the first when they sign, then one a month on the **1st or the 15th** (they pick when they sign). **Never for a re-install.** Current customers: only if they ask about payment options or say they can’t afford it this year. In the estimate editor set **Payment plan → Pay in 3** (and **Kind → Lease** if we keep the lights); the contract, the customer’s page and their account then say Payment 1 / 2 / 3 of 3 with the dates, the terms switch to the Pay-in-3 wording by themselves, the Pay button opens on each due day and the customer gets an email that morning (and a week later if unpaid). The Payments box shows the due dates; **Ask for payment 2 of 3** still opens it early if you need to. Auto-draft by PayPal is off until the attorney has reviewed it.'],
  ['Sales tax on an estimate or invoice','From **October 15** new estimates carry **8.25%** on the lines ticked **tax** (new lights; untick a line that shouldn’t be taxed, like takedown of lights they own) and show it as its own line; the deposit includes it. Invoices have a **Sales tax** box: on by itself for add-ons; tick it for a first-year install billed by invoice; never for a re-install, a takedown of owned lights or a service call. Rate, permit number and start date: **⚙ Settings → Sales tax**.'],
  ['Automatic emails (what the website sends by itself)', '**⚙ Settings → Automatic emails** has three switches, all on: **“Got your request”** goes to every website estimate request the moment it lands (what happens next, the designer link, Pay in 3; it shows in the lead’s history as an email from the app); **Weather heads-ups**: each afternoon the server reads the National Weather Service forecast, and when storms, strong wind or a freeze are coming, customers on a route that day hear their date may move, customers with lights up get the storm tips, and you get a notification and an email saying who was told; **“Still waiting”**: every hour 8 am to 8 pm, a notification and an email when a message, request or problem report has sat 2+ hours with nobody tapping I’ve got it. Every customer email carries the logo and the “found us in spam?” line.'],
  ['A customer asks about the warranty', 'Two promises, both free: **all season**, anything that goes out we fix, usually the same day; and **for life while they stay a customer**: from each install until their next install with us, season after season, anything we supplied that wears out, sun-rotted housings included, is replaced brand new. The owner: 15 years, never charged a cent. Choosing not to have us install the next season ends the relationship and the warranty; so does someone else installing or altering the lights; it is a replacement, never a refund; trees, storms, animals, vehicles and the home’s wiring are not covered. It is in the agreement (clause 4), the FAQ, Help and the assistant.'],
  ['A tree pulled a customer’s lights down', 'Not covered, and it is on them: their agreement (clause 4), the signed-agreement email, the **Trees and your lights** note on their account page and proposal, the day-before reminder and the storm tips all say that branches must be trimmed back and that a re-hang is a **paid service call scheduled after booked installs** (owner: a tree call-out takes so long it can push another customer’s install). Quote it kindly, book the paid visit after the installs, and if they argue, point to the note they were shown.'],
  ['A customer turned off (or wants to stop) weather emails', 'They do it themselves: account page → **Email preferences**. It shows in **Recent activity** as “Weather and tips emails off”. Agreements, bills, payment reminders, scheduling and replies can’t be turned off; if someone wants those stopped, they have to tell us to fix the address instead.'],
  ['A customer is confused by their account', 'Send them to **Help** on their account page (signed in or not): a search box over the common answers (signing in, the sign-in email in spam, paying, Pay in 3, lights out, trees, dates and weather, boxes on the porch, HOA dates, cancelling, the app). We don’t run a tech-support line; if Help doesn’t cover it, they call or text and we answer like any message.'],
  ['See who has the app', 'Open the customer (**Accounts** → their name): the login line shows **📱 has the app** with the device and since when, once they have opened the installed app. Phone notifications of any kind only work from the installed app; the account page says so under Get the app.'],
  ['A customer asks “why did my price go up?”','Their account → **💲 Yearly price & add-ons** shows the breakdown. Tick **Customer can see this** so they can see it on their own account too.'],
  ['Get the customer list into a spreadsheet', 'On **Customers** (All, under the search box; or next to ✉ Email these on a saved filter) or **Season** (installs or takedowns, any area, type or status filter), tap **⬇ Export N to spreadsheet**. You get a .csv of exactly the N people shown: name, phone, email, address, area, neighborhood, gate code, HOA and lights-down-by date, install type, light color, since, original rate, this season’s status, week, day, planned date and scheduling notes, install and takedown billing (rate, discount, total, paid, how, when), What’s up, and the notes. It opens in Excel, Numbers or Google Sheets; on a phone it lands in Downloads or Files (iPhone offers Share). Always the full set of columns, whatever the table shows. It’s a copy: changes made in the spreadsheet don’t come back into the app.'],
]

export const SECTIONS = [
  {
    id: 'home', icon: '🛰', title: 'Home (mission control)', tab: 'home',
    summary: 'Where the app opens: what the team did lately, what needs attention, today’s routes and the season at a glance.',
    items: [
      '**Recent activity**: who emailed (or scheduled an email), invoiced, sent a proposal, changed a lead, logged or finished a service call, or started a text or call, and when; plus customers who signed or paid on the website. Tap one to open that account. It’s there so nobody does the same thing twice.',
      'Texts and calls show as **started**: the app sees you tap Text or Call, not whether the text went or the call was answered.',
      '**I’ve got it** (in 💬 and Unmatched): everyone sees “Katie is on it” on that message. Someone else can **Take it over**: then it says “Lacie took it over from Katie” (Katie sees “… from you”) and Recent activity gets “Lacie took over the message from …”.',
      '**Counters**: new messages (yours), new website requests, unpaid invoices (and how many overdue), open service calls. Tap one to go there.',
      '**Scheduled emails**: every email waiting to go out (⏰ Send later), soonest first, with who scheduled it. A list scheduled together is one line (**Show names**, **Cancel all**). Anyone can **Edit** the time or text, or **Cancel**, until it goes. **Didn’t go** ones stay here with the reason until someone gives them a **New time…** or **Removes** them.',
      '**Today’s routes**: each route with stops done, skipped and left, and the stops themselves with **🚗 On our way**, **✓ Done** (which offers the **All done** text) and **told 10:42 am** once texted, so a phone on Home is the crew’s console. **Season**: installs and takedowns by step, and money collected (season billing marked paid) next to last season.',
      '**System status** lights: text/email sync, outgoing email (red when an email didn’t go or bounced), website problems, payments, the request-alert email list, the activity log, and notifications on this device. Green is good; amber means look; red means something broke (tap the red banner).',
      '**Spent this month**: what the services behind the app cost so far this month. **Claude** (Suggest a reply, Ask Claude, Plan with Claude) is exact: every call’s tokens at Anthropic’s list price. **PayPal fees** are exact: what PayPal kept on each online payment. **Google Cloud** (Firebase, Maps, email) is exact too, about a day behind: Google’s billing export is read every 6 hours, and the line says “as of” which day; **see billing** opens Google’s page. **Google Ads** comes the same way once the Ads transfer is connected; **see ads** opens Google Ads. Only costs that go up with use are shown, no fixed bills. Until a Google line has its first numbers it says so and the total leaves it out.',
      '**Google Ads**: how the ads did this month, from the same Google Ads transfer (a day behind, “as of” says which day): what we spent, clicks, cost per click, and **requests** (estimate requests Google counted from the ads) with the cost per request once there are any; until then it shows how many times the ads were shown. Under that: the top campaigns, and **People searched**: the words people typed before clicking an ad, most clicked first (good for new keywords and negatives). **see ads** opens Google Ads. Until the transfer is connected it says “Not connected yet”.',
      '**⛶ Wall screen**: full screen with big numbers for a TV in the shop; it updates by itself. **✕** or Esc to leave.',
      '**⠿ Arrange**: drag the panels where you want them (on a phone, use the ▲ ▼ arrows on each panel); the size button on each panel cycles **Half → 2/3 → 1/3 → Wide** (thirds let three sit across, or a big one beside a small one); then **Done arranging**. It’s saved on that phone or computer; **Reset layout** puts them back.',
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
      '**🎨 sent a design**: they used the free designer on the website (/design/, no prices shown there). Their picture is under Light designs; **Open in designer**, then Save, to make it one of theirs for a proposal. Website uploads are deleted after **30 days**, so save it if you’ll need it.',
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
      '**📷 Photos** and **🎄 What’s up** on each customer: after-install photos (newest first, by season; Remove only your own, the owner any) and the list of what’s installed with where the lights are stored; What’s up is also a column on the Season and Customers tables.',
      '**⬇ Export N to spreadsheet** (under the search box, or next to ✉ Email these on a saved filter): the people shown, as a .csv for Excel, Numbers or Google Sheets, with every column.',
    ],
  },
  {
    id: 'season', icon: '📅', title: 'Season', tab: 'season',
    summary: 'This season at a glance: who’s confirmed, scheduled, installed, taken down.',
    items: [
      'Switch between **Installs** and **Takedowns**; filter by area, early/regular, week.',
      'Change a status right in the list: everyone sees it within seconds.',
      '**✉ Email these N** sends a template to each person, one email each from info@: check each and tap **Send ✓ Next** (or **Skip**), or **Send the rest** after one confirm, or **⏰ Schedule the rest** for one time (each still gets their own email, one a second from then). People with a blank in the template (e.g. no install rate on file) are skipped and listed; already-sent or already-scheduled people are skipped. At most 300 emails a day from the app, sent and scheduled together.',
      '**＋ Route these N** puts the filtered list on a route.',
      '**⬇ Export N to spreadsheet** downloads the filtered list as a .csv (clc-season-2026-installs-….csv) for Excel or Google Sheets.',
      '**✨ Plan with Claude (N)** (Installs): Claude proposes an install day for everyone confirmed but not yet scheduled, honoring their wishes, the early-install deadline, each day’s capacity and area grouping. You move or drop people, or type a note in **Tell Claude a change** → **↻ Re-plan** (your note wins, the rest stays, moved people show **Changed**), or **✕** someone out and **Re-plan** to fill their spot; **Apply** writes the dates, then **✉ Email these** sends “You are on the schedule”. Nothing is written until Apply; 20 plans and re-plans a day.',
      '**＋ New filter** (Customers tab, chip row at the top) saves a filter for everyone, e.g. “Needs scheduling”; **Old-site requests** are under Leads; Signs, Emails, Gates and Import are under **More ▾**.',
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
      'Install-day texts on each stop: **🚗 On our way** (about how many minutes out), and after **✓ Done** the **All done** text; each opens Google Voice with the text to paste and shows **told 10:42 am** afterwards. A skipped stop that’s carried over gets them again on its new day.',
      '**Day-before reminders** (on the route’s edit screen, for a route on a later day): every install and takedown stop with its arrival window; **⏰ Email N reminders** schedules “We’re coming tomorrow” for 6:00 pm the evening before (change the time if you like; they sit in Home → Scheduled emails until then); people with no email get a **📱 Text** button. Optimize the route first so the windows are real.',
    ],
  },
  {
    id: 'map', icon: '🗺', title: 'Map', tab: 'map',
    summary: 'Every customer as a pin, colored by this season’s status. Pulsing red = open service call.',
    items: [
      'Opens on our area (Houston to Galveston, centered between Pearland and Clear Lake). **Fit all** shows every pin; on a computer, **📌 Open the map here** makes the current view where the map opens for everyone.',
      'Filter by saved filter, installs/takedowns or area; satellite view; **Full screen** for a wall screen.',
      'Tap a pin: name, status, gate code, miles from home base, **Open customer / Directions / Street View**.',
      '**Put N addresses on the map** finds customers that don’t have a pin yet.',
    ],
  },
  {
    id: 'proposals', icon: '📝', title: 'Light designs & proposals', tab: null,
    summary: 'Mockups on the customer’s own house photo, e-signed proposals and online payments. On any customer or lead.',
    items: [
      '**🎨 New design from a photo**: draw light lines, rectangles (windows) and ovals; pinch to zoom; drag a pin to move it, drag a line to bend it; **Erase** lights behind a tree; **Measure** with a satellite view for real feet. The label on the photo says which tool you’re on; forgot to switch? On **Select**, tap an empty spot to start drawing; on **Lights**, drag a strand to adjust it.',
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
      'Calls marked **🛠 Reported from their account** came from the customer’s own account page (they were told “within 2 days”); they also show in 💬 until someone taps I’ve got it or changes the status.',
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
    id: 'notes', icon: '📒', title: 'Notes', tab: 'notes',
    summary: 'Your own notes, private unless you share them with the team (then Scott sees them under your name).',
    items: [
      '**＋ New note**: a title (optional, the first line is used), the note, and **Share with the team**. Tap one of yours to edit or delete it.',
      'Shared notes from others show under **From Katie P.** / **From Lacie M.**, read-only. Un-share a note and it goes private again.',
      'Search appears once you have more than three. Notes are on your account, not your device: the same list on your phone and your computer.',
    ],
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
      'The red number counts messages **nobody has taken yet**, the same for everyone. Just opening the list doesn’t clear it: tap **I’ve got it** (or **Take it over**), **Dismiss** a junk one in Unmatched, or move a website request off **New**. On the installed app it also shows on the app icon (most phones).',
      'The list shows the last 7 days, newest first, with the person’s name (or their number or email if we don’t know them yet) and the first words. **New** marks what arrived since your last look. Website estimate requests (📝), problem reports (🛠) and messages typed on a customer’s account page (🗨️ *Account message*) are in it too; an account message opens their account with the **💬 Chat** box at the top, where you answer.',
      'Tap one: their account opens with the full Text & call history. Unknown numbers and emails from new people open the **Unmatched** list on Leads: **Link to customer**, **Reply in Gmail** or **Dismiss**.',
      'Emails from someone we don’t know yet are kept unless they look like junk: no-reply and notification senders, PayPal/Google-type services, and newsletters with an unsubscribe link. Those stay only in Gmail.',
      'Texts, voicemails and emails arrive within about 5 minutes (the info@ sync); estimate requests at once. Our own replies aren’t listed.',
      '**✨ Suggest a reply** under any message: Claude reads their history and record and drafts an answer with a one-line summary and a next step. You edit it and send it through the normal Email / Text screens; it never sends on its own. Shows on Home’s Who’s on as “Claude (assistant)” with when it last drafted.',
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
      '**Automatic emails**: the “Got your request” reply, the weather heads-ups and the “still waiting” reminders (see the task above).',
      '**Business texting**: the Google Voice account; **on this device, text from** the business number or your own.',
      '**Install-day texts**: the wording of the day-before reminder, On our way and the two All done texts (install, takedown), with placeholders like {first}, {when} and {eta}; **Reset** puts one back to the standard wording.',
      '**Install availability**: the website’s “Check availability” shows the next real open install days. Set installs on a normal day, the days you work, and change single days (**6** on helper days, **0** for rain or a day off). A day fills up from the Season planned dates and route stops, so keep those current.',
      '**How booked we are (home page)**: a short, true line like “October is 80% booked” under the main buttons on the website. Update it weekly; it hides itself after 14 days.',
      '**Home base** (for distances and routes), **price per foot** for designs, **early-install discounts**.',
      '**Proposals & contracts**: deposit %, takedown % and minimum (set both to 0 if takedown is ever included), countersigner, contract terms.',
      '**🤖 Ask Claude**: the on/off switch for the question panel (off hides the tab and the server refuses questions).',
    ],
  },
  {
    id: 'customer-side', icon: '🙋', title: 'What customers see', tab: null,
    summary: 'So you can answer their questions.',
    items: [
      '**Their proposal link**: the design mockup with before/after, the price, the contract; they sign with their finger and pay the deposit.',
      '**Their invoice link** (christmas-light-creations.com/invoice/…): the invoice with a Pay button, Save or print (PDF), and after paying, their receipt.',
      '**Their own account** at christmas-light-creations.com/account/: sign in with Google or an emailed link (no password). They see their proposals and invoices, what’s due (and pay it), paid invoices with receipts, and, once you tick **Customer can see this**, their yearly price breakdown and what they paid each season. Never a lifetime total.',
      '**Chat with us** on that page: they type to us, we answer from the **💬 Chat** box on their account in this app; each reply also goes to them by email (always: it can’t be turned off). They see “Christmas Light Creations”, never your email.',
      'Takedown that costs $0 shows as **Free**. We don’t store lights: customers keep them, labeled and boxed.',
      'Payments: PayPal, Venmo or card online; Zelle, check, cash and others are recorded by staff in Seasons.',
    ],
  },
]

// "How do I…" grouped by what the person is trying to do (the guide shows
// each group as a short folded list). Titles must match TASKS exactly;
// anything left over shows under "Other".
export const TASK_GROUPS = [
  ['Getting around', ['Find my way around on a phone', 'My checklist on Home']],
  ['Customers & messages', ['Before you call, text or email someone', 'A customer texted, called or emailed', 'A customer wrote from their account (🗨️ Account message)', 'Find anyone fast', 'Text a customer', 'Text customers on install day', 'Sign emails with my name', 'Email a customer', 'Keep notes and share them with Scott', 'Send an email later', 'Let Claude draft the reply', 'Teach the sales assistant', 'Ask Claude a question about the database', 'Get a notification on my phone', 'A customer filled in their property details', 'A customer wants the app on their phone','Ask for a Google review', 'Get the customer list into a spreadsheet']],
  ['New requests', ['A new estimate request came in', 'A request says “🎨 sent a design”', 'A customer picked a date on the website']],
  ['Prices & money', ['Send a price / contract', 'Get paid', 'Bill a customer (invoice)', 'Bill everyone for the season', 'They paid cash, check or Zelle', 'Someone has a cheaper quote', 'Offer Pay in 3', 'Sales tax on an estimate or invoice','A customer asks “why did my price go up?”']],
  ['Installs, takedowns & service', ['Plan installs or takedowns', 'Let Claude plan install days', 'A customer’s lights are out', 'A customer reported a problem from their account', 'Add photos of an install', 'Record what’s installed']],
  ['Automatic emails & the customer side', ['Automatic emails (what the website sends by itself)', 'A customer asks about the warranty', 'A tree pulled a customer’s lights down', 'A customer turned off (or wants to stop) weather emails', 'A customer is confused by their account', 'See who has the app']],
  ['When something breaks', ['A red “website problem” banner showed up', 'An email bounced (❌ Bounced)']],
]

export function groupedTasks(tasks = TASKS) {
  const byTitle = new Map(tasks.map((t) => [t[0], t]))
  const used = new Set()
  const groups = TASK_GROUPS.map(([name, titles]) => [name, titles.map((t) => { used.add(t); return byTitle.get(t) }).filter(Boolean)])
  const rest = tasks.filter(([t]) => !used.has(t))
  return rest.length ? [...groups, ['Other', rest]] : groups
}

// Long "A → B → C" answers read better as numbered steps (3 or more parts).
export function howSteps(how) {
  const parts = String(how).split(' → ')
  return parts.length >= 3 ? parts : null
}

// First-login tour (src/leads/Tour.jsx): the handful of things staff use most.
export const TOUR = [
  { icon: '👋', title: 'Welcome to CLC Staff', body: ['Three minutes on what you’ll use most, and on what the app does by itself while you work. Everything else is in the **?** guide at the top, any time.', '**Save this app to your home screen first** (iPhone: Safari → Share → Add to Home Screen; Android: Chrome ⋮ → Install app). Phone notifications and the 💬 badge only work from the installed app.'] },
  { icon: '🛰', title: 'Home: before you do anything', tab: 'home', body: ['**Recent activity** shows who emailed, texted, called, invoiced or scheduled what, and when. Glance at it before you call someone, so nobody does it twice.', '**My checklist** (today, this week, the season; ticks clear by themselves), **counters** (new messages, requests, unpaid invoices, open service calls), **today’s routes** with each stop’s progress, and the **status lights**: green is good, red means tap the banner.'] },
  { icon: '💬', title: 'Customer messages', tab: 'home', body: ['The **💬** button (top right) counts texts, voicemails, missed calls, emails, website requests, problem reports and account messages **nobody has taken yet**. Tap **I’ve got it** on the one you’ll answer; everyone sees “Katie is on it”.', 'Turn on **phone notifications** there. By itself: if anything sits **2+ hours** with nobody on it, the app nudges the team every hour, 8 am to 8 pm, until someone takes it.'] },
  { icon: '🗨️', title: 'Chat with a customer', tab: 'accounts', body: ['Customers can type to us on their own account page (**Chat with us**). Each message lands in the same **💬** list as 🗨️ *Account message* and on your phone. Tap it: their account opens with the **💬 Chat** box at the top (it’s under **Edit details** too).', 'Type your answer and **Send reply**: it’s saved on their account and they get an email with your words and a button back to the chat. Recent activity shows who replied.'] },
  { icon: '📥', title: 'Leads: new estimate requests', tab: 'leads', body: ['Every request from the website lands here with a Street View photo and, if they used the free designer, their own drawing. Call or text them, set the status, add notes. When they say yes: **Make customer**.', 'By itself, the moment a request lands: staff get the alert email and a phone notification, and the customer gets a branded **“Got your request”** email (what happens next, the designer, Pay in 3). It shows in their history.'] },
  { icon: '🔎', title: 'Accounts: find anyone', tab: 'accounts', body: ['Type a name, street, phone or gate code. Their whole account opens: photo of the house, seasons, proposals, invoices, photos, messages. Set this season’s **install status and date right there**.', 'The **Customer login** line shows whether they’ve signed in to their own account and whether they have the app on their phone.'] },
  { icon: '📅', title: 'Customers & Season', tab: 'season', body: ['**Customers** is the full list, with saved filters in the chip row. **Season** is this year’s installs and takedowns by status; change a status in the list and everyone sees it.', 'From either: **✉ Email these**, **＋ Route these**, or **✨ Plan with Claude** to get install days proposed for everyone confirmed but unscheduled; you adjust and Apply.'] },
  { icon: '🚚', title: 'Routes and install day', tab: 'route', body: ['**＋ New route**, add stops, **⚡ Optimize** by drive time, **Send to the installer**. On the day: **🚗 On our way** and **All done** texts from each stop, **Done** or **Skip, carry over**, with the customer’s gate code and heads-ups (sprinklers, pets) right there.', '**Day-before reminders** go out at 6 pm the evening before (boxes on the porch, “Gate? Reply with the code”). By itself: when storms, strong wind or a freeze are forecast, customers on a route that day are emailed that the date may move, and you get a notification naming the stops.'] },
  { icon: '📝', title: 'Prices and getting paid', tab: 'invoices', body: ['On a customer: **🎨 design on their photo** → **📝 New proposal** (Buy, Lease or **Pay in 3**; sales tax on the right lines) → **Send**. They sign on their phone and pay by PayPal, Venmo or card. Returning customers and the rest: **Invoices → ＋ New invoice**.', 'By itself: receipts and “paid” emails, the season’s billing fills in, invoice reminders 7 and 14 days after due, and Pay-in-3 customers get their Pay link the morning each payment is due.'] },
  { icon: '🛠', title: 'Service', tab: 'service', body: ['**Log call**: the customer, the problem, details; To do → Scheduled → Done. Address, gate code and Call / Text / Map on each.', 'Customers can also tap **Report a problem** on their own account page: it lands here, in 💬 and on your phones by itself, marked **🛠 Reported from their account**.'] },
  { icon: '✉️', title: 'Email from the app', tab: 'emails', body: ['Pick a template, it fills in their name and dates, **Send** from info@ now or **⏰ Send later**. Every email lands in the person’s history; **❌ Bounced** shows when Gmail couldn’t deliver one.', 'Every customer email carries the logo, the phone and the “found us in spam?” line by itself. Switches for the automatic ones are in **⚙ Settings → Automatic emails**.'] },
  { icon: '✨', title: 'Claude in the app', tab: 'home', body: ['**✨ Suggest a reply** under any message drafts an answer in our voice from their history; you edit and send it. **🤖 Ask Claude** answers questions over the database (read-only). **✨ Plan with Claude** proposes install days.', 'Teach it facts once in **⚙ Settings → What the sales assistant knows**. It never quotes a price it wasn’t given and never sends anything on its own.'] },
  { icon: '🙋', title: 'What customers have', body: ['Their own account at christmas-light-creations.com/account (no password): agreements, pay online, their install day, Report a problem, their gate code and pets, Email preferences, a Help search, and the app on their phone.', 'So you can answer them: the **lifetime warranty** (worn-out lights replaced new while they’re a customer), **trees** (branches pulling lights down aren’t covered; the re-hang is a paid visit after booked installs), and the **price promise** (beat a written proposal by 10%).'] },
  { icon: '⚙', title: 'What runs by itself', tab: 'home', body: ['Request alerts and the “Got your request” reply, the still-waiting nudge (hourly, 8 to 8), the weather watch (4:30 pm), invoice and Pay-in-3 reminders, receipts and season billing, the 7:30 am daily check email, bounce flags, website uploads deleted after 30 days, and “Check availability” on the site from the real schedule.', 'That’s the tour. Reopen it any time: **? → 🧭 Take the tour**. When something breaks, the red banner on Home says what, in plain words.'] },
]
