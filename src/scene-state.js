import projectStudy from '../studies/current.json' with { type: 'json' }
import { clone, validateSettings, GROUPS } from './studio-config.js'

import { DRAFT_KEY, readSceneDraft } from './scene-storage.js'
export const SAVED_SETTINGS=validateSettings(projectStudy.settings)

// Visitor state keeps recording and saved designs working without constructing editor UI.
export function createSceneState({apply,message}) {
  let settings=clone(SAVED_SETTINGS)
  function persist() {
    try {localStorage.setItem(DRAFT_KEY,JSON.stringify({updatedAt:Date.now(),settings}))}
    catch {message('This browser cannot save your changes across refresh.')}
  }
  function commit(next) {
    const checked=validateSettings(next),previous=settings
    apply(checked,previous);settings=checked;persist()
  }
  const ready=(async()=>{
    // Let the mechanism and recording button finish initializing before applying a study.
    await Promise.resolve()
    let saved=projectStudy
    if(import.meta.env.DEV) {
      try {
        const response=await fetch('/__musicbox/study')
        if(!response.ok)throw new Error('Could not load the local study.')
        const local=await response.json()
        if(local.settings)saved={...local,settings:validateSettings(local.settings)}
      } catch {message('Using the bundled setup; the local study could not be loaded.')}
    }
    settings=validateSettings(saved.settings)
    try {
      const draft=readSceneDraft()
      if(draft?.settings&&draft.updatedAt>(Date.parse(saved.savedAt)||0))settings=validateSettings(draft.settings)
    } catch {message('Could not restore browser changes; using the saved setup.')}
    apply(settings,null)
  })()
  return {
    ready,
    getSettings:()=>clone(settings),
    setSettings:commit,
    setCamera(camera){const next=clone(settings);next.camera={...next.camera,...camera};commit(next)},
    syncCamera(camera){settings.camera={...settings.camera,...camera};persist()},
    assemble(){const next=clone(settings);next.composition.explode=0;for(const key of Object.keys(GROUPS))next.composition.offsets[key]={x:0,y:0,z:0};commit(next)},
  }
}
