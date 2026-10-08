# Gift wrapping (new service)

Status: **on hold, waiting on owner answers** (2026-10-08). Idea from the owner: offer holiday gift wrapping alongside light installs (same customers, same season). Owner is known for great wrapping; photos exist.

## Questions for the owner

Fill in the **Answer** column, then the section can be built.

| # | Question | Examples / notes | Answer |
|---|---|---|---|
| 1 | **Pricing** | Per gift by size (small $_, medium $_, large $_), per hour, or "contact for a quote" for the first season | |
| 2 | **How gifts get to you** | Customer drops off at your place; you pick up (e.g. during an install or service call); both | |
| 3 | **Timing** | Start date; last drop-off day before Christmas; turnaround time | |
| 4 | **Supplies** | Paper, ribbon, bows included or extra? Can customers bring their own? | |
| 5 | **Who wraps** | Name on the site ("wrapped by …")? | |
| 6 | **Commercial orders** | Businesses wrapping client/employee gifts: yes/no, minimum order? | |

## Plan once answered

- Home page: a "Gift wrapping" section with 4–6 of the owner's photos (plaid, navy snowflake, red polka-dot bows), how it works, pricing or "call for a quote", and a request button.
- Estimate form: "What do you need?" Christmas lights / Gift wrapping / Both. Saved on the lead (new `service` field, needs a `firestore.rules` update) and shown as a tag in the staff app.
- Photos: owner puts originals in `gift-wrap-incoming/` (not in git); same processing as the gallery (`scripts/process-photos.mjs`: resize, strip location data, glam pass).
- Google Business Profile: add "Gift wrapping" as a service.

## Not decided

Whether gift wrapping gets its own area/landing page for search ("gift wrapping Pearland"). Decide after the first season's demand.
