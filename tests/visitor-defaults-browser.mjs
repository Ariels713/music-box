import assert from 'node:assert/strict'
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
const directory=await mkdtemp(join(tmpdir(),'music-box-visitor-')),wave=join(directory,'phrase.wav'),rate=48000
const wav=Buffer.alloc(44+rate*5*2)
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(rate*5*2,40)
for(const [start,end,midi] of [[.2,.8,57],[1,1.6,59],[1.8,2.4,60],[2.7,3.4,62]])for(let i=start*rate|0;i<end*rate;i++)wav.writeInt16LE(Math.round(6500*Math.sin(2*Math.PI*440*2**((midi-69)/12)*(i/rate-start))),44+i*2)
await writeFile(wave,wav)
const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${wave}%noloop`]}),errors=[]
const saved=JSON.parse(await readFile('studies/current.json','utf8')).settings
const draft=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('music-box-scene-v1')||'null')?.settings)
try{
 for(const base of ['http://localhost:5173','http://localhost:5174']) {
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),requests=[]
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())})
  await page.goto(base+'/');await page.waitForSelector('canvas');await page.waitForSelector('#record-sound')
  assert.equal(await page.locator('#studio-toggle,#studio-panel').count(),0)
  assert.equal(requests.some(url=>/\/src\/studio\.js/.test(url)),false)
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true')
  await page.getByRole('button',{name:'Sound on',exact:true}).click()
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false')
  await page.getByRole('button',{name:'Sound off',exact:true}).click()
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true')
  const contact=page.getByRole('link',{name:'Email Ariel Rodriguez'})
  assert.equal(await contact.getAttribute('href'),'mailto:ariel.rodriguez@hey.com')
  assert.equal(await page.getByRole('link',{name:/@Ariel_Rodriguez on X/}).getAttribute('href'),'https://x.com/Ariel_Rodriguez')
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:1000})
   assert.ok(await contact.isVisible());const rect=await contact.boundingBox()
   assert.ok(rect.height>=44&&rect.x>=0&&rect.x+rect.width<=width)
   assert.equal(await contact.evaluate(el=>getComputedStyle(el).pointerEvents),'auto')
   await contact.focus();assert.equal(await contact.evaluate(el=>el===document.activeElement),true)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   await page.evaluate(()=>document.activeElement.blur())
   await page.screenshot({path:`verification/visitor-defaults-${base.endsWith('5174')?'production-':''}${width}.png`})
  }
  await page.setViewportSize({width:1440,height:1000})
  // Orbit creates a browser draft; its melody must be the bundled approved hum.
  await page.mouse.move(250,220);await page.mouse.down();await page.mouse.move(285,240,{steps:3});await page.mouse.up()
  assert.deepEqual((await draft(page)).melody,saved.melody)
  await page.locator('canvas').focus();await page.keyboard.press('ArrowRight')
  await page.keyboard.down('Space');await page.waitForFunction(()=>document.querySelector('#record-sound').getAttribute('aria-pressed')==='true')
  await page.waitForTimeout(3000);await page.keyboard.up('Space')
  await page.waitForFunction(original=>{const d=JSON.parse(localStorage.getItem('music-box-scene-v1')||'null');return d?.settings.melody?.notes.length>=2&&JSON.stringify(d.settings.melody)!==JSON.stringify(original)},saved.melody,{timeout:20000})
  const recorded=(await draft(page)).melody;assert.notDeepEqual(recorded,saved.melody)
  await page.reload();await page.waitForSelector('#record-sound');assert.deepEqual((await draft(page)).melody,recorded)
  await page.goto(base+'/?studio=1');await page.waitForSelector('#record-sound')
  if(base.endsWith('5173')) {
   await page.waitForSelector('#studio-toggle');assert.equal(await page.locator('#studio-panel').isVisible(),false)
   await page.getByRole('button',{name:'Studio',exact:true}).click();assert.equal(await page.locator('#studio-panel').isVisible(),true)
   await page.getByRole('tab',{name:'Tune',exact:true}).click()
   await page.waitForFunction(n=>document.querySelector('#tune-current').textContent.includes(`${n} notes`),recorded.notes.length)
  } else {
   assert.equal(await page.locator('#studio-toggle,#studio-panel').count(),0)
   assert.equal(requests.some(url=>url.includes('/__musicbox/study')),false)
  }
  await page.close()
 }
 assert.deepEqual(errors,[])
 assert.deepEqual(JSON.parse(await readFile('studies/current.json','utf8')).settings,saved)
 console.log('Visitor DOM contains no Studio; production ignores editor flag and needs no save API. Existing hum preserved; fake-mic recording/reload/local editor handoff, updated contact links, desktop/mobile layout and console checks pass.')
}finally{await browser.close();await rm(directory,{recursive:true,force:true})}
