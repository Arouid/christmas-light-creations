# Light designer module

Draw Christmas / permanent lights on a house photo, measure rooflines, export
a mockup. Self-contained so it can move into its own app later.

## Rules for this folder

- No imports from outside `src/designer/` except React. No Firebase, no
  customers, no app state. The host passes data in and gets data out.
- Designs are plain JSON (`model.js`), versioned (`DESIGN_VERSION`), and
  coordinates are in the photo's natural pixels.
- Pure logic (`model.js`, `geometry.js`, `stats.js`) has no browser APIs and
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
  onSave={async (design, { blob, stats }) => { /* store JSON + image */ }}
  onClose={() => {}}
/>
```

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
| `render.js` | Canvas drawing: night tint, glow, icicles, decorations, handles |
| `image.js` | Shrink phone photos (and drop location data), load images |
| `Designer.jsx` | The editor screen |
