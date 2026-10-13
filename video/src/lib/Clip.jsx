import { Loop, OffthreadVideo, staticFile, useVideoConfig } from 'remotion'
import clipsMeta from '../clips.json'

// A piece of footage from assets-source/ads/clips/, filling its box like a photo (object-fit
// cover), muted, looped when the scene outlasts it. Durations come from clips.json, which
// prepare-assets writes by probing each file.
export function Clip({ file, fill = 1, brightness = 1, focus = [0.5, 0.5], transform, style }) {
  const { fps } = useVideoConfig()
  const seconds = clipsMeta[file]
  const media = (
    <OffthreadVideo
      src={staticFile(`clips/${file}`)}
      muted
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`, filter: `brightness(${brightness})`, transform, ...style }}
    />
  )
  void fill
  if (seconds && seconds > 0.5) return <Loop durationInFrames={Math.max(1, Math.floor(seconds * fps) - 1)}>{media}</Loop>
  return media
}
