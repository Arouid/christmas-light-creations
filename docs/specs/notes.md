# Staff notes and My checklist

> Status: built 2026-10-13 (owner: "an area for Lacie and Katie to keep personal notes they can share with me" and "that to-do list in the staff app in a visible place she'll refer back to"). Needs the owner to publish `firestore.rules` (new collection `notes`); until then the Notes tab is empty and Save says the rules aren't published. Nothing to deploy on the server.

## Notes (tab under More ▾ / drawer → Tools)

- `notes/{id}`: `{ title ≤ 120, text ≤ 5000, by (writer's email, lowercase), shared (bool), createdAt, updatedAt, updatedBy }`.
- Private unless **Share with the team** is ticked; then every staff member reads it under "From Katie P." (read-only). Only the writer edits or deletes.
- The app reads two live queries, `by == me` and `shared == true` (`useNotes` in `src/leads/useStaffLists.js`), merged by `splitNotes` in `src/lib/notes.js`; the rules allow exactly those reads, never the whole collection.
- Rules (`firestore.rules`, `noteOk()`): stamped, only the known keys, sizes, `shared` a bool, `by` the caller's own email; update and delete only by the writer.
- UI `src/leads/NotesView.jsx`: ＋ New note, cards (title, three lines, when, Shared pill), tap yours to edit, search once there are more than three, Delete with a second tap. A permission error on Save says the rules need publishing.
- Demo: `/leads/?demo` shows sample notes.

## My checklist (Home panel)

- `src/lib/checklist.js`: three lists, each item `[id, what, where]`: **Today** (clears every morning), **This week** (clears every Monday), **This season** (stays). `where` is a tab id, `messages` (opens 💬) or blank.
- `src/leads/ChecklistPanel.jsx`: ticks per device in localStorage (`clcChecklist`, period keys so expired ticks drop), tabs for the three lists with a ✓ when a list is done, **Open** on each item. Part of the Home layout (`dashLayout.js`, panel `checklist`, second by default) so it can be moved, resized or pushed down with ⠿ Arrange.
- The list mirrors Katie's to-do page (the customer-care routine); change the words in `checklist.js`.

## Tests

`tests/notes.test.mjs` (record checks, merge/grouping, search), `tests/checklist.test.mjs` (ids, period resets), `tests/dashLayout.test.mjs` (the new panel lands in stored layouts), `tests/staffMenu.test.mjs` (the tab is reachable), `tests/rules/firestore.rules.test.mjs` (needs the emulator: own/shared reads, writer-only writes).
