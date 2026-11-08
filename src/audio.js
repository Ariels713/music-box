export function pluck(context, output, midi, time = context.currentTime) {
  const frequency = 440 * 2 ** ((midi - 69) / 12)
  const voices = []
  for (const [ratio, level, decay] of [[1, 0.22, 1.8], [2.76, 0.055, 0.55], [5.4, 0.018, 0.2]]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = frequency * ratio
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(level, time + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.00001, time + decay)
    oscillator.connect(gain).connect(output)
    oscillator.start(time)
    oscillator.stop(time + decay + 0.01)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    voices.push(oscillator)
  }
  return () => voices.forEach(voice => voice.stop())
}

export class MusicAudio {
  context = null
  voices = []
  muted = false
  async unlock() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' })
      this.output = this.context.createGain()
      this.output.gain.value = 0.65
      const compressor = this.context.createDynamicsCompressor()
      this.output.connect(compressor).connect(this.context.destination)
    }
    if (this.context.state !== 'running') await this.context.resume()
  }
  strike(midi) {
    if (this.muted || this.context?.state !== 'running') return
    const now = this.context.currentTime
    this.voices = this.voices.filter(voice => voice.end > now)
    if (this.voices.length >= 12) this.voices.shift().stop()
    this.voices.push({ end: now + 1.82, stop: pluck(this.context, this.output, midi) })
  }
  dispose() { this.context?.close() }
}
