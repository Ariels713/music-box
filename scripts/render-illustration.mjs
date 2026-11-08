// Local art-direction study using the actual model, without external rendering services.
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1536, height: 1152 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(String(error)))
page.on('console', event => { if (event.type() === 'error') errors.push(event.text()) })
await mkdir('verification', { recursive: true })
await page.route('**/src/main.js*', async route => {
  const response = await route.fetch()
  await route.fulfill({ response, body: await response.text() + `\n
renderer.setAnimationLoop(null);
for (const element of document.querySelectorAll('header, footer')) element.remove();
app.style.inset = '0'; app.style.borderRadius = '0';
const width = 1536, height = 1152;
renderer.setPixelRatio(1); renderer.setSize(width, height);
box.hitTarget.visible = false;
box.base.traverse(item => { if (item.geometry?.type === 'PlaneGeometry') item.visible = false; });
box.frame.position.y = 0.32;
box.cylinder.position.add(new THREE.Vector3(-0.07, 0.92, 0.1));
box.comb.position.set(-0.15, 1.24, -0.25);
box.crank.position.add(new THREE.Vector3(0.82, 0.9, 0.06));
const grainCanvas = document.createElement('canvas'); grainCanvas.width = grainCanvas.height = 512;
const grain = grainCanvas.getContext('2d'); grain.fillStyle = '#d3b58d'; grain.fillRect(0,0,512,512);
for (let i=0;i<340;i++) {
 grain.strokeStyle = 'rgba(104,66,30,' + (0.012+(i%7)*0.005) + ')';
 grain.beginPath();
 for (let x=0;x<=512;x+=8) { const y=i*1.6+Math.sin(x/130+i*.11)*5; if(x===0)grain.moveTo(x,y);else grain.lineTo(x,y); }
 grain.stroke();
}
const woodMap = new THREE.CanvasTexture(grainCanvas); woodMap.colorSpace = THREE.SRGBColorSpace;
const styled = new Set();
box.root.traverse(item => {
 for(const material of [item.material].flat().filter(Boolean)) {
  if(styled.has(material)) continue; styled.add(material);
  const palette = {
   frame: [0xcbd1cd, .5, .48], brass: [0xd1ae67, .78, .4], combClay: [0xa5b1b7, .82, .26],
   dark: [0x34434b, .1, .65], recess: [0x6d7e86, .3, .5], baseClay: [0xc5a37b, 0, .65],
   crankClay: [0xd4dce0, .8, .28], gripClay: [0x7bb9c3, .1, .6]
  }[material.name];
  if(palette) { material.color.setHex(palette[0]); material.metalness=palette[1]; material.roughness=palette[2]; }
  if(material.name==='baseClay') material.map=woodMap;
  material.needsUpdate=true;
 }
});
box.root.updateMatrixWorld(true);
scene.background = new THREE.Color(2, 1.98, 1.93);
scene.environmentIntensity = .8;
key.intensity = 2.2; key.shadow.radius = 16;
key.position.set(-3,7,4);
const bounds = new THREE.Box3().setFromObject(box.root);
const center = bounds.getCenter(new THREE.Vector3());
const illustrationCamera = new THREE.OrthographicCamera(-3.0,3.0,2.25,-2.25,.1,50);
illustrationCamera.position.copy(center).add(new THREE.Vector3(4.5,4.5,6));
illustrationCamera.lookAt(center); illustrationCamera.updateMatrixWorld();
composer.dispose(); occlusion.dispose(); outputPass.dispose();
const illustration = new EffectComposer(renderer);
illustration.renderTarget1.samples=4; illustration.renderTarget2.samples=4;
illustration.setSize(width,height);
illustration.addPass(new RenderPass(scene,illustrationCamera));
const illustrationAO = new SSAOPass(scene, illustrationCamera, width,height,24);
illustrationAO.kernelRadius=.16; illustrationAO.minDistance=.0005; illustrationAO.maxDistance=.08;
illustration.addPass(illustrationAO); illustration.addPass(new OutputPass());
illustration.render();
window.illustrationReady = true;
` })
})
try {
  await page.goto('http://localhost:5173/?studio=1')
  await page.waitForFunction(() => window.illustrationReady === true)
  await page.screenshot({ path: 'verification/product-illustration.png' })
  if (errors.length) throw new Error(errors.join('\n'))
  await writeFile('verification/product-illustration.json', JSON.stringify({ renderer: 'Local Three.js', camera: 'Orthographic', scene: 'Exploded model study', text: false, logos: false, dimensions: [1536,1152], errors }, null, 2) + '\n')
  console.log('Rendered verification/product-illustration.png; no browser errors.')
} finally { await browser.close() }
