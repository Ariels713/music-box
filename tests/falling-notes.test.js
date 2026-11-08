import test from 'node:test'
import assert from 'node:assert/strict'
import { fallingNoteMotion } from '../src/falling-notes.js'
import { DEFAULT_SETTINGS, validateSettings } from '../src/studio-config.js'

test('slow descent starts gently, stays above ground and arrives continuously',()=>{
  let previous=4
  for(let age=0;age<5;age+=.01){const p=fallingNoteMotion(age,5,4);assert.ok(p.height>=0&&p.height<=previous+1e-8);previous=p.height}
  assert.ok(fallingNoteMotion(.01,5,4).height>3.999)
  assert.ok(fallingNoteMotion(4.999,5,4).height<.002)
  assert.equal(fallingNoteMotion(5,5,4).height,0)
})
test('soft bounce decays and settles without moving below the floor',()=>{
  for(let age=5;age<7;age+=.01){const p=fallingNoteMotion(age,5,4,.12);assert.ok(p.height>=0&&p.height<=.12)}
  assert.deepEqual(fallingNoteMotion(7,5,4,.12),{height:0,progress:1,squash:0,settled:true})
})
test('fall controls survive settings validation; old studies receive safe defaults',()=>{
  assert.deepEqual(validateSettings({version:1}).fallingNotes,DEFAULT_SETTINGS.fallingNotes)
  assert.throws(()=>validateSettings({version:1,fallingNotes:{speed:10}}),/speed/)
  for(const field of ['sheen','fiberBrightness']){
    assert.equal(validateSettings({version:1,fallingNotes:{[field]:0}}).fallingNotes[field],0)
    assert.throws(()=>validateSettings({version:1,fallingNotes:{[field]:2}}),new RegExp(field))
  }
  for(const shape of ['mixed','quarter','eighth','paired'])assert.equal(validateSettings({version:1,fallingNotes:{shape}}).fallingNotes.shape,shape)
  assert.throws(()=>validateSettings({version:1,fallingNotes:{shape:'unknown'}}),/shape/)
})

test('falling-note colors validate and old palettes remain unchanged',()=>{
  const palette=['#112233','#223344','#334455','#445566','#556677','#667788']
  const actual=validateSettings({version:1,fallingNotes:{colorMode:'single',singleColor:'#123abc',palette}}).fallingNotes
  assert.deepEqual(actual.palette,palette)
  assert.equal(actual.singleColor,'#123abc')
  assert.equal(actual.colorMode,'single')
  assert.throws(()=>validateSettings({version:1,fallingNotes:{palette:['#ffffff']}}),/six colors/)
  assert.throws(()=>validateSettings({version:1,fallingNotes:{singleColor:'bad'}}),/color/)
})

test('crank arrow settings validate custom designs and fill defaults for older studies',()=>{
  assert.deepEqual(validateSettings({version:1}).crankArrow,DEFAULT_SETTINGS.crankArrow)
  const arrow={...structuredClone(DEFAULT_SETTINGS.crankArrow),linecap:'square',head:'chevron',arcLength:180,position:{x:.2,y:.1,z:.4},style:'polished'}
  assert.deepEqual(validateSettings({version:1,crankArrow:arrow}).crankArrow,arrow)
  for(const crankArrow of [{thickness:1},{arcLength:400},{linecap:'invalid'},{head:'invalid'},{position:{x:Infinity}}])assert.throws(()=>validateSettings({version:1,crankArrow}),/Crank arrow/)
})
