import * as THREE from 'three'
import { PLAY_DIRECTION } from './mechanism.js'
import { DEFAULT_SETTINGS, clone } from './studio-config.js'

export function createCrankHint() {
  const root=new THREE.Group();root.name='crank-turn-hint';root.matrixAutoUpdate=false
  const material=new THREE.MeshPhysicalMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide})
  let settings=clone(DEFAULT_SETTINGS.crankArrow),geometryKey='',mode='idle',previewing=false,spinAngle=0,dropAge=0
  const offset=new THREE.Matrix4(),rotation=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3()
  const anchor=new THREE.Matrix4(),spin=new THREE.Matrix4(),dropMatrix=new THREE.Matrix4(),localBounds=new THREE.Box3()
  const dropPosition=new THREE.Vector3(),dropRotation=new THREE.Quaternion(),dropScale=new THREE.Vector3(),restRotation=new THREE.Quaternion(),landing=new THREE.Vector3()
  const worldPosition=new THREE.Vector3(),worldRotation=new THREE.Quaternion(),normal=new THREE.Vector3(),inverse=new THREE.Quaternion()
  const finishes={satin:[.25,.38,0],polished:[.9,.16,.35],matte:[0,.85,0]}
  function clearGeometry() {
    const geometries=new Set(root.children.map(object=>object.geometry))
    root.clear();geometries.forEach(geometry=>geometry.dispose())
  }
  function add(geometry,position,quaternion) {
    const mesh=new THREE.Mesh(geometry,material)
    if(position)mesh.position.copy(position)
    if(quaternion)mesh.quaternion.copy(quaternion)
    mesh.raycast=()=>{};mesh.userData.opticalGlow=true;root.add(mesh)
    return mesh
  }
  function build() {
    clearGeometry()
    const start=THREE.MathUtils.degToRad(settings.startAngle),end=start+PLAY_DIRECTION*THREE.MathUtils.degToRad(settings.arcLength)
    const points=Array.from({length:81},(_,i)=>{
      const angle=start+(end-start)*i/80
      return new THREE.Vector3(Math.cos(angle)*settings.radius,Math.sin(angle)*settings.radius,0)
    })
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),80,settings.thickness,12,false))
    for(const [point,angle,direction] of [[points[0],start,-1],[points.at(-1),end,1]]) {
      const tangent=new THREE.Vector3(-Math.sin(angle),Math.cos(angle),0).multiplyScalar(direction*PLAY_DIRECTION)
      if(settings.linecap==='round')add(new THREE.SphereGeometry(settings.thickness,16,10),point)
      else if(settings.linecap==='square') {
        add(new THREE.CylinderGeometry(settings.thickness,settings.thickness,settings.thickness,16),point.clone().addScaledVector(tangent,settings.thickness/2),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),tangent))
      } else add(new THREE.CircleGeometry(settings.thickness,16),point,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),tangent))
    }
    const length=settings.headLength,width=settings.headWidth,depth=settings.depth
    let head
    if(settings.head==='triangle') {
      const shape=new THREE.Shape()
      shape.moveTo(0,length*.56);shape.lineTo(-width/2,-length*.44)
      shape.quadraticCurveTo(-width*.54,-length*.5,-width*.4,-length*.5)
      shape.lineTo(width*.4,-length*.5);shape.quadraticCurveTo(width*.54,-length*.5,width/2,-length*.44);shape.closePath()
      const bevel=Math.min(.003,depth/4,width/10)
      head=add(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:1}).translate(0,0,-depth/2))
    } else if(settings.head==='chevron') {
      head=add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-width/2,-length/2,0),new THREE.Vector3(0,length/2,0),new THREE.Vector3(width/2,-length/2,0)]),24,settings.thickness,12,false))
    } else if(settings.head==='cone')head=add(new THREE.ConeGeometry(width/2,length,20))
    if(head){head.position.copy(points.at(-1));head.rotation.z=end+(PLAY_DIRECTION<0?Math.PI:0)}
    localBounds.makeEmpty()
    for(const mesh of root.children){mesh.updateMatrix();mesh.geometry.computeBoundingBox();localBounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix))}
  }
  function floorHeight(quaternion,size) {
    normal.set(0,1,0).applyQuaternion(inverse.copy(quaternion).invert())
    return -(Math.min(normal.x*localBounds.min.x,normal.x*localBounds.max.x)+Math.min(normal.y*localBounds.min.y,normal.y*localBounds.max.y)+Math.min(normal.z*localBounds.min.z,normal.z*localBounds.max.z))*size
  }
  function showPose() {
    const attached=previewing||mode==='idle'
    if(attached)root.matrix.copy(anchor).multiply(spin.makeRotationZ(previewing?0:spinAngle))
    else root.matrix.copy(dropMatrix)
    root.matrixWorldNeedsUpdate=true
    root.visible=settings.enabled&&(previewing||mode!=='gone')
    material.opacity=settings.opacity*(mode==='fading'&&!previewing?Math.max(0,1-dropAge/.12):1)
  }
  function configure(next) {
    settings=clone(next)
    const key=JSON.stringify([next.radius,next.thickness,next.arcLength,next.startAngle,next.linecap,next.head,next.headLength,next.headWidth,next.depth])
    if(key!==geometryKey){geometryKey=key;build()}
    const [metalness,roughness,clearcoat]=finishes[next.style]
    if((material.clearcoat>0)!==(clearcoat>0))material.needsUpdate=true
    material.color.set(next.color);material.metalness=metalness;material.roughness=roughness;material.clearcoat=clearcoat
    showPose()
  }
  configure(settings)
  return {
    root,configure,
    follow(box){
      box.root.updateMatrixWorld(true)
      position.copy(box.crank.position).add(new THREE.Vector3(settings.position.x,settings.position.y,settings.position.z))
      rotation.setFromEuler(new THREE.Euler(...['x','y','z'].map(axis=>THREE.MathUtils.degToRad(settings.rotation[axis]))))
      offset.compose(position,rotation,scale.setScalar(settings.scale))
      anchor.multiplyMatrices(box.root.matrixWorld,offset);showPose()
    },
    preview(active){previewing=active;showPose()},
    dismiss(){
      if(mode!=='idle')return
      dropMatrix.copy(root.matrix);dropMatrix.decompose(dropPosition,dropRotation,dropScale)
      restRotation.setFromEuler(new THREE.Euler(-Math.PI/2,0,spinAngle,'YXZ'))
      landing.copy(dropPosition);landing.x+=.025;landing.z+=.045
      dropAge=0;mode='falling'
    },
    state(){return {phase:mode,spin:spinAngle}},
    update(delta,reduced){
      if(previewing||!settings.enabled)return false
      if(mode==='idle') {
        if(reduced||settings.idleSpeed===0)return false
        spinAngle=(spinAngle+PLAY_DIRECTION*THREE.MathUtils.degToRad(settings.idleSpeed)*delta)%(Math.PI*2)
        showPose();return true
      }
      if(mode==='falling'&&reduced){mode='fading';dropAge=0}
      if(mode==='fading') {
        dropAge+=delta
        if(dropAge>=.12)mode='gone'
        showPose();return true
      }
      if(mode!=='falling')return false
      dropAge+=delta
      const progress=Math.min(1,dropAge/settings.fallDuration),travel=progress*progress
      worldRotation.copy(dropRotation).slerp(restRotation,THREE.MathUtils.smoothstep(progress,.15,1))
      const floor=floorHeight(worldRotation,dropScale.x)
      worldPosition.copy(dropPosition).lerp(landing,travel)
      const restHeight=floorHeight(restRotation,dropScale.x)
      worldPosition.y=Math.max(floor,THREE.MathUtils.lerp(dropPosition.y,restHeight,travel))
      if(progress===1) {
        const after=dropAge-settings.fallDuration
        worldPosition.y=restHeight+(after<1?.028*Math.exp(-4*after)*Math.abs(Math.sin(10*after)):0)
        if(after>=1)mode='landed'
      }
      dropMatrix.compose(worldPosition,worldRotation,dropScale)
      for(const mesh of root.children){mesh.userData.opticalGlow=false;mesh.castShadow=true;mesh.receiveShadow=true}
      showPose();return true
    },
    dispose(){root.removeFromParent();clearGeometry();material.dispose()},
  }
}
