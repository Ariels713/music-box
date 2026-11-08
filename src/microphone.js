export class MicrophoneCapture {
  generation = 0
  resources = null
  async start(seconds, onProgress, onFinish) {
    this.cancel()
    const generation = this.generation
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is unavailable. Open this app on localhost in a supported browser.')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return }
    let context
    try { context = new AudioContext() }
    catch (error) { stream.getTracks().forEach(track => track.stop()); throw error }
    const resource = { stream, context, chunks: [], length: 0, onFinish }
    this.resources = resource
    try {
      await context.audioWorklet.addModule(new URL('./microphone-worklet.js', import.meta.url))
      if (generation !== this.generation) return
      const source = context.createMediaStreamSource(stream)
      const node = new AudioWorkletNode(context, 'music-box-capture')
      const silent = context.createGain(); silent.gain.value = 0
      Object.assign(resource, { source, node, silent })
      source.connect(node).connect(silent).connect(context.destination)
      const maximum = Math.floor(seconds * context.sampleRate)
      node.port.onmessage = event => {
        if (this.resources !== resource) return
        const chunk = event.data.subarray(0, maximum - resource.length)
        resource.chunks.push(chunk); resource.length += chunk.length
        if (resource.length % 4096 < chunk.length) onProgress(resource.length / context.sampleRate)
        if (resource.length >= maximum) this.finish()
      }
      resource.timer = setTimeout(() => this.finish(), seconds * 1000 + 1500)
      resource.ended = () => this.finish()
      stream.getTracks().forEach(track => track.addEventListener('ended', resource.ended))
      await context.resume()
      onProgress(0)
    } catch (error) { if (this.resources === resource) { this.cancel(); throw error } }
  }
  finish() {
    const resource = this.resources
    if (!resource) return
    const samples = new Float32Array(resource.length)
    let offset = 0
    for (const chunk of resource.chunks) { samples.set(chunk, offset); offset += chunk.length }
    this.cancel()
    resource.onFinish(samples, resource.context.sampleRate)
  }
  cancel() {
    this.generation++
    const resource = this.resources
    this.resources = null
    if (!resource) return
    clearTimeout(resource.timer)
    if (resource.node) { resource.node.port.onmessage = null; resource.node.disconnect(); resource.node.port.close() }
    resource.source?.disconnect(); resource.silent?.disconnect()
    resource.stream.getTracks().forEach(track => { track.removeEventListener('ended', resource.ended); track.stop() })
    resource.context.close().catch(() => {})
  }
}
