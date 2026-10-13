# Leasing and the pay-in-3 plan on the website

> Status: **live 2026-10-12** (owner: "copy ok"): the options row (Buy / Lease / Pay in 3) under the pricing stats on the home page and the four FAQ answers below are on the site; the assistant's FAQ knowledge rebuilt. The plan's contract terms (cancellation, moving) stay off the site until the attorney's review (TODO #30).

## What customers can choose (facts, from the owner)

| | Purchase (today's model) | Lease (paid up front) | Pay in 3 (pilot) |
|---|---|---|---|
| Who owns the lights | The customer, once paid | We do | We do |
| The design | Locked as bought; add-ons charged in full the first year | New design any year, or keep last year's | Same as the lease |
| Price over the years | Year 1 full; re-install 50% of the original every year after | Year 1 full; another 10% off the original every returning year, capped at 50% off | Same as the lease |
| Removal | Set price, due in January | Set price, due in January | **Included** |
| Payment | Deposit + balance | Deposit + balance | Three equal payments: at signing, when the lights are up, in January; no long-term commitment (owner 2026-10-12) |

We only install lights that came from us.

## Proposed copy

### 1. Home page, pricing block (`pricingNotes` in `src/data/content.js`)

Today: *Removal · Set price* / *Re-install · 50%* / *Service calls · $0*. Proposed: keep those three and add a short "Your options" row above the FAQ link:

- **Buy** — Own your lights. We put them back up every year for 50% of the original price.
- **Lease** — We keep the lights; pick a new look any year. 10% off for every year you come back, up to 50% off.
- **Pay in 3** (new this season) — Split your lease into three equal payments: when you sign, when the lights are up, and in January. No long-term commitment.

### 2. FAQ (`faq` in `src/data/content.js`)

**Paying**
- *Can I lease the lights instead of buying them?* — Yes. With a lease we keep the lights, and every year you choose a brand-new design or keep the one you had. Year one is full price; every year you come back takes another 10% off the original price, up to 50% off. Nothing to store, test or replace.
- *What's Pay in 3?* — A lease paid in three equal payments instead of one up front: when you sign, when your lights are up, and in January, with removal included. No long-term commitment: it's season by season. We go over the details with you on your quote.

**Removal & next year**
- *Do I own the lights?* (reworded) — If you buy them, yes: once they're paid for, they're yours, and every year after we put them back up for about half the original price. If you lease, we keep them and you get a fresh design any year. Either way, we call in late summer to get you on the schedule.
- *Can you hang lights I already own?* (new) — No. We only install lights that came from us, so we can guarantee every bulb all season.

### 3. Nothing else changes now

- Privacy page: nothing new is collected (the monthly plan's card on file comes later with PayPal subscriptions, TODO J).
- Estimate form: unchanged ("What do you need?" waits on gift wrapping, TODO E).
- After the copy lands, `node scripts/build-assistant-knowledge.mjs` rebuilds the assistant's FAQ knowledge so ✨ Suggest a reply says the same words.

## Owner's call

Say "copy ok" or send edits (any wording, or drop the Pay-in-3 line until the attorney has answered). Then: `content.js`, knowledge rebuild, check at 375 px, `docs/verified.md`, push.
