// The sample house the public designer opens on (public/images/design/,
// drawn from assets-source/sample-house.svg), with warm white C9s already on
// its rooflines and a wreath, so visitors see the idea before they touch it.
import { newDecoration, newDesign, newStrand } from '../designer/model.js'

export const SAMPLE_PHOTO = { src: `${import.meta.env.BASE_URL}images/design/sample-house.jpg`, width: 1280, height: 800, sample: true }
// The sample below already drawn on the sample house, shown until the visitor
// changes something. Redraw it after changing this file, the house or
// render.js: node scripts/sample-design.mjs
export const SAMPLE_PICTURE = `${import.meta.env.BASE_URL}images/design/sample-design.webp`

export function sampleDesign() {
  const d = newDesign({ width: 1280, height: 800, name: 'Sample house' })
  const line = (points) => ({ ...newStrand('c9', ['warm']), points })
  d.strands = [
    line([[266, 302], [934, 302]]), // main eave
    line([[272, 298], [380, 170], [820, 170], [928, 298]]), // hips and ridge
    line([[518, 433], [600, 368], [682, 433]]), // porch gable
    line([[884, 433], [1040, 350], [1196, 433]]), // garage gable
  ]
  d.decorations = [newDecoration('wreath', 600, 548)]
  d.night = 0.55
  return d
}
