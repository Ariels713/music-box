import { PitchDetector } from 'pitchy'

// Pitchy supplies the frequency estimator. This layer groups stable frames into notes.
export function segmentFrames(frames, minimumDuration = .1) {
  const notes = []
  let active = null, candidate = null, silence = null
  const finish = end => {
    if (active && end - active.start >= minimumDuration) notes.push({ midi: active.midi, start: active.start, duration: end - active.start })
    active = null
  }
  for (const frame of frames) {
    if (frame.midi === null) {
      candidate = null
      silence ??= frame.time
      if (active && frame.time - silence >= .045) finish(silence)
      continue
    }
    silence = null
    if (active?.midi === frame.midi) { candidate = null; continue }
    if (candidate?.midi !== frame.midi) candidate = { midi: frame.midi, start: frame.time }
    if (frame.time - candidate.start >= .045) {
      finish(candidate.start)
      active = { ...candidate }; candidate = null
    }
  }
  finish(silence ?? frames.at(-1)?.time ?? 0)
  return notes
}
export async function transcribe(samples, sampleRate, { clarity = .9, onProgress = () => {}, canceled = () => false } = {}) {
  const size = 2048, hop = 256
  const detector = PitchDetector.forFloat32Array(size)
  const frames = []
  for (let offset = 0; offset + size <= samples.length; offset += hop) {
    if (canceled()) return null
    const input = samples.subarray(offset, offset + size)
    let power = 0
    for (const value of input) power += value * value
    const rms = Math.sqrt(power / size)
    const [hz, confidence] = rms >= .008 ? detector.findPitch(input, sampleRate) : [0, 0]
    frames.push({ time: offset / sampleRate, midi: confidence >= clarity && hz >= 70 && hz <= 1600 ? Math.round(69 + 12 * Math.log2(hz / 440)) : null })
    if ((offset / hop) % 128 === 0) { onProgress(offset / samples.length); await new Promise(resolve => setTimeout(resolve, 0)) }
  }
  onProgress(1)
  const notes = segmentFrames(frames)
  return { notes: notes.slice(0, 128), truncated: notes.length > 128 }
}
