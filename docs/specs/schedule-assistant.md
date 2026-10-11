# Schedule with Claude (install day proposals)

> Status: implemented and live 2026-10-10 (first real plan: 9 placed, 1 not, sensible reasons); re-plan by instruction added 2026-10-10 evening (needs a `proposeSchedule` deploy) · Decided 2026-10-10 by Scott (owner): Phase 4 of `docs/specs/sales-assistant.md`; Claude proposes, staff approve, nothing happens by itself.

## The problem

Every October the owner sits with the Season list and a calendar and works out who goes on which day: early installs before the discount deadline, people grouped by neighborhood so the crew isn't crossing Pearland twice, "not before the 20th, we're travelling" texts remembered or missed, days that are already full from routes. It takes an evening and it's redone every time someone confirms late. Owner, 2026-10-10: "can Claude be set up to help me schedule people?"

## What we want

A **✨ Plan with Claude** button on the **Season** tab (installs). Staff pick a date range (default: tomorrow to two weeks out, inside the install season) and see how many unscheduled people are in it: by default this season's customers who said yes (Wants lights? = Confirmed) and have no planned date or week yet. They can untick anyone.

Claude comes back in under a minute with a **day plan**: for each day in the range the people proposed for it, grouped by area, with a one-line reason each ("Shadow Creek with the Smiths; asked for the week of the 19th"), and a short paragraph explaining the plan as a whole. People who couldn't be fitted are listed separately with the reason (no open day left before the deadline, asked for a date outside the range, no address).

The plan honours, in this order: what the customer asked for (scheduling notes, timeframe, and timing wishes in their recent texts and emails), early-install customers before the discount deadline (Oct 31 by default, from ⚙ Settings → discount schedule), the days' capacity (the same per-day limit the website's Check availability uses, minus installs already booked by planned dates and routes), and grouping by location block and neighborhood.

Staff then **adjust**: move anyone to another day in the range, or drop them from the plan. Days that would go over capacity show a warning. **Apply** writes Planned date, Day and Week of on each customer (and sets Install status to Install Scheduled, unless unticked), exactly as if typed in the Season tab, then offers **✉ Email these** with the "You are on the schedule" template prefilled for the people just scheduled, through the normal one-by-one email flow.

**Tell Claude a change** (owner, 2026-10-10 after the first real plan: "can I make suggestions to switch in the plan panel"): under the plan, a box for one note in plain words ("move Alice to the 20th with Debbie", "keep Monday open", "Kay and Leann must stay together", "Donna can go in November after all") and a **Re-plan** button. Claude gets the plan as it stands, including the moves staff already made with the day pickers, plus the note, and returns a revised plan: the note wins over its own preferences, everyone else stays where they were unless the note forces a change, and the explanation starts with what changed and why. People whose day changed show a **Changed · was …** mark. Notes can be sent one after another; each is a new call.

Nothing is written until Apply. Nothing is sent until the email flow's own Send.

## What we DON'T do

| Left out | Why |
|---|---|
| Writing the schedule from the server | Staff writes go through the same client path as the Season tab today (audit, rules, undo by retyping); the server only proposes |
| Time of day, stop order, crew | That's a route (**＋ Route these** → Routes → ⚡ Optimize); the plan stops at the day |
| Takedowns | Takedowns are driven by customer requests in January; no deadline, no early group. Later if asked |
| Moving people already scheduled | The plan only places the unscheduled set; existing bookings count as booked days. Rescheduling stays a human job (and the "We need to reschedule" email) |
| Texting or emailing customers to ask their preference | Phase 1 drafts do that one at a time; the plan uses what's already on file |
| Letting Claude change capacity or the deadline | Those are settings; the plan reports them and works within them |
| Gate codes, phone numbers, emails in the prompt | Same privacy line as Suggest a reply: name, address, city, neighborhood, install type, notes and incoming message text only |
| Streaming | One answer, one spinner; the panel says what it's doing |

## Edge cases

- **Nobody to plan** (no confirmed-unscheduled customers): the button opens the panel, which says so and suggests the Season filters; no call made.
- **More than 60 people picked**: the browser refuses before any call (cost and context cap); narrow the area or range.
- **Range outside the season or longer than 6 weeks**, or end before start: refused in the browser and the server.
- **No open day in the range** (everything at capacity): Claude is still asked, with the days marked full; everyone comes back as unplaced with "no open day", and the explanation says to widen the range or raise capacity.
- **Early customer with no open day before the deadline**: placed on the first open day after it, with the reason saying so (the owner's rule: early customers keep their discount even when pushed; `suggestDiscount` already does that).
- **Customer asked for a date outside the range**: unplaced, reason quotes the wish.
- **Claude puts someone on a day over capacity or outside the range**: the server moves the entry to unplaced with reason "over capacity on …" (never silently kept); unknown ids or days are dropped.
- **Someone was scheduled by a colleague while the panel was open**: Apply skips anyone who now has a planned date and says who.
- **Key refused / off switch / daily cap (20 plans a day, everyone together)**: the same clear messages as Ask Claude; `settings/app.askClaude === false` turns this off too (one switch for the in-app Claude).
- **Claude declines or returns nothing usable**: the panel says the plan couldn't be made and nothing is applied.
- **Demo mode** (`/leads/?demo`): a canned plan for the sample customers so the panel can be checked without a key.
- **A note can't be honored** (the day is full, the person isn't in the plan, the wish is outside the range): Claude keeps them where they were and says so in their reason and the explanation; capacity still wins over the note.
- **A note names someone not in the plan** (already scheduled, or unticked): Claude says it can only move people in the plan; nothing else changes.
- **Apply fails halfway** (network): the people already written keep their dates; the panel lists who was written and who wasn't, and Apply can be pressed again for the rest.

## Decisions

- 2026-10-10 (owner): build it; Claude proposes, staff approve, nothing by itself; budget shared with drafts and questions (about $150/month). Claude Opus 5.5 like the other phases.
- 2026-10-10 (Claude Code): the server gathers the inputs itself (customers, their last incoming messages, routes, availability settings, discount schedule) from the ids the browser sends, so the browser never ships customer data to the function and the prompt is built in one place. The browser decides *who* (the default set is computed with the same pure helper, so staff can untick).
- 2026-10-10: one Claude call with **structured output** (JSON schema: assignments, unplaced, explanation), effort `high` (it is a planning problem, worst case ~20–40¢ a plan), no tools: the whole input fits in one prompt (≤ 60 people, ≤ 42 days).
- 2026-10-10: the server **checks the plan** before returning it (ids exist, days in range, per-day capacity) and the browser checks again after every move, with the same pure helper, so the model can't put a day over capacity without a warning.
- 2026-10-10: Apply writes `plannedDate` ("Oct 15"), `day` ("Thursday"), `weekOf` ("Oct 11-17", Sunday to Saturday, the sheet's style) and `installStatus` = "Install Scheduled" through `customersApi.update`, one field at a time like the Season tab. No new Firestore fields, no rules change. `serverState/aiSchedule` counts plans (server only, like `serverState/askClaude`).
- 2026-10-10 (evening): re-plans reuse the same callable and prompt with two optional fields (`instruction`, `current`), not a conversation: the browser always sends the whole current plan, so the server stays stateless and the cap, checks and cost are the same as a plan (about 20–40¢). "Changed" marks are a client-side diff of the plan before and after (`diffPlans`), so nothing depends on the model reporting its own changes correctly.
- 2026-10-10: the confirmation email reuses the existing one-by-one queue (`EmailQueue`, template `schedule-confirm`) with the just-applied people; the template reads the fields Apply just wrote.

## Acceptance criteria

1. [test] `unscheduled(customers, season)` returns only customers with `firstContact` Confirmed and no `plannedDate`/`weekOf` this season, excluding Not Servicing / Off Scheduler. → `tests/scheduleAssistant.test.mjs`
2. [test] `scheduleRequest()` refuses a bad or over-long range, more than 60 ids, non-string ids; `scheduleAllowed()` allows 20 a Central day, then refuses. → same file
3. [test] `dayList()` lists each day in the range with weekday, capacity (settings and overrides) and booked count, and says which are open. → same file
4. [test] The rows sent to the model carry name, address, city, neighborhood, block, install type, notes, timeframe and incoming message text, but no gate code, phone or email. → same file
5. [test] `parseProposal()` moves over-capacity and out-of-range assignments to unplaced with a reason, drops unknown ids/days, caps reason lengths, and gives a fallback when the answer isn't JSON. → same file
6. [test] `dayLoads()` reports booked + proposed per day and flags days over capacity; `moveTo()`/`dropFrom()` keep one entry per customer. → same file
7. [test] `writesFor(assignments, season)` yields `plannedDate`, `day`, `weekOf` and `installStatus` values in the sheet's style for each customer. → same file
8. [human, demo] `/leads/?demo` → Season → **✨ Plan with Claude** → the panel shows 1 person to plan (Example Family), the range, **Make a plan** → a plan with a day, reason and explanation; moving them to another day updates the per-day count; **Apply** writes the fields (the Season row shows the date) and offers **✉ Email these 1** with "You are on the schedule". 375 px and 1200 px, no sideways scroll, no console errors. Observer: Claude Code in the browser pane; owner on a phone once deployed.
9. [human, live] After `proposeSchedule` is deployed: a real plan for this season's confirmed-unscheduled customers places early installs before Oct 31, groups by block, and the function log shows token counts and cost, no customer text. Observer: owner.
10. [test] `scheduleRequest()` cleans a note (whitespace, ≤ 500 chars, text only) and the current plan (strangers, out-of-range days and repeats dropped); the prompt carries the current plan and the note only on a re-plan; `diffPlans()` lists who moved, from where to where. → same file
11. [human, demo] In the plan, type a note → **↻ Re-plan** → the explanation starts with "Changed: …", the moved person shows **Changed · was Thu Oct 15**, everyone else keeps their day; a move made with the day picker before the note is still there after it. 375 px and 1200 px. Observer: Claude Code in the browser pane.
12. [human, live] After the deploy: "move <name> to the <day> with <name>" moves exactly that person; "keep <day> open" empties that day and the explanation says where they went; a note the day can't take leaves them put with the reason saying so. Observer: owner.
13. [check] `npm run check` green; guide, decisions, verified, TODO and both assistant READMEs updated in the same commit.

## Contract

**Callable** `proposeSchedule` (region us-south1, staff only, same gate as `askClaude`; off when `settings/app.askClaude === false`).

Request: `{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' (≤ 42 days, within the install season), customerIds: string[] (1–60), instruction?: string (≤ 500), current?: { assignments: [{ customerId, day }], unplaced: string[] } }` — `instruction` and `current` together make it a re-plan.

Response:
```
{
  explanation: string,
  assignments: [{ customerId, day: 'YYYY-MM-DD', reason }],
  unplaced:    [{ customerId, reason }],
  days:        [{ day, weekday, capacity, booked }],
  customers:   [{ id, name, area, installType, wish }],   // what the model saw, for the panel
  deadline:    'MM-DD' | null,
  model, cost
}
```

Errors (HttpsError codes): `unauthenticated`, `permission-denied`, `invalid-argument`, `failed-precondition` (off, or key refused), `resource-exhausted` (cap), `unavailable`, `not-found` (none of the ids exist).

**Inputs the server gathers** (never from the browser): the customers by id (name, address, city, neighborhood, location block, install type, this season's timeframe, scheduling notes, status), their last 5 incoming messages (≤ 300 chars each, this year), `settings/app.availability` (capacity per day, overrides) and `discountSchedule` (deadline = last `to` of the early rows), `routes` with a day in the range, and every customer's planned date this season (booked counts).

**Firestore**: `serverState/aiSchedule` `{ day, count, last: { [staff]: ms } }` (server only). No new collections or fields on customers.

**Where the code lives**: `functions/assistant/schedulePrompt.js` (pure: request and gate checks, `unscheduled`, `dayList`, rows, prompt, schema, `parseProposal`, `dayLoads`, `moveTo`, `dropFrom`, `writesFor`, `currentOf`, `diffPlans`, week/day formatting) and `functions/assistant/schedule.js` (gathers from Firestore, calls Claude); `src/assistant/PlanSchedule.jsx` (panel), `src/assistant/scheduleApi.js` (callable + demo). `index.js` registers the callable and hands in `bookedByDay`/`capacity` from `functions/availability.js`.

## Links

- `docs/specs/sales-assistant.md` (phases, model, budget, privacy line)
- `docs/specs/ask-claude.md` (gate pattern, kill switch, daily count)
- `functions/availability.js` (capacity, booked days: the same numbers the website shows)
- `src/lib/discounts.js` (the early-install deadline and the "pushed early customers keep the discount" rule)
- `src/leads/BulkEmail.jsx` (`EmailQueue`, the confirmation email flow)
