import { validateSettings } from './studio-config.js'

export const DRAFT_KEY='music-box-scene-v1'

export function readSceneDraft() {
  const current=localStorage.getItem(DRAFT_KEY)
  if(current)return JSON.parse(current)
  const legacy=JSON.parse(localStorage.getItem('music-box-studio-v1')||'null')
  if(!legacy?.settings)return null
  legacy.settings=validateSettings(legacy.settings)
  // The old visibility choice applied to the original manufacturer's URL.
  legacy.settings.scene.showMark=true
  return legacy
}
