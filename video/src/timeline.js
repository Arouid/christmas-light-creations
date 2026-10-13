// Scene order and frame maths, shared by the composition, its metadata (duration) and the
// sound layer (which needs to know when things happen inside scenes).
export const ORDER = ['thread1', 'plan', 'home', 'thread2', 'pitch', 'end']
// Scenes overlap by this many frames: the outgoing fade-out and the incoming fade-in cross-dissolve.
export const OVERLAP = 8
// Length of the light sweep that crosses the frame at each scene change.
export const SWEEP = 14

export function sceneList(props) {
  const fps = props.fps || 30
  let from = 0
  const out = []
  for (const key of ORDER) {
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

// The plan scene: when each beat lands (frames into the scene).
export function planTiming(durFrames, beatCount) {
  const step = Math.floor((durFrames - 30) / beatCount)
  const beats = Array.from({ length: beatCount }, (_, i) => 12 + i * step)
  return { step, beats, on: beats[beatCount - 1] + 14 }
}

// The 5:41 pm scene: where the drive clip ends and the reveal starts (frames into the scene).
export function homeTiming(props, durFrames) {
  const fps = props.fps || 30
  const drive = props.clips?.drive ? Math.round((props.home?.driveSeconds ?? 2.5) * fps) : 0
  const reaction = props.clips?.reaction ? Math.round((props.home?.reactionSeconds ?? 2.2) * fps) : 0
  return { driveEnd: drive, revealStart: drive ? drive + 6 : 18, reactionStart: durFrames - reaction }
}
