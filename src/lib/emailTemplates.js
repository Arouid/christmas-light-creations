// Stock email templates for staff, in season order. {placeholders} are filled
// per customer (see PLACEHOLDERS in messages.js). Staff can edit these or add
// their own in the app's Emails tab; edits are stored in settings/app as
// `emailTemplates` and replace the stock one with the same id.

const sign = '\n\nThank you,\n{business}\n{businessPhone}'

export const TEMPLATE_GROUPS = ['General', 'Estimates', 'Booking', 'Install', 'Service', 'Takedown', 'Thank you', 'Our templates']

export const STOCK_TEMPLATES = [
  // General: quick "we got it" replies for when there's no date or answer yet
  // (owner 2026-10-10: people write "yes, put me on the schedule!" before we know the day).
  {
    id: "got-it-schedule", group: "General", label: "Yes, put me on the schedule!",
    when: "They said yes but the install date isn't set yet.",
    subject: "You're on our list for {season}",
    body: `Hi {first},

Great, you're on the list! We don't have your exact install date yet: we build the schedule area by area as the season fills in, and we'll email or text you your date as soon as it's set. Nothing to do on your end for now.

If some dates work best for you (or don't work at all), reply and we'll do our best to match them.

Reminder: installs done by October 31st get 10% off.${sign}`,
  },
  {
    id: "got-message", group: "General", label: "Got your message",
    when: "Any message you can't answer right away.",
    subject: "Got your message",
    body: `Hi {first},

Thanks for your message, we've got it. We're out installing most of the day, so we check messages between jobs and reply within a day, usually sooner.

Need us faster? Call or text {businessPhone}.${sign}`,
  },
  {
    id: "got-photos", group: "General", label: "Got your photos",
    when: "They sent photos of the house for a rough quote.",
    subject: "Got your photos, thank you",
    body: `Hi {first},

Thanks for the photos of {address}! That's a big help. We'll look them over and get back to you with a rough quote. If we need a closer look at anything, we'll let you know.${sign}`,
  },
  {
    id: "got-info", group: "General", label: "Thanks for the details",
    when: "Gate code, access notes, a change of plans, anything we noted down.",
    subject: "Got it, thank you",
    body: `Hi {first},

Got it, thank you! We've added that to your notes so the crew has it when they come out.

Anything else changes, just reply here.${sign}`,
  },
  {
    id: "will-call", group: "General", label: "We'll call you",
    when: "The answer is easier by phone.",
    subject: "We'll give you a call",
    body: `Hi {first},

Thanks for your message. This one is easier to sort out by phone, so we'll give you a call in the next day or so. If there's a time that works best, reply with it and we'll aim for that.${sign}`,
  },
  {
    id: "checking", group: "General", label: "Let me check and get back to you",
    when: "A question you need to check with the crew or the schedule first.",
    subject: "Checking on that for you",
    body: `Hi {first},

Good question. Let me check with the crew and our schedule and get back to you shortly.

If it's urgent, call or text {businessPhone}.${sign}`,
  },
  {
    id: 'estimate-thanks', group: 'Estimates', label: 'Got your request',
    when: 'Right after a website estimate request comes in.',
    subject: 'Your Christmas light estimate request',
    body: `Hi {first},\n\nThanks for reaching out to {business}! We got your estimate request for {address}.\n\nWe'll swing by to measure your roofline with a measuring wheel. It takes about 30 minutes, there's no roof climbing, and you don't need to be home unless we need to get through a gate. In a hurry? Reply with a few phone photos of the front of your home and we can send a rough quote.\n\nWe'll be in touch soon to let you know when we're coming by.${sign}`,
  },
  {
    id: 'estimate-quote', group: 'Estimates', label: 'Here is your estimate',
    when: 'After measuring. Put the price in Install rate first, or type it in.',
    subject: 'Your {season} Christmas light estimate',
    body: `Hi {first},\n\nThanks for letting us measure! Your estimate for {address} is {rate}.\n\nThat includes:\n- All lights, clips, cords, timers and labor, custom-fit to your home\n- Free service calls all season, as many as you need\n- Removal in January (billed at removal); you keep the lights, labeled and binned\n\nEvery year after, re-installing is 50% of the original price. Installs start October 15th, and installs done by October 31st get 10% off.\n\nReply "yes" with any timing preferences and we'll get you on the schedule.${sign}`,
  },
  {
    id: 'estimate-followup', group: 'Estimates', label: 'Estimate follow-up',
    when: 'A week or so after sending an estimate with no answer.',
    subject: 'Checking in on your Christmas light estimate',
    body: `Hi {first},\n\nJust checking in on the estimate we sent for {address}. Any questions we can answer?\n\nThe schedule fills up fast once November hits, so if you'd like your lights up in time, reply here or call or text us at {businessPhone}.${sign}`,
  },
  {
    id: 'winback', group: 'Estimates', label: 'Still want lights? (past requests)',
    when: 'People who asked on the old website years ago (Past requests tab).',
    subject: 'Still thinking about Christmas lights?',
    body: `Hi {first},

Back in {asked} you asked {business} about putting up Christmas lights. We'd still love to light up your home!

We're booking {season} installs now. Estimates are free: we measure your roofline in about 30 minutes, no roof climbing, and you don't need to be home. Installs done by October 31st get 10% off.

Just reply to this email, or call or text {businessPhone}. If you're all set, no worries, and Merry Christmas!${sign}`,
  },
  {
    id: 'comeback', group: 'Estimates', label: 'We miss you (former customers)',
    when: 'People who paid us in past years but are not customers now (Past requests → Win-backs).',
    subject: 'Christmas lights again this year?',
    body: `Hi {first},

It's {business}! It's been a while since we lit up your home, and we'd love to have you back this season.

We're booking {season} installs now. If you still have your lights from us, let us know: re-installing them costs less than new. Installs done by October 31st get 10% off.

Just reply to this email, or call or text {businessPhone}. If you're all set, no worries, and Merry Christmas!${sign}`,
  },
  {
    id: 'reinstall', group: 'Booking', label: 'Re-install invite',
    when: 'Late summer/fall, to returning customers.',
    subject: 'Your {season} Christmas lights',
    body: `Hi {first},\n\nIt's {business}! We're booking {season} installs now and would love to light up your home again. Reply to this email (or text {businessPhone}) with "yes" and any timing preferences, and we'll get you on the schedule.\n\nInstalls done by October 31st get 10% off, and early spots book up fast.${sign}`,
  },
  {
    id: 'schedule', group: 'Booking', label: 'Pick your install date',
    when: 'Customer said yes; ask what dates work.',
    subject: 'Scheduling your {season} install',
    body: `Hi {first},\n\nWe're putting together the install schedule. Reply with the dates that work best for you, and let us know any gate code or access notes we should have.\n\nReminder: installs done by October 31st get 10% off.${sign}`,
  },
  {
    id: 'schedule-confirm', group: 'Booking', label: 'You are on the schedule',
    when: 'Once the date is set. Fill Day, Planned date and Timeframe first.',
    subject: 'Your install is scheduled: {day}, {date}',
    body: `Hi {first},\n\nYou're on the schedule! We'll be at {address} on {day}, {date}, {timeframe}.\n\nYou don't need to be home. A few things that help:\n- Leave side gates unlocked (or reply with the gate code)\n- Make sure the outdoor outlets work\n- Keep cars clear of the driveway if you can\n\nYour total for this season is {total}.\n\nSee you soon!${sign}`,
  },
  {
    id: 'reschedule', group: 'Booking', label: 'We need to reschedule',
    when: 'Weather or a delay moves an install. Early-install discounts are kept.',
    subject: 'New date for your install',
    body: `Hi {first},\n\nWe're sorry, but we need to move your install. Your new date is {day}, {date}, {timeframe}.\n\nDon't worry: if you were booked for an early install, you keep your early-install discount.\n\nIf the new date doesn't work, just reply and we'll find another.${sign}`,
  },
  {
    id: 'gate', group: 'Booking', label: 'Need your gate code',
    when: 'Before an install or takedown at a gated home or neighborhood.',
    subject: 'Gate code for your visit',
    body: `Hi {first},\n\nWe're coming out to {address} soon. Is there a gate code or a side gate we should know about? Just reply with the code or any access notes.${sign}`,
  },
  // Day-before reminders go out from the route (Routes → open the route →
  // Day-before reminders), which fills {visitDay}, {when} and {job} from the
  // stop's times (docs/specs/install-texts.md). Sent from anywhere else those
  // placeholders are blank and the Email box warns.
  {
    id: 'install-reminder', group: 'Install', label: 'We’re coming tomorrow (day-before reminder)',
    when: 'The evening before an install, from the route’s edit screen (Day-before reminders).',
    subject: 'We’re coming tomorrow: your lights on {visitDay}',
    body: `Hi {first},\n\nJust a reminder that we'll be at {address} tomorrow, {visitDay}, {when}, for your {job}.\n\nA few things that help:\n- Leave side gates unlocked (we have your gate code if you gave us one)\n- Keep dogs inside while we're there\n- Make sure the outdoor outlets work\n{boxesEmail}{gateAskEmail}\nYou don't need to be home. Questions? Call or text {businessPhone}.${sign}`,
  },
  {
    id: 'install-done', group: 'Install', label: 'Your lights are up',
    when: 'Same day the install is finished.',
    subject: 'Your lights are up!',
    body: `Hi {first},\n\nYour lights are up! They're on a timer, so they'll come on by themselves each evening.\n\nIf anything goes out (a bulb, a strand, a tripped outlet), just call or text {businessPhone}. Service calls are free all season, usually same day.\n\nYour total for this season is {total}. Your invoice will come through PayPal; we also take Zelle, Venmo, Cash App, check or cash.\n\nEnjoy, and Merry Christmas!${sign}`,
  },
  {
    id: 'payment-reminder', group: 'Install', label: 'Payment reminder',
    when: 'Invoice still open a couple of weeks after install.',
    subject: 'Friendly reminder: {season} Christmas lights',
    body: `Hi {first},\n\nHope you're enjoying your lights! Just a friendly reminder that your balance of {total} for this season is still open.\n\nYou can pay the PayPal invoice, or by Zelle, Venmo, Cash App, check or cash. If you've already paid, thank you, and please ignore this!${sign}`,
  },
  {
    id: 'service-done', group: 'Service', label: 'Fixed your lights',
    when: 'After a service call is done.',
    subject: 'Your lights are fixed',
    body: `Hi {first},\n\nWe've been out to {address} and your lights should be all set. If anything else goes out, just call or text {businessPhone}. Service calls are always free.${sign}`,
  },
  {
    id: 'service-timer', group: 'Service', label: 'Timer / outlet tips',
    when: 'Customer says lights are off; things to try first.',
    subject: 'Quick checks for your lights',
    body: `Hi {first},\n\nSorry your lights are giving you trouble! A couple of quick things to check:\n- Outdoor outlets (GFCI): press the "reset" button on the outlet, and check for another GFCI in the garage or a bathroom\n- Timer: make sure it's plugged in all the way and switched to "timer" or "on"\n\nIf that doesn't do it, reply here or text {businessPhone} and we'll come take care of it, free.${sign}`,
  },
  {
    id: 'takedown', group: 'Takedown', label: 'Takedown is coming',
    when: 'Late December, before removals start January 3rd.',
    subject: 'Taking down your lights in January',
    body: `Hi {first},\n\nHope you had a wonderful Christmas! Removals start January 3rd and wrap up by the 13th. You don't need to be home; just leave side gates unlocked or reply with your gate code.\n\nWe'll label, wrap and bin your lights so they're ready for next year.${sign}`,
  },
  {
    id: 'takedown-reminder', group: 'Takedown', label: 'We’re coming tomorrow (takedown reminder)',
    when: 'The evening before a takedown, from the route’s edit screen (Day-before reminders).',
    subject: 'We’re coming tomorrow to take down your lights',
    body: `Hi {first},\n\nJust a reminder that we'll be at {address} tomorrow, {visitDay}, {when}, to take down your lights. We'll label, wrap and bin them so they're ready for next year.\n\n{boxes}{gateAsk}Please leave side gates unlocked and keep dogs inside while we're there. You don't need to be home. Questions? Call or text {businessPhone}.${sign}`,
  },
  {
    id: 'takedown-done', group: 'Takedown', label: 'Lights are down',
    when: 'After the takedown.',
    subject: 'Your lights are down and stored',
    body: `Hi {first},\n\nYour lights are down, labeled and binned, ready for next season. Your removal total is {takedownRate}; the invoice will come through PayPal (or pay by Zelle, Venmo, Cash App, check or cash).\n\nThank you for another great season! We'll reach out in late summer to schedule next year, when re-installing is 50% of the original price.${sign}`,
  },
  {
    id: 'review', group: 'Thank you', label: 'Review request',
    when: 'After a happy install or service call.',
    subject: 'Thank you from {business}',
    body: `Hi {first},\n\nThank you for choosing {business}! If you have a minute, a Google review really helps our small family business:\n{reviewLink}\n\nMerry Christmas,\n{business}`,
  },
  {
    id: 'thanks-season', group: 'Thank you', label: 'Thanks for the season',
    when: 'End of season, to everyone.',
    subject: 'Thank you for a great {season} season',
    body: `Hi {first},\n\nThank you for letting us light up your home this year. It means a lot to our family business.\n\nWe'll be in touch in late summer about next season. If friends or neighbors ask about your lights, we'd love the referral!${sign}`,
  },
  {
    id: 'custom', group: 'Our templates', label: 'Blank',
    when: 'Write your own.',
    subject: '',
    body: `Hi {first},\n\n\n${sign.trimStart()}`,
  },
]

// Stock templates with staff edits applied, plus staff-added ones.
export function mergeTemplates(saved = []) {
  const byId = new Map(saved.map((t) => [t.id, t]))
  const stock = STOCK_TEMPLATES.map((t) => (byId.has(t.id) ? { ...t, ...byId.get(t.id), edited: true } : t))
  const added = saved.filter((t) => !STOCK_TEMPLATES.some((s) => s.id === t.id)).map((t) => ({ group: 'Our templates', ...t, custom: true }))
  return [...stock, ...added]
}

export const isStock = (id) => STOCK_TEMPLATES.some((t) => t.id === id)
