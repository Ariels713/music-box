import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createMusicBox, CRANK_CENTER, CRANK_RADIUS, GRIP_OFFSET, TINE_HEIGHT } from './model.js'
import { TAU, PLAY_DIRECTION, cylinderAngleForCrank, CRANK_REST_ANGLE, PITCHES, PINS, angleDelta, crossedPins } from './mechanism.js'
import { arrangeMelody } from './tune.js'
import { MusicAudio } from './audio.js'
import { createCrankHint } from './crank-hint.js'
import { createFallingNotes } from './falling-notes.js'
import { createRecordButton } from './record-button.js'
import { createSceneState } from './scene-state.js'
import { DEFAULT_SETTINGS, clone } from './studio-config.js'

const app = document.querySelector('#app')
const status = document.querySelector('#status')
const audio = new MusicAudio()
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.localClippingEnabled = true
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.VSMShadowMap
const canvas = renderer.domElement
canvas.tabIndex = 0
canvas.setAttribute('aria-label', 'Music box. Grab the handle and turn in circles. Arrow right turns forward; arrow left rewinds silently. Drag elsewhere to orbit. Hold Space to record a melody; release to create a cylinder.')
canvas.setAttribute('aria-describedby', 'instructions')
app.append(canvas)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf4f5f7)
const pmrem = new THREE.PMREMGenerator(renderer)
const room = new RoomEnvironment()
const environment = pmrem.fromScene(room, 0.04)
scene.environment = environment.texture
scene.environmentIntensity = 0.55
room.dispose(); pmrem.dispose()
let camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = false
controls.enablePan = false
controls.enableZoom = false
controls.minDistance = 2.6
controls.maxDistance = 10
controls.minZoom = 0.4; controls.maxZoom = 3
controls.minPolarAngle = THREE.MathUtils.degToRad(5); controls.maxPolarAngle = THREE.MathUtils.degToRad(175)
let currentPins = PINS
let capturing = false
let recordPointer = null
let keyboardRecording = false
let recordButton = null
let box = createMusicBox()
scene.add(box.root)
const ambient = new THREE.HemisphereLight(0xfffcf4, 0xb6bcc9, 0.3)
scene.add(ambient)
const key = new THREE.DirectionalLight(0xfff5e5, 2.1)
key.position.set(-3.5, 7, 4)
key.castShadow = true
key.shadow.mapSize.set(1024, 1024)
key.shadow.radius = 20
key.shadow.blurSamples = 12
key.shadow.camera.left = key.shadow.camera.bottom = -3
key.shadow.camera.right = key.shadow.camera.top = 3
key.shadow.normalBias = 0.015
scene.add(key)
const fill = key.clone(); fill.castShadow = false
const rim = key.clone(); rim.castShadow = false
scene.add(fill, rim)
const lights = { key, fill, rim }
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.17 }))
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.005
floor.receiveShadow = true;floor.userData.opticalGlow=true; scene.add(floor)
const ground=new THREE.Mesh(floor.geometry,new THREE.MeshBasicMaterial({color:scene.background.clone()}))
ground.rotation.x=-Math.PI/2;ground.position.y=-.006;scene.add(ground)
const shadowCanvas = document.createElement('canvas')
shadowCanvas.width = shadowCanvas.height = 256
const shadowContext = shadowCanvas.getContext('2d')
const shadowGradient = shadowContext.createRadialGradient(128, 128, 30, 128, 128, 126)
shadowGradient.addColorStop(0, 'rgba(50,45,65,0.24)')
shadowGradient.addColorStop(0.5, 'rgba(50,45,65,0.12)')
shadowGradient.addColorStop(1, 'rgba(50,45,65,0)')
shadowContext.fillStyle = shadowGradient
shadowContext.fillRect(0, 0, 256, 256)
const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }))
contactShadow.rotation.x = -Math.PI / 2
contactShadow.position.set(0.05, -0.003, 0.08)
contactShadow.userData.opticalGlow=true
scene.add(contactShadow)
const wellUniforms={recordWellCenter:{value:new THREE.Vector2()},recordWellRadius:{value:0},recordWellAxes:{value:new THREE.Vector2(1,1)},recordWellRotation:{value:new THREE.Vector2(1,0)}}
contactShadow.material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,wellUniforms)
  shader.vertexShader='varying vec3 vWellWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWellWorld=(modelMatrix*vec4(transformed,1.0)).xyz;')
  shader.fragmentShader='varying vec3 vWellWorld;uniform vec2 recordWellCenter;uniform float recordWellRadius;uniform vec2 recordWellAxes;uniform vec2 recordWellRotation;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec2 d=vWellWorld.xz-recordWellCenter;vec2 q=vec2(recordWellRotation.x*d.x-recordWellRotation.y*d.y,recordWellRotation.y*d.x+recordWellRotation.x*d.y);if(recordWellRadius>0.0 && length(q/recordWellAxes)<1.0)discard;')
}
let wellGeometryKey=''

const composer = new EffectComposer(renderer)
composer.renderTarget1.samples = 4
composer.renderTarget2.samples = 4
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)
// Optical halos must not become solid surfaces in the occlusion depth pass.
class ContactOcclusionPass extends SSAOPass {
  _overrideVisibility() {
    super._overrideVisibility()
    this.scene.traverse(object => {
      if (object.visible && object.userData.opticalGlow) { object.visible = false; this._visibilityCache.push(object) }
    })
  }
}
const occlusion = new ContactOcclusionPass(scene, camera, 512, 512, 16)
occlusion.kernelRadius = 0.11
occlusion.minDistance = 0.0005
occlusion.maxDistance = 0.005
composer.addPass(occlusion)
const outputPass = new OutputPass()
composer.addPass(outputPass)

let dirty = true
let lastStrike = -Infinity
let crankAngle = 0
let activePointer = null
let lastAngle = null
const struckAt = new Array(PITCHES.length).fill(-Infinity)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(CRANK_CENTER.z + GRIP_OFFSET))
const intersection = new THREE.Vector3()
const abort = new AbortController()
const listen = (target, type, callback, options = {}) => target.addEventListener(type, callback, { ...options, signal: abort.signal })
let studio = null
let sceneState = null
let applying = false
let currentSettings = clone(DEFAULT_SETTINGS)
const fallingNotes=createFallingNotes();scene.add(fallingNotes.root)
const crankHint=createCrankHint();scene.add(crankHint.root);crankHint.follow(box)
const texturePool = new Map()
rememberPartPositions()
controls.addEventListener('change', () => {
  dirty = true
  if (!applying && sceneState) sceneState.syncCamera(cameraSnapshot())
})

function increment(delta) {
  if (!Number.isFinite(delta) || delta === 0 || document.hidden || capturing) return
  if(Math.abs(delta)>.003)crankHint.dismiss()
  const before = cylinderAngleForCrank(crankAngle)
  dirty = true
  crankAngle += delta
  box.crank.rotation.z = (crankAngle + CRANK_REST_ANGLE) % TAU
  box.cylinder.rotation.x = cylinderAngleForCrank(crankAngle) % TAU
  for (const pin of crossedPins(before, cylinderAngleForCrank(crankAngle), currentPins)) {
    audio.strike(PITCHES[pin.tine])
    lastStrike = performance.now()
    struckAt[pin.tine] = lastStrike
    if(!reducedMotion.matches)fallingNotes.spawn(PITCHES[pin.tine],camera)
  }
}
function setRay(event) {
  const rect = canvas.getBoundingClientRect()
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
  raycaster.setFromCamera(pointer, camera)
}
function pointerAngle(event) {
  setRay(event)
  box.root.updateMatrixWorld(true)
  const origin = box.crank.getWorldPosition(new THREE.Vector3())
  const axis = new THREE.Vector3(0, 0, 1).transformDirection(box.root.matrixWorld)
  const gripPlaneOrigin = origin.clone().addScaledVector(axis, GRIP_OFFSET)
  plane.setFromNormalAndCoplanarPoint(axis, gripPlaneOrigin)
  // An edge-on crank plane cannot be manipulated reliably. Orbit to face it.
  if (Math.abs(raycaster.ray.direction.dot(plane.normal)) < 0.06) return null
  if (!raycaster.ray.intersectPlane(plane, intersection)) return null
  box.root.worldToLocal(intersection)
  intersection.sub(box.crank.position)
  if (Math.hypot(intersection.x, intersection.y) < 0.07) return null
  return Math.atan2(intersection.y, intersection.x)
}
async function unlock() {
  try {
    await audio.unlock()
    status.textContent = audio.muted ? 'Sound off' : 'Sound ready · turn to play'
  } catch { status.textContent = 'Sound unavailable · try the sound button again' }
}
function stop() {
  const id = activePointer
  activePointer = null; lastAngle = null
  controls.enabled = true
  canvas.classList.remove('turning')
  if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id)
}
listen(window, 'keydown', () => canvas.classList.remove('pointer-focus'), { capture: true })
listen(canvas, 'pointerdown', event => {
  canvas.classList.add('pointer-focus')
  if (event.button !== 0 || activePointer !== null || capturing) return
  setRay(event)
  box.root.updateMatrixWorld(true)
  if (studio?.isPicking()) {
    const hit = raycaster.intersectObject(box.root, true).find(hit => hit.object.visible && hit.object.userData.part)
    if (hit) studio.selectPart(hit.object.userData.part)
    event.stopImmediatePropagation(); event.preventDefault()
    return
  }
  if (recordButton && raycaster.intersectObject(recordButton.root,true).length) {
    event.stopImmediatePropagation(); event.preventDefault()
    canvas.focus({preventScroll:true});recordPointer=event.pointerId;canvas.setPointerCapture(event.pointerId);controls.enabled=false
    recordButton.down();controls.enabled=false;return
  }
  if (!raycaster.intersectObject(box.hitTarget).length) return
  if (isExploded()) {
    event.stopImmediatePropagation(); event.preventDefault()
    sceneState.assemble()
    return
  }
  // Capture phase runs before OrbitControls' pointer listener.
  event.stopImmediatePropagation(); event.preventDefault()
  controls.enabled = false
  activePointer = event.pointerId
  lastAngle = pointerAngle(event)
  canvas.setPointerCapture(event.pointerId)
  canvas.focus({ preventScroll: true })
  canvas.classList.add('turning')
  unlock()
}, { capture: true })
listen(canvas, 'pointermove', event => {
  if (recordPointer !== null) return
  if (activePointer === null) {
    setRay(event)
    const overRecord=!!recordButton && raycaster.intersectObject(recordButton.root,true).length>0
    recordButton?.hover(overRecord)
    canvas.classList.toggle('over-record',overRecord)
    canvas.classList.toggle('over-handle', raycaster.intersectObject(box.hitTarget).length > 0)
    return
  }
  if (event.pointerId !== activePointer) return
  const events = event.getCoalescedEvents?.() || []
  for (const sample of events.length ? events : [event]) {
    const next = pointerAngle(sample)
    if (next !== null && lastAngle !== null) increment(angleDelta(lastAngle, next))
    lastAngle = next
  }
})
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(canvas, type, event => {
  if(event.pointerId===recordPointer){
    recordPointer=null;controls.enabled=true
    if(type==='pointerup')recordButton.up();else recordButton.cancel()
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId)
    return
  }
  if (event.pointerId === activePointer) stop()
})
listen(window, 'blur', () => { stop(); cancelRecordingGesture() })
listen(document, 'visibilitychange', () => {stop();if(document.hidden)cancelRecordingGesture()})
listen(canvas, 'keydown', event => {
  if (event.key === 'Escape') { stop();cancelRecordingGesture();studio?.cancelPick(); return }
  if([' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat&&recordPointer===null&&!capturing){keyboardRecording=true;recordButton?.down()}return}
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  if (activePointer !== null || event.repeat) return
  if (isExploded()) sceneState.assemble()
  unlock()
  increment(PLAY_DIRECTION * (['ArrowRight', 'ArrowUp'].includes(event.key) ? Math.PI / 6 : -Math.PI / 6))
})
listen(canvas,'keyup',event=>{if([' ','Enter'].includes(event.key)&&keyboardRecording){event.preventDefault();keyboardRecording=false;recordButton?.up()}})
listen(canvas,'blur',()=>{if(keyboardRecording){keyboardRecording=false;recordButton?.cancel()}})
listen(document.querySelector('#sound'), 'click', async () => {
  const button = document.querySelector('#sound')
  audio.muted = !audio.muted
  if(!audio.muted)await unlock()
  button.setAttribute('aria-pressed', String(!audio.muted))
  button.textContent = audio.muted ? 'Sound off' : 'Sound on'
  status.textContent = audio.muted ? 'Sound off' : 'Sound ready · turn to play'
})
function resetView() {
  stop()
  sceneState?.setCamera(clone(DEFAULT_SETTINGS.camera))
}
function resize() {
  const width = app.clientWidth, height = app.clientHeight
  if (!width || !height) return
  const aspect = width / height
  if (camera.isPerspectiveCamera) {
    camera.aspect = aspect
    camera.fov = currentSettings.camera.fov
    camera.clearViewOffset()
  } else {
    const half = Math.max(1.85, 1.75 / aspect)
    camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half
  }
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  composer.setSize(width, height)
  updateOcclusionCamera()
  dirty = true
}
listen(reducedMotion,'change',()=>{fallingNotes.clear();dirty=true})
listen(window, 'resize', resize)
if(import.meta.env.DEV&&new URLSearchParams(location.search).get('studio')==='1') {
  const toggle=document.createElement('button')
  toggle.id='studio-toggle';toggle.textContent='Studio';toggle.setAttribute('aria-controls','studio-panel');toggle.setAttribute('aria-expanded','false')
  document.querySelector('.actions').prepend(toggle)
  const {createStudio}=await import('./studio.js')
  studio = createStudio({
    apply: applySettings,
    capture: captureScene,
    pick: active => canvas.classList.toggle('picking', active),
    frameModel,
    resetCamera: resetView,
    previewCrankArrow:active=>{crankHint.preview(active);dirty=true},
    clearFallingNotes:()=>{fallingNotes.clear();dirty=true},
    recordingChanged: recordingChanged,
    canRecord:()=>!capturing&&(!recordButton||recordButton.state()==='idle'),
  })
  sceneState=studio
  if(new URLSearchParams(location.search).get('edit')==='lettering')studio.ready.then(()=>studio.openLettering())
} else sceneState=createSceneState({apply:applySettings,message:text=>{status.textContent=text}})

recordButton=createRecordButton({
  changed:()=>{dirty=true}, recordingChanged,
  canStart:()=>!capturing&&!studio?.tuneBusy(),
  currentColor:()=>currentSettings.materials.cylinder.color,
  message:text=>{status.textContent=text},
  install:(melody,color)=>{const next=sceneState.getSettings();next.melody=melody;next.materials.cylinder.color=color;next.composition.explode=0;for(const key of Object.keys(next.composition.offsets))next.composition.offsets[key]={x:0,y:0,z:0};sceneState.setSettings(next)},
})
scene.add(recordButton.root)
recordButton.configure(currentSettings.recordButton)
updateButtonWell(currentSettings.recordButton)
resize()
let previousFrame=performance.now()
renderer.setAnimationLoop(() => {
  const now = performance.now()
  const delta=Math.min(.05,Math.max(0,(now-previousFrame)/1000))
  if(reducedMotion.matches && fallingNotes.clear())dirty=true
  const buttonMoving=recordButton.update(delta,reducedMotion.matches)
  const hintMoving=!document.hidden&&crankHint.update(delta,reducedMotion.matches)
  const notesMoving=!document.hidden&&!reducedMotion.matches&&fallingNotes.update(delta)
  previousFrame=now
  if (!dirty && !buttonMoving && !hintMoving && !notesMoving && now - lastStrike > 600) return
  dirty = false
  box.tines.forEach((tine, i) => {
    const age = (now - struckAt[i]) / 1000
    tine.material.emissive.setHex(0x947127)
    tine.material.emissiveIntensity = age < 0.5 ? Math.exp(-age * 12) * 0.8 : 0
    tine.position.y = TINE_HEIGHT + (!reducedMotion.matches && age < 0.35 ? Math.sin(age * 150) * Math.exp(-age * 18) * 0.008 : 0)
  })
  composer.render()
})
if (import.meta.hot) import.meta.hot.dispose(() => {
  stop(); crankHint.dispose(); fallingNotes.dispose(); recordButton?.dispose(); sceneState?.dispose?.();document.querySelector('#studio-toggle')?.remove(); abort.abort(); renderer.setAnimationLoop(null); controls.dispose(); audio.dispose()
  disposeObject(scene)
  texturePool.forEach(texture => texture.dispose())
  environment.dispose(); occlusion.dispose(); outputPass.dispose(); composer.dispose(); renderer.dispose(); canvas.remove()
})


function rememberPartPositions() {
  box.restPositions = Object.fromEntries(['base', 'frame', 'comb', 'cylinder', 'crank'].map(key => [key, box[key].position.clone()]))
}
function isExploded() {
  return currentSettings.composition.explode > 0 || Object.values(currentSettings.composition.offsets).some(offset => Object.values(offset).some(value => value !== 0))
}
function updateOcclusionCamera() {
  renderPass.camera = camera
  occlusion.camera = camera
  for (const material of [occlusion.ssaoMaterial, occlusion.depthRenderMaterial]) {
    const perspective = camera.isPerspectiveCamera ? 1 : 0
    if (material.defines.PERSPECTIVE_CAMERA !== perspective) { material.defines.PERSPECTIVE_CAMERA = perspective; material.needsUpdate = true }
    material.uniforms.cameraNear.value = camera.near; material.uniforms.cameraFar.value = camera.far
  }
  occlusion.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix)
  occlusion.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse)
}
function cameraSnapshot() {
  return {
    projection: camera.isPerspectiveCamera ? 'perspective' : 'orthographic',
    azimuth: THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()),
    elevation: THREE.MathUtils.clamp(90 - THREE.MathUtils.radToDeg(controls.getPolarAngle()), -85, 85),
    distance: THREE.MathUtils.clamp(camera.position.distanceTo(controls.target), 2.6, 10),
    zoom: camera.zoom,
    target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
  }
}
function applySettings(settings, previous) {
  applying = true
  try {
    stop()
    const melodyChanged = !previous || JSON.stringify(settings.melody) !== JSON.stringify(previous.melody)
    if (melodyChanged) {
      currentPins = settings.melody ? arrangeMelody(settings.melody).pins : PINS
      crankAngle = 0; struckAt.fill(-Infinity); lastStrike = -Infinity
    }
    if (melodyChanged || JSON.stringify(settings.geometry) !== JSON.stringify(previous.geometry)) {
      const old = box
      box = createMusicBox(settings.geometry, currentPins)
      scene.remove(old.root); disposeObject(old.root)
      scene.add(box.root); rememberPartPositions()
      box.crank.rotation.z = (crankAngle + CRANK_REST_ANGLE) % TAU
      box.cylinder.rotation.x = cylinderAngleForCrank(crankAngle) % TAU
    }
    recordButton?.configure(settings.recordButton)
    updateButtonWell(settings.recordButton)
    currentSettings = settings
    for (const [part, surfaces] of Object.entries(box.materials)) {
      const value = settings.materials[part]
      const texture = value.texture === 'none' ? null : surfaceTexture(part, value.texture)
      if (texture) texture.repeat.set(value.textureScale, value.textureScale)
      for (const material of surfaces) {
        material.color.set(value.color)
        material.metalness = value.metalness; material.roughness = value.roughness
        material.clearcoat = value.clearcoat; material.clearcoatRoughness = 0.15
        material.opacity = value.opacity; material.transparent = value.opacity < 1
        material.depthWrite = value.opacity >= 1
        const map = value.texture === 'wood' ? texture : null
        const roughnessMap = value.texture === 'brushed' ? texture : null
        const changed = material.map !== map || material.bumpMap !== texture || material.roughnessMap !== roughnessMap
        material.map = map; material.bumpMap = texture; material.roughnessMap = roughnessMap
        material.bumpScale = value.textureStrength * (value.texture === 'wood' ? 0.003 : 0.001)
        if (changed) material.needsUpdate = true
      }
    }
    box.mark.visible = settings.scene.showMark
    const explosion = { base: [0,0,0], frame: [0,.32,0], cylinder: [-.07,.92,.1], comb: [-.15,1.24,-.25], crank: [.82,.9,.06] }
    for (const [part, vector] of Object.entries(explosion)) {
      const offset = settings.composition.offsets[part]
      box[part].position.copy(box.restPositions[part]).addScaledVector(new THREE.Vector3(...vector), settings.composition.explode).add(new THREE.Vector3(offset.x, offset.y, offset.z))
    }
    box.root.rotation.y = THREE.MathUtils.degToRad(settings.composition.rotation)
    box.root.updateMatrixWorld(true)
    crankHint.configure(settings.crankArrow)
    crankHint.follow(box)
    const bounds=new THREE.Box3().setFromObject(box.root),buttonBounds=new THREE.Box3().setFromObject(recordButton.root)
    fallingNotes.configure(settings.fallingNotes,[bounds,buttonBounds].map(b=>({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z})))
    scene.background.set(settings.scene.background)
    ground.material.color.set(settings.scene.background)
    scene.environmentIntensity = settings.lighting.environment
    scene.environmentRotation.y = THREE.MathUtils.degToRad(settings.lighting.environmentRotation)
    ambient.intensity = settings.lighting.ambient
    for (const [name, light] of Object.entries(lights)) {
      const value = settings.lighting[name]
      light.visible = value.enabled; light.intensity = value.intensity; light.color.set(value.color)
      const azimuth = THREE.MathUtils.degToRad(value.azimuth), elevation = THREE.MathUtils.degToRad(value.elevation)
      light.position.set(Math.sin(azimuth) * Math.cos(elevation) * 8, Math.sin(elevation) * 8, Math.cos(azimuth) * Math.cos(elevation) * 8)
      light.castShadow = settings.scene.shadows && value.shadows
      light.shadow.radius = settings.scene.shadowSoftness
      light.shadow.needsUpdate = true
    }
    renderer.toneMappingExposure = settings.scene.exposure
    renderer.toneMapping = { aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping, agx: THREE.AgXToneMapping }[settings.scene.toneMapping]
    floor.material.opacity = settings.scene.shadowOpacity
    contactShadow.material.opacity = settings.scene.contactOpacity
    occlusion.enabled = settings.scene.ao; occlusion.kernelRadius = settings.scene.aoRadius
    const wantPerspective = settings.camera.projection === 'perspective'
    if (Boolean(camera.isPerspectiveCamera) !== wantPerspective) {
      camera = wantPerspective ? new THREE.PerspectiveCamera(38, 1, .05, 50) : new THREE.OrthographicCamera(-2,2,2,-2,.05,50)
      controls.object = camera
    }
    const target = settings.camera.target
    controls.target.set(target.x, target.y, target.z)
    const azimuth = THREE.MathUtils.degToRad(settings.camera.azimuth), elevation = THREE.MathUtils.degToRad(settings.camera.elevation)
    camera.position.set(target.x + Math.sin(azimuth) * Math.cos(elevation) * settings.camera.distance, target.y + Math.sin(elevation) * settings.camera.distance, target.z + Math.cos(azimuth) * Math.cos(elevation) * settings.camera.distance)
    camera.zoom = settings.camera.zoom
    controls.update(); resize()
    dirty = true
  } finally { applying = false }
}
function captureScene() {
  composer.render()
  return canvas.toDataURL('image/png')
}
function frameModel() {
  box.root.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(box.root)
  const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3())
  const diameter = Math.max(size.x, size.y, size.z)
  sceneState.setCamera({ target: { x: center.x, y: center.y, z: center.z }, zoom: Math.min(2, Math.max(.4, 2.65 / diameter)), distance: Math.min(10, Math.max(2.6, diameter * 2.5)) })
}
function surfaceTexture(part, type) {
  const key = `${part}:${type}`
  if (texturePool.has(key)) return texturePool.get(key)
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,256,256)
  let seed = 731
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  if (type === 'grain') {
    const data = ctx.getImageData(0,0,256,256)
    for(let i=0;i<data.data.length;i+=4) { const value=205+random()*50; data.data[i]=data.data[i+1]=data.data[i+2]=value }
    ctx.putImageData(data,0,0)
  } else {
    for(let i=0;i<280;i++) {
      ctx.strokeStyle = `rgba(40,40,40,${type==='wood' ? .03+(i%6)*.015 : .02+random()*.12})`
      ctx.lineWidth = type==='wood' ? .7 : .5
      ctx.beginPath()
      for(let x=0;x<=256;x+=4) { const y=type==='wood' ? i+Math.sin(x/70+i*.16)*4 : i; if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y) }
      ctx.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.userData.studioShared = true
  texturePool.set(key, texture)
  return texture
}
function disposeObject(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set()
  root.traverse(item => {
    if (item.geometry) geometries.add(item.geometry)
    for (const material of [item.material].flat().filter(Boolean)) {
      materials.add(material)
      for(const value of Object.values(material)) if(value?.isTexture && !value.userData.studioShared) textures.add(value)
    }
  })
  geometries.forEach(value=>value.dispose()); materials.forEach(value=>value.dispose()); textures.forEach(value=>value.dispose())
}

function recordingChanged(value){capturing=value;stop();if(recordPointer!==null)controls.enabled=false;if(value){audio.voices.forEach(voice=>voice.stop());audio.voices=[]}}


function cancelRecordingGesture(){const id=recordPointer;recordPointer=null;keyboardRecording=false;controls.enabled=true;if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);recordButton?.cancel()}

function updateButtonWell(button){
  const angle=THREE.MathUtils.degToRad(button.rotation),c=Math.cos(angle),s=Math.sin(angle)
  const x=button.position.x+(c*button.baseOffset.x+s*button.baseOffset.z)*button.scale
  const z=button.position.z+(-s*button.baseOffset.x+c*button.baseOffset.z)*button.scale
  const y=button.position.y+button.baseOffset.y*button.scale
  const enabled=y<button.wellDepth*button.scale && y>-.35
  const rx=.258*button.scale*button.baseWidth/.52,rz=.258*button.scale*button.baseDepth/.52
  const key=JSON.stringify([x,z,rx,rz,angle,enabled])
  if(key===wellGeometryKey)return
  wellGeometryKey=key
  const shape=new THREE.Shape();shape.moveTo(-8,-8);shape.lineTo(8,-8);shape.lineTo(8,8);shape.lineTo(-8,8);shape.closePath()
  if(enabled){const hole=new THREE.Path();hole.absellipse(x,-z,rx,rz,0,Math.PI*2,true,angle);shape.holes.push(hole)}
  floor.geometry.dispose();floor.geometry=new THREE.ShapeGeometry(shape,64);ground.geometry=floor.geometry
  wellUniforms.recordWellCenter.value.set(x,z);wellUniforms.recordWellRadius.value=enabled?1:0
  wellUniforms.recordWellAxes.value.set(rx,rz);wellUniforms.recordWellRotation.value.set(c,s)
}
