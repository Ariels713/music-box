import { MicrophoneCapture } from './microphone.js'
import { transcribe } from './transcribe.js'
import { arrangeMelody, noteName, suggestTranspose } from './tune.js'
import { MusicAudio } from './audio.js'

export function createTuneStudio(parent, { applyMelody, recordingChanged, canRecord }) {
  parent.innerHTML = `<h3>Make a tune</h3>
    <p class="studio-hint">Record a short melody through your microphone. Humming or one instrument works best. A song through speakers is experimental: Pitchy follows one pitch at a time.</p>
    <p class="studio-hint">Audio stays in this browser. Cranking pauses during capture. Stop or cancel releases the microphone.</p>
    <div class="studio-field"><label for="tune-seconds">Maximum recording length</label><select id="tune-seconds"><option value="5">5 seconds</option><option value="10" selected>10 seconds</option><option value="15">15 seconds</option></select></div>
    <div class="studio-field"><label for="tune-clarity">Pitch clarity threshold · <output id="tune-clarity-value" for="tune-clarity">0.90</output></label><input id="tune-clarity" type="range" min="0.75" max="0.98" step="0.01" value="0.9"><p class="studio-hint">Higher rejects uncertain pitches; lower may recover quiet notes and admit more mistakes.</p></div>
    <button type="button" id="tune-record" class="studio-button studio-primary studio-wide">Record a melody</button>
    <button type="button" id="tune-stop" class="studio-button studio-secondary studio-wide" hidden>Stop & analyze</button>
    <button type="button" id="tune-cancel" class="studio-button studio-secondary studio-wide" hidden>Cancel</button>
    <p id="tune-status" role="status" aria-live="polite">Microphone permission is requested when you press Record.</p>
    <div id="tune-review" hidden><h3>Review the arrangement</h3>
      <p class="studio-hint">Gray notes below are the detected pitches; the right side is what our C-major comb can play. Chromatic notes are moved to the nearest tine. Timing is kept; pitch detection can make mistakes.</p>
      <div class="studio-field"><label for="tune-transpose">Octave shift</label><select id="tune-transpose">${[-24,-12,0,12,24,36,48].map(value=>`<option value="${value}">${value > 0 ? '+' : ''}${value / 12} octaves</option>`).join('')}</select></div>
      <p id="tune-summary" class="studio-hint"></p><ol id="tune-notes" class="tune-notes"></ol>
      <button type="button" id="tune-preview" class="studio-button studio-secondary studio-wide">Preview arrangement</button>
      <button type="button" id="tune-apply" class="studio-button studio-primary studio-wide">Build this cylinder</button>
    </div>
    <p id="tune-current" class="studio-hint">The original study melody is installed.</p>
    <button type="button" id="tune-original" class="studio-button studio-secondary studio-wide">Restore original tune</button>`
  const $ = id => parent.querySelector(`#tune-${id}`)
  const capture = new MicrophoneCapture(), preview = new MusicAudio()
  let draft = null, generation = 0, previewGeneration = 0, timers = [], previewing = false, busy = false
  function stopPreview() {
    previewGeneration++
    timers.forEach(clearTimeout); timers = []
    preview.voices.forEach(voice=>voice.stop()); preview.voices = []
    previewing = false; $('preview').textContent = 'Preview arrangement'
  }
  function mode(value) {
    busy = value !== 'idle'
    $('record').disabled = busy; $('seconds').disabled = busy; $('clarity').disabled = busy
    $('stop').hidden = value !== 'recording'; $('cancel').hidden = !busy
    $('apply').disabled = busy; $('preview').disabled = busy; $('original').disabled = busy
  }
  function review() {
    if (!draft) return
    const arrangement = arrangeMelody(draft)
    $('transpose').value = draft.transpose
    $('review').hidden = false
    $('summary').textContent = `${draft.notes.length} notes · ${arrangement.changed} adjusted to available tines · one cylinder revolution covers ${arrangement.length.toFixed(1)} seconds of relative timing.`
    $('notes').replaceChildren()
    draft.notes.forEach((note,index)=>{
      const row = document.createElement('li')
      const label = document.createElement('span'); label.textContent = `${note.start.toFixed(2)}s · ${noteName(note.midi)} → ${noteName(arrangement.notes[index].played)}`
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove'; remove.className = 'tune-remove'; remove.setAttribute('aria-label', `Remove note ${index + 1}, ${noteName(note.midi)}`)
      remove.addEventListener('click',()=>{stopPreview();draft.notes.splice(index,1);if(!draft.notes.length){draft=null;$('review').hidden=true;$('status').textContent='No notes left. Record another melody.'}else review()})
      row.append(label,remove);$('notes').append(row)
    })
  }
  $('record').addEventListener('click',async()=>{
    if(!canRecord()){ $('status').textContent='Another recording is in progress. Finish it first.'; return }
    stopPreview(); const token = ++generation; mode('permission');$('status').textContent='Waiting for microphone permission…'
    recordingChanged(true)
    try {
      await capture.start(Number($('seconds').value),seconds=>{
        if(token!==generation)return
        mode('recording');$('status').textContent=`Recording · ${seconds.toFixed(1)} / ${$('seconds').value} seconds`
      },async(samples,rate)=>{
        if(token!==generation)return
        recordingChanged(false);mode('analysis');$('status').textContent='Finding pitches…'
        try {
          const result=await transcribe(samples,rate,{clarity:Number($('clarity').value),canceled:()=>token!==generation,onProgress:p=>{$('status').textContent=`Finding pitches · ${Math.round(p*100)}%`}})
          if(token!==generation||!result)return
          if(!result.notes.length){$('status').textContent='No stable melody found. Try a clearer hum, a quieter room, or a lower clarity threshold.' + (draft ? ' Your previous draft is still shown below.' : '');return}
          draft={notes:result.notes,transpose:suggestTranspose(result.notes)};review()
          $('status').textContent=result.truncated?'Detected more than 128 notes; showing the first 128. Try a shorter, simpler clip.':'Draft ready. Preview and remove mistakes before building the cylinder.'
        } catch(error){$('status').textContent=`Couldn’t analyze this recording: ${error.message}`}
        finally {if(token===generation)mode('idle')}
      })
    } catch(error) {
      if(token!==generation)return
      recordingChanged(false);mode('idle')
      $('status').textContent=error.name==='NotAllowedError'?'Microphone access was denied. Allow it in the browser’s site controls to try again.':`Couldn’t open microphone: ${error.message}`
    }
  })
  $('clarity').addEventListener('input', () => { $('clarity-value').value = Number($('clarity').value).toFixed(2) })
  $('stop').addEventListener('click',()=>capture.finish())
  function cancel() {generation++;capture.cancel();recordingChanged(false);mode('idle');$('status').textContent='Canceled · microphone released.'}
  $('cancel').addEventListener('click',cancel)
  $('transpose').addEventListener('change',()=>{stopPreview();draft.transpose=Number($('transpose').value);review()})
  $('apply').addEventListener('click',()=>{if(!draft)return;stopPreview();applyMelody(structuredClone(draft));$('status').textContent='Cylinder built · turn the crank to play your arrangement.'})
  $('original').addEventListener('click',()=>{stopPreview();applyMelody(null);$('status').textContent='Original tune restored.'})
  $('preview').addEventListener('click',async()=>{
    if(previewing){stopPreview();return}
    if(!draft)return
    const token=generation, playback=++previewGeneration
    try {
      await preview.unlock()
      if(token!==generation||playback!==previewGeneration||busy)return
      const arrangement=arrangeMelody(draft);previewing=true;$('preview').textContent='Stop preview'
      const first=draft.notes[0].start
      arrangement.notes.forEach(note=>timers.push(setTimeout(()=>preview.strike(note.played),(note.start-first)*1000)))
      timers.push(setTimeout(stopPreview,(arrangement.length+1.9)*1000))
    }catch(error){$('status').textContent=`Preview unavailable: ${error.message}`}
  })
  const onHidden=()=>{if(document.hidden){stopPreview();if(busy)cancel()}}
  document.addEventListener('visibilitychange',onHidden)
  return {
    isBusy:()=>busy,
    sync(melody) { $('current').textContent=melody?`Installed cylinder: ${melody.notes.length} notes. Save study to keep it with your design.`:'The original study melody is installed.' },
    dispose(){generation++;capture.cancel();recordingChanged(false);stopPreview();preview.dispose();document.removeEventListener('visibilitychange',onHidden)},
  }
}
