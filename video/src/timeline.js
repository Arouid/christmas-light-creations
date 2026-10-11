// Scene order and frame maths, shared by the composition and its metadata (duration).
export const ORDER = ['intro', 'headline', 'estimate', 'design', 'season', 'areas', 'offer', 'end']
// Scenes overlap by this many frames: the outgoing fade-out and the incoming fade-in cross-dissolve.
export const OVERLAP = 8
// Length of the light sweep that crosses the frame at each scene change.
export const SWEEP = 14

export function sceneList(props) {
  const fps = props.fps || 30
  let from = 0
  const out = []
  for (const key of ORDER) {
    if (key === 'offer' && !props.offer?.enabled) continue
    const dur = Math.round((props.scenes[key] || 0) * fps)
    if (dur <= 0) continue
    out.push({ key, from, dur })
    from += dur - OVERLAP
  }
  return out
}

export function totalFrames(props) {
  const list = sceneList(props)
  const last = list[list.length - 1]
  return last ? last.from + last.dur : 1
}
