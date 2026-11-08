import * as THREE from 'three'
import { DEFAULT_SETTINGS, clone } from './studio-config.js'
import { MicrophoneCapture } from './microphone.js'
import { transcribe } from './transcribe.js'
import { suggestTranspose } from './tune.js'

const COLORS = ['#43646b', '#a66b82', '#987b45', '#4c7c86', '#7276a0', '#658263', '#ac6b51']
export function createRecordButton({ changed, recordingChanged, install, currentColor, message, canStart }) {
  let settings=clone(DEFAULT_SETTINGS.recordButton)
  const root = new THREE.Group(); root.name = 'record-sound-button'
  const material = (color, metalness, roughness) => new THREE.MeshPhysicalMaterial({color,metalness,roughness})
  const wellProfile=[[.26,0],[.255,.004],[.242,.003],[.234,-.012],[.234,-.125],[.22,-.15],[0,-.15]].map(([x,y])=>new THREE.Vector2(x,y))
  const well=new THREE.Group();well.name='record-base';root.add(well)
  const base=new THREE.Mesh(new THREE.LatheGeometry(wellProfile,80),material('#96969a',.12,.6))
  base.name='record-button-well';well.add(base)
  const bezel=new THREE.Mesh(new THREE.TorusGeometry(.255,.0035,12,80),material('#d5d4d0',.2,.5))
  bezel.rotation.x=Math.PI/2;bezel.position.y=.003;well.add(bezel)
  const cap = new THREE.Group(); cap.position.y=settings.restHeight-.057;root.add(cap)
  const profile = [[0,-.025],[.19,-.025],[.215,-.015],[.227,0],[.224,.025],[.218,.045],[.202,.057],[0,.057]].map(([x,y])=>new THREE.Vector2(x,y))
  const surface=material('#e4e2dd',.08,.48);surface.clearcoat=.15
  const top=new THREE.Mesh(new THREE.LatheGeometry(profile,64),surface);cap.add(top)
  const ink=material(settings.color,.08,.4);ink.clearcoat=.1
  const note=new THREE.Group();note.name='record-note';note.position.set(-.015,.059,0);note.scale.setScalar(1.35);cap.add(note)
  const head=new THREE.Shape();head.absellipse(-.025,-.04,.036,.024,-.3,Math.PI*2-.3,false)
  const stem=new THREE.Shape();stem.moveTo(0,-.04);stem.lineTo(.012,-.04);stem.lineTo(.012,.095);stem.lineTo(0,.095);stem.closePath()
  const flag=new THREE.Shape();flag.moveTo(0,.095);flag.bezierCurveTo(.085,.09,.09,.04,.065,.013);flag.bezierCurveTo(.083,.061,.034,.052,0,.066);flag.closePath()
  const noteShapes=[head,stem,flag]
  for(const shape of noteShapes){const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelSize:.0015,bevelThickness:.001,bevelSegments:2,curveSegments:24}),ink);mesh.rotation.x=-Math.PI/2;note.add(mesh)}
  const lampMaterial=material(settings.idleColor,0,.3)
  const lamp=new THREE.Mesh(new THREE.TorusGeometry(.255,.0025,12,128),lampMaterial)
  lamp.name='record-rim-light';lamp.rotation.x=Math.PI/2;lamp.position.y=.0065;well.add(lamp)
  const washCanvas=document.createElement('canvas');washCanvas.width=washCanvas.height=128
  const washContext=washCanvas.getContext('2d'),washGradient=washContext.createRadialGradient(64,64,4,64,64,62)
  washGradient.addColorStop(0,'rgba(255,255,255,.7)');washGradient.addColorStop(1,'rgba(255,255,255,0)')
  washContext.fillStyle=washGradient;washContext.fillRect(0,0,128,128)
  const washMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(washCanvas),color:settings.idleColor,transparent:true,depthWrite:false})
  const wash=new THREE.Mesh(new THREE.PlaneGeometry(.35,.22),washMaterial)
  wash.rotation.x=-Math.PI/2;wash.position.set(0,.008,.33);wash.userData.opticalGlow=true;wash.raycast=()=>{};root.add(wash)
  const uplight=new THREE.PointLight(settings.idleColor,.03,.65,2);uplight.position.set(0,.028,.31);root.add(uplight)
  root.traverse(item=>{if(item.isMesh){item.castShadow=!item.userData.opticalGlow;item.receiveShadow=true}})
  base.castShadow=false;lamp.castShadow=false
  const capture=new MicrophoneCapture()
  let state='idle',held=false,generation=0,press=0,hover=false,disposed=false
  const accessible=document.createElement('button');accessible.id='record-sound';accessible.type='button';accessible.className='record-accessible';accessible.textContent='Hold to record a tune';accessible.setAttribute('aria-label','Hold Space or Enter to record a melody. Release to create a cylinder. Maximum 10 seconds.');accessible.setAttribute('aria-pressed','false');document.body.append(accessible)
  const hint=document.createElement('p');hint.className='record-hint';hint.id='record-hint';hint.textContent='Hold ♪ and hum · release to create';document.body.append(hint);message(hint.textContent)
  function updateRecessLight() {
    const color=held?settings.recordingColor:settings.idleColor
    lampMaterial.color.set(color);lampMaterial.emissive.set(color);lampMaterial.emissiveIntensity=3*settings.glow
    washMaterial.color.set(color);washMaterial.opacity=Math.min(.6,settings.glow*.45);washMaterial.visible=settings.glow>0
    uplight.color.set(color);uplight.intensity=settings.lightPower*settings.glow
  }
  function setState(next,text) {updateRecessLight();if(state===next&&hint.textContent===text)return;state=next;accessible.disabled=next==='processing';accessible.setAttribute('aria-pressed',String(held));hint.textContent=text;message(text);changed()}
  function idle(text){held=false;recordingChanged(false);setState('idle',text)}
  async function down() {
    if(held||state==='processing'||disposed||!canStart())return
    const token=++generation;held=true;recordingChanged(true)
    setState('permission','Allow microphone, then keep holding ♪ to hum')
    try {
      await capture.start(10,seconds=>{
        if(token!==generation||!held)return
        setState('recording',`Hum your tune · ${Math.max(0,10-seconds).toFixed(0)}s left · release to create`)
      },async(samples,rate)=>{
        if(token!==generation)return
        held=false;recordingChanged(false);setState('processing','Making your cylinder…')
        try {
          const result=await transcribe(samples,rate,{canceled:()=>token!==generation})
          if(token!==generation||!result)return
          if(!result.notes.length){idle('No clear tune yet · hold ♪ a little longer and hum');return}
          const choices=COLORS.filter(color=>color.toLowerCase()!==currentColor().toLowerCase())
          const color=choices[Math.floor(Math.random()*choices.length)]
          install({notes:result.notes,transpose:suggestTranspose(result.notes)},color)
          idle(`New cylinder · ${result.notes.length} notes · turn the crank to play`)
        }catch(error){if(token===generation)idle(`Couldn’t create the tune: ${error.message}`)}
      })
    }catch(error){if(token===generation)idle(error.name==='NotAllowedError'?'Microphone blocked · allow it in browser site controls, then hold ♪ again':`Microphone unavailable: ${error.message}`)}
  }
  function up() {
    if(!held)return
    held=false;updateRecessLight();accessible.setAttribute('aria-pressed','false')
    if(state==='recording')capture.finish()
    else {generation++;capture.cancel();idle('Hold ♪ again to record · release to create')}
    changed()
  }
  function cancel() {
    if(state==='idle')return
    generation++;held=false;capture.cancel();idle('Canceled · your cylinder is unchanged')
  }
  accessible.addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat)down()}if(event.key==='Escape')cancel()})
  accessible.addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();up()}})
  accessible.addEventListener('blur',cancel)
  const onHidden=()=>{if(document.hidden)cancel()}
  document.addEventListener('visibilitychange',onHidden)
  window.addEventListener('blur',cancel)
  return {
    root, cap, down, up, cancel, state:()=>state,
    configure(next){
      settings=clone(next)
      root.position.set(settings.position.x,settings.position.y,settings.position.z)
      well.position.set(settings.baseOffset.x,settings.baseOffset.y,settings.baseOffset.z)
      well.scale.set(settings.baseWidth/.52,settings.wellDepth/.15,settings.baseDepth/.52)
      uplight.position.set(settings.lightPosition.x,settings.lightPosition.y,settings.lightPosition.z);uplight.distance=settings.lightRange
      wash.position.set(settings.lightPosition.x,.008,settings.lightPosition.z-.06);wash.scale.set(settings.washWidth/.35,settings.washDepth/.22,1)
      root.rotation.y=THREE.MathUtils.degToRad(settings.rotation);root.scale.setScalar(settings.scale)
      surface.metalness=settings.metalness;surface.roughness=settings.roughness
      bezel.material.color.set(settings.bezelColor);base.material.color.set(settings.wellColor);base.material.metalness=settings.baseMetalness;base.material.roughness=settings.baseRoughness
      ink.color.set(settings.color).multiplyScalar(.9);ink.metalness=settings.metalness;ink.roughness=Math.max(.25,settings.roughness)
      updateRecessLight();changed()
    },
    hover(value){if(hover!==value){hover=value;changed()}},
    update(delta,reduced){
      const target=held?1:0,previous=press
      press=reduced?target:THREE.MathUtils.damp(press,target,held?35:22,Math.min(delta,.1))
      if(Math.abs(press-target)<.001)press=target
      const restingHeight=Math.max(settings.restHeight,.085-settings.wellDepth)
      const travel=Math.min(settings.pressDepth,Math.max(0,settings.wellDepth+restingHeight-.085))
      cap.position.y=restingHeight-.057-press*travel
      surface.color.set(settings.color)
      if(hover)surface.color.lerp(new THREE.Color('#ffffff'),.06)
      updateRecessLight()
      return previous!==press
    },
    dispose(){disposed=true;generation++;capture.cancel();recordingChanged(false);accessible.remove();hint.remove();document.removeEventListener('visibilitychange',onHidden);window.removeEventListener('blur',cancel)},
  }
}
