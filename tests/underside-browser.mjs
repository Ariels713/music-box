import assert from 'node:assert/strict'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1200,height:1000},reducedMotion:'reduce'}),errors=[]
page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())})
await page.route('**/src/main.js*',async r=>{const response=await r.fetch();await r.fulfill({response,body:await response.text()+`\nwindow.signatureTest={ready:sceneState.ready,view:()=>sceneState.setCamera({azimuth:0,elevation:-65,distance:5.4,zoom:1.5,target:{x:0,y:.08,z:0}}),state:()=>{box.root.updateMatrixWorld(true);return {text:box.mark.userData.signature,visible:box.mark.visible,normal:new THREE.Vector3(0,0,1).transformDirection(box.mark.matrixWorld).toArray(),material:box.mark.material.type,muted:audio.muted,audio:audio.context?.state??'locked',voices:audio.voices.length}}};`})})
try{
 await page.goto('http://localhost:5173/');await page.waitForFunction(()=>window.signatureTest);await page.evaluate(()=>window.signatureTest.ready)
 const initial=await page.evaluate(()=>window.signatureTest.state())
 assert.equal(initial.text,'@Ariel_Rodriguez');assert.equal(initial.visible,true);assert.ok(initial.normal[1]<-.99)
 assert.equal(initial.material,'MeshStandardMaterial');assert.equal(initial.muted,false);assert.equal(initial.audio,'locked')
 assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true')
 await page.locator('canvas').focus();for(let i=0;i<16;i++)await page.keyboard.press('ArrowRight')
 const playing=await page.evaluate(()=>window.signatureTest.state());assert.equal(playing.audio,'running');assert.ok(playing.voices>0)
 await page.getByRole('button',{name:'Sound on',exact:true}).click();assert.equal((await page.evaluate(()=>window.signatureTest.state())).muted,true)
 await page.getByRole('button',{name:'Sound off',exact:true}).click();assert.equal((await page.evaluate(()=>window.signatureTest.state())).muted,false)
 await page.evaluate(()=>{window.signatureTest.view();document.activeElement.blur()})
 await page.screenshot({path:'verification/twitter-underside.png'})
 assert.deepEqual(errors,[]);console.log('Reference-style signature faces outward beneath base; sound defaults on, unlocks on crank and toggles correctly; no errors.')
}finally{await page.unrouteAll({behavior:'ignoreErrors'});await browser.close()}
