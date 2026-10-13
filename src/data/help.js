// Self-help on the account page (owner 2026-10-12: "a knowledge base in case
// someone is confused or doesn't understand how something works... a search
// box... since we aren't providing tech support"). Plain answers; the search
// is a word match over the question, the answer and the tags. Pure.
import { TREE_NOTICE } from '../../functions/notices.js'
import { GFCI_TIP } from '../../functions/notices.js'

const PHONE = '281-819-0163'

export const HELP = [
  { id: 'sign-in', q: 'How do I sign in?', tags: 'login password link google email',
    a: `There is no password. Tap Sign in with Google, or type the email we have for you and tap Email me a link: the email has a one-tap link that signs you in. Use the same email your estimate or invoice was sent to.` },
  { id: 'no-link', q: 'The sign-in email never came', tags: 'spam junk promotions link expired once',
    a: `Check your spam or promotions folder and mark it "Not spam" so the next one lands in your inbox. The link works once; ask for a new one if you used it already. If the email we have for you is different from the one you typed, nothing is sent: call or text ${PHONE} and we will fix the address.` },
  { id: 'pay', q: 'How do I pay?', tags: 'payment paypal venmo card zelle cash check invoice deposit balance',
    a: `Under Agreements & payments, tap Pay on anything due: PayPal, Venmo or a card. Zelle, Cash App, check or cash work too (text us and we mark it paid). A payment made online shows as paid within a minute.` },
  { id: 'payin3', q: 'What is Pay in 3?', tags: 'payments monthly plan thirds installments',
    a: `Three equal payments that cover everything (install and takedown): the first when you sign, then one a month on the 1st or the 15th, whichever you picked when you signed. We email the link the morning each one is due. Same price as paying up front.` },
  { id: 'lights-out', q: 'My lights are out', tags: 'outlet gfci reset breaker timer strand dark not working',
    a: `${GFCI_TIP} If a whole section is dark, or a strand is down, tap Report a problem under Your lights (or text a photo to ${PHONE}): service calls are free all season.` },
  { id: 'warranty', q: 'Is there a warranty on my lights?', tags: 'lifetime warranty replace worn sun broken guarantee',
    a: `Yes, for life, for as long as you stay a customer: when we install your lights, you are covered from that install until your next one with us, season after season. Decide not to have us install one year, and it ends there. When the Texas sun has finally worn out the plastic housings, five or more years in, we replace everything brand new at no charge; in 15 years we have never charged a cent for it. During the season, anything that goes out is fixed free, usually the same day. Not covered: damage from trees, storms, animals, vehicles or your home's wiring (see your agreement).` },
  { id: 'timer', q: 'When do the lights come on?', tags: 'timer dusk schedule hours',
    a: `They are on a timer set at the install, usually dusk until late evening. Want different hours? Text us and we will adjust it on our next visit, or on a service call.` },
  { id: 'trees', q: 'A tree pulled my lights down', tags: 'branches trim wind roof gutter rehang service',
    a: TREE_NOTICE },
  { id: 'dates', q: 'When will you install or take down my lights?', tags: 'schedule date week install takedown january',
    a: `Your lights section shows the day or week once it is set; we schedule area by area and text the day before. Takedown runs from January 3 to about January 13, weather and the number of homes permitting. You never need to be home.` },
  { id: 'weather', q: 'It is going to rain or storm on my install day', tags: 'weather rain wind lightning freeze reschedule',
    a: `Rain, lightning and strong wind keep our crew off the roof, so the date may move to the next clear day. We text you if it does, and you keep any early-install discount. When bad weather is coming we email a heads-up the afternoon before.` },
  { id: 'email-prefs', q: 'How do I stop the weather and tips emails?', tags: 'unsubscribe opt out notifications spam',
    a: `Under Email preferences, switch off Weather heads-ups and seasonal tips. Agreements, bills, payment reminders, scheduling and replies to you always come through.` },
  { id: 'details', q: 'My gate code changed, or there is something in my yard to avoid', tags: 'gate code hoa sprinklers pets property details',
    a: `Update Your property details: gate code, HOA and its lights-down date, things in the yard we should avoid (sprinkler heads, landscape lights, pet-fence wire) and pets. Our crew sees it on the day.` },
  { id: 'boxes', q: 'Where should my boxes of lights be?', tags: 'porch storage box bin re-install takedown',
    a: `For a re-install, set your labeled boxes out on the porch by the morning of your day. For a takedown, set an empty box or bin out and we pack your lights into it. No box out: we may leave the lights stacked on the porch, or provide a new box for $15.` },
  { id: 'hoa', q: 'My HOA wants the lights down by a certain date', tags: 'hoa deadline rules deed restriction',
    a: `Tell us when you sign, or at least 30 days before that date, in Your property details (HOA: lights down by), and we plan your takedown around it.` },
  { id: 'cancel', q: 'Can I cancel or get a refund?', tags: 'cancel refund deposit',
    a: `Your deposit holds your date. Cancel on or before October 15 for a full refund of the deposit; October 16 to November 1, half; after that it is not refundable, except when we are the ones who cannot do the install. The full terms are in your agreement.` },
  { id: 'price', q: 'Why did my price change?', tags: 'yearly price add-on increase re-install',
    a: `If you added lights (an arch, a tree, more roofline), the new part is charged in full that year and adds about half its price to your yearly re-install from then on. Your yearly price section shows the breakdown.` },
  { id: 'app', q: 'How do I put the app on my phone?', tags: 'install home screen android iphone notifications',
    a: `Under Get the app: on Android tap Install; on an iPhone open this page in Safari, tap Share, then Add to Home Screen. Phone notifications of any kind only work from the installed app, so add it first if you want them.` },
  { id: 'contact', q: 'How do I reach a person?', tags: 'call text phone email hours support',
    a: `Call or text ${PHONE}, or reply to any email from us. We answer in the order messages come in, usually the same day. There is no separate tech support line: this page and Report a problem cover the common questions.` },
]

const words = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1)

// Entries matching the query, best first; the whole list for a blank query.
export function searchHelp(query, list = HELP) {
  const q = words(query)
  if (!q.length) return list
  return list
    .map((h) => {
      const hay = `${h.q} ${h.tags} ${h.a}`.toLowerCase()
      const title = h.q.toLowerCase()
      const score = q.reduce((n, w) => n + (title.includes(w) ? 3 : 0) + (String(h.tags).includes(w) ? 2 : 0) + (hay.includes(w) ? 1 : 0), 0)
      return [score, h]
    })
    .filter(([n]) => n > 0)
    .sort((a, b) => b[0] - a[0])
    .map(([, h]) => h)
}
