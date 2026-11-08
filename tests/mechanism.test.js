import test from 'node:test'
import assert from 'node:assert/strict'
import { TAU, PINS, GEAR_RATIO, PLAY_DIRECTION, cylinderAngleForCrank, CRANK_REST_ANGLE, angleDelta, crossedPins } from '../src/mechanism.js'

test('angle seam remains a small movement in either direction', () => {
  assert.ok(Math.abs(angleDelta(Math.PI - 0.02, -Math.PI + 0.03) - 0.05) < 1e-12)
  assert.ok(Math.abs(angleDelta(-Math.PI + 0.03, Math.PI - 0.02) + 0.05) < 1e-12)
})
test('stationary and reverse motion never strike', () => {
  assert.deepEqual(crossedPins(1, 1), [])
  assert.deepEqual(crossedPins(4, -12), [])
})
test('multiple complete laps emit every pin in chronological order', () => {
  const events = crossedPins(0, TAU * 4)
  assert.equal(events.length, PINS.length * 4)
  assert.ok(events.every((event, i) => i === 0 || event.angle > events[i - 1].angle))
  assert.deepEqual(events.slice(0, PINS.length).map(e => e.tine), PINS.map(e => e.tine))
})
test('boundary split and negative unwrapped angles never double or skip', () => {
  const start = -TAU * 2.3, end = TAU * 3.1
  const split = PINS[8].phase
  assert.deepEqual([...crossedPins(start, split), ...crossedPins(split, end)], crossedPins(start, end))
})
test('small irregular input segments produce exactly the same crossings as one fast move', () => {
  let angle = -3.7
  const start = angle, end = TAU * 5.2
  const segmented = []
  while (angle < end) {
    const next = Math.min(end, angle + 0.013 + Math.abs(Math.sin(angle * 91)) * 0.43)
    segmented.push(...crossedPins(angle, next))
    angle = next
  }
  assert.deepEqual(segmented, crossedPins(start, end))
})

test('upward resting handle leaves tune phase zero; transmission advances 25% faster',()=>{
  assert.equal(CRANK_REST_ANGLE,Math.PI/2)
  assert.ok(Math.abs(GEAR_RATIO/(1/12)-1.25)<1e-12)
  const events=crossedPins(0,TAU*GEAR_RATIO)
  assert.equal(events.length,5)
  assert.equal(0*GEAR_RATIO,0)
})

test('clockwise crank motion plays forward and counterclockwise motion rewinds silently',()=>{
  assert.equal(PLAY_DIRECTION,-1)
  assert.equal(cylinderAngleForCrank(-TAU),TAU*GEAR_RATIO)
  assert.equal(crossedPins(0,cylinderAngleForCrank(-TAU)).length,5)
  assert.deepEqual(crossedPins(cylinderAngleForCrank(-TAU),cylinderAngleForCrank(-TAU+.5)),[])
  assert.deepEqual(crossedPins(0,cylinderAngleForCrank(TAU)),[])
})
