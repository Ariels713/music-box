import { PITCHES, TAU } from './mechanism.js'

export function validateMelody(raw) {
  if (raw === null || raw === undefined) return null
  if (!raw || !Array.isArray(raw.notes) || raw.notes.length < 1 || raw.notes.length > 128) throw new Error('A tune needs 1–128 notes.')
  if (![0, 12, 24, 36, 48, -12, -24].includes(raw.transpose)) throw new Error('Choose a supported octave shift.')
  let previous = -1
  const notes = raw.notes.map(note => {
    if (!Number.isInteger(note.midi) || note.midi < 24 || note.midi > 108 || !Number.isFinite(note.start) || note.start < 0 || note.start > 15 || note.start < previous || !Number.isFinite(note.duration) || note.duration < .03 || note.duration > 15 || note.start + note.duration > 15.1) throw new Error('Tune notes must have valid, ordered pitches and times within 15 seconds.')
    previous = note.start
    return { midi: note.midi, start: note.start, duration: note.duration }
  })
  return { notes, transpose: raw.transpose }
}
export function noteName(midi) {
  return ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1)
}
export function arrangeMelody(melody) {
  const checked = validateMelody(melody)
  const first = checked.notes[0].start
  const length = Math.max(...checked.notes.map(note => note.start + note.duration)) - first + .3
  const notes = checked.notes.map(note => {
    const requested = note.midi + checked.transpose
    const tine = PITCHES.reduce((best, pitch, index) => Math.abs(pitch - requested) < Math.abs(PITCHES[best] - requested) ? index : best, 0)
    return { ...note, tine, played: PITCHES[tine], changed: requested !== PITCHES[tine], phase: (note.start - first + .1) / length * TAU }
  })
  return { notes, pins: notes.map(({ tine, phase }) => ({ tine, phase })), length, changed: notes.filter(note => note.changed).length }
}
export function suggestTranspose(notes) {
  return [0, 12, 24, 36, 48, -12, -24].reduce((best, shift) => {
    const score = value => notes.reduce((sum, note) => sum + Math.min(...PITCHES.map(pitch => Math.abs(pitch - note.midi - value))) ** 2, 0) + Math.abs(value) * .001
    return score(shift) < score(best) ? shift : best
  }, 0)
}
