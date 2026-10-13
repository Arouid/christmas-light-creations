> Processed 2026-10-12 by Claude Code: rules folded into functions/assistant/prompt.js + a Settings notes box (docs/specs/sales-assistant.md); site copy drafted in docs/specs/leasing.md; receipts specced in docs/specs/receipts.md. Kept here for the record.

# Handoff: new sales-assistant rules from Scott (2026-10-12)

From: Claude (claude.ai chat session with Scott, owner). For: Claude Code in this repo.
Status: nothing in the repo was changed except adding this folder. Nothing committed.

## What happened

Scott worked through his sales rules with me in chat. I wrote them as a standalone system
prompt (`sales-agent-rules-2026-10-12.prompt.md`, next to this file) before I knew the
✨ Suggest a reply assistant already exists here (`docs/specs/sales-assistant.md`,
`functions/assistant/prompt.js`). **Don't build a second agent.** Fold the new rules into the
existing `systemPrompt()` / knowledge and update the spec, keeping its structure, `parseDraft`
checks, staff gate, caps and JSON shape.

## New or changed rules (Scott's own words, confirmed in chat)

| # | Rule | vs. current prompt.js |
|---|---|---|
| 1 | **No numbers to anyone who hasn't gone through the quote process.** No range, no "starts at $600", no per-foot rate, no formula, however hard they push. "People use us to price match and we're only helping the next guy undercut our business." Photos **and** address are required before any price. | Tighter. Current rule 1 already blocks prices without a record; keep the "price on THIS season's record" exception for existing customers. Add: repeated pushing for a number → flag as a price shopper for staff (new next-action or reason line). |
| 2 | Don't ask the budget directly; offer scope options (roofline only vs. + trees/bushes/walkway). | New. |
| 3 | Price objections: answer once with value (no ladders/roof risk, no storage, free service calls, full guarantee), offer smaller scope, don't push twice. | New. |
| 4 | Push the **free designer** (/design/) as the easiest next step; or texted photos + address; or a free measure. | New emphasis. |
| 5 | **Leasing** (not on the site yet): we keep the lights; customer picks a new design any year or keeps last year's. Year 1 full price, then +10% off per returning year (yr2 10%, yr3 20% … capped at 50% off original), design still fully changeable. Benefits: fresh look any year, nothing to store/test/replace, never stuck with old lights, cheaper every year. | New. Current prompt only knows purchase + 50% re-install. |
| 6 | **Purchase**: customer owns lights; we reinstall yearly at 50% off original from year 2; color/design locked. We only install lights that came from us. | Matches current; add "only our lights". |
| 7 | **Monthly plan (pilot)** = the lease paid in 12 monthly autopay payments. **Removal included.** New customers sign a **2-year contract**, then renews yearly. Moving: plan can move to a new address in the service area, or pass to the home's buyer if the buyer wants it; payments already made aren't refunded. Early cancellation fee: 50% of the yearly price **or the remaining balance, whichever is less**. Loyalty discount on the monthly plan: undecided (maybe smaller than the lease's). | New. The assistant must **never state** monthly amounts, the monthly-plan discount, or contract/cancellation terms; mention the plan mainly when up-front cost is the objection; questions about terms or cancelling → escalate. |
| 8 | Free service calls all season; anything that stops working is fixed/replaced free. | Matches. |
| 9 | Deposit up to 50% at agreement. | Current says "a deposit"; fine either way, don't state a %. |

## Decisions for Scott before you change prompt.js

1. **Internal pricing rules in the prompt** (per-foot C9, takedown 15% / $150 min). They're marked "don't quote", but Scott's rule #1 is strict. A model can't leak a number it was never given. Ask whether to remove them.
2. **Email sign-off**: current is "Thank you, Christmas Light Creations, 281-819-0163"; in chat Scott gave "Scott Minor, Owner". Ask which.
3. **Early discount**: the prompt states 10% to customers; the public site doesn't give an amount. Ask if the assistant should keep saying 10%.
4. **Leasing + monthly plan on the public site**: content.js / FAQ / privacy changes are separate work; ask before touching copy.
5. Monthly-plan contract terms need an attorney review (TODO #30 is the same attorney), before the assistant mentions the plan to customers.

## Ignore

The Express route / standalone `salesAgent.js` I drafted in chat. It isn't needed here.

## Scott's answers (2026-10-12, 6:34 pm)

1. **Keep** the internal pricing rules in prompt.js (still marked never to quote).
2. Email sign-off stays **"Thank you, Christmas Light Creations, 281-819-0163"**.
3. Keep telling customers the early install discount is **10%**. "10% will never change."
4. **Yes, put leasing and the monthly plan on the public site** (content.js / FAQ, and update the privacy page in the same commit if anything new is collected). Show Scott the wording before pushing. Keep monthly amounts and contract terms off the site until the attorney has reviewed them (TODO #30).

So: go ahead with the prompt changes now, then draft the site copy for Scott's review.
