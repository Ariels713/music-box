import assert from 'node:assert/strict'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[]
page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())})
try{
 await page.goto('http://localhost:5173/');await page.waitForSelector('#studio-panel',{state:'attached'})
 assert.equal(await page.locator('#studio-toggle').getAttribute('aria-expanded'),'false')
 assert.equal(await page.locator('#studio-panel').isVisible(),false)
 const contact=page.getByRole('link',{name:'Email Ariel Rodriguez'})
 assert.equal(await contact.getAttribute('href'),'mailto:ariel.rodriguez@rho.co')
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:1000})
  assert.ok(await contact.isVisible());const rect=await contact.boundingBox()
  assert.ok(rect.height>=44&&rect.x>=0&&rect.x+rect.width<=width)
  assert.equal(await contact.evaluate(el=>getComputedStyle(el).pointerEvents),'auto')
  await contact.focus();assert.equal(await contact.evaluate(el=>el===document.activeElement),true)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.screenshot({path:`verification/visitor-defaults-${width}.png`})
 }
 await page.getByRole('button',{name:'Studio',exact:true}).click();assert.equal(await page.locator('#studio-panel').isVisible(),true)
 await page.reload();await page.waitForSelector('#studio-panel',{state:'attached'});assert.equal(await page.locator('#studio-panel').isVisible(),false)
 assert.deepEqual(errors,[]);console.log('Studio closed by default/reload, still opens; contact link accessible/clickable; desktop/mobile layout and console checks pass.')
}finally{await browser.close()}
