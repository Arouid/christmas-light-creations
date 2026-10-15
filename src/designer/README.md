# Light designer module

Draw Christmas / permanent lights on a house photo, measure rooflines, export
a mockup. Self-contained so it can move into its own app later.

## Rules for this folder

- No imports from outside `src/designer/` except React. No Firebase, no
  customers, no app state. The host passes data in and gets data out.
- Designs are plain JSON (`model.js`), versioned (`DESIGN_VERSION`), and
  coordinates are in the photo's natural pixels.
- Pure logic (`model.js`, `geometry.js`, `stats.js`, `history.js`) has no browser APIs and
  is tested in `tests/designer.test.mjs`. `render.js`, `image.js` and
  `Designer.jsx` need a browser (canvas).
- Styling uses Tailwind classes and the site's theme tokens (`night`, `glow`,
  `berry`). A new host needs those tokens (see `src/index.css`).

## Using it

```jsx
import { Designer, photoToDataUrl } from './designer'

const photo = await photoToDataUrl(file) // { dataUrl, width, height }, EXIF dropped
<Designer
  photo={{ src: photo.dataUrl, width: photo.width, height: photo.height }}
  design={savedDesignOrNull}
  defaults={{ pricePerFoot: 4.5 }}   // new designs start with this rate
  title="Pat Sample, 123 Example St"
  brand="Christmas Light Creations"   // optional text on exported images
  stamp={(ctx, w, h) => …}            // optional: draw your own mark on exported images instead (may be async)
  onSave={async (design, { blob, stats }) => { /* store JSON + image */ }}
  onClose={(design) => {}}           // the design, with a half-drawn line (2+ taps) added
  onChange={(design) => {}}          // optional: every change, e.g. to keep it for a reload
  onSatelliteMeasure={async () => ({ feet: 52, label: 'Satellite edge' })} // optional
/>
```

- `simple` + `saveLabel` (public website, /design/): no measuring, decorating,
  history, feet, bulb counts or prices, and C9 bulbs only; `onClose(design)`
  passes the current design back.
- Public page extras: `backCloses` (opening adds a browser history entry, so a
  phone's Back closes the designer; ✕ and Save leave through it, and the host's
  `onSave` is expected to close it), `intro` ({ title, steps, hint, ok }: a
  how-to over the photo the first time on a device) and `tip` (one line on the
  photo for a few seconds).
- Layout: upright screens stack tools, photo, the view bar (Before toggle,
  Night, zoom) and the controls; on the `sideways:` variant (wider than tall,
  560 px+, defined in `src/index.css`) the controls move to a right-hand column.
  Rectangle and Oval share one Shapes tool. Undo history is `history.js`
  (sliders merge into one step); while a line is being drawn, undo takes back
  the last tap.
- Tools forgive forgetting to switch: on Select, a tap on an empty spot (nothing
  selected) starts drawing lights there; on Lights with nothing being drawn,
  dragging a strand moves its pin / bends it / moves the shape (and switches to
  Select). A label on the photo always says which tool is on.
- `designStats(design)` → feet (measured or estimated), bulbs, bulbs per
  color, ballpark price (`pricePerFoot`).
- `renderDesign(ctx, design, image, opts)` draws a design on any canvas
  (proposal pages, thumbnails, PDFs).

## Files

| File | What |
|---|---|
| `model.js` | Design JSON, colors, color sets, bulb styles, decorations |
| `geometry.js` | Line length, evenly spaced bulbs, hit-testing |
| `stats.js` | Feet, bulbs, colors, price; scale from a measured line |
| `history.js` | Undo steps (a slider drag is one step) |
| `render.js` | Canvas drawing: night tint, glow, icicles, decorations, handles |
| `image.js` | Shrink phone photos (and drop location data), load images |
| `Designer.jsx` | The editor screen |
