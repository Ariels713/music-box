import test from 'node:test'
import assert from 'node:assert/strict'
import { transcribe, segmentFrames } from '../src/transcribe.js'
import { validateMelody, arrangeMelody, suggestTranspose } from '../src/tune.js'
import { DEFAULT_SETTINGS, validateSettings } from '../src/studio-config.js'
import { crossedPins, PITCHES, TAU } from '../src/mechanism.js'

function phrase() {
  const rate=48000, samples=new Float32Array(rate*4)
  for(const [start,end,midi] of [[.15,.7,57],[.85,1.4,59],[1.6,2.15,60],[2.4,3,60]]) {
    const frequency=440*2**((midi-69)/12)
    for(let i=Math.floor(start*rate);i<end*rate;i++) {
      const t=i/rate-start, envelope=Math.min(1,t/.02,(end-i/rate)/.02)
      samples[i]=.2*envelope*(Math.sin(2*Math.PI*frequency*t)+.25*Math.sin(4*Math.PI*frequency*t))
    }
  }
  return {samples,rate}
}
test('Pitchy transcribes a synthesized monophonic phrase and repeated notes',async()=>{
  const {samples,rate}=phrase()
  const result=await transcribe(samples,rate)
  assert.deepEqual(result.notes.map(n=>n.midi),[57,59,60,60])
  for(const [i,start] of [.15,.85,1.6,2.4].entries()) assert.ok(Math.abs(result.notes[i].start-start)<.08)
  assert.equal(result.truncated,false)
  assert.deepEqual((await transcribe(new Float32Array(48000),48000)).notes,[])
})
test('weak or short detections are rejected; cancel stops analysis',async()=>{
  const frames=Array.from({length:6},(_,i)=>({time:i*.01,midi:60}))
  assert.deepEqual(segmentFrames(frames),[])
  assert.equal(await transcribe(new Float32Array(48000),48000,{canceled:()=>true}),null)
})
test('arrangement preserves rhythm and matches crossed notes to fixed comb pitches',()=>{
  const notes=[{midi:57,start:.2,duration:.4},{midi:58,start:.8,duration:.3},{midi:60,start:1.3,duration:.5}]
  const melody={notes,transpose:suggestTranspose(notes)}
  const arranged=arrangeMelody(melody)
  assert.equal(melody.transpose,24)
  assert.equal(arranged.changed,1)
  assert.equal(arranged.pins.length,notes.length)
  assert.deepEqual(crossedPins(0,TAU,arranged.pins).map(p=>p.tine),arranged.notes.map(n=>n.tine))
  assert.ok(arranged.notes.every(n=>PITCHES.includes(n.played)))
  const ratio=(arranged.pins[1].phase-arranged.pins[0].phase)/(arranged.pins[2].phase-arranged.pins[1].phase)
  assert.ok(Math.abs(ratio-.6/.5)<1e-8)
  assert.deepEqual(validateSettings({...DEFAULT_SETTINGS,melody}).melody,melody)
  assert.equal(validateSettings({version:1}).melody,null)
  assert.throws(()=>validateMelody({notes:[{midi:NaN,start:0,duration:1}],transpose:0}))
  assert.throws(()=>validateMelody({notes,transpose:1}))
})
