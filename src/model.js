import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { DEFAULT_GEOMETRY } from './studio-config.js'
import { PINS, PITCHES, CRANK_REST_ANGLE } from './mechanism.js'

// Photo-guided relative proportions, with Ariel's matte ceramic art direction.
export const CLAY_ROUGHNESS = 0.84
export const CRANK_CENTER = new THREE.Vector3(0.58, 0.79, 1.06)
export const CRANK_RADIUS = 0.17
export const GRIP_OFFSET = 0.18
export const CYLINDER_CENTER = new THREE.Vector3(0, 0.57, 0.25)
export const TINE_HEIGHT = CYLINDER_CENTER.y
export const TINE_X = i => -0.37 + i * (0.74 / (PITCHES.length - 1))

export function createMusicBox(shape = DEFAULT_GEOMETRY, pins = PINS) {
  const edgeSoftness = shape.edgeSoftness
  const radius = shape.barrelRadius
  const pinLength = shape.pinHeight
  const pinCenterRadius = radius + 0.008
  const contactZ = CYLINDER_CENTER.z - pinCenterRadius - pinLength / 2
  const tineX = i => TINE_X(i) * shape.barrelLength / DEFAULT_GEOMETRY.barrelLength
  const lift = shape.baseThickness - DEFAULT_GEOMETRY.baseThickness
  const root = new THREE.Group()
  const base = new THREE.Group()
  const frameAssembly = new THREE.Group()
  const comb = new THREE.Group()
  base.name = 'base'; frameAssembly.name = 'frame'; comb.name = 'comb'
  root.add(base, frameAssembly, comb)
  const clay = (color, roughness = CLAY_ROUGHNESS) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0 })
  const frame = clay(0xe4e0d5)
  const brass = clay(0xd0b376)
  const combClay = clay(0xa4aaa6)
  const dark = clay(0x545564)
  const recess = clay(0x777783)
  const baseClay = clay(0xc9aa8e)
  const crankClay = clay(0xeee9df)
  const gripClay = clay(0xd784a4)
  for (const [name, material] of Object.entries({ frame, brass, combClay, dark, recess, baseClay, crankClay, gripClay })) material.name = name
  const mesh = (geometry, material, parent, x = 0, y = 0, z = 0) => {
    const item = new THREE.Mesh(geometry, material)
    item.position.set(x, y, z)
    item.castShadow = item.receiveShadow = true
    parent.add(item)
    return item
  }
  const box = (w, h, d, material, parent, x, y, z, radius = 0.012) => mesh(new RoundedBoxGeometry(w, h, d, 3, radius * edgeSoftness), material, parent, x, y, z)
  const rod = (r, length, material, parent, x, y, z, axis = 'y') => {
    const item = mesh(new THREE.CylinderGeometry(r, r, length, 48), material, parent, x, y, z)
    if (axis === 'x') item.rotation.z = Math.PI / 2
    if (axis === 'z') item.rotation.x = Math.PI / 2
    return item
  }
  const ring = (outer, inner, depth, material, parent, x, y, z, axis = 'y') => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, inner, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const item = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.003 * edgeSoftness, bevelThickness: 0.003 * edgeSoftness, bevelSegments: 2, curveSegments: 32 }), material, parent, x, y, z)
    if (axis === 'x') item.rotation.y = Math.PI / 2
    if (axis === 'y') item.rotation.x = -Math.PI / 2
    return item
  }
  const extrude = shape => new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: true, bevelSize: 0.014 * edgeSoftness, bevelThickness: 0.008 * edgeSoftness, bevelSegments: 3, curveSegments: 24 })

  box(shape.baseWidth, shape.baseThickness, shape.baseDepth, baseClay, base, 0, shape.baseThickness / 2, 0, 0.035)

  const bed = new THREE.Shape()
  bed.moveTo(-0.59, -0.77)
  bed.lineTo(0.58, -0.77); bed.quadraticCurveTo(0.7, -0.77, 0.7, -0.65)
  bed.lineTo(0.7, 0.6); bed.quadraticCurveTo(0.7, 0.72, 0.58, 0.72)
  bed.lineTo(0.15, 0.72); bed.quadraticCurveTo(0.11, 0.8, 0, 0.8)
  bed.quadraticCurveTo(-0.11, 0.8, -0.15, 0.72)
  bed.lineTo(-0.58, 0.72); bed.quadraticCurveTo(-0.7, 0.72, -0.7, 0.6)
  bed.lineTo(-0.7, -0.65); bed.quadraticCurveTo(-0.7, -0.77, -0.59, -0.77)
  const opening = new THREE.Path()
  opening.moveTo(-0.43, 0.03); opening.lineTo(-0.43, 0.56)
  opening.quadraticCurveTo(-0.43, 0.61, -0.37, 0.61)
  opening.lineTo(0.37, 0.61); opening.quadraticCurveTo(0.43, 0.61, 0.43, 0.55)
  opening.lineTo(0.43, 0.03); opening.quadraticCurveTo(0.43, -0.03, 0.37, -0.03)
  opening.lineTo(-0.37, -0.03); opening.quadraticCurveTo(-0.43, -0.03, -0.43, 0.03)
  bed.holes.push(opening)
  for (const [x, z] of [[-0.6, -0.36], [-0.6, -0.66]]) {
    const hole = new THREE.Path(); hole.absarc(x, z, 0.031, 0, Math.PI * 2, true); bed.holes.push(hole)
  }
  const bedMesh = mesh(extrude(bed), frame, frameAssembly, 0, 0.27, 0)
  bedMesh.rotation.x = Math.PI / 2

  function bearingPlate(x) {
    const profile = new THREE.Shape()
    profile.moveTo(-0.69, 0.27); profile.lineTo(0.59, 0.27)
    profile.lineTo(0.59, 0.38); profile.lineTo(0.45, 0.38)
    profile.quadraticCurveTo(0.38, 0.38, 0.35, 0.48)
    profile.lineTo(0.34, 0.58)
    profile.quadraticCurveTo(0.26, 0.75, 0.17, 0.6)
    profile.lineTo(0.11, 0.45); profile.quadraticCurveTo(0.08, 0.4, -0.02, 0.4)
    profile.lineTo(-0.19, 0.4); profile.quadraticCurveTo(-0.27, 0.4, -0.29, 0.47)
    profile.lineTo(-0.32, 0.53); profile.lineTo(-0.69, 0.53); profile.closePath()
    const hole = new THREE.Path(); hole.absarc(0.25, CYLINDER_CENTER.y, 0.043, 0, Math.PI * 2, true)
    profile.holes.push(hole)
    const geometry = extrude(profile)
    geometry.rotateY(-Math.PI / 2)
    mesh(geometry, frame, frameAssembly, x, 0, 0)
    ring(0.073, 0.033, 0.014, crankClay, frameAssembly, x + 0.008, CYLINDER_CENTER.y, CYLINDER_CENTER.z, 'x')
  }
  bearingPlate(-0.49); bearingPlate(0.61)

  // The raised outside wall and three shaft supports are visible in capture 06.
  box(0.1, 0.23, 1.4, frame, frameAssembly, 0.63, 0.385, -0.015, 0.018)
  for (const z of [-0.69, -0.29, 0.58]) {
    box(0.13, 0.32, 0.11, frame, frameAssembly, CRANK_CENTER.x, 0.65, z, 0.025)
    ring(0.042, 0.025, 0.012, crankClay, frameAssembly, CRANK_CENTER.x, CRANK_CENTER.y, z + 0.058, 'z')
  }

  const cylinder = new THREE.Group()
  cylinder.position.copy(CYLINDER_CENTER)
  root.add(cylinder)
  rod(radius, shape.barrelLength, brass, cylinder, 0, 0, 0, 'x')
  rod(0.028, 1.23, frame, cylinder, 0, 0, 0, 'x')
  for (const x of [-shape.barrelLength / 2 - 0.025, shape.barrelLength / 2 + 0.025]) {
    rod(radius + 0.019, 0.044, dark, cylinder, x, 0, 0, 'x')
    ring(0.09, 0.031, 0.014, dark, cylinder, x + 0.022, 0, 0, 'x')
  }
  for (let i = 0; i < 6; i++) ring(0.034, 0.027, 0.004, combClay, cylinder, -0.59 + i * 0.011, 0, 0, 'x')
  const pinHeads = []
  for (const pin of pins) {
    // The comb is behind the cylinder; a phase reaches contact at local -Z.
    const outward = new THREE.Vector3(0, Math.sin(pin.phase + Math.PI), Math.cos(pin.phase + Math.PI))
    const item = rod(0.008, pinLength, brass, cylinder, tineX(pin.tine), outward.y * pinCenterRadius, outward.z * pinCenterRadius)
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward)
    item.userData = { tine: pin.tine, phase: pin.phase }
    pinHeads.push(item)
  }
  rod(0.28, 0.075, dark, cylinder, 0.485, 0, 0, 'x')
  ring(0.23, 0.195, 0.004, recess, cylinder, 0.526, 0, 0, 'x')
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2
    const tooth = box(0.08, 0.023, 0.032, dark, cylinder, 0.485, Math.sin(a) * 0.28, Math.cos(a) * 0.28, 0.005)
    tooth.rotation.x = -a
  }

  box(0.91 * shape.barrelLength / 0.82, 0.045, 0.24, combClay, comb, 0, TINE_HEIGHT - 0.025, -0.62, 0.018)
  for (const x of [-0.31, 0.31]) box(0.15, 0.24, 0.22, frame, frameAssembly, x, 0.39, -0.61, 0.035)
  const tines = []
  for (let i = 0; i < PITCHES.length; i++) {
    const length = shape.tineLength - i * 0.0025
    const tine = box(0.037, 0.009, length, combClay.clone(), comb, tineX(i), TINE_HEIGHT, contactZ - length / 2, 0.002)
    tines.push(tine)
  }

  function screw(x, y, z, radius = 0.073, parent = root, slotAngle = 0.2) {
    rod(radius * 1.14, 0.01, frame, parent, x, y - 0.012, z).userData.part = 'hardware'
    const head = mesh(new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), crankClay, parent, x, y, z)
    head.scale.y = 0.28
    head.userData.part = 'hardware'
    const slots = new THREE.Group()
    slots.position.set(x, y + radius * 0.275, z); slots.rotation.y = slotAngle
    parent.add(slots)
    box(radius * 1.22, 0.002, radius * 0.17, recess, slots, 0, 0, 0, 0.001)
    box(radius * 0.17, 0.002, radius * 1.22, recess, slots, 0, 0, 0, 0.001)
  }
  screw(-0.29, TINE_HEIGHT + 0.006, -0.64, 0.075, comb, 0.32)
  screw(0.29, TINE_HEIGHT + 0.006, -0.64, 0.075, comb, -0.17)
  for (const [x, z] of [[-0.59, -0.53], [0.58, -0.62], [0, 0.73]]) {
    rod(0.031, 0.055, combClay, frameAssembly, x, 0.29, z)
    ring(0.053, 0.027, 0.008, crankClay, frameAssembly, x, 0.278, z)
  }

  const crank = new THREE.Group()
  crank.position.copy(CRANK_CENTER)
  crank.rotation.z = CRANK_REST_ANGLE
  root.add(crank)
  rod(0.025, 1.88, crankClay, crank, 0, 0, -0.94, 'z')
  const bendPoints = [
    new THREE.Vector3(0, 0, -0.06), new THREE.Vector3(0.005, 0, -0.012),
    new THREE.Vector3(0.03, 0, 0.008), new THREE.Vector3(CRANK_RADIUS - 0.025, 0, 0.008),
    new THREE.Vector3(CRANK_RADIUS, 0, 0.03), new THREE.Vector3(CRANK_RADIUS, 0, 0.09),
  ]
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bendPoints), 48, 0.025, 16, false), crankClay, crank)
  ring(0.042, 0.025, 0.012, crankClay, crank, CRANK_RADIUS, 0, 0.07, 'z')
  const handle = rod(0.05, 0.22, gripClay, crank, CRANK_RADIUS, 0, GRIP_OFFSET, 'z')
  for (const z of [0.075, 0.285]) ring(0.05, 0.042, 0.005, gripClay, crank, CRANK_RADIUS, 0, z, 'z')
  const points = []
  for (let i = 0; i <= 360; i++) {
    const a = i / 360 * Math.PI * 18
    points.push(new THREE.Vector3(Math.cos(a) * 0.039, Math.sin(a) * 0.039, CYLINDER_CENTER.z - CRANK_CENTER.z - 0.2 + i / 360 * 0.4))
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 360, 0.009, 8, false), crankClay, crank)
  const hitTarget = mesh(new THREE.SphereGeometry(0.105, 16, 12), new THREE.MeshBasicMaterial({ visible: false }), crank, CRANK_RADIUS, 0, GRIP_OFFSET)

  hitTarget.visible = false

  for (const [x, z] of [[-0.59, -0.53], [0.58, -0.62], [0, 0.73]]) {
    const underside = new THREE.Group()
    underside.position.set(x, 0.004, z); underside.rotation.x = Math.PI
    base.add(underside)
    screw(0, 0, 0, 0.047, underside, 0.45)
  }
  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 512; labelCanvas.height = 128
  const ctx = labelCanvas.getContext('2d')
  ctx.font = 'bold 46px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#35291f'
  ctx.fillText('@Ariel_Rodriguez', 256, 64)
  const labelTexture = new THREE.CanvasTexture(labelCanvas)
  labelTexture.colorSpace = THREE.SRGBColorSpace
  const label = mesh(new THREE.PlaneGeometry(0.9, 0.225), new THREE.MeshStandardMaterial({ map: labelTexture, transparent: true, depthWrite: false, roughness: .95, metalness: 0, side: THREE.FrontSide }), base, 0, -0.002, 0)
  label.rotation.x = Math.PI / 2
  label.name = 'maker-mark'
  label.userData.signature = '@Ariel_Rodriguez'
  label.userData.opticalGlow = true
  label.castShadow = false
  frameAssembly.position.y = lift; comb.position.y = lift
  cylinder.position.y += lift; crank.position.y += lift
  const materialCache = new Map()
  const templates = new Set([frame, brass, combClay, dark, recess, baseClay, crankClay, gripClay])
  const materials = Object.fromEntries(['frame', 'cylinder', 'comb', 'gears', 'crank', 'grip', 'hardware', 'base'].map(key => [key, new Set()]))
  const isIn = (item, group) => { for (let node = item.parent; node; node = node.parent) if (node === group) return true; return false }
  root.traverse(item => {
    const original = item.material
    if (!original?.isMeshPhysicalMaterial) return
    templates.add(original)
    let part = item.userData.part ?? { frame: 'frame', brass: 'cylinder', dark: 'gears', baseClay: 'base', gripClay: 'grip' }[original.name]
    if (original.name === 'combClay') part = isIn(item, comb) ? 'comb' : 'hardware'
    if (original.name === 'crankClay') part = isIn(item, crank) ? 'crank' : 'hardware'
    if (original.name === 'recess') part = isIn(item, cylinder) ? 'gears' : 'hardware'
    if (!part) return
    const key = part + original.uuid
    if (!materialCache.has(key)) materialCache.set(key, original.clone())
    item.material = materialCache.get(key)
    item.userData.part = part
    materials[part].add(item.material)
  })
  // Dispose construction templates after every rendered mesh has its own part material.
  for (const original of templates) original.dispose()
  return { root, base, frame: frameAssembly, comb, cylinder, crank, handle, hitTarget, tines, pinHeads, materials, mark: label, lift }
}
