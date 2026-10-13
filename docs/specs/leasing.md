# Leasing and the monthly plan on the website

> Status: copy drafted 2026-10-12 for the owner's review (his decision in the claude.ai hand-off, `docs/inbox/sales-agent-handoff-2026-10-12.md`: "yes, put leasing and the monthly plan on the public site; show me the wording before pushing"). **Nothing is on the site yet.** Monthly amounts and the contract terms stay off the site until the attorney's review (TODO #30).

## What customers can choose (facts, from the owner)

| | Purchase (today's model) | Lease (paid yearly) | Monthly plan (pilot) |
|---|---|---|---|
| Who owns the lights | The customer, once paid | We do | We do |
| The design | Locked as bought; add-ons charged in full the first year | New design any year, or keep last year's | Same as the lease |
| Price over the years | Year 1 full; re-install 50% of the original every year after | Year 1 full; another 10% off the original every returning year, capped at 50% off | Set with the quote; **not published** |
| Removal | Set price, due in January | Set price, due in January | **Included** |
| Payment | Deposit + balance | Deposit + balance | 12 monthly autopay payments; terms with the quote |

We only install lights that came from us.

## Proposed copy

### 1. Home page, pricing block (`pricingNotes` in `src/data/content.js`)

Today: *Removal · Set price* / *Re-install · 50%* / *Service calls · $0*. Proposed: keep those three and add a short "Your options" row above the FAQ link:

- **Buy** — Own your lights. We put them back up every year for 50% of the original price.
- **Lease** — We keep the lights; pick a new look any year. 10% off for every year you come back, up to 50% off.
- **Monthly plan** (new this season) — The lease, split into 12 monthly payments, removal included. Ask us when you request your estimate.

### 2. FAQ (`faq` in `src/data/content.js`)

**Paying**
- *Can I lease the lights instead of buying them?* — Yes. With a lease we keep the lights, and every year you choose a brand-new design or keep the one you had. Year one is full price; every year you come back takes another 10% off the original price, up to 50% off. Nothing to store, test or replace.
- *What's the monthly plan?* — A way to spread a lease over the year: 12 monthly payments by autopay instead of one up front, with removal included. It's new this season, so we go over the details with you on your quote.

**Removal & next year**
- *Do I own the lights?* (reworded) — If you buy them, yes: once they're paid for, they're yours, and every year after we put them back up for about half the original price. If you lease, we keep them and you get a fresh design any year. Either way, we call in late summer to get you on the schedule.
- *Can you hang lights I already own?* (new) — No. We only install lights that came from us, so we can guarantee every bulb all season.

### 3. Nothing else changes now

- Privacy page: nothing new is collected (the monthly plan's card on file comes later with PayPal subscriptions, TODO J).
- Estimate form: unchanged ("What do you need?" waits on gift wrapping, TODO E).
- After the copy lands, `node scripts/build-assistant-knowledge.mjs` rebuilds the assistant's FAQ knowledge so ✨ Suggest a reply says the same words.

## Owner's call

Say "copy ok" or send edits (any wording, or drop the monthly-plan line until the attorney has answered). Then: `content.js`, knowledge rebuild, check at 375 px, `docs/verified.md`, push.
