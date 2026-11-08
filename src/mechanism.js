export const TAU = Math.PI * 2
export const GEAR_RATIO = 1.25 / 12
export const PLAY_DIRECTION = -1
export const cylinderAngleForCrank = angle => angle * GEAR_RATIO * PLAY_DIRECTION
export const CRANK_REST_ANGLE = Math.PI / 2
export const PITCHES = [72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96, 98, 100, 101]
// Original study, not a transcription of the physical box.
const tune = [0, 2, 4, 7, 6, 4, 2, 1, 0, 2, 5, 7, 9, 7, 5, 2, 4, 6, 7, 4, 2, 1, 2, 0,
  4, 7, 9, 7, 6, 4, 2, 4, 5, 7, 9, 11, 9, 7, 5, 4, 2, 4, 6, 7, 4, 2, 1, 0]
export const PINS = tune.map((tine, i) => ({ tine, phase: (i + 0.5) / tune.length * TAU }))

export function angleDelta(previous, next) {
  return Math.atan2(Math.sin(next - previous), Math.cos(next - previous))
}

// Half-open interval (from, to] prevents duplicate strikes at boundaries.
export function crossedPins(from, to, pins = PINS) {
  if (to <= from) return []
  const events = []
  for (const pin of pins) {
    const first = Math.floor((from - pin.phase) / TAU) + 1
    const last = Math.floor((to - pin.phase) / TAU)
    for (let lap = first; lap <= last; lap++) events.push({ ...pin, angle: pin.phase + lap * TAU })
  }
  return events.sort((a, b) => a.angle - b.angle)
}
