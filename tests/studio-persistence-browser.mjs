import assert from 'node:assert/strict'
import { validateSettings } from '../src/studio-config.js'
import { readFile, writeFile } from 'node:fs/promises'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
const shared=validateSettings(JSON.parse(await readFile('studies/ariel-record-button-tune.json','utf8')))
const browser=await chromium.launch({headless:true}),results=[]
try{
 for(const scenario of ['immediate refresh','style preview refresh','saved setup restore']){
  const context=await browser.newContext(),page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(String(e)))
  let project={settings:shared,savedAt:new Date(Date.now()-100000).toISOString()}
  await page.route('**/__musicbox/study',route=>{if(route.request().method()==='POST'){project={settings:route.request().postDataJSON().settings,savedAt:new Date().toISOString()};return route.fulfill({json:{...project,path:'studies/current.json'}})}return route.fulfill({json:project})})
  await page.route('**/src/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nwindow.persistenceTest={ready:studio.ready,get:studio.getSettings};`})})
  const ready=async()=>{await page.waitForFunction(()=>window.persistenceTest);await page.evaluate(()=>window.persistenceTest.ready);if(await page.locator('#studio-toggle').getAttribute('aria-expanded')==='false')await page.locator('#studio-toggle').click()}
  try{
   await page.goto('http://localhost:5173/?studio=1');await ready()
   if(scenario==='immediate refresh'){
    await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(()=>{const input=document.getElementById('control-materials.cylinder.color');input.value='#123456';input.dispatchEvent(new Event('input',{bubbles:true}));location.reload()})]);await ready()
    assert.equal((await page.evaluate(()=>window.persistenceTest.get())).materials.cylinder.color,'#123456')
   }else if(scenario==='style preview refresh'){
    await page.locator('#studio-preset').selectOption('Soft ceramic');await page.waitForTimeout(350);await page.reload();await ready()
    assert.equal((await page.evaluate(()=>window.persistenceTest.get())).materials.cylinder.color,shared.materials.cylinder.color)
   }else{
    await page.locator('#studio-preset').selectOption('Pop chrome')
    assert.equal(await page.locator('#studio-preset option[value="saved"]').count(),1)
    await page.locator('#studio-preset').selectOption('saved')
    assert.deepEqual(await page.evaluate(()=>window.persistenceTest.get()),shared)
    await page.locator('[id="control-materials.cylinder.roughness"]').evaluate(el=>{el.value=.41;el.dispatchEvent(new Event('input',{bubbles:true}))})
    await page.locator('#studio-save').click();await page.waitForFunction(()=>document.querySelector('#studio-message').textContent.startsWith('Saved'))
    await page.locator('#studio-preset').selectOption('Soft ceramic');await page.locator('#studio-preset').selectOption('saved')
    assert.equal((await page.evaluate(()=>window.persistenceTest.get())).materials.cylinder.roughness,.41)
   }
   assert.deepEqual(errors,[]);results.push({scenario,passed:true})
  }catch(error){results.push({scenario,passed:false,error:error.message})}finally{await context.close()}
 }
 console.log(JSON.stringify(results,null,2));assert.ok(results.every(r=>r.passed))
 await writeFile('verification/persistence-report.json',JSON.stringify(results,null,2)+'\n')
}finally{await browser.close()}
