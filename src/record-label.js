import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import fontData from './assets/fonts/record-label.typeface.json' with { type: 'json' }

export function createRecordLabel() {
  const font=new FontLoader().parse(fontData)
  const label=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:'#35394a',depthWrite:false,toneMapped:false}))
  let geometryKey=''
  let parts=[],options
  const safeText=text=>[...text.toUpperCase()].map(letter=>fontData.glyphs[letter]?letter:'?').join('')
  function arc(text,radius,size,lower=false) {
    const tracking=options.spacing*(lower ? 1.5 : 1),widths=[...text].map(letter=>fontData.glyphs[letter].ha/fontData.resolution*size)
    const total=widths.reduce((sum,width)=>sum+width,0)+tracking*(widths.length-1)
    let cursor=-total/2
    for(const [i,letter] of [...text].entries()) {
      const middle=cursor+widths[i]/2
      const angle=lower?Math.PI*1.5+middle/radius:Math.PI/2-middle/radius
      if(letter!==' ') {
        const glyph=new THREE.ShapeGeometry(font.generateShapes(letter,size),8)
        glyph.translate(-widths[i]/2,0,0)
        glyph.scale(1,options.stretch,1)
        glyph.rotateZ(lower?angle+Math.PI/2:angle-Math.PI/2)
        glyph.translate(Math.cos(angle)*radius,Math.sin(angle)*radius,0)
        parts.push(glyph)
      }
      cursor+=widths[i]+tracking
    }
  }
  label.userData.configure=next=>{
    options=next
    const key=JSON.stringify([next.upperText,next.lowerText,next.size,next.spacing,next.upperRadius,next.lowerRadius,next.stretch])
    if(key!==geometryKey){
      parts=[]
      arc(safeText(next.upperText),next.upperRadius,.078*next.size)
      arc(safeText(next.lowerText),next.lowerRadius,.064*next.size,true)
      const geometry=parts.length?mergeGeometries(parts):new THREE.BufferGeometry()
      parts.forEach(part=>part.dispose());label.geometry.dispose();label.geometry=geometry;geometryKey=key
    }
    label.visible=next.enabled&&!!(next.upperText.trim()||next.lowerText.trim())
    label.material.color.set(next.color)
    label.rotation.z=THREE.MathUtils.degToRad(next.rotation)
  }
  label.name='record-floor-instruction';label.rotation.x=-Math.PI/2;label.userData.opticalGlow=true
  label.userData.instruction='Press and hold to record your own tune';label.userData.layout='circular'
  label.raycast=()=>{}
  return label
}
