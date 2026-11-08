import * as THREE from 'three'

export const MAX_FALLING_NOTES = 100
const PALETTE = ['#df9b87', '#a8bda1', '#b5a2c7', '#d5bd79', '#87b7be', '#ce9fb3']
const white = new THREE.Color('#ffffff')

export function fallingNoteMotion(age, duration, height, bounce=.12) {
  if(age < duration) {
    const distance=t=>t-.6*(1-Math.exp(-t/.6))
    const progress=Math.min(1,distance(Math.max(0,age))/distance(duration))
    return {height:height*(1-progress),progress,squash:0,settled:false}
  }
  const t=age-duration
  if(t>=1.6)return {height:0,progress:1,squash:0,settled:true}
  return {height:bounce*Math.exp(-3.3*t)*Math.abs(Math.sin(9*t)),progress:1,squash:Math.exp(-7*t)*Math.cos(10*t),settled:false}
}

export function createFallingNotes({ random = Math.random } = {}) {
  const root = new THREE.Group();root.name='fallen-music-notes'
  let settings={enabled:true,shape:'mixed',size:1,speed:1,drift:.16,bounce:.12},obstacles=[],sequence=0
  const pool=[]
  function makeGeometry(kind) {
    const outline=new THREE.Shape()
    if(kind==='paired') {
      outline.moveTo(-.052,.089)
      outline.lineTo(-.052,.225)
      outline.quadraticCurveTo(-.052,.242,-.035,.244)
      outline.lineTo(.121,.265)
      outline.quadraticCurveTo(.143,.268,.143,.247)
      outline.lineTo(.143,.078)
      outline.bezierCurveTo(.151,.042,.101,.018,.063,.032)
      outline.bezierCurveTo(.008,.052,.027,.104,.078,.111)
      outline.quadraticCurveTo(.095,.115,.105,.107)
      outline.lineTo(.105,.224)
      outline.lineTo(-.014,.208)
      outline.lineTo(-.014,.057)
      outline.bezierCurveTo(-.006,.021,-.056,-.003,-.094,.011)
      outline.bezierCurveTo(-.149,.031,-.13,.083,-.079,.09)
      outline.quadraticCurveTo(-.062,.094,-.052,.089)
    } else {
      outline.moveTo(.004,.088)
      outline.lineTo(.004,.244)
      outline.quadraticCurveTo(.004,.263,.023,.263)
      if(kind==='eighth') {
        outline.bezierCurveTo(.046,.241,.116,.232,.124,.192)
        outline.bezierCurveTo(.131,.164,.112,.141,.092,.129)
        outline.quadraticCurveTo(.079,.121,.083,.138)
        outline.bezierCurveTo(.101,.173,.08,.189,.042,.198)
      } else outline.quadraticCurveTo(.042,.263,.042,.244)
      outline.lineTo(.042,.067)
      outline.bezierCurveTo(.05,.031,0,.007,-.038,.021)
      outline.bezierCurveTo(-.093,.041,-.074,.093,-.023,.1)
      outline.quadraticCurveTo(-.006,.104,.004,.088)
    }
    outline.closePath()
    // A single beveled outline has no overlapping caps or internal joint surfaces.
    const geometry=new THREE.ExtrudeGeometry(outline,{depth:.016,bevelEnabled:true,bevelThickness:.006,bevelSize:.009,bevelSegments:5,curveSegments:24,steps:1}).translate(0,-.135,-.008)
    geometry.computeBoundingBox()
    return {geometry}

  }
  const shapes=Object.fromEntries(['quarter','eighth','paired'].map(kind=>[kind,makeGeometry(kind)]))
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(128,128)
  let seed=7123
  const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  for(let i=0;i<image.data.length;i+=4){const value=140+noise()*115;image.data[i]=image.data[i+1]=image.data[i+2]=value;image.data[i+3]=255}
  ctx.putImageData(image,0,0)
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,3)
  const materials=PALETTE.map(color=>new THREE.MeshPhysicalMaterial({color,metalness:0,roughness:1,sheen:1,sheenRoughness:.9,sheenColor:new THREE.Color(color).lerp(white,.35),bumpMap:texture,bumpScale:.0018}))
  for(const shape of Object.values(shapes)) {
    const fibers=[],positions=shape.geometry.attributes.position,normals=shape.geometry.attributes.normal
    for(let i=0;i<1100;i++){
      const index=Math.floor(noise()*positions.count),length=.002+noise()*.004
      const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index)
      fibers.push(x,y,z,x+normals.getX(index)*length,y+normals.getY(index)*length,z+normals.getZ(index)*length)
    }
    shape.fibers=new THREE.BufferGeometry()
    shape.fibers.setAttribute('position',new THREE.Float32BufferAttribute(fibers,3))
  }
  const fiberMaterials=PALETTE.map(color=>new THREE.LineBasicMaterial({color:new THREE.Color(color).lerp(white,.28),transparent:true,opacity:.32,depthWrite:false}))
  function makeNote() {
    const node=new THREE.Group(),visual=new THREE.Group();node.name='falling-note';node.visible=false;node.add(visual);root.add(node)
    const mesh=new THREE.Mesh(shapes.eighth.geometry,materials[0]);mesh.castShadow=true;mesh.receiveShadow=true;mesh.raycast=()=>{};visual.add(mesh)
    const fuzz=new THREE.LineSegments(shapes.eighth.fibers,fiberMaterials[0]);fuzz.raycast=()=>{};visual.add(fuzz)
    const item={node,visual,mesh,fuzz,active:false,settled:false,age:0,id:0,landing:new THREE.Vector2(),air:new THREE.Quaternion(),rest:new THREE.Quaternion()}
    pool.push(item);return item
  }
  function clear(){let changed=false;for(const p of pool){changed ||= p.active;p.active=false;p.node.visible=false}return changed}
  function spawn(midi,camera) {
    if(!settings.enabled)return
    const p=pool.find(p=>!p.active) || (pool.length<MAX_FALLING_NOTES?makeNote():pool.filter(p=>p.settled).sort((a,b)=>a.id-b.id)[0] || pool.reduce((a,b)=>a.id<b.id?a:b))
    let x=0,z=0
    const projected=new THREE.Vector3()
    for(let attempt=0;attempt<80;attempt++){
      x=(random()-.5)*4.4;z=(random()-.5)*4.4
      const padding=.2+.12*settings.size
      const blocked=obstacles.some(b=>x>b.minX-padding&&x<b.maxX+padding&&z>b.minZ-padding&&z<b.maxZ+padding)
      const occupied=pool.some(q=>q!==p&&q.active&&Math.hypot(q.landing.x-x,q.landing.y-z)<.22)
      projected.set(x,.06,z).project(camera)
      if(!blocked&&!occupied&&Math.abs(projected.x)<.9&&Math.abs(projected.y)<.9)break
      if(attempt===79)return
    }
    const color=(midi+Math.floor(random()*PALETTE.length))%PALETTE.length
    const kind=settings.shape==='mixed'?['quarter','eighth','paired'][sequence%3]:settings.shape
    const shape=shapes[kind]
    p.node.userData.shape=kind
    p.mesh.geometry=shape.geometry;p.fuzz.geometry=shape.fibers
    p.mesh.material=materials[color];p.fuzz.material=fiberMaterials[color]
    p.active=true;p.settled=false;p.node.visible=true;p.age=0;p.id=sequence++;p.landing.set(x,z)
    p.lift=new THREE.Vector3();p.duration=3.8+random()*2.5;p.phase=random()*Math.PI*2;p.scale=.85+random()*.35
    const angle=Math.atan2(camera.position.x,camera.position.z)
    p.air.setFromEuler(new THREE.Euler((random()-.5)*.4,angle+(random()-.5)*.9,(random()-.5)*.7,'YXZ'))
    p.rest.setFromEuler(new THREE.Euler(-Math.PI/2,random()*Math.PI*2,0,'YXZ'))
    p.turnStart=.38+random()*.25;p.turnEnd=.9+random()*.1
    p.driftRate=.75+random()*.5;p.sway=.07+random()*.1
    p.bounceScale=.55+random()*.6;p.settleRate=.85+random()*.3

    pose(p)
    // Start above the camera frame at the landing depth, rather than a fixed world height.
    // Camera-plane lift also works when looking almost straight down at the floor.
    camera.updateMatrixWorld()
    const origin=p.node.position.clone(),screen=origin.clone().project(camera)
    let screenY=1.15+random()*.2
    const bounds=new THREE.Box3(),corner=new THREE.Vector3()
    for(let attempt=0;attempt<12;attempt++) {
      p.lift.copy(new THREE.Vector3(screen.x,screenY,screen.z).unproject(camera)).sub(origin)
      pose(p)
      bounds.setFromObject(p.node)
      let lowest=Infinity
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]) {
        lowest=Math.min(lowest,corner.set(x,y,z).project(camera).y)
      }
      if(lowest>=1.04)break
      screenY+=1.04-lowest+.05
    }
  }
  const up=new THREE.Vector3(),inverse=new THREE.Quaternion()
  function pose(p){
    const age=p.age<p.duration?p.age:p.duration+(p.age-p.duration)*p.settleRate
    const motion=fallingNoteMotion(age,p.duration,1,settings.bounce*p.bounceScale),size=p.scale*settings.size
    const drift=(1-motion.progress)*settings.drift
    p.node.scale.set(size*(1+.08*motion.squash),size*(1-.15*motion.squash),size*(1+.08*motion.squash))
    const tilt=THREE.MathUtils.smoothstep(motion.progress,p.turnStart,p.turnEnd)
    p.visual.quaternion.copy(p.air).slerp(p.rest,tilt)
    if(motion.progress<1)p.visual.rotateZ(Math.sin(p.age*1.4*p.driftRate+p.phase)*p.sway*(1-tilt))
    // Centered geometry needs orientation-aware clearance as it gently turns flat.
    const bounds=p.mesh.geometry.boundingBox
    up.set(0,1,0).applyQuaternion(inverse.copy(p.visual.quaternion).invert())
    const floor=-Math.min(up.x*bounds.min.x,up.x*bounds.max.x)-Math.min(up.y*bounds.min.y,up.y*bounds.max.y)-Math.min(up.z*bounds.min.z,up.z*bounds.max.z)
    p.node.position.set(p.landing.x+Math.sin(p.age*1.15*p.driftRate+p.phase)*drift,floor*size*(1-.15*motion.squash),p.landing.y+Math.cos(p.age*.8*p.driftRate+p.phase)*drift)
    if(age<p.duration)p.node.position.addScaledVector(p.lift,motion.height)
    else p.node.position.y+=motion.height
    p.settled=motion.settled
  }
  return {
    root,spawn,clear,
    configure(next,bounds){
      for(let i=0;i<materials.length;i++) {
        const color=next.colorMode==='single'?next.singleColor:next.palette[i]
        if((materials[i].sheen>0)!==(next.sheen>0))materials[i].needsUpdate=true
        materials[i].sheen=next.sheen
        materials[i].color.set(color)
        materials[i].sheenColor.set(color).lerp(white,.35)
        fiberMaterials[i].color.set(color).lerp(white,next.fiberBrightness)
      }
      const resized=settings.size!==next.size;settings={...next};obstacles=bounds;if(!settings.enabled)clear();else if(resized)for(const p of pool)if(p.active)pose(p)},
    update(delta){let changed=false;for(const p of pool){if(p.active&&!p.settled){p.age+=delta*settings.speed;pose(p);changed=true}}return changed},
    stats(){return {count:pool.filter(p=>p.active).length,airborne:pool.filter(p=>p.active&&!p.settled).length,settled:pool.filter(p=>p.active&&p.settled).length,maximum:MAX_FALLING_NOTES}},
    dispose(){root.removeFromParent();Object.values(shapes).forEach(s=>{s.geometry.dispose();s.fibers.dispose()});texture.dispose();materials.forEach(m=>m.dispose());fiberMaterials.forEach(m=>m.dispose())},
  }
}
