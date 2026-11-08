import './studio.css'
import { MAX_FALLING_NOTES } from './falling-notes.js'
import { createTuneStudio } from './tune-studio.js'
import { DEFAULT_SETTINGS, PARTS, GROUPS, PRESETS, GEOMETRY_BOUNDS, defaultButtonPosition, clone, validateSettings, makePreset } from './studio-config.js'

import { DRAFT_KEY, readSceneDraft } from './scene-storage.js'
const FINISHES = {
  'Satin metal': { metalness: 0.85, roughness: 0.32, clearcoat: 0, texture: 'brushed' },
  'Polished metal': { metalness: 0.98, roughness: 0.12, clearcoat: 0, texture: 'none' },
  'Brushed metal': { metalness: 0.9, roughness: 0.42, clearcoat: 0, texture: 'brushed' },
  'Matte ceramic': { metalness: 0, roughness: 0.84, clearcoat: 0, texture: 'grain' },
  'Glazed ceramic': { metalness: 0, roughness: 0.3, clearcoat: 0.8, texture: 'none' },
  'Wood': { metalness: 0, roughness: 0.65, clearcoat: 0, texture: 'wood' },
  'Soft plastic': { metalness: 0, roughness: 0.52, clearcoat: 0.1, texture: 'none' },
}
const get = (object, path) => path.split('.').reduce((value, key) => value[key], object)
const set = (object, path, value) => { const keys = path.split('.'); const last = keys.pop(); keys.reduce((value, key) => value[key], object)[last] = value }
function el(tag, attributes = {}, content) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') node.className = value
    else node.setAttribute(key, value)
  }
  if (content !== undefined) node.textContent = content
  return node
}
function button(label, action, className = 'studio-button') {
  const node = el('button', { type: 'button', class: className }, label)
  node.addEventListener('click', action)
  return node
}
function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = el('a', { href: url, download: name })
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function createStudio({ apply, capture, pick, frameModel, resetCamera, recordingChanged, canRecord, clearFallingNotes, previewCrankArrow }) {
  let settings = clone(DEFAULT_SETTINGS)
  let selectedPart = 'cylinder'
  let selectedGroup = 'cylinder'
  let bindings = []
  let draftTime = 0, saving = false, picking = false, savedStudy = null, previewingPreset = false
  const abort = new AbortController()
  const panel = el('aside', { id: 'studio-panel', class: 'studio', hidden: '', 'aria-label': 'Music box scene studio' })
  panel.innerHTML = `<div class="studio-heading"><div><p class="studio-eyebrow">Music box / workbench</p><h2>Scene studio</h2></div><button type="button" class="studio-close" aria-label="Close studio">×</button></div>
    <div class="studio-preset-row"><label for="studio-preset">Starting look</label><select id="studio-preset"><option value="custom">Custom study</option><option value="saved" disabled>Your saved setup</option></select></div>
    <nav class="studio-tabs" role="tablist" aria-label="Studio controls"></nav>
    <form class="studio-form" autocomplete="off"><div class="studio-scroll"></div></form>
    <div class="studio-savebar"><div class="studio-save-actions"></div><p id="studio-message" role="status" aria-live="polite">Changes preview live. Save a study when you like it.</p></div>`
  document.body.append(panel)
  const scroll = panel.querySelector('.studio-scroll')
  const message = panel.querySelector('#studio-message')
  const preset = panel.querySelector('#studio-preset')
  const toggle = document.querySelector('#studio-toggle')
  const panels = {}, tabs = {}
  let arrowControls=null
  const syncArrowPreview=()=>previewCrankArrow(!panel.hidden&&!panels.composition?.hidden&&!!arrowControls?.open)
  const announce = (text, error = false) => { message.textContent = text; message.classList.toggle('studio-error', error); message.setAttribute('role', error ? 'alert' : 'status') }
  const setOpen = open => {
    panel.hidden = !open
    document.body.classList.toggle('studio-open', open)
    toggle.setAttribute('aria-expanded', String(open))
    syncArrowPreview()
    window.dispatchEvent(new Event('resize'))
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden), { signal: abort.signal })
  panel.querySelector('.studio-close').addEventListener('click', () => { setOpen(false); toggle.focus() }, { signal: abort.signal })
  function showTab(name, focus = false) {
    for (const key of Object.keys(tabs)) {
      const active = key === name
      tabs[key].setAttribute('aria-selected', String(active)); tabs[key].tabIndex = active ? 0 : -1
      panels[key].hidden = !active
    }
    if (focus) tabs[name].focus()
    scroll.scrollTop = 0
    syncArrowPreview()
  }
  for (const [name, title] of [['materials', 'Materials'], ['lighting', 'Lighting'], ['composition', 'Compose'], ['tune', 'Tune'], ['share', 'Save & share']]) {
    const tab = el('button', { type: 'button', id: `studio-tab-${name}`, role: 'tab', 'aria-controls': `studio-${name}`, 'aria-selected': String(name === 'materials'), tabindex: name === 'materials' ? '0' : '-1' }, title)
    tab.addEventListener('click', () => showTab(name))
    tab.addEventListener('keydown', event => {
      const names = Object.keys(tabs), index = names.indexOf(name)
      let next
      if (event.key === 'ArrowRight') next = names[(index + 1) % names.length]
      if (event.key === 'ArrowLeft') next = names[(index + names.length - 1) % names.length]
      if (event.key === 'Home') next = names[0]
      if (event.key === 'End') next = names.at(-1)
      if (next) { event.preventDefault(); showTab(next, true) }
    })
    tabs[name] = tab; panel.querySelector('.studio-tabs').append(tab)
    panels[name] = el('section', { id: `studio-${name}`, role: 'tabpanel', 'aria-labelledby': tab.id })
    panels[name].hidden = name !== 'materials'; scroll.append(panels[name])
  }
  for (const name of PRESETS) preset.append(el('option', { value: name }, name))
  preset.addEventListener('change', () => {
    if (preset.value === 'custom') return
    if (preset.value === 'saved') { if(savedStudy){commit(clone(savedStudy), 'Restored your saved setup.');preset.value='saved'};return }
    const next = makePreset(preset.value)
    next.notes = settings.notes
    next.melody = settings.melody
    next.recordButton = clone(settings.recordButton)
    next.fallingNotes = clone(settings.fallingNotes)
    next.crankArrow = clone(settings.crankArrow)
    commit(next, `Previewing ${preset.value}. Refresh returns to your last edit; choose Your saved setup to restore the saved design.`, false, true)
  })

  function persistDraft() {
    if(previewingPreset)return
    draftTime = Date.now()
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ updatedAt: draftTime, settings })) }
    catch { announce('Browser autosave is unavailable. Save to the project or download your settings.', true) }
  }
  let tuneStudio
  function syncBindings() {
    tuneStudio?.sync(settings.melody)
    bindings = bindings.filter(binding => binding.input.isConnected)
    for (const binding of bindings) {
      const value = get(settings, binding.path)
      if (binding.type === 'checkbox') binding.input.checked = value
      else if (binding.input !== document.activeElement || binding.type === 'range' || binding.type === 'color') binding.input.value = value
      if (binding.output) binding.output.value = Number(value).toFixed(binding.step >= 1 ? 0 : binding.step >= 0.1 ? 1 : 2)
    }
  }
  function commit(next, notification, custom = true, preview = false) {
    try {
      const checked = validateSettings(next), previous = settings
      apply(checked, previous)
      settings = checked
      previewingPreset = preview
      preset.value = custom ? 'custom' : PRESETS.includes(settings.name) ? settings.name : 'custom'
      syncBindings(); persistDraft()
      if (notification) announce(notification)
    } catch (error) { announce(error.message, true) }
  }
  function change(path, value) {
    const next = clone(settings); set(next, path, value)
    commit(next, 'Unsaved study · changes are kept in this browser.')
  }
  function textNote(parent, content, className = 'studio-hint') { const note = el('p', { class: className }, content); parent.append(note); return note }
  function heading(parent, title, hint) {
    parent.append(el('h3', {}, title))
    if (hint) textNote(parent, hint)
  }
  function select(parent, label, options, onChange, id) {
    const wrap = el('div', { class: 'studio-field' })
    const input = el('select', { id })
    for (const [value, title] of Object.entries(options)) input.append(el('option', { value }, title))
    wrap.append(el('label', { for: id }, label), input); parent.append(wrap)
    input.addEventListener('change', () => onChange(input.value))
    return input
  }
  function boundSelect(parent, label, path, options) {
    const input = select(parent, label, options, value => change(path, value), `control-${path}`)
    bindings.push({ input, path }); return input
  }
  function textInput(parent,label,path) {
    const id=`control-${path}`,row=el('div',{class:'studio-field'})
    const input=el('input',{type:'text',id,maxlength:48,spellcheck:'false'})
    row.append(el('label',{for:id},label),input);parent.append(row)
    bindings.push({input,path,type:'text'})
    input.addEventListener('input',()=>change(path,input.value))
  }
  function range(parent, label, path, min, max, step = 0.01, hint) {
    const row = el('div', { class: 'studio-field studio-range' }), id = `control-${path}`
    const top = el('div', { class: 'studio-range-label' })
    const input = el('input', { type: 'range', id, min, max, step })
    const output = el('output', { for: id, 'aria-hidden': 'true' })
    top.append(el('label', { for: id }, label), output); row.append(top, input)
    if (hint) textNote(row, hint)
    parent.append(row); bindings.push({ input, path, type: 'range', output, step })
    input.addEventListener('input', () => change(path, Number(input.value)))
    return input
  }
  function checkbox(parent, label, path, hint) {
    const row = el('label', { class: 'studio-checkbox', for: `control-${path}` })
    const input = el('input', { type: 'checkbox', id: `control-${path}` })
    row.append(input, el('span', {}, label)); parent.append(row)
    if (hint) textNote(parent, hint)
    bindings.push({ input, path, type: 'checkbox' })
    input.addEventListener('change', () => change(path, input.checked))
  }
  function color(parent, label, path) {
    const row = el('div', { class: 'studio-field' }), id = `control-${path}`
    const pair = el('div', { class: 'studio-color' })
    const input = el('input', { type: 'color', id, 'aria-label': label })
    const hex = el('input', { type: 'text', id: `${id}-hex`, 'aria-label': `${label} hex`, maxlength: 7, spellcheck: 'false', autocomplete: 'off' })
    row.append(el('label', { for: id }, label), pair); pair.append(input, hex); parent.append(row)
    bindings.push({ input, path, type: 'color' }, { input: hex, path })
    input.addEventListener('input', () => { hex.removeAttribute('aria-invalid'); change(path, input.value) })
    hex.addEventListener('change', () => {
      if (!/^#[\da-f]{6}$/i.test(hex.value)) { hex.setAttribute('aria-invalid', 'true'); announce('Use a hex color such as #bd974c.', true); return }
      hex.removeAttribute('aria-invalid'); change(path, hex.value)
    })
  }

  heading(panels.materials, 'Give each surface a job', 'Choose a part or pick it directly in the scene. Each material is independent.')
  const partSelect = select(panels.materials, 'Part', PARTS, key => selectPart(key), 'studio-part')
  partSelect.value = selectedPart
  const pickButton = button('Pick a part in the scene', () => {
    picking = !picking; pick(picking)
    pickButton.setAttribute('aria-pressed', String(picking))
    pickButton.textContent = picking ? 'Click a part · Esc to cancel' : 'Pick a part in the scene'
  }, 'studio-button studio-secondary studio-wide')
  pickButton.id = 'studio-pick'; pickButton.setAttribute('aria-pressed', 'false'); panels.materials.append(pickButton)
  const materialControls = el('div'); panels.materials.append(materialControls)
  function renderMaterialControls() {
    materialControls.replaceChildren()
    const path = `materials.${selectedPart}`
    color(materialControls, 'Base color', `${path}.color`)
    const finish = select(materialControls, 'Finish recipe', { custom: 'Custom finish', ...Object.fromEntries(Object.keys(FINISHES).map(name => [name, name])) }, name => {
      if (name === 'custom') return
      const next = clone(settings); Object.assign(next.materials[selectedPart], FINISHES[name]); commit(next, `Applied ${name} to ${PARTS[selectedPart]}.`)
    }, 'studio-finish')
    finish.value = 'custom'
    range(materialControls, 'Metalness', `${path}.metalness`, 0, 1, 0.01, '0 behaves like wood or ceramic. 1 reflects light like bare metal.')
    range(materialControls, 'Roughness', `${path}.roughness`, 0, 1, 0.01, 'Low: sharp reflections. High: broad, soft reflections.')
    range(materialControls, 'Clear coating', `${path}.clearcoat`, 0, 1, 0.01, 'A glossy layer, useful for lacquer or glaze.')
    boundSelect(materialControls, 'Surface texture', `${path}.texture`, { none: 'Pristine / smooth', brushed: 'Fine brushing', wood: 'Wood grain', grain: 'Fine matte grain' })
    range(materialControls, 'Texture strength', `${path}.textureStrength`, 0, 1)
    range(materialControls, 'Texture scale', `${path}.textureScale`, 0.25, 8, 0.05)
    range(materialControls, 'Opacity', `${path}.opacity`, 0.1, 1)
    syncBindings()
  }
  function selectPart(key) {
    if (!PARTS[key]) return
    selectedPart = key; partSelect.value = key
    picking = false; pick(false)
    pickButton.setAttribute('aria-pressed', 'false'); pickButton.textContent = 'Pick a part in the scene'
    renderMaterialControls(); showTab('materials'); setOpen(true)
    announce(`Selected ${PARTS[key]}.`)
  }
  renderMaterialControls()

  heading(panels.lighting, 'Light makes the material', 'Metals need something to reflect. Try changing the studio reflections before lowering roughness.')
  range(panels.lighting, 'Studio reflections', 'lighting.environment', 0, 3)
  range(panels.lighting, 'Reflection rotation', 'lighting.environmentRotation', -180, 180, 1)
  range(panels.lighting, 'Ambient fill', 'lighting.ambient', 0, 2)
  for (const [key, name, hint] of [['key', 'Main light', 'Shapes the object and supplies the main shadow.'], ['fill', 'Fill light', 'Softens the dark side. Too much can flatten the model.'], ['rim', 'Rim light', 'A light from behind to separate edges from the background.']]) {
    const section = el('details', { class: 'studio-section' }); if (key === 'key') section.open = true
    section.append(el('summary', {}, name)); textNote(section, hint)
    checkbox(section, 'Light enabled', `lighting.${key}.enabled`)
    color(section, 'Light color', `lighting.${key}.color`)
    range(section, 'Strength', `lighting.${key}.intensity`, 0, 8, 0.05)
    range(section, 'Direction around object', `lighting.${key}.azimuth`, -180, 360, 1)
    range(section, 'Height / elevation', `lighting.${key}.elevation`, 5, 85, 1)
    checkbox(section, 'Cast a shadow', `lighting.${key}.shadows`)
    panels.lighting.append(section)
  }
  heading(panels.lighting, 'Grounding & contrast')
  checkbox(panels.lighting, 'Cast shadows', 'scene.shadows')
  range(panels.lighting, 'Cast-shadow strength', 'scene.shadowOpacity', 0, 0.8)
  range(panels.lighting, 'Shadow softness', 'scene.shadowSoftness', 0, 20, 0.5)
  range(panels.lighting, 'Soft contact shadow', 'scene.contactOpacity', 0, 1.5)
  checkbox(panels.lighting, 'Contact depth / ambient occlusion', 'scene.ao', 'Darkens close gaps and intersections. Turn it off to compare the actual light and shadow.')
  range(panels.lighting, 'Contact-depth radius', 'scene.aoRadius', 0.01, 0.3)

  heading(panels.composition, 'The scene around it')
  color(panels.composition, 'Background', 'scene.background')
  range(panels.composition, 'Exposure', 'scene.exposure', 0.4, 2)
  boundSelect(panels.composition, 'Color response', 'scene.toneMapping', { aces: 'ACES · cinematic highlights', neutral: 'Neutral · product colors', agx: 'AgX · softer highlight color' })
  const recordControls = el('details', { class: 'studio-section', open: '' })
  recordControls.append(el('summary', {}, 'Record button'))
  textNote(recordControls, 'Position is in scene coordinates and stays fixed while you orbit. The recess light turns green immediately while held and red on release. The status text confirms when microphone capture begins.')
  for (const [axis, label] of [['x', 'X position'], ['z', 'Z position'], ['y', 'Height above floor']]) range(recordControls, label, `recordButton.position.${axis}`, axis === 'y' ? 0 : -3, axis === 'y' ? 1 : 3, .01)
  range(recordControls, 'Button rotation', 'recordButton.rotation', -180, 180, 1)
  range(recordControls, 'Button size', 'recordButton.scale', .6, 1.8, .05)
  recordControls.append(button('Reset button placement', () => { const next = clone(settings); next.recordButton.position = defaultButtonPosition(settings.camera.azimuth); next.recordButton.rotation = 0; next.recordButton.scale = 1; commit(next, 'Button placed beside the music box.') }, 'studio-button studio-secondary studio-wide'))
  const baseControls=el('details',{class:'studio-section'});baseControls.append(el('summary',{},'Base & floor cut'))
  range(baseControls,'Base width','recordButton.baseWidth',.5,1.5,.01)
  range(baseControls,'Base depth','recordButton.baseDepth',.5,1.5,.01)
  range(baseControls,'Well depth','recordButton.wellDepth',.08,.4,.01)
  range(baseControls,'Resting height above floor','recordButton.restHeight',0,.12,.002)
  range(baseControls,'Press depth','recordButton.pressDepth',.005,.15,.005,'Independent of well depth; limited only to keep the cap clear of the bottom.')
  for(const axis of ['x','y','z'])range(baseControls,`Base ${axis.toUpperCase()} offset`,`recordButton.baseOffset.${axis}`,-.3,.3,.01)
  color(baseControls,'Well color','recordButton.wellColor')
  range(baseControls,'Base metalness','recordButton.baseMetalness',0,1)
  range(baseControls,'Base roughness','recordButton.baseRoughness',0,1)
  textNote(baseControls,'Offsets move the base independently of the cap. The floor opening follows the base width, depth and rotation.')
  recordControls.append(baseControls)
  const lightControls=el('details',{class:'studio-section'});lightControls.append(el('summary',{},'Ground light placement'))
  textNote(lightControls,'These positions move the light spill relative to the button. The visible ring stays attached to the container rim.')
  for(const axis of ['x','y','z'])range(lightControls,`Light ${axis.toUpperCase()} position`,`recordButton.lightPosition.${axis}`,axis==='y'?-.1:-1,axis==='y'?.5:1,.01)
  range(lightControls,'Uplight power','recordButton.lightPower',0,2,.01)
  range(lightControls,'Light reach','recordButton.lightRange',.2,2,.05)
  range(lightControls,'Floor wash width','recordButton.washWidth',.1,1,.01)
  range(lightControls,'Floor wash depth','recordButton.washDepth',.1,1,.01)
  recordControls.append(lightControls)
  color(recordControls, 'Button color', 'recordButton.color')
  color(recordControls, 'Rim color', 'recordButton.bezelColor')
  range(recordControls, 'Button metalness', 'recordButton.metalness', 0, 1)
  range(recordControls, 'Button roughness', 'recordButton.roughness', 0, 1)
  color(recordControls, 'Rim light · idle', 'recordButton.idleColor')
  color(recordControls, 'Rim light · recording', 'recordButton.recordingColor')
  range(recordControls, 'Rim light brightness', 'recordButton.glow', 0, 3, .05, 'Controls the circular rim light and surrounding light spill. The note stays unlit.')
  const letteringControls=el('details',{class:'studio-section'})
  letteringControls.append(el('summary',{},'Button lettering'))
  textNote(letteringControls,'Flat lettering on the floor. Edit either arc; changes preview live and are saved in this browser.')
  checkbox(letteringControls,'Show lettering','recordButton.lettering.enabled')
  textInput(letteringControls,'Upper words','recordButton.lettering.upperText')
  textInput(letteringControls,'Lower words','recordButton.lettering.lowerText')
  color(letteringControls,'Lettering color','recordButton.lettering.color')
  for(const [key,label,min,max,step] of [['size','Letter size',.4,2,.01],['spacing','Letter spacing',0,.03,.001],['upperRadius','Upper arc radius',.26,.8,.01],['lowerRadius','Lower arc radius',.26,.8,.01],['stretch','Letter height',1,3,.05],['rotation','Lettering rotation',-180,180,1],['x','Lettering X',-.6,.6,.01],['z','Lettering Z',-.6,.6,.01]])range(letteringControls,label,`recordButton.lettering.${key}`,min,max,step)
  recordControls.querySelector('summary').after(letteringControls)
  panels.composition.append(recordControls)
  arrowControls=el('details',{class:'studio-section'});arrowControls.append(el('summary',{},'Crank arrow'))
  textNote(arrowControls,'The arrow stays visible while this section is open, even after you have played. Close it or Studio to return to its idle spin or landed position.')
  arrowControls.addEventListener('toggle',syncArrowPreview)
  checkbox(arrowControls,'Arrow enabled','crankArrow.enabled')
  range(arrowControls,'Arrow speed · degrees/second','crankArrow.idleSpeed',0,45,1,'Controls the invitation arrow only. Set to 0 to pause. Rotation pauses while this section is open; close it or Studio to see the speed.')
  range(arrowControls,'Drop duration','crankArrow.fallDuration',.6,2.4,.05)
  for(const axis of ['x','y','z'])range(arrowControls,`Arrow ${axis.toUpperCase()} position`,`crankArrow.position.${axis}`,-1.5,1.5,.01,'Relative to the crank axis.')
  range(arrowControls,'Overall size','crankArrow.scale',.4,2.5,.05)
  range(arrowControls,'Circle radius','crankArrow.radius',.07,.6,.01)
  range(arrowControls,'Arc length · degrees','crankArrow.arcLength',45,340,1)
  range(arrowControls,'Arc starting angle','crankArrow.startAngle',-180,180,1)
  range(arrowControls,'Stroke thickness','crankArrow.thickness',.003,.025,.001)
  boundSelect(arrowControls,'Line caps','crankArrow.linecap',{round:'Round',butt:'Butt · flush',square:'Square · extended flat'})
  boundSelect(arrowControls,'Arrowhead','crankArrow.head',{triangle:'Beveled triangle',chevron:'Open chevron',cone:'Rounded cone',none:'No arrowhead'})
  range(arrowControls,'Arrowhead length','crankArrow.headLength',.025,.12,.005)
  range(arrowControls,'Arrowhead width','crankArrow.headWidth',.02,.1,.005)
  range(arrowControls,'Arrowhead depth','crankArrow.depth',.006,.08,.002)
  boundSelect(arrowControls,'Material style','crankArrow.style',{satin:'Satin metal',polished:'Polished metal',matte:'Matte ceramic'})
  color(arrowControls,'Arrow color','crankArrow.color')
  range(arrowControls,'Arrow opacity','crankArrow.opacity',.2,1,.05)
  for(const axis of ['x','y','z'])range(arrowControls,`Arrow ${axis.toUpperCase()} rotation`,`crankArrow.rotation.${axis}`,-180,180,1)
  panels.composition.append(arrowControls)
  const fallingControls=el('details',{class:'studio-section'});fallingControls.append(el('summary',{},'Falling music notes'))
  textNote(fallingControls,`Soft felt notes drift down on pin strikes, then softly bounce and rest. Up to ${MAX_FALLING_NOTES} stay in the scene; reduced motion disables the effect.`)
  checkbox(fallingControls,'Falling notes enabled','fallingNotes.enabled')
  boundSelect(fallingControls,'Note shapes','fallingNotes.shape',{mixed:'Mixed notes',quarter:'Quarter notes',eighth:'Eighth notes',paired:'Paired eighth notes'})
  textNote(fallingControls,'Shape choices apply to new drops. These are playful decorations; the cylinder pins still determine the tune.')
  const noteColors=el('details',{class:'studio-section'});noteColors.append(el('summary',{},'Note colors'))
  boundSelect(noteColors,'Color mode','fallingNotes.colorMode',{palette:'Six-color palette',single:'One color'})
  color(noteColors,'Single note color','fallingNotes.singleColor')
  for(let i=0;i<6;i++)color(noteColors,`Palette color ${i+1}`,`fallingNotes.palette.${i}`)
  range(noteColors,'Sheen','fallingNotes.sheen',0,1,.01,'Lower values reduce the soft, pale fabric highlights.')
  range(noteColors,'Fiber brightness','fallingNotes.fiberBrightness',0,1,.01,'0 keeps fibers at the base color; 1 makes them white. The fuzzy texture stays visible.')
  textNote(noteColors,'Colors update falling and landed notes immediately. Lighting and the soft felt finish affect how they appear.')
  fallingControls.append(noteColors)
  range(fallingControls,'Note size','fallingNotes.size',.6,1.6,.05)
  range(fallingControls,'Fall speed','fallingNotes.speed',.5,1.5,.05)
  range(fallingControls,'Sideways drift','fallingNotes.drift',0,.4,.01)
  range(fallingControls,'Soft bounce','fallingNotes.bounce',0,.25,.01)
  fallingControls.append(button('Clear fallen notes',clearFallingNotes,'studio-button studio-secondary studio-wide'))
  panels.composition.append(fallingControls)
  heading(panels.composition, 'Camera & arrangement')
  boundSelect(panels.composition, 'Projection', 'camera.projection', { orthographic: 'Orthographic · parallel lines', perspective: 'Perspective · natural depth' })
  range(panels.composition, 'View direction', 'camera.azimuth', -180, 180, 1)
  range(panels.composition, 'View elevation', 'camera.elevation', -80, 80, 1)
  range(panels.composition, 'Zoom', 'camera.zoom', 0.4, 3)
  range(panels.composition, 'Camera distance', 'camera.distance', 2.6, 10, 0.1)
  range(panels.composition, 'Perspective field of view', 'camera.fov', 25, 65, 1)
  panels.composition.append(button('Frame the whole model', frameModel, 'studio-button studio-secondary studio-wide'))
  panels.composition.append(button('Reset camera', resetCamera, 'studio-button studio-secondary studio-wide'))
  range(panels.composition, 'Exploded spacing', 'composition.explode', 0, 1.5, 0.01, 'An inspection layout. Assemble the parts to play the crank.')
  panels.composition.append(button('Assemble to play', () => assemble(), 'studio-button studio-secondary studio-wide'))
  range(panels.composition, 'Model rotation', 'composition.rotation', -180, 180, 1)
  const moveSection = el('details', { class: 'studio-section' }); moveSection.append(el('summary', {}, 'Move individual assemblies'))
  const groupSelect = select(moveSection, 'Assembly', GROUPS, value => { selectedGroup = value; renderOffsets() }, 'studio-group')
  groupSelect.value = selectedGroup
  const offsetControls = el('div'); moveSection.append(offsetControls); panels.composition.append(moveSection)
  function renderOffsets() {
    offsetControls.replaceChildren()
    for (const axis of ['x', 'y', 'z']) range(offsetControls, `${axis.toUpperCase()} offset`, `composition.offsets.${selectedGroup}.${axis}`, -1.5, 1.5)
    syncBindings()
  }
  renderOffsets()
  const shape = el('details', { class: 'studio-section' }); shape.append(el('summary', {}, 'Shape & proportions'))
  textNote(shape, 'Relative proportions, not measured millimeters. The comb contact and pin positions stay coupled when these change.')
  const names = { baseWidth: 'Base width', baseDepth: 'Base depth', baseThickness: 'Base thickness', barrelLength: 'Cylinder length', barrelRadius: 'Cylinder radius', tineLength: 'Comb length', pinHeight: 'Pin height', edgeSoftness: 'Edge softness' }
  for (const [key, [min, max]] of Object.entries(GEOMETRY_BOUNDS)) range(shape, names[key], `geometry.${key}`, min, max, key === 'pinHeight' ? 0.001 : 0.005)
  checkbox(shape, 'Show underside maker mark', 'scene.showMark')
  panels.composition.append(shape)

  heading(panels.share, 'Keep the exact setup', 'Save a study and tell me “use the saved study.” Its settings, notes and preview stay in this local project.')
  for (const [path, label, tag, max] of [['name', 'Study name', 'input', 80], ['notes', 'Your notes / what should change', 'textarea', 4000]]) {
    const row = el('div', { class: 'studio-field' }), id = `studio-${path}`
    const input = el(tag, { id, maxlength: max, autocomplete: 'off', ...(tag === 'input' ? { type: 'text' } : { rows: 5, placeholder: 'For example: the brass feels right, but the frame needs more contrast. Keep the softer shadow.' }) })
    row.append(el('label', { for: id }, label), input); panels.share.append(row)
    bindings.push({ input, path }); input.addEventListener('input', () => change(path, input.value))
  }
  panels.share.append(button('Download settings JSON', () => download(new Blob([JSON.stringify(settings, null, 2) + '\n'], { type: 'application/json' }), 'music-box-study.json'), 'studio-button studio-secondary studio-wide'))
  panels.share.append(button('Download scene PNG', async () => {
    try { download(await (await fetch(capture())).blob(), 'music-box-study.png'); announce('Downloaded a scene-only PNG.') }
    catch (error) { announce(`Couldn’t export the scene: ${error.message}`, true) }
  }, 'studio-button studio-secondary studio-wide'))
  const importInput = el('input', { type: 'file', accept: '.json,application/json', id: 'studio-import' }); importInput.hidden = true
  panels.share.append(button('Import settings JSON', () => importInput.click(), 'studio-button studio-secondary studio-wide'), importInput)
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0]; if (!file) return
    try {
      if (file.size > 200000) throw new Error('Choose a settings JSON smaller than 200 KB.')
      const raw = JSON.parse(await file.text())
      commit(validateSettings(raw.settings ?? raw), `Imported ${file.name}.`)
    } catch (error) { announce(`Couldn’t import: ${error.message}`, true) }
    importInput.value = ''
  })
  const copyArea = el('textarea', { id: 'studio-copy-json', rows: 8, readonly: '', 'aria-label': 'Settings JSON to copy' }); copyArea.hidden = true
  panels.share.append(copyArea)
  textNote(panels.share, 'Save writes studies/current.json plus a separate dated JSON and PNG. Copy setup includes all settings and your notes for pasting into chat. No uploads.')
  const saveButton = button('Save study', save, 'studio-button studio-primary'); saveButton.id = 'studio-save'
  const copyButton = button('Copy setup', async () => {
    const json = JSON.stringify(settings, null, 2)
    try { await navigator.clipboard.writeText(json); announce('Copied settings and notes. Paste them into chat.') }
    catch { copyArea.value = json; copyArea.hidden = false; showTab('share'); copyArea.focus(); copyArea.select(); announce('Select and copy the JSON below; clipboard access is unavailable.') }
  }, 'studio-button studio-secondary')
  panel.querySelector('.studio-save-actions').append(saveButton, copyButton)
  async function save() {
    if (saving) return
    if (!import.meta.env.DEV) { announce('Project saves need the local Vite dev server. Download the JSON and PNG here instead.', true); showTab('share'); return }
    const snapshot=clone(settings)
    saving = true; saveButton.disabled = true; saveButton.textContent = 'Saving…'
    try {
      const response = await fetch('/__musicbox/study', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: snapshot, preview: capture() }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Couldn’t save the study.')
      savedStudy=snapshot;preset.querySelector('[value="saved"]').disabled=false
      if(JSON.stringify(settings)===JSON.stringify(snapshot)){previewingPreset=false;persistDraft();preset.value='saved'}
      announce(`Saved ${result.path} + dated JSON and PNG. Tell me “use the saved study.”`)
    } catch (error) { announce(error.message, true) }
    finally { saving = false; saveButton.disabled = false; saveButton.textContent = 'Save study' }
  }
  function assemble() {
    const next = clone(settings)
    next.composition.explode = 0
    for (const key of Object.keys(GROUPS)) next.composition.offsets[key] = { x: 0, y: 0, z: 0 }
    commit(next, 'Assembled · grab the handle to play.')
  }
  panel.querySelector('form').addEventListener('submit', event => { event.preventDefault(); save() })
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (picking) { picking = false; pick(false); pickButton.setAttribute('aria-pressed', 'false'); pickButton.textContent = 'Pick a part in the scene' } else { setOpen(false); toggle.focus() } }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); save() }
  })
  tuneStudio = createTuneStudio(panels.tune, { recordingChanged, canRecord, applyMelody: melody => { const next = clone(settings); next.melody = melody; commit(next, 'Tune updated · save the study to keep it.') } })
  syncBindings()
  queueMicrotask(() => { apply(settings, null); setOpen(false) })
  const ready = (async () => {
    let project, draft, loadError
    try {
      if (import.meta.env.DEV) {
        const response = await fetch('/__musicbox/study')
        if (!response.ok) throw new Error('Could not load the project study.')
        project = await response.json()
        if(project.settings){savedStudy=validateSettings(project.settings);preset.querySelector('[value="saved"]').disabled=false}
      }
    } catch(error){loadError=error.message}
    try {
      draft=readSceneDraft()
      if(draft?.settings)draft.settings=validateSettings(draft.settings)
    } catch(error){loadError=error.message;draft=null}
    if (draft?.settings && (!savedStudy || draft.updatedAt > (Date.parse(project?.savedAt)||0))) commit(draft.settings, 'Restored this browser’s draft.')
    else if(savedStudy){commit(clone(savedStudy), 'Loaded your saved setup.');preset.value='saved'}
    if(loadError)announce(`Some saved settings could not be loaded: ${loadError}`,true)
  })()

  return {
    ready, tuneBusy:()=>tuneStudio.isBusy(), getSettings: () => clone(settings), setSettings: next => commit(next), selectPart,
    openLettering(){setOpen(true);showTab('composition');recordControls.open=true;letteringControls.open=true;letteringControls.scrollIntoView({block:'start'})},
    setOpen, assemble, isPicking: () => picking,
    syncCamera(camera) { settings.camera = { ...settings.camera, ...camera }; syncBindings(); persistDraft() },
    setCamera(camera) { const next = clone(settings); Object.assign(next.camera, camera); commit(next) },
    cancelPick() { picking = false; pick(false); pickButton.setAttribute('aria-pressed', 'false'); pickButton.textContent = 'Pick a part in the scene' },
    dispose() { tuneStudio?.dispose(); abort.abort(); panel.remove(); document.body.classList.remove('studio-open') },
  }
}
