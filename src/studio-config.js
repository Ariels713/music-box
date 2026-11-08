import { validateMelody } from './tune.js'
export const PARTS = {
  cylinder: 'Cylinder & pins', comb: 'Steel comb', frame: 'Metal frame', gears: 'Gears & end caps',
  crank: 'Crank shaft', grip: 'Handle grip', hardware: 'Screws & bearings', base: 'Wooden base',
}
export const GROUPS = { cylinder: 'Cylinder & gears', comb: 'Comb', frame: 'Frame', crank: 'Crank', base: 'Base' }
export const DEFAULT_GEOMETRY = { baseWidth: 1.62, baseDepth: 1.8, baseThickness: 0.2, barrelLength: 0.82, barrelRadius: 0.235, tineLength: 0.605, pinHeight: 0.024, edgeSoftness: 0.75 }
const material = (color, metalness, roughness, texture = 'none') => ({ color, metalness, roughness, clearcoat: 0, opacity: 1, texture, textureStrength: 0.25, textureScale: 1 })
const light = (color, intensity, azimuth, elevation, shadows = false) => ({ enabled: true, color, intensity, azimuth, elevation, shadows })
export const defaultButtonPosition = (azimuth = 32) => { const angle = azimuth * Math.PI / 180; return { x: -Math.cos(angle) * 1.3 + Math.sin(angle) * .65, y: 0, z: Math.sin(angle) * 1.3 + Math.cos(angle) * .65 } }
export const DEFAULT_SETTINGS = {
  version: 1, name: 'Satin brass & steel', notes: '', melody: null,
  crankArrow: {enabled:true,idleSpeed:18,fallDuration:1.1,position:{x:0,y:0,z:.35},rotation:{x:0,y:0,z:0},scale:1,radius:.19,thickness:.008,arcLength:288,startAngle:-72,linecap:'round',head:'triangle',headLength:.05,headWidth:.045,depth:.012,style:'satin',color:'#506f77',opacity:1},
  fallingNotes: {enabled:true,shape:'mixed',colorMode:'palette',sheen:1,fiberBrightness:.28,singleColor:'#df9b87',palette:['#df9b87','#a8bda1','#b5a2c7','#d5bd79','#87b7be','#ce9fb3'],size:1,speed:1,drift:.16,bounce:.12},
  recordButton: {"position":{"x":-1.44,"y":0,"z":-0.16},"rotation":0,"scale":1,"color":"#e4e2dd","bezelColor":"#d5d4d0","metalness":0.17,"roughness":0,"idleColor":"#ff0011","recordingColor":"#177825","glow":0.45,"baseWidth":0.5,"wellColor":"#99999b","baseMetalness":0.12,"baseRoughness":0.6,"baseDepth":0.5,"wellDepth":0.09,"restHeight":0.018,"pressDepth":0.04,"baseOffset":{"x":0,"y":0,"z":0},"lightPosition":{"x":-0.05,"y":0.02,"z":0.31},"lightPower":1.59,"lightRange":0.7,"washWidth":0.35,"washDepth":0.22},
  materials: {
    cylinder: material('#ac6b51', 0.9, 0.29, 'brushed'), comb: material('#aebac1', 0.94, 0.22, 'brushed'),
    frame: material('#849399', 0.74, 0.38), gears: material('#303a42', 0.12, 0.56),
    crank: material('#d0dbe0', 0.94, 0.18), grip: material('#69aebc', 0.05, 0.48),
    hardware: material('#b4bfc2', 0.86, 0.25), base: material('#b98e61', 0, 0.68, 'wood'),
  },
  lighting: {
    key: light('#fff0dc', 3.2, -40, 55, true),
    fill: light('#dce9ff', 0.9, 110, 25),
    rim: light('#e6f8ff', 2.2, 205, 45),
    environment: 1, environmentRotation: 20, ambient: 0.3,
  },
  scene: { background: '#f5f3ee', exposure: 1, toneMapping: 'aces', shadows: true, shadowOpacity: 0.3, shadowSoftness: 5, contactOpacity: 0.7, ao: true, aoRadius: 0.09, showMark: false },
  camera: {"projection":"orthographic","azimuth":-47.770876421923504,"elevation":33.82652533609099,"distance":5.400000000000002,"zoom":1,"fov":38,"target":{"x":0.05999999999999999,"y":0.42000000000000004,"z":0.11999999999999998}},
  geometry: { ...DEFAULT_GEOMETRY },
  composition: { explode: 0, rotation: 0, offsets: Object.fromEntries(Object.keys(GROUPS).map(key => [key, { x: 0, y: 0, z: 0 }])) },
}
export const clone = value => structuredClone(value)
const finite = (value, fallback, min, max, path) => {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${path} must be between ${min} and ${max}.`)
  return value
}
const color = (value, fallback, path) => {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) throw new Error(`${path} must be a six-digit hex color.`)
  return value.toLowerCase()
}
const choice = (value, fallback, options, path) => {
  if (value === undefined) return fallback
  if (!options.includes(value)) throw new Error(`${path} is not supported.`)
  return value
}
const bool = (value, fallback, path) => {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') throw new Error(`${path} must be on or off.`)
  return value
}
const text = (value, fallback, max, path) => {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || value.length > max) throw new Error(`${path} must be text up to ${max} characters.`)
  return value
}
export const GEOMETRY_BOUNDS = {
  baseWidth: [1.45, 2.1], baseDepth: [1.6, 2.2], baseThickness: [0.14, 0.32],
  barrelLength: [0.74, 0.88], barrelRadius: [0.2, 0.28], tineLength: [0.59, 0.7], pinHeight: [0.012, 0.035], edgeSoftness: [0.2, 1.6],
}
export function validateSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1) throw new Error('Choose a Music Box studio JSON file with version 1.')
  const d = DEFAULT_SETTINGS, out = clone(d)
  out.melody = validateMelody(raw.melody)
  out.name = text(raw.name, d.name, 80, 'Study name')
  out.notes = text(raw.notes, '', 4000, 'Notes')
  for (const key of Object.keys(PARTS)) {
    const src = raw.materials?.[key] ?? {}, target = out.materials[key]
    target.color = color(src.color, target.color, `${PARTS[key]} color`)
    for (const field of ['metalness', 'roughness', 'clearcoat', 'opacity', 'textureStrength']) target[field] = finite(src[field], target[field], field === 'opacity' ? 0.1 : 0, 1, `${PARTS[key]} ${field}`)
    target.texture = choice(src.texture, target.texture, ['none', 'brushed', 'wood', 'grain'], `${PARTS[key]} texture`)
    target.textureScale = finite(src.textureScale, target.textureScale, 0.25, 8, `${PARTS[key]} texture scale`)
  }
  for (const key of ['key', 'fill', 'rim']) {
    const src = raw.lighting?.[key] ?? {}, target = out.lighting[key]
    target.enabled = bool(src.enabled, target.enabled, `${key} light`)
    target.shadows = bool(src.shadows, target.shadows, `${key} shadows`)
    target.color = color(src.color, target.color, `${key} light color`)
    for (const [field, min, max] of [['intensity', 0, 8], ['azimuth', -180, 360], ['elevation', 5, 85]]) target[field] = finite(src[field], target[field], min, max, `${key} ${field}`)
  }
  for (const [field, min, max] of [['environment', 0, 3], ['environmentRotation', -180, 180], ['ambient', 0, 2]]) out.lighting[field] = finite(raw.lighting?.[field], d.lighting[field], min, max, field)
  const scene = raw.scene ?? {}
  out.scene.background = color(scene.background, d.scene.background, 'Background')
  out.scene.toneMapping = choice(scene.toneMapping, d.scene.toneMapping, ['aces', 'neutral', 'agx'], 'Tone mapping')
  for (const field of ['shadows', 'ao', 'showMark']) out.scene[field] = bool(scene[field], d.scene[field], field)
  for (const [field, min, max] of [['exposure', 0.4, 2], ['shadowOpacity', 0, 0.8], ['shadowSoftness', 0, 20], ['contactOpacity', 0, 1.5], ['aoRadius', 0.01, 0.3]]) out.scene[field] = finite(scene[field], d.scene[field], min, max, field)
  const camera = raw.camera ?? {}
  out.camera.projection = choice(camera.projection, d.camera.projection, ['orthographic', 'perspective'], 'Projection')
  for (const [field, min, max] of [['azimuth', -360, 360], ['elevation', -85, 85], ['distance', 2.6, 10], ['zoom', 0.4, 3], ['fov', 25, 65]]) out.camera[field] = finite(camera[field], d.camera[field], min, max, `Camera ${field}`)
  for (const axis of ['x', 'y', 'z']) out.camera.target[axis] = finite(camera.target?.[axis], d.camera.target[axis], -3, 3, `Camera target ${axis}`)
  for (const [field, [min, max]] of Object.entries(GEOMETRY_BOUNDS)) out.geometry[field] = finite(raw.geometry?.[field], d.geometry[field], min, max, field)
  out.composition.explode = finite(raw.composition?.explode, 0, 0, 1.5, 'Exploded spacing')
  out.composition.rotation = finite(raw.composition?.rotation, 0, -180, 180, 'Model rotation')
  for (const key of Object.keys(GROUPS)) for (const axis of ['x', 'y', 'z']) out.composition.offsets[key][axis] = finite(raw.composition?.offsets?.[key]?.[axis], 0, -1.5, 1.5, `${GROUPS[key]} offset ${axis}`)
  const arrow=raw.crankArrow??{},defaultArrow=d.crankArrow
  out.crankArrow.enabled=bool(arrow.enabled,defaultArrow.enabled,'Crank arrow')
  out.crankArrow.color=color(arrow.color,defaultArrow.color,'Crank arrow color')
  for(const [field,options] of [['style',['satin','polished','matte']],['linecap',['round','butt','square']],['head',['triangle','chevron','cone','none']]])out.crankArrow[field]=choice(arrow[field],defaultArrow[field],options,`Crank arrow ${field}`)
  for(const [field,min,max] of [['idleSpeed',0,45],['fallDuration',.6,2.4],['scale',.4,2.5],['radius',.07,.6],['thickness',.003,.025],['arcLength',45,340],['startAngle',-180,180],['headLength',.025,.12],['headWidth',.02,.1],['depth',.006,.08],['opacity',.2,1]])out.crankArrow[field]=finite(arrow[field],defaultArrow[field],min,max,`Crank arrow ${field}`)
  for(const axis of ['x','y','z']) {
    out.crankArrow.position[axis]=finite(arrow.position?.[axis],defaultArrow.position[axis],-1.5,1.5,`Crank arrow position ${axis}`)
    out.crankArrow.rotation[axis]=finite(arrow.rotation?.[axis],defaultArrow.rotation[axis],-180,180,`Crank arrow rotation ${axis}`)
  }
  const falling=raw.fallingNotes??{}
  out.fallingNotes.shape=choice(falling.shape,d.fallingNotes.shape,['mixed','quarter','eighth','paired'],'Falling note shape')
  out.fallingNotes.colorMode=choice(falling.colorMode,d.fallingNotes.colorMode,['palette','single'],'Falling note color mode')
  out.fallingNotes.singleColor=color(falling.singleColor,d.fallingNotes.singleColor,'Falling note single color')
  if(falling.palette!==undefined&&(!Array.isArray(falling.palette)||falling.palette.length!==6))throw new Error('Falling note palette must contain six colors.')
  out.fallingNotes.palette=d.fallingNotes.palette.map((fallback,i)=>color(falling.palette?.[i],fallback,`Falling note palette ${i+1}`))
  out.fallingNotes.enabled=bool(falling.enabled,d.fallingNotes.enabled,'Falling notes')
  for(const [key,min,max] of [['sheen',0,1],['fiberBrightness',0,1],['size',.6,1.6],['speed',.5,1.5],['drift',0,.4],['bounce',0,.25]])out.fallingNotes[key]=finite(falling[key],d.fallingNotes[key],min,max,`Falling notes ${key}`)
  const button = raw.recordButton ?? {}
  out.recordButton.position = raw.recordButton ? out.recordButton.position : defaultButtonPosition(out.camera.azimuth)
  for (const axis of ['x', 'y', 'z']) out.recordButton.position[axis] = finite(button.position?.[axis], out.recordButton.position[axis], axis === 'y' ? 0 : -3, axis === 'y' ? 1 : 3, `Button ${axis} position`)
  for (const field of ['color', 'bezelColor', 'idleColor', 'recordingColor', 'wellColor']) out.recordButton[field] = color(button[field], d.recordButton[field], `Button ${field}`)
  for (const [field, min, max] of [['rotation', -180, 180], ['scale', .6, 1.8], ['metalness', 0, 1], ['roughness', 0, 1], ['glow', 0, 3]]) out.recordButton[field] = finite(button[field], d.recordButton[field], min, max, `Button ${field}`)
  for (const [field, min, max] of [['baseMetalness', 0, 1], ['baseRoughness', 0, 1], ['restHeight', 0, .12], ['pressDepth', .005, .15], ['baseWidth', .5, 1.5], ['baseDepth', .5, 1.5], ['wellDepth', .08, .4], ['lightPower', 0, 2], ['lightRange', .2, 2], ['washWidth', .1, 1], ['washDepth', .1, 1]]) out.recordButton[field] = finite(button[field], d.recordButton[field], min, max, `Button ${field}`)
  if(button.restHeight===undefined && button.pressDepth===undefined){
    if(button.baseWidth===.7)out.recordButton.baseWidth=d.recordButton.baseWidth
    if(button.baseDepth===.7)out.recordButton.baseDepth=d.recordButton.baseDepth
  }
  for(const axis of ['x','y','z']){
    out.recordButton.baseOffset[axis]=finite(button.baseOffset?.[axis], d.recordButton.baseOffset[axis], -.3, .3, `Button base ${axis}`)
    out.recordButton.lightPosition[axis]=finite(button.lightPosition?.[axis], d.recordButton.lightPosition[axis], axis==='y' ? -.1 : -1, axis==='y' ? .5 : 1, `Button light ${axis}`)
  }
  return out
}
export function makePreset(name) {
  const result = clone(DEFAULT_SETTINGS)
  result.name = name
  if (name === 'Warm industrial') {
    result.materials.frame.color = '#596a66'; result.materials.frame.roughness = 0.48
    result.materials.cylinder.color = '#b38c3e'; result.materials.cylinder.roughness = 0.38
    result.materials.grip.color = '#8b5948'; result.materials.base.color = '#956d47'
    result.scene.background = '#e7e1d5'; result.lighting.key.color = '#ffe4be'; result.lighting.key.intensity = 3.5
  } else if (name === 'Cool precision') {
    for (const part of ['frame', 'cylinder', 'comb', 'crank', 'hardware']) { result.materials[part].color = part === 'frame' ? '#677b8b' : '#c0cdd6'; result.materials[part].metalness = 0.9 }
    result.materials.grip.color = '#6ba6bd'; result.materials.base.color = '#a7a29a'
    result.scene.background = '#e9edf2'; result.lighting.key.color = '#e3eeff'; result.lighting.rim.intensity = 3
  } else if (name === 'Pop chrome') {
    result.materials.frame = material('#2864db', 0.85, 0.23)
    result.materials.cylinder = material('#edbb50', 0.95, 0.19)
    result.materials.comb = material('#d8e5ec', 0.98, 0.17, 'brushed')
    result.materials.crank = material('#e1edf3', 0.98, 0.12)
    result.materials.hardware = material('#c6d9e3', 0.96, 0.18)
    result.materials.gears = material('#172d4b', 0.4, 0.36)
    result.materials.grip = { ...material('#ed528c', 0.05, 0.25), clearcoat: 0.65 }
    result.materials.base = { ...material('#f07851', 0.05, 0.3), clearcoat: 0.5 }
    result.materials.comb.textureStrength = 0.12
    result.scene.background = '#f7f0e4'
    result.scene.toneMapping = 'neutral'
    result.scene.shadowOpacity = 0.26; result.scene.shadowSoftness = 7
    result.scene.contactOpacity = 0.45; result.scene.aoRadius = 0.07
    result.lighting.key.color = '#fff5e7'; result.lighting.key.intensity = 2.8
    result.lighting.fill.color = '#e4efff'; result.lighting.fill.intensity = 0.8
    result.lighting.rim.color = '#ffffff'; result.lighting.rim.intensity = 2
    result.lighting.environment = 1; result.lighting.environmentRotation = 45
    result.lighting.ambient = 0.22
  } else if (name === 'Pearl & prism') {
    result.materials.frame = { ...material('#d4d7d2', 0.6, 0.27), clearcoat: 0.25 }
    result.materials.cylinder = material('#d6b66d', 0.9, 0.23, 'brushed')
    result.materials.comb = material('#dce5e4', 0.96, 0.2, 'brushed')
    result.materials.crank = material('#e1e8e7', 0.98, 0.15)
    result.materials.hardware = material('#cbd8d6', 0.94, 0.2)
    result.materials.gears = material('#8d86a5', 0.48, 0.34)
    result.materials.grip = { ...material('#72dce1', 0.18, 0.24), clearcoat: 0.65 }
    result.materials.base = { ...material('#e8e5de', 0.08, 0.32), clearcoat: 0.35 }
    result.materials.cylinder.textureStrength = 0.12
    result.materials.comb.textureStrength = 0.12
    result.scene.background = '#f4f3ec'
    result.scene.toneMapping = 'neutral'
    result.scene.shadowOpacity = 0.22; result.scene.shadowSoftness = 9
    result.scene.contactOpacity = 0.4; result.scene.aoRadius = 0.065
    result.lighting.key.color = '#fff8eb'; result.lighting.key.intensity = 2.65
    result.lighting.fill.color = '#e5f9f8'; result.lighting.fill.intensity = 0.8
    result.lighting.rim.color = '#efebff'; result.lighting.rim.intensity = 1.8
    result.lighting.environment = 0.95; result.lighting.environmentRotation = 35
    result.lighting.ambient = 0.28
  } else if (name === 'Soft ceramic') {
    const colors = { frame: '#e4e0d5', cylinder: '#d0b376', comb: '#a4aaa6', gears: '#545564', crank: '#eee9df', grip: '#d784a4', hardware: '#d7d8d2', base: '#c9aa8e' }
    for (const part of Object.keys(PARTS)) result.materials[part] = material(colors[part], 0, 0.84)
    result.lighting.environment = 0.55; result.lighting.ambient = 0.7; result.lighting.key.intensity = 2.1
    result.geometry.edgeSoftness = 1.3; result.scene.background = '#e7e8eb'; result.scene.shadowSoftness = 12
  }
  return result
}
export const PRESETS = ['Satin brass & steel', 'Warm industrial', 'Cool precision', 'Pop chrome', 'Pearl & prism', 'Soft ceramic']
