# Light Designer audit, October 2026

A pass over the public designer at /design/ on 2026-10-14, from a homeowner's first tap to the estimate request, on the live site at 375×812 and 1280×860 and against the code (`src/designer/`, `src/design/DesignPage.jsx`). 19 findings: 4 high, 11 medium, 4 low. Owner: “lets fix everything”. 18 were built in commit bbc16d7 (spec: `docs/specs/public-designer.md`, “Usability round”); #19 was kept on purpose.

Moved here from the claude.ai report (https://claude.ai/artifact/2QMZLAjfAi9ya2vAC8mac2, with screenshots) on 2026-10-15 so the staff app's Reports → Design reads it. The real-phone checks still open are in `docs/test-checklist.md` (#167–168).

## In short (before the fixes)

- The designer worked and was forgiving: upload, drawing, shapes, erase, undo, delete and the hand-off to the estimate form all did what they should.
- The real risk was losing work: Back on a phone left the page, ✕ threw away a half-drawn strand, a new photo wiped the design without asking.
- On phones the controls people need most were out of sight: Erase off the edge of the tool row; Delete and Night far below the visible panel.

## Findings and what was built

| # | Finding | Severity | Now |
|---|---|---|---|
| 1 | Back on a phone threw the whole design away | High | Back closes the designer and stays on /design/; the tab keeps the design, so a reload brings it back (privacy page updated) |
| 2 | ✕ threw away a strand not finished with Done | High | ✕, Estimate → and Save keep a line of 2+ taps |
| 3 | On phones half the controls were off-screen (tool row 503 px; Delete 225 px and Night 285 px below the panel) | High | Select · Lights · Shapes · Erase fit 375 px; Delete beside the strand's name; Night in a bar under the photo |
| 4 | ↶ while drawing removed the last finished strand, not the last tap | High | ↶ and Ctrl+Z take back the last tap while drawing |
| 5 | A new photo erased the design without asking | Medium | “Start over on a new photo? …” with Start over and Keep this one |
| 6 | The photo was small on phones (234 px of 812) | Medium | Nothing sits on the photo; Before, Night and zoom in the bar under it; sideways phones and wide screens put controls beside it |
| 7 | No first-run guide | Medium | A three-step how-to the first time the designer opens on a device |
| 8 | Two gold buttons while drawing; a greyed Done all the time | Medium | Done from the second tap, the one solid button; Estimate → outlined while drawing |
| 9 | Keyboard focus slipped out to the hidden page | Medium | The page behind is inert; Tab stays in; focus returns to Open the designer |
| 10 | Night and Bulb size changes made with arrow keys were lost | Medium | Sliders save as they move (keys too); one drag is one undo step |
| 11 | “Hold: before” was press-and-hold only | Medium | Before is a tap toggle |
| 12 | Save on phones: an unlabeled ⬇ that landed in Files | Medium | “⬇ Save” labeled, opens the share sheet (Save Image → Photos); computers download |
| 13 | The sideways-photo tip showed only after the designer closed | Medium | Shown on the photo right after a portrait upload |
| 14 | Homeowner mode showed staff words (C9 chip, Spacing, Pattern 1×1, “decoration”) | Medium | Those hidden; “Colors change every 2 bulbs”; no colors while erasing |
| 15 | Desktop: small photo, controls under it | Medium | Controls in a right-hand column; a portrait photo 560×746 |
| 16 | The way into the designer was below the fold | Low | The picture opens it (“Tap to try it”); Open the designer on the first phone screen |
| 17 | Estimate hand-off: small thumbnail, “your design” on the untouched sample | Low | 144×96; “Our sample design is attached” when unchanged |
| 18 | Pins covered small details at phone size | Low | Rings with a clear middle |
| 19 | A strand's new color also became the next strand's color | Low | Kept on purpose; shown under “For the next strand” |

## What works well (keep it)

- Upload resizes the photo, drops its location data and explains a too-small photo in plain words.
- Tool mix-ups are forgiven: on Select an empty tap starts drawing; switching tools finishes the strand.
- Rectangle becomes four free corners; Oval keeps handles and “Keep circle”; Erase rubs with a brush size and “Restore erased lights” undoes it.
- On a computer: Escape finishes the strand, Delete removes the selection, Ctrl+Z / Ctrl+Y, wheel or pinch zoom, Fit resets.
- Estimate → takes them to a filled-in form in one tap, with the design attached.

## How it was checked

The live site in the browser pane at 375×812 and 1280×860: the sample opened, strands tapped, the panel scrolled, one of our own gallery photos uploaded as a test file, ✕ and the hand-off to the form tried; nothing was sent. The Back gesture, Save on an iPhone and the portrait tip were read in the code; checklist #167–168 has them on real phones.
