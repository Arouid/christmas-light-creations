// Default contract terms (editable in staff Settings). Plain language, built
// from CLC's published policies and the owner's choices (2026-10-09: if CLC
// can't install by Dec 1 the customer may choose a refund; standard limited
// liability; 2026-10-12: deposits refundable in full through October 15, half
// through November 1, not from November 2). NOT legal advice: a Texas
// attorney should review it. Any [TO FILL IN] left in terms blocks sending.

export const FILL_IN = '[TO FILL IN'

export const DEFAULT_TERMS = `1. The work. {business} will provide and install the Christmas lighting described in this proposal at {address} for the {season} season, service it at no extra charge during the season, and take it down in January.

2. Price and payment. The total is {total}. A deposit of {deposit} ({depositPct} of the install) is due when you sign and holds your install date. The rest of the install, {dueAtInstall}, is due when installation is complete. Takedown in January: {takedownCost}. We accept PayPal, Zelle, Venmo, Cash App, check or cash.

3. Scheduling. Installs begin October 15. We will confirm your install date with you. Weather or safety can require us to reschedule; if we move an early install, you keep your early-install discount.

4. Service calls. If any of our lights, cords, clips or timers stop working during the season, contact us at {businessPhone} and we will repair or replace them at no charge, usually the same day locally and within 48 hours during the busiest weeks.

5. Access and your property. You agree to give us access to the areas being lit (including gate codes) and working outdoor outlets, and to tell us about anything we should avoid (sprinkler heads, buried lines, pets, fragile plants). We do not install on clay or other tile roofs.

6. Takedown and ownership. Takedown starts January 3 and is finished by January 13. Once paid in full, the lights and materials are yours: we label, wrap and bin them for you to keep. Re-installing them in a future season is 50% of the original install price ({nextYear} for this design).

7. Cancellation and refunds. Your deposit holds your install date. If you cancel on or before October 15, we refund your deposit in full; if you cancel between October 16 and November 1, we refund half of it; from November 2 on, it is non-refundable. If we have to cancel or reschedule your install (for example, because of weather), we will first offer you a new install date. If we cannot complete your install by December 1, you may choose a full refund of your deposit instead, starting December 1.

8. Damage and liability. We carry liability insurance and take care around your home. If we damage your property while doing this work, we will repair it or pay for the repair. We are not responsible for problems that existed before our work (such as outlets, GFCIs, wiring, roofing, shingles, gutters or trim already in poor condition); for damage caused by weather, power outages or surges, animals, or other events beyond our control; or for items we were not told about (such as buried lines, sprinkler heads or fragile decorations). Except for damage caused by our negligence, our total liability under this agreement is limited to the amount you paid us under it.

9. Electronic signature. By signing electronically you agree that your electronic signature is the legal equivalent of your handwritten signature on this agreement, and that you may save or print a copy.`

// Variants by kind and plan (owner 2026-10-12; pilot wording, attorney review
// TODO #30). A Pay-in-3 plan swaps clauses 2 and 7; a lease swaps clause 6.
// They replace the numbered paragraph in whatever terms the owner keeps in
// Settings, so his edits to the other clauses carry over.
export const PAYIN3_PAYMENT = `2. Price and payment (Pay in 3). The total is {total}, paid in three payments: {payment1} when you sign, which holds your install date; then {payment2} and {payment3} on the day of the month you choose when you sign (the 1st or the 15th), one in each of the two months after you sign. We email you a payment link that morning. By signing you agree to pay the full total in these three payments. We accept PayPal, Zelle, Venmo, Cash App, check or cash.`

export const PAYIN3_CANCELLATION = `7. Cancellation and refunds. Your first payment holds your install date. You may cancel within 3 days of signing for a full refund of it. After those 3 days, the full total for the season is owed in the three payments above, whether or not you cancel. If we have to cancel or reschedule your install (for example, because of weather), we will first offer you a new install date. If we cannot complete your install by December 1, you may choose a full refund of your first payment instead, starting December 1.`

export const LEASE_OWNERSHIP = `6. Takedown and the lights (lease). Takedown starts January 3 and is finished by January 13. The lights and materials stay ours: we store, test and maintain them between seasons, and each season you choose a brand-new design or keep this one. Each season you come back takes another 10% off this season's price ({nextYear} next season), up to 50% off.`

const clauseRe = (n) => new RegExp(`(^|\\n\\n)${n}\\. [^]*?(?=\\n\\n\\d+\\. |$)`)
const swapClause = (text, n, clause) => (clauseRe(n).test(text) ? text.replace(clauseRe(n), (m, lead) => `${lead}${clause}`) : text)

// The terms for a proposal's kind and plan, built on `base` (the owner's
// Settings terms, or the default). Terms without numbered clauses are left as they are.
export function defaultTerms({ kind = null, plan = null } = {}, base = DEFAULT_TERMS) {
  let t = base
  if (kind === 'lease') t = swapClause(t, 6, LEASE_OWNERSHIP)
  if (plan === 'payin3') { t = swapClause(t, 2, PAYIN3_PAYMENT); t = swapClause(t, 7, PAYIN3_CANCELLATION) }
  return t
}
