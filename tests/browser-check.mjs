// Uses an existing Playwright installation; adds no app dependency.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
// Decorative motion is tested separately in falling-notes-browser.mjs.
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const errors = [], checks = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
await mkdir('verification', { recursive: true })
// Instrument only the test response, keeping production free of test globals.
await page.route('**/src/main.js*', async route => {
  const response = await route.fetch()
  const source = await response.text()
  await route.fulfill({ response, body: source + `\n
const onsets = [];
const originalStrike = audio.strike.bind(audio);
audio.strike = midi => { onsets.push({midi, time: performance.now()}); originalStrike(midi) };
window.testBox = {
 ready: studio.ready,
 snapshot: () => ({distance:camera.position.distanceTo(controls.target),zoom:camera.zoom,crankVisual:box.crank.rotation.z,angle: crankAngle, cylinder: box.cylinder.rotation.x, active: activePointer, orbit: controls.enabled, camera: camera.position.toArray(), onsets: [...onsets], voices: audio.voices.length, audio: audio.context?.state}),
 project: angle => { const p = new THREE.Vector3(CRANK_CENTER.x + Math.cos(angle+CRANK_REST_ANGLE)*CRANK_RADIUS, CRANK_CENTER.y + Math.sin(angle+CRANK_REST_ANGLE)*CRANK_RADIUS, CRANK_CENTER.z+GRIP_OFFSET).project(camera); const r = canvas.getBoundingClientRect(); return {x:r.left+(p.x+1)*canvas.clientWidth/2,y:r.top+(1-p.y)*canvas.clientHeight/2} },
 contacts: () => {
   const rotation = box.cylinder.rotation.x;
   const results = box.pinHeads.map(pin => {
     box.cylinder.rotation.x = pin.userData.phase;
     box.root.updateMatrixWorld(true);
     const tip = pin.localToWorld(new THREE.Vector3(0, pin.geometry.parameters.height / 2, 0));
     const tine = box.tines[pin.userData.tine];
     const tineEnd = new THREE.Vector3(0,0,tine.geometry.parameters.depth/2);
     tine.localToWorld(tineEnd);
     return tip.distanceTo(tineEnd);
   });
   box.cylinder.rotation.x = rotation;
   box.root.updateMatrixWorld(true);
   return results;
 },
 view: (x,y,z) => { camera.position.set(x,y,z); controls.update() },
 advance: increment
};` })
})
await page.route('**/__musicbox/study', route => route.fulfill({ json: { settings: null } }))
const state = () => page.evaluate(() => window.testBox.snapshot())
const point = a => page.evaluate(a => window.testBox.project(a), a)
const move = async a => { const p = await point(a); await page.mouse.move(p.x, p.y) }
try {
  await page.goto('http://localhost:5173/?studio=1')
  await page.waitForFunction(() => !!window.testBox)
  await page.evaluate(() => window.testBox.ready)
  let before = await state()
  await page.waitForTimeout(300)
  assert.equal((await state()).angle, before.angle)
  checks.push('No autoplay or idle mechanism rotation; guide may rotate independently')
  assert.ok(Math.abs((await state()).crankVisual-Math.PI/2)<1e-12)
  checks.push('Crank starts pointing upward without advancing the cylinder or striking a note')
  const distances = await page.evaluate(() => window.testBox.contacts())
  assert.ok(distances.every(d => d < 0.0001), 'Every pin tip must meet its matching tine at the audio crossing phase')
  checks.push('All visible pins meet their pitch-matched tine at the exact audio crossing angle')
  await move(0); await page.mouse.down()
  assert.equal((await state()).orbit, false)
  before = await state()
  await page.waitForTimeout(350)
  assert.equal((await state()).angle, before.angle)
  assert.equal((await state()).onsets.length, 0)
  checks.push('Grab disables orbit; holding still has no movement/onsets')
  await move(0)
  for (let i = 1; i <= 96; i++) await move(-i / 96 * Math.PI * 4)
  const turned = await state()
  assert.ok(Math.abs(turned.angle + Math.PI * 4) < 0.02)
  assert.deepEqual(turned.camera, before.camera)
  assert.ok(Math.abs(turned.cylinder+turned.angle*(1.25/12))<.003)
  assert.ok(turned.onsets.length > 0)
  assert.equal(turned.audio, 'running')
  checks.push('Two clockwise pointer circles turn crank by -4π; camera unchanged; audio unlocked; notes emitted')
  await page.mouse.up()
  before = await state()
  await move(2)
  assert.equal((await state()).angle, before.angle)
  assert.equal((await state()).orbit, true)
  checks.push('Release stops and restores orbit')
  for (const event of ['pointercancel', 'lostpointercapture', 'blur']) {
    const angle = (await state()).angle
    await move(angle); await page.mouse.down()
    assert.notEqual((await state()).active, null)
    await page.evaluate(type => {
      if (type === 'blur') window.dispatchEvent(new Event(type))
      else document.querySelector('canvas').dispatchEvent(new PointerEvent(type, { pointerId: window.testBox.snapshot().active }))
    }, event)
    assert.equal((await state()).active, null)
    const stopped = (await state()).angle
    await move(angle + 0.5)
    assert.equal((await state()).angle, stopped)
    await page.mouse.up()
  }
  checks.push('Pointer cancel, lost capture, window blur stop immediately')
  before = await state()
  await page.mouse.move(300, 400); await page.mouse.down(); await page.mouse.move(500, 450, { steps: 8 }); await page.mouse.up()
  assert.notDeepEqual((await state()).camera, before.camera)
  assert.equal((await state()).angle, before.angle)
  checks.push('Dragging off crank orbits without mechanism movement')
  await page.getByRole('button', { name: 'Reset view' }).click()
  await page.locator('canvas').focus()
  before = await state()
  await page.keyboard.press('ArrowRight')
  assert.ok((await state()).angle < before.angle)
  const forwardCount = (await state()).onsets.length
  await page.keyboard.press('ArrowLeft')
  assert.equal((await state()).onsets.length, forwardCount)
  checks.push('Keyboard steps use same rotation; reverse silent')
  before=await state()
  await page.mouse.move(350,250)
  await page.mouse.wheel(0,700);await page.mouse.wheel(0,-700)
  assert.equal((await state()).zoom,before.zoom)
  assert.deepEqual((await state()).camera,before.camera)
  const touch=await page.context().newCDPSession(page)
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true})
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:250,id:1},{x:400,y:250,id:2}]})
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:260,y:250,id:1},{x:440,y:250,id:2}]})
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false});await touch.detach()
  assert.equal((await state()).zoom,before.zoom)
  assert.ok(Math.abs((await state()).distance-before.distance)<1e-9)
  checks.push('Scroll/trackpad wheel and two-finger pinch leave camera zoom and distance unchanged')
  await page.evaluate(() => window.testBox.advance(-Math.PI * 2 * 12 * 3))
  assert.ok((await state()).voices <= 12)
  checks.push('Fast multi-lap input caps simultaneous voices at 12')
  // Render real Web Audio synthesis offline, measuring signal and tail decay.
  const audioResult = await page.evaluate(async () => {
    const { pluck } = await import('/src/audio.js')
    const context = new OfflineAudioContext(1, 48000 * 3, 48000)
    pluck(context, context.destination, 72, 0)
    const buffer = await context.startRendering()
    const samples = buffer.getChannelData(0)
    function rms(start, end) {
      let sum = 0
      for (let i = start*48000; i < end*48000; i++) sum += samples[i] ** 2
      return Math.sqrt(sum / ((end-start)*48000))
    }
    // Search the fundamental via a direct Fourier projection.
    let best = { frequency: 0, energy: 0 }
    for (let f = 500; f <= 545; f++) {
      let re = 0, im = 0
      for (let i = 0; i < 12000; i++) { re += samples[i] * Math.cos(2*Math.PI*f*i/48000); im += samples[i] * Math.sin(2*Math.PI*f*i/48000) }
      const energy = re*re + im*im
      if (energy > best.energy) best = { frequency: f, energy }
    }
    return { early: rms(0.01, 0.1), late: rms(1.5, 1.6), tail: rms(2, 3), fundamental: best.frequency }
  })
  assert.ok(audioResult.early > 0.01)
  assert.ok(audioResult.late < audioResult.early / 100)
  assert.equal(audioResult.tail, 0)
  assert.ok(Math.abs(audioResult.fundamental - 523.25) < 2)
  checks.push('Offline Web Audio: nonzero pluck, C5 fundamental, natural decay, silent finished tail')
  await page.screenshot({ path: 'verification/desktop.png' })
  await page.mouse.move(300, 400); await page.mouse.down(); await page.mouse.move(900, 700, { steps: 12 }); await page.mouse.up()
  await page.screenshot({ path: 'verification/alternate-angle.png' })
  await page.evaluate(() => window.testBox.view(0.1, 5.8, 0.2))
  await page.screenshot({ path: 'verification/top.png' })
  await page.evaluate(() => window.testBox.view(-2.7, 1.9, -4.5))
  await page.screenshot({ path: 'verification/back.png' })
  await page.evaluate(() => window.testBox.view(0.1, -5, 0.2))
  await page.screenshot({ path: 'verification/underside.png' })
  await page.getByRole('button', { name: 'Reset view' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'verification/mobile.png' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  checks.push('390px layout has no horizontal overflow; screenshots captured')
  assert.deepEqual(errors, [])
  checks.push('Browser console and page errors: none')
  const report = { date: new Date().toISOString(), checks, audioResult, errors, limitation: 'Headless Chromium tested. Signal verified offline; sound not listened to by a human.' }
  await writeFile('verification/report.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} catch (error) { console.error({errors}); throw error } finally { await browser.close() }
