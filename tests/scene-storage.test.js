import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SETTINGS, clone } from '../src/studio-config.js'
import { DRAFT_KEY, readSceneDraft } from '../src/scene-storage.js'

function withStorage(entries,run) {
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),values=new Map(entries)
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}})
  try{run(values)}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage}
}
test('existing Studio drafts migrate without altering a captured hum or the legacy backup',()=>{
  const settings=clone(DEFAULT_SETTINGS);settings.scene.showMark=false
  settings.melody={notes:[{midi:60,start:0,duration:.4},{midi:64,start:.6,duration:.3}],transpose:12}
  const legacy=JSON.stringify({updatedAt:123,settings})
  withStorage([['music-box-studio-v1',legacy]],values=>{
    const migrated=readSceneDraft()
    assert.deepEqual(migrated.settings.melody,settings.melody)
    assert.equal(migrated.settings.scene.showMark,true)
    assert.equal(migrated.updatedAt,123)
    assert.equal(values.get('music-box-studio-v1'),legacy)
    assert.equal(values.has(DRAFT_KEY),false)
  })
})
test('current drafts keep an explicit later choice to hide the signature',()=>{
  const settings=clone(DEFAULT_SETTINGS);settings.scene.showMark=false
  const current={updatedAt:456,settings}
  withStorage([[DRAFT_KEY,JSON.stringify(current)],['music-box-studio-v1','bad legacy data']],()=>assert.deepEqual(readSceneDraft(),current))
})
