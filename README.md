# Music box

A local Three.js study of Ariel’s hand-cranked music box. Open **http://localhost:5173/** while the existing Vite server is running.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
npm run build
node --test tests/*.test.js
```

Vite, vanilla JavaScript, Three.js, Web Audio, and Pitchy for microphone pitch detection. No remote assets, audio uploads, analytics, deployment, or hardware integration. A local Vite-only save handler writes study files on this Mac. The existing personal website is outside this project.

## Browser scene studio

The visitor page does not render Studio. For local editing, open **http://localhost:5173/?studio=1** and use the **Studio** button to open controls alongside the live design. Production builds omit the editor UI, even with that URL parameter. Open **http://localhost:5173/?studio=1&edit=lettering** to jump straight to **Compose → Record button → Button lettering**. Edit the upper/lower words, color, size, spacing, arc radii, height, rotation and X/Z placement. The circular letters remain flat on the floor; edits autosave in this browser and are included in saved/exported settings. Changes preview immediately; they do not turn the crank. On narrow screens the preview sits above a scrolling control panel.

- **Materials:** choose one of eight part categories, or use **Pick a part in the scene**. Each category has its own color, metalness, roughness, clear coating, texture and opacity. Finish recipes apply to the selected category only. Starting looks preview a style while retaining your notes, tune and button settings; previews do not replace your stored working draft.
- **Lighting:** main, fill and rim lights each have an enable switch, color, strength, direction, elevation and shadow switch. Studio reflections are the surrounding light reflected in metal. Control their intensity and rotation independently of direct lights. Compare cast shadows, the soft contact overlay and ambient occlusion separately.
- **Compose:** background, exposure and color response; orthographic or perspective camera; zoom, view and framing; exploded spacing and individual assembly offsets; bounded shape/proportion and edge-softness controls. Proportions are estimates, not millimeters. Changing them rebuilds geometry while preserving note/pin correspondence. Arbitrary topology, tooth counts and melody editing still require code.
- **Save & share:** name the study and write what feels right or wrong. **Save study** writes `studies/current.json` and a dated JSON + scene-only PNG in `studies/`. Tell the coding agent “use the saved study”; it can read those exact settings, notes and preview locally. **Copy setup** includes settings and notes for chat. JSON import/export and PNG download are also available. Nothing is uploaded.

Edits write immediately to localStorage, so an immediate refresh retains them. Style previews do not overwrite that draft. Choose Your saved setup in Starting look to restore the project snapshot; Save study updates that snapshot. On reload the newer of the browser draft and the saved project study wins. Clearing site data removes the draft, so use **Save study** for a durable handoff. Project saves require `npm run dev`; a production preview can download files. Dated saves are retained rather than overwritten. Cmd/Ctrl+Enter saves from the panel; Escape closes it. Tabs support arrow-key navigation.

**How to tune:** first select a finish, then adjust reflections and the main light, then shadow strength. Metalness describes conductor-like reflection: bare brass/steel approach 1; wood, paint and ceramic approach 0. Roughness spreads reflections, from crisp polished highlights to broad satin highlights. Clear coating adds a second glossy layer. A fill light reveals the dark side; too much removes depth. The rim light catches edges. Orthographic projection keeps parallel lines for an illustration; perspective introduces natural size changes with depth. The procedural brushing/wood textures are approximations, not measured material scans.

**Try this:** select Cylinder & pins, change roughness from `0.29` to `0.55`, then rotate the studio reflections. Keep its color fixed and watch how the finish changes. Add a note describing the preferred result and save a study.

Implementation: `src/studio-config.js` defines validated settings and presets; `src/studio.js` binds accessible vanilla controls to those settings; `src/main.js` applies them to real Three.js materials, lights, camera and groups. `src/studio.css` lays out the workbench. `vite.config.js` and `studio-server.js` provide a loopback-only local save endpoint with input validation and atomic replacement of the current study. No library was added. Editing presets or shape ranges starts in `studio-config.js`.

Verification commands (use an existing personal Playwright installation):

```sh
node --test tests/*.test.js
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/studio-browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser-check.mjs
npm run build
```

Studio browser evidence: `verification/studio-desktop.png`, `verification/studio-mobile.png`, `verification/studio-report.json`. The server integration test saves into a temporary directory and verifies roundtrip/archives plus rejected invalid/cross-site writes. Browser save tests inspect the submitted JSON/PNG without replacing your saved study. Browser tests cover material isolation, finish and style recipes, actual lights, projection/AO compatibility, finite geometry after rebuild, assemble, import/export, draft restore and keyboard/mobile layout. Visual approval and human listening remain Ariel’s checks.

## What is here

- A wooden base, contoured steel bed with a relief opening, bearing side plates, worm-shaft lugs, black cylinder caps and wheel, brass pinned cylinder, slotted comb, threaded fasteners, rounded wire crank, and metal grip.
- Drag the grip in circles. Counterclockwise from the initial view plays forward; clockwise silently rewinds. Clicking or holding still does not turn anything. Release stops immediately; existing notes decay.
- Drag elsewhere to orbit, including underneath. Scroll and pinch zoom are disabled; dragging only rotates the view. Studio camera controls still allow deliberate framing adjustments. Reset view restores the camera without resetting the mechanism.
- Focus the canvas and tap right/up to advance, left/down to rewind. Key repeats are ignored: holding a key does not run the mechanism. Escape ends a grab.
- Sound unlocks on a grip grab, arrow key, or sound-button click. The sound button mutes future strikes; existing notes finish decaying.

## Reference fidelity

Six original reference files were found: `src/assets/IMG_3613.HEIC` through `IMG_3618.HEIC`. The 18 posed photos from the later object capture were also inspected. Originals remain unchanged and are not included in the built website. Local contact sheets, selected detail crops, camera metadata and the original capture location are recorded in `references/capture-study/`. The failed photogrammetry mesh is not used as geometry.

Ariel supplied a soft ceramic CGI reference, then an industrial product-illustration brief. The live scene now starts with satin brass, distinct steel, warm wood and a cyan grip. The browser studio also includes warm industrial, cool precision, pop chrome and soft ceramic starting looks; the earlier exploded still remains a separate review artifact. The supplied style reference is retained locally in `references/art-direction/soft-ceramic-reference.png`. Neither treatment claims to match the physical materials exactly.

| Photo | Details used |
| --- | --- |
| IMG_3613 | Overall plan, brass barrel beside comb, two large comb screws, black wheel, worm shaft perpendicular to barrel, bent handle |
| IMG_3614 | Bearing outline and hole, raised comb, exposed shaft, bed thickness |
| IMG_3615 | Cylinder proportions, frame end profile, wooden base thickness |
| IMG_3616 | Worm supports, side-wall silhouette and curved bearing profile |
| IMG_3617 | Opposite-side construction and gear placement |
| IMG_3618 | Three underside screws and visible `www.fridolin.de` maker marking |

The second model pass replaced the generic block frame with contoured plates and a relieved bed, made the barrel wider relative to its length, narrowed the tine gaps, added an estimated 18-tine comb, darkened and textured the cast steel, softened the wood grain, rounded the crank bends, and added washers, threaded studs, domed screw heads, and underside details.

**Estimates:** every dimension is relative and estimated by eye. The 18-tine count is a visual estimate, wheel teeth are illustrative, and the 9.6:1 crank-to-cylinder reduction is chosen for interaction (25% faster than the initial 12:1). The photos guide construction and proportions; material colors are art-directed. The warm room lighting in the photos is not calibrated. This is a procedural approximation, not a measured scan or exact replica. The 48-pin melody is an original study, not the physical box’s tune or pin layout. Extra decorative pins are deliberately avoided: every visible pin belongs to a real note event.

## How the mechanism works

`pointer / keyboard → angle increment → cumulative crank angle → gear ratio → cumulative cylinder angle → crossed pins → notes + tine feedback`

- `src/mechanism.js` owns the original melody, pitch lanes, gear ratio, seam-safe delta calculation, and crossing detection. Intervals are `(previous angle, new angle]`, so an exact boundary is struck once. All crossed pins are sorted, including multiple revolutions in one input increment. Reverse updates position without emitting notes; forward turning over a rewound section plays it again.
- `src/model.js` builds the scene graph. Cylinder, wheel, and pins share one rotating parent; crank wire and worm share another. Pin axial positions use the same tine indices as audio. A pin’s stored phase reaches the tine contact line at the same cylinder angle that triggers its note.
- `src/main.js` connects the renderer, camera, lights, model, input, and audio. Raycasting selects an enlarged invisible grip target. The pointer ray intersects a plane perpendicular to the shaft through the grip; its angle around the shaft supplies the increment. OrbitControls is disabled before its pointer handler receives a crank grab. Coalesced samples are used when supplied by the browser.
- `src/audio.js` synthesizes each pluck with three decaying sine partials. There is no recording and no independent musical clock. Notes start when the mechanism crosses pins, and at most twelve plucks sound simultaneously. Audio is never queued while unlocking or while the page is hidden.
- Pointer release/cancel/lost capture, visibility changes, and window blur clear the grab. There is no inertia or frame-based crank animation. Reduced-motion preference removes tine vibration; deliberate crank movement remains direct, and a brief tine highlight remains available.

## Learning notes

| Milestone | What changed | How it works | One setting to try |
| --- | --- | --- | --- |
| 1 · Model | Photo-based geometry, materials, lighting, orbit | A scene graph groups parts; geometry supplies shape, materials respond to the environment and lights, and the camera supplies viewpoint | Move `key.position` in `src/main.js` to see how light reveals metal |
| 2 · Input | Circular grip drag, coupled wheel and cylinder, separate orbit | A ray hits the grip; ray-plane intersection gives an angle; small angle deltas accumulate without a seam jump | Change `GEAR_RATIO` in `src/mechanism.js` from `1 / 12` to `1 / 8` |
| 3 · Sound | Pin-driven plucks and tine feedback | Forward crossings trigger Web Audio oscillators; their envelopes ring independently after the mechanism stops | Change the first partial’s `1.8` decay time in `src/audio.js` |

Motion principle: immediate hand-to-object response supplies control. Weight comes from scale, gearing, material and sound; easing or coasting would break the hand connection.

## Verification

Evidence is in `verification/`: desktop, mobile, top, back, underside and alternate-view screenshots plus `report.json`. Screenshots are local development evidence, not uploaded assets.

- `npm run build`: passes. Vite reports a non-blocking large-chunk warning for the Three.js bundle.
- `node --test tests/mechanism.test.js`: five checks cover seam crossings, still/reverse input, fast multi-lap movement, exact boundaries including negative angles, and invariance under irregular input segmentation.
- `tests/browser-check.mjs`: headless Chromium exercises actual pointer circles, idle hold, release, cancel, lost capture, blur, orbit separation, keyboard, voice cap, and 390px layout. It records console/page errors and screenshots. Test instrumentation is injected only into the test browser response, not production code.
- Offline Web Audio renders the actual pluck function and measures nonzero output, the expected C5 fundamental (523 Hz measured), natural decay, and a silent finished tail. **Audio was tested as a signal, not heard by the agent. Human listening and tactile judgment remain open.**

The browser script uses an already installed Playwright; it is deliberately not an app dependency:

```sh
# Point to an existing Playwright module if it is not otherwise resolvable.
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser-check.mjs
```

Desktop computer-use was unavailable in this session; automated browser verification used locally installed headless Chromium. Safari, Firefox, physical touch devices, speaker output, and a hidden-tab/resume cycle have not been separately verified. The code clears input on visibility changes, but that specific browser lifecycle check remains manual.

## Limits and next steps

1. Compare the model with the physical object in hand. Ruler measurements would improve fidelity beyond the current image-based estimates. Confirm the estimated tine count and the real tune if they matter.
2. Listen locally while cranking slowly, quickly, stopping, and reversing. The pluck is a synthesized approximation; sound character needs Ariel’s judgment.
3. An edge-on crank plane is geometrically ill-conditioned: orbit to face it or use keyboard controls. Pointer movement over more than half a revolution between delivered samples is inherently ambiguous; normal sampled circles and multi-pin crossings are covered.
4. Very fast multi-pin events in a single input sample are dispatched in angle order at the current audio time rather than queued into the future. Closely grouped events may sound together. This preserves stop behavior and avoids delayed catch-up notes.
5. Ariel supplied the ceramic reference and exploded industrial-CGI brief. Both have concrete local review artifacts; the final preferred material treatment and presentation remain open.
6. Micropad is later scope: inspect hardware/protocol/mappings, back up configuration, obtain confirmation, then use a spare layer only. No hardware files were inspected or changed.
7. Microphone transcription is now an experimental Pitchy trial, described below. Full multi-instrument song transcription remains outside the implemented scope.

## Files changed in this session

Existing: `index.html`, `src/main.js`, `src/style.css`. Later passes also update `src/model.js`, `tests/browser-check.mjs` and this README.

Added: `src/model.js`, `src/mechanism.js`, `src/audio.js`, `tests/mechanism.test.js`, `tests/browser-check.mjs`, `README.md`, and the evidence files in `verification/`.

Package manifests, lockfile, `.npmrc`, favicon, and reference originals were preserved. No Git commits, remote, or publish action was created. The original scene and stylesheet were also copied to `/tmp/music-box-original-main.js` and `/tmp/music-box-original-style.css` before editing; these temporary copies are not durable backups.


## Photo and art-direction pass — November 7, 2026

The new photos corrected a significant layout error: the handle protrudes on the **cylinder side**, with the comb on the opposite side. The frame now includes the third shaft support, front mounting boss and central fastener; the comb is longer and the body proportions are narrower. All dimensions remain visual estimates. Pin geometry was rephased by π so the back-facing comb still meets each pin exactly at its audio event. Browser verification checks the actual tip-to-tine distance for every pin, in addition to testing motion and sound.

The live clay treatment uses rough, nonmetallic materials, rounded edges, diffuse environment lighting, soft variance shadows, a contact-shadow gradient and Three.js SSAO. The render loop redraws while input or tine feedback changes; it skips idle scene rendering. Postprocessing uses installed Three.js addons, with no added dependency. Orbit and crank movement remain direct, without coasting. Camera/framing and pointer tests account for the inset scene viewport. Mobile retains a compact accessible reset-view button.

The model exposes base, frame, comb, cylinder and crank groups. These are the same assembled parts used by the standalone illustration; the illustration repositions those groups and restyles their named materials rather than using a generated substitute.

### Text-free exploded illustration

`verification/product-illustration.png` is a 1536×1152 local Three.js render of the actual model, with an orthographic three-quarter camera, separated components, satin brass, steel, warm wood and a restrained cyan grip. The page UI and underside maker mark are omitted from this still. The interactive assembled scene remains available separately. Illustration verification is in `verification/product-illustration.json`.

Recreate the still while the local Vite server is running:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/render-illustration.mjs
```

No photos were uploaded to an image-generation or rendering service. The render script temporarily changes its own browser response only; it does not alter the running user's scene or write an exploded state into the production app. This is an art-direction study, not a measured disassembly diagram: illustrated spacing is chosen for readability.

Learning note: **what changed** — photo-guided layout and a softer CGI finish, plus an exploded review image. **How it works** — scene-graph groups keep the mechanism editable, while material roughness and ambient occlusion control the surface feel and contact depth. **Try changing** — use the browser Studio’s per-part roughness control; it now overrides construction defaults.

Final checks: `npm run build`, five Node mechanism tests, the headless browser interaction/audio-signal suite including actual pin/tine contact, and the local illustration renderer. The usual non-blocking Three.js bundle-size warning remains. Human listening and final visual approval are not implied by automated checks. `verification/clay-pass/` preserves the earlier assembled-style screenshots and results; current checks are in `verification/report.json`.

Scene-studio files changed: `index.html`, `src/main.js`, `src/model.js`, `tests/browser-check.mjs`, `README.md`. Added `src/studio.js`, `src/studio.css`, `src/studio-config.js`, `studio-server.js`, `vite.config.js`, `tests/studio.test.js`, `tests/studio-browser.mjs`, and `verification/studio-*.{png,json}`. No package or lockfile changes.

### Pop chrome palette

Choose **Studio → Starting look → Pop chrome** for electric-blue polished metal, a warm gold cylinder, chrome comb/shaft/hardware, ink-blue gears, a coral lacquered base and pink coated grip. A warm ivory background, neutral color response and restrained shadows support the stronger colors. The base uses a painted finish; proportions remain photo-based. Existing defaults and saved studies are preserved. Try the cylinder roughness or frame color independently. Verified with the build, seven Node tests and a Chromium preset/render check; screenshots and report are `verification/pop-chrome-*`.

### Pearl & prism palette

Choose **Studio → Starting look → Pearl & prism** for the supplied pale futuristic CGI reference: pearl frame/base, polished silver, champagne cylinder, cyan grip and muted lavender gears. The main/fill/rim lighting is warm white/cool mint/soft lavender, with softer restrained shadows. Colors and reflected light carry this reference; the preset does not introduce glass transmission or glowing geometry. Source saved locally as `references/art-direction/pearl-prism-reference.png`. Build and seven Node tests pass; Chromium preset/render evidence is in `verification/pearl-prism-*`.

Ariel’s shared teal/coral studies are preserved as `studies/ariel-teal-coral-view-1.json` and `studies/ariel-teal-coral-view-2.json`. View 2 is the latest, with a lower, more side-on camera; its scene preview is `studies/ariel-teal-coral-view-2.png`. Import either through Save & share. These retain the original exported study name and do not replace the app defaults or current study.

### Microphone transcription research

Current agreed capture scope is microphone only, initiated by a user action and the browser permission flow; no tab/system-audio capture. Libraries and tradeoffs are documented in [audio transcription research](docs/audio-transcription-research.md). The research informed the microphone-only Pitchy trial below; Basic Pitch remains the richer, heavier alternative.

### Pitchy microphone trial

In the local editor at **http://localhost:5173/?studio=1**, open **Studio → Tune**. Choose 5, 10 or 15 seconds, press **Record a melody**, and approve the browser microphone prompt if needed. Hum/whistle or play one melodic instrument; **Stop & analyze** ends early and **Cancel** discards the new capture. A song through speakers can be tried, but chords, drums and competing voices can confuse this single-pitch detector. It is not source separation or complete song transcription.

Review detected pitches and their adapted music-box pitches. An automatically suggested whole-octave shift fits the melody to the existing C-major comb; change it with **Octave shift**. Chromatic/out-of-range notes move to the nearest available tine and are counted as adjusted. Remove stray notes; use **Preview arrangement** to hear the synthesized music-box notes at the captured timing, and press it again to stop. Preview is an explicit review player; the installed cylinder still plays only from crank/keyboard rotation. **Build this cylinder** replaces pins and resets rotation to the start. **Restore original tune** restores the original 48-pin study. Starting looks preserve an installed custom tune.

**Save study**, Copy setup and JSON export now include the installed melody. Reload restores it with the design. Audio recordings are not saved/uploaded: only note data enters study settings. Cancel, completed capture, tab hiding and module disposal release the microphone tracks. If permission is pending, Cancel also stops a stream that arrives after the cancellation. Permission denial produces guidance rather than changing the installed tune. Crank input is paused during microphone capture to avoid recording our own plucks; already-active voices are stopped.

How it works: `getUserMedia` → local mono PCM via `AudioWorklet` → Pitchy's McLeod frequency/clarity estimates → confidence/silence gating and stable-note grouping → review/comb adaptation → one shared pin list for geometry and angle crossings. Capture is bounded to 15 seconds and the draft to 128 notes. Analysis yields to the UI in small batches. Original relative onset timing is retained; mechanical plucks decay naturally rather than holding for the detected duration. Very short notes, vibrato, octave errors and repeated notes without a clear gap remain limitations; the current review supports removal and whole-octave adjustment, not a full piano-roll editor.

**Try changing:** lower **Pitch clarity threshold** from 0.90 to 0.85 if quiet humming is missed, or raise it to reject uncertain background pitches. Start with a clear five-second melody, including short pauses between notes.

Dependency: exact `pitchy@4.1.0` (MIT published package), plus its locked `fft.js` dependency. Installation ran `npm view pitchy@4.1.0 version license dependencies --json` and `npm install --save-exact pitchy@4.1.0`; audit reported zero vulnerabilities. No permission to approve unrelated install scripts was granted. The minified app grew from 670.62 KB / 173.12 KB gzip to approximately 690.90 KB / 180.66 KB gzip for this complete feature (not Pitchy alone); the existing bundle-size warning remains.

Files added: `src/transcribe.js`, `src/tune.js`, `src/tune-studio.js`, `src/microphone.js`, `src/microphone-worklet.js`, `tests/transcription.test.js`, `tests/tune-browser.mjs`. Updated: `src/main.js`, `src/model.js`, `src/studio.js`, `src/studio.css`, `src/studio-config.js`, package manifest/lockfile and README. The background-pulse experiment remains reverted.

Verification: `node --test tests/*.test.js`, `npm run build`, and the existing studio/mechanism browser suites. `tests/tune-browser.mjs` exercises actual browser microphone APIs using a synthetic WAV as Chromium's fake input, AudioWorklet capture and Pitchy analysis, preview/stop, exact custom pin/tine correspondence, melody persistence, restoration, permission denial and cancellation (including a late permission result). No physical microphone was accessed in automated tests. Evidence: `verification/tune-report.json`, `tune-review-desktop.png`, `tune-mobile.png`. Real voice/song transcription accuracy, Safari/Firefox microphone behavior and audible speaker quality have not been verified.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/tune-browser.mjs
```

### Physical hold-to-record button

A pearl-colored round 3D button sits beside the music box, with one embossed musical note and a small steady recording indicator. **Hold it and hum; release to create the cylinder.** Recording is capped at 10 seconds. This is the simple default path: fixed clarity threshold 0.90 and automatic whole-octave adaptation, no preview/build confirmation required. The advanced Studio → Tune trial remains available. Only one cylinder is installed; no cylinder collection was added.

The cap presses down into a recessed socket while held, then returns smoothly on release. The floor has an actual opening matching the base, so the cap can sink below the ground into a visible well. The indicator is steady rather than pulsing. A successful take replaces the pins, assembles the mechanism, resets rotation and assigns the cylinder a different color from a small curated palette. The status says “New cylinder”; a failed/empty take leaves the installed tune and color unchanged. Microphone capture and Pitchy remain entirely local. Existing study/draft saving retains the currently installed melody/color.

Permission is requested on the press. If you release before capture actually starts, it cancels safely; a late granted stream is stopped. Allow permission, then hold again if needed. Pointer cancellation, lost capture, Escape, window blur and tab hiding discard the take. Normal release analyzes and installs it. At the 10-second limit capture ends automatically. The camera cannot orbit while the physical button is grabbed. Concurrent recording through the advanced Tune panel is guarded.

Keyboard: focus the canvas and hold Space or Enter, then release; Escape cancels. A separate focusable accessible button offers the same keyboard interaction. Reduced motion uses an immediate down/up state instead of the travel animation; recording feedback remains. The background stays steady. The button has a saved scene position and stays fixed while orbiting or changing the camera. Older studies without button settings get an initial placement beside their saved camera view. Narrow orthographic views fit the instrument and button horizontally.

Learning: raycasting distinguishes the button from the crank; pointer capture keeps the hold active even outside its outline. One press/release state drives cap depth and microphone lifecycle. The cap uses an exponential approach to its target depth, so releasing midway reverses smoothly without bounce. The raised note is geometry, not a flat text label. Try the Press depth control in Studio or the return damping in src/record-button.js when tuning the feel.

Added `src/record-button.js` and `tests/record-button-browser.mjs`; updated main input/render handling, Studio/Tune recording guards and page styling. No additional dependencies. Build and ten Node tests pass. Chromium tests exercise actual raycast holds with a synthetic microphone, press depth, automatic note/pin replacement and color change on release, camera separation, cancel preservation, late permission cleanup, keyboard/reduced-motion and mobile layout. Existing crank/audio-signal and advanced Tune suites also run. Evidence: `verification/record-button-{idle,held,created,mobile}.png` and `record-button-report.json`. Automated tests do not access a physical microphone; human feel/voice and physical-touch-device validation remain manual.

### Button placement, finish and recess light

Open **Compose → Record button** to change X/Z position, height, rotation, size, button/rim colors, cap metalness/roughness, idle/recording note colors and light brightness. **Reset button placement** positions it beside the instrument for the current view. Coordinates are in scene space and remain fixed while orbiting; moving the camera does not undo your placement. Starting looks preserve button settings. Save study, Copy setup, JSON import/export and browser drafts include them in the version-1 `recordButton` object; older studies receive defaults.

The separate indicator dot has been removed. The embossed music note is the LED label: **green immediately on press/hold, red immediately on release or cancellation**. Emissive material makes the note self-lit and a small local light spills its color onto the cap. Both states remain steady; there is no pulsing animation. The LED now has a local bright core and soft optical halo. The label is press feedback; status text separately confirms permission waiting and actual microphone capture. Colors can be art-directed independently through the two note-light color controls.

Learning: geometry supplies the raised note, emissive material supplies the lit label, and a nearby point light makes the illumination affect the cap. Try **Note light brightness** from 0.9 to 1.5; 0 disables emitted light while retaining the label’s state color.

Changed `src/studio-config.js`, `src/studio.js`, `src/main.js`, `src/record-button.js`, `tests/studio.test.js` and `tests/record-button-browser.mjs`; no dependencies added. Build and eleven Node tests pass. The record-button Chromium suite verifies actual position/color/brightness controls, green during synthetic microphone capture and red after release/pending-permission cancellation, plus persistence across reload and the existing hold/cancel/keyboard flow. Existing studio and crank regression suites also run. Current screenshots/report are in `verification/record-button-*`. Physical microphone/real-device feel remain user-tested; automated capture uses synthetic audio.

Button timing refinement: the note light updates synchronously from the hold state, before waiting for microphone setup or cap travel. Release restores red before transcription begins. The browser test checks green while permission is pending and red after release. The latest shared 22-note tune, camera and button finish/position are preserved in studies/ariel-record-button-tune.json.

### Earlier LED optical treatment (superseded by ground uplight)

The music-note label now combines a brighter emissive body, a color-matched luminous inner diffuser, two soft colored edge halos and stronger nearby light spill. The inner mask is eroded from the same note shapes, leaving a colored edge around the bright center. This is a local optical effect rather than whole-scene bloom, so metal highlights/background remain unaffected. Brightness is still **Compose > Record button > Note light brightness**; it scales core/halo/spill together, and 0 disables emitted illumination. Existing saved brightness values remain valid, including the latest shared study at 0.45.

Halo/core planes are excluded from raycasting, shadow casting and the SSAO normal/depth pass so they cannot become click targets or solid square occluders. The installed Three.js SSAOPass visibility hook is specialized in src/main.js to hide optical meshes for that pass and restore them afterward. No render dependency was added. Bright/colored label state still changes synchronously on press/release with no pulse.

Changed src/record-button.js, src/main.js, Studio hint text and record-button browser checks. Build and eleven Node tests pass. Browser checks cover the new core/halo meshes, brightness and zero-light behavior plus existing button capture/cancel/color timing. Red/green closeup review images are verification/led-label-red.png and led-label-green.png, rendered using the latest shared study; user visual approval remains open. Existing crank/audio regression is also run.

### Saved setup recovery and saturated LED correction

The last shared design is now installed as **studies/current.json**, with an archived JSON/PNG, and appears as **Starting look > Your saved setup**. It includes the coral backdrop, 22-note tune, camera, materials and exact button position/colors/finish. Earlier shared-study files remain intact. Selecting a style is now a preview: it does not replace the browser draft, including when orbiting that preview. Editing a preview makes it the current working draft. **Save study** explicitly saves it as the new project snapshot; **Your saved setup** restores that snapshot after exploring other styles.

The underlying refresh bug was a delayed localStorage write, which could be canceled by a quick reload. Writes are now immediate. Preset selection also previously overwrote the draft; previews now skip persistence. Project and browser draft loading are independent, so a failed project load does not prevent recovering a valid draft. The Save request snapshots the settings it sends, so the restore entry always represents what was actually saved.

The note no longer uses a white-hot inner layer: its diffuser and emissive body use the selected red/green, with reduced white reflections and softer halos. Instant press/release timing remains.

Regression: tests/studio-persistence-browser.mjs first failed on immediate refresh, style-preview refresh and missing saved-setup restore; all three now pass, including Save updating the restore snapshot. verification/persistence-report.json records the result. A fresh-browser check against the actual saved project passed exact JSON equality, style/restore and reload; verification/shared-study-restore-report.json and restored-shared-study.png show the installed design. Build, eleven Node tests, Studio and record-button browser suites pass. Default mechanism browser tests mock an empty saved study to stay isolated from the user's custom cylinder. No dependencies added.

### Deep well, embossed note and ground-uplight controls

Current direction follows the two new references in references/art-direction/{ground-uplight-reference,deep-button-well-reference}.png. The music note is now a plain unlit emboss. State lighting comes from a small source on the ground near the recess, with a soft floor wash and point-light spill onto the button. It still switches green at press and red at release, without pulsing. Earlier LED note/core/halo effects were removed.

Open **Compose > Record button**:

- **Base & floor cut:** base width, depth, well depth/press travel, independent base X/Y/Z offsets, well color, base metalness and roughness. The main X/Y/Z/size controls above move/scale the entire button; base offsets move the socket relative to its cap. Large offsets can deliberately misalign the parts; there is no collision solver.
- **Ground light placement:** light X/Y/Z position, uplight power, reach, floor-wash width and depth. Recess idle/recording colors and brightness are below. Power controls the local uplight; brightness also controls the visible lamp/wash. The light source and wash move with the position controls.

The circular well has a curved lip, inner walls and bottom. An opaque, background-colored ground surface plus the existing shadow layer use matching elliptical openings; the cut follows base dimensions, position, rotation and scale. The old gradient contact shadow is also cut away over the opening. The scene floor uses moderate bounds to avoid precision seams around the cut in SSAO. Press travel is limited by well depth, so the cap drops below ground at the default depth. Raising the complete base clear of the floor closes the floor opening. These remain stylized relative dimensions, not measured construction.

All new fields are in the version-1 recordButton settings and are validated/saved/copied/exported/autosaved. Older studies receive defaults, preserving their existing placement, colors, melody and other settings. No dependency or saved-profile reset. Try increasing well depth from 0.15 to 0.22, then adjusting Light Y and Uplight power to compare grazing versus higher illumination.

Files changed: src/record-button.js, src/main.js, src/studio.js, src/studio-config.js and relevant tests. Eleven Node tests/build pass. Record-button browser checks verify unlit emboss, below-ground press, floor cut resizing with the base, independent base offset/light placement and reload persistence, plus hold/release/cancel behavior. Persistence and original crank/audio-signal suites pass. Current closeups: verification/recess-idle.png and recess-held.png; record-button-report.json and persistence-report.json contain checks. Automated capture remains synthetic; real-device feel and final art direction are for Ariel to judge.

### Near-flush resting button and independent press depth

The current default cap sits almost on the table, with a close-fitting circular socket rather than a broad exposed well. Defaults: base width/depth 0.52, cap-face resting height 0.018 and press travel 0.04 (relative scene units, not measured dimensions). Much of the cap body is already recessed at rest; a press moves it slightly farther down. The music note remains an unlit emboss and ground/recess state lighting is unchanged.

**Compose > Record button > Base & floor cut** now separates **Well depth**, **Resting height above floor** and **Press depth**. Making the cavity deeper no longer increases the press travel. Actual travel is capped only to prevent the cap bottom intersecting the well floor. These settings save/export/autosave with the study.

Older profiles without the new resting/press fields receive the new low resting height and short travel. Their former default base dimensions (exactly 0.7) migrate to 0.52; explicitly different widths/depths are kept. Position, colors, tune and other settings are preserved. The floor cut and bezel follow the tighter dimensions.

Changed record-button geometry/defaults/validation, floor cut radii, Studio controls and tests. Twelve Node tests and build pass; record-button browser tests check near-flush resting height, short travel independent of a deeper well, below-floor depression, persistence and existing capture/cancel behavior. Migration tests retain custom widths. New reference: references/art-direction/flush-button-height-reference.png; closeups: verification/flush-button-idle.png and flush-button-held.png. Human feel/final preference remains for Ariel to judge.

Latest user-shared setup: studies/ariel-flush-button-study.json, installed as studies/current.json via Save study. Includes the 22-note melody, 0.5-wide/deep base, 0.09 well depth, 0.018 resting height, requested 0.04 press depth, ground light power 1.59 and the updated close camera. Use Starting look > Your saved setup to restore it. Older shared setups and dated saves are retained. The existing bottom-clearance rule can limit actual travel in a shallow well.

### Continuous rim-light indicator

The tiny ground indicator dot is removed. A thin continuous circular light now sits along the container rim, attached to the fixed base so it does not travel with the cap. It follows the base size, offsets and rotation. Green appears immediately on press and red on release; the music note remains a plain unlit emboss. Existing idle/recording colors and glow settings are retained. Studio labels are now **Rim light - idle / recording / brightness**. Ground light position controls still move the surrounding light spill, while the visible ring stays attached to the container.

Changed src/record-button.js, Studio wording and record-button browser assertions. Build, twelve Node tests and the full record-button browser suite pass: no dot mesh, a complete ring parented to the base, fixed ring height during cap travel, immediate state changes, capture/cancel and persistence. Visual checks with the latest shared setup: verification/rim-light-idle.png and rim-light-held.png. No dependencies or saved-study values changed.

### Approved default view

The latest framing and visual setup from studies/ariel-default-view.json is now the bundled default: orthographic azimuth -47.770876, elevation 33.826525, zoom 1, authored button position/finish/light settings, copper-colored cylinder and the off-white studio scene. Reset view returns to this camera. The complete shared snapshot is installed as studies/current.json (with dated JSON/PNG archive) and restores through Your saved setup, including the single MIDI-88 note present in the provided JSON. The bundled fallback still uses the original demo melody; recorded/saved tunes continue to restore normally. Earlier saved studies remain.

Updated src/studio-config.js visual defaults and default-sensitive tests. Build and twelve Node tests pass. A fresh browser with project storage absent matched the supplied visual configuration exactly (excluding the deliberately retained fallback demo melody); Reset view returned to the same camera. Actual project save/load/style-restore/reload checks passed exact snapshot equality. Evidence: verification/default-view.png and default-view-report.json, plus shared-study-restore-report.json. Record-button and mechanism browser checks also run.

### Default song enabled

The approved view now starts with the existing original 48-note demo melody. The previous saved snapshot's single-note recording was the reason it sounded like no full demo was installed. studies/ariel-default-song.json is installed as studies/current.json and restores through Your saved setup; older snapshots remain. `melody: null` selects the built-in PINS sequence in src/mechanism.js. This is an original study, not the physical box's tune or a named commercial song.

The demo plays only when the crank/keyboard turns the mechanism. Pressing Record does not erase it; a successful take replaces it on release, while a canceled, denied or unclear recording leaves the installed tune intact. A replacement is retained in the browser draft across refresh, and Save study makes it the saved project snapshot. Restore original tune in Studio > Tune brings the demo back.

No app-code change was required: the existing replacement logic already had these rules. Saved the default-song setup through the real local Save endpoint, verified fresh load/style-restore/reload exact equality, and updated the recording browser test to start from the 48-pin demo, check it remains during capture, then verify successful replacement.

### Falling felt music notes

Each forward pin crossing now spawns a pastel 3D music note that drifts down from above, makes a small soft bounce, and rests on the floor. The material combines rough clay-like shading, cloth sheen, procedural bump grain and short geometric fibers for a tennis-ball/felt finish. Shapes share geometry/materials; no physics engine, asset download or new dependency was added. A bounded pool retains up to 100 notes, reusing older ones as you continue playing.

**Compose > Falling music notes** controls enable/disable, size, fall speed, sideways drift and bounce, plus **Clear fallen notes**. Parameters are saved with the design and retained while previewing different styles. Runtime note positions are decorative and reset on reload; they are not part of the saved tune.

What changed: playful note drops around the instrument, including nearer/farther landing locations. How it works: the same angle-driven pin event triggers sound/tine feedback and the drop; a time-based descent approaches a slow terminal speed, a decaying bounce settles exactly, and a gentle rotation lays the note down. Landing candidates avoid the mechanism/button footprints and prefer visible floor space. This is art-directed motion, not a collision simulation. Notes remain noninteractive so orbit/crank input works through them. Try **Fall speed = 0.7** for a slower helium-balloon descent, then compare bounce 0.06 versus 0.12.

Holding still, reversing or pausing input adds no notes. Already-spawned notes continue falling after the crank stops. As with tine highlights, pin events still produce visual feedback while sound is muted; the explicit Studio audio preview does not create pin-driven drops. Very fast input is bounded by the pool rather than queuing delayed spawns. Reduced motion clears/suppresses this decorative effect while leaving direct crank input and existing sound/tine state feedback. Hidden-tab time is not accumulated into a catch-up simulation. Rendering returns to idle after all active notes settle.

Added src/falling-notes.js, tests/falling-notes.test.js and tests/falling-notes-browser.mjs; updated main event/render loop, validated settings and Studio controls. Fifteen Node tests and production build pass. Dedicated Chromium checks cover pin-to-drop coupling, idle/reverse, felt materials/fibers, landing, bounded pool, reduced-motion variants, clear/enable controls, mobile layout and noninterference with orbit. The mechanism suite uses reduced motion to isolate its control/audio checks; normal decorative motion is tested in the dedicated suite. Existing persistence checks also run. Evidence: verification/falling-notes-{airborne,landed,felt-detail,mobile}.png and falling-notes-report.json. Final motion/texture taste and physical-device performance remain for Ariel to judge.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/falling-notes-browser.mjs
```

### Falling note shape family

Compose > Falling music notes > Note shapes now offers Mixed notes (default), Quarter notes, Eighth notes, and Paired eighth notes. The shapes share fuller tilted oval heads and rounded stems; the eighth note has a filled, curved flag and the pair has a rounded joining beam. Each retains the existing felt finish and unchanged descent/drift/bounce timing. The choice affects new drops only and is saved with the design. Old studies default to Mixed notes. Decorative shapes do not represent detected note durations or change the music.

How it works: three shared geometry/fiber sets are reused by the existing bounded pool. Mixed mode cycles through them. Each silhouette supplies its own thickness for floor clearance, so settled notes lie on the surface. Try a single shape to compare silhouettes, or Mixed notes for variety.

### Live note palette and continuous joins

Studio > Compose > Falling music notes > Note colors offers a six-color palette or One color mode, with native color pickers and hex entry. Both falling and landed notes recolor immediately, including their lighter felt fibers and sheen. These settings use the existing browser draft and Save study flow; old studies receive the original pastel palette. Scene lighting still affects the rendered colors.

Each note is now one continuous beveled silhouette rather than intersecting capped tubes, heads and flags. This removes protruding joint caps and the seams where the old separate surfaces overlapped. The quarter/eighth/paired choices, soft texture and falling motion remain. Try One color to compare shape shading, then switch back to the editable six-color palette. No new dependencies.

### Slim notes with varied, peaceful landings

Note thickness is 0.028 scene units instead of 0.048 (about 42% thinner). After trying a more forceful floor-contact/tip-over response, Ariel preferred the original peaceful float and soft bounce. That motion is restored. There is no impact tumble or rigid-body simulation.

Each new note varies its descent duration (3.8–6.3 seconds at speed 1), starting tilt, final rotation, sideways sway rate, point at which it begins/finishes turning flat, bounce height and settling speed. Drops still start immediately on the pin crossing; no delayed spawn queue is used. The end result keeps the calm styling while avoiding identical timing. Floor clearance follows the rotated shape bounds. The bounded pool, color controls, reduced-motion handling and mechanism coupling remain.

What changed: slim shapes with calmer, less synchronized falls. How it works: the original analytic descent and decaying bounce are combined with per-note randomized motion parameters. Try Soft bounce at 0.06 versus 0.12, or Fall speed at 1 versus 1.2. These are art-directed decorations rather than a collision simulation. No new dependencies.

### Note sheen and fiber brightness

Compose > Falling music notes > Note colors includes Sheen (0–1) and Fiber brightness (0–1). Sheen reduces the pale fabric reflection independently of the bump texture and fibers. Fiber brightness blends the short fibers from the chosen base color at 0 toward white at 1. Both update existing and new notes immediately and save with the design. Defaults of sheen 1 and fiber brightness 0.28 preserve the previous appearance, including for older studies. Lighting/exposure/tone mapping still affect the rendered color; these controls do not promise an exact screen match to the hex swatch.

Try sheen 0.25 and fiber brightness 0.1 for richer colors with the felt detail intact. Toggling sheen through zero updates the material shader correctly. Build and 16 Node checks pass; expanded falling-notes browser checks cover live material updates, new drops, shader switching and refresh persistence. No dependencies or motion changes.

### Notes enter from above the viewport

Spawn positions now come from the current camera frame instead of a fixed world height. A screen-space point above the top edge is unprojected at the landing depth, then checked against all corners of the complete note/fiber bounds. The calm descent follows that camera-plane lift down to its existing landing position; this also supports near-overhead views where raising world Y alone does not move an object above the screen. New drops use the current camera/zoom/viewport. Existing airborne notes keep their paths when the camera moves. Durations, soft bounce and note/pin coupling remain unchanged.


2026-11-08: The standalone bouclé heading experiment was reverted at Ariel’s request. The original Music box heading, eyebrow and white header bar are restored. Falling-note appearance, controls and above-viewport entry remain.

2026-11-08: Disabled OrbitControls zoom for mouse wheel, trackpad and pinch gestures. Drag-to-orbit, crank input and explicit Studio camera/framing controls remain. Removed the scroll-to-zoom instruction.

### Crank interaction guide

A compact, shaded 3D circular arrow sits around the crank in its turning plane, with no words. It rotates slowly on load to suggest turning, without driving the crank or playing notes. The first deliberate angle increment (pointer or keyboard, either direction) releases the arrow: it falls, turns flat, makes a small settling bounce and stays on the floor until reload. Orbiting or simply grabbing/holding does not release it. Reduced motion keeps the guide static and replaces the drop with a brief opacity-only fade. Reset view does not restart the guide; reload does. Existing accessible instructions remain.

src/crank-hint.js owns geometry, material, attachment/spin and the one-time release state. Idle rotation changes a transform, not the stored starting angle or geometry. Floor clearance is calculated from the rotated bounds; shadows/AO switch on for the falling/landed physical piece. This is an art-directed drop, not full collision physics. No new dependency.

### Crank arrow design controls

Studio > Compose > Crank arrow edits enabled state; position XYZ relative to the crank; rotation XYZ; overall scale; circle radius; arc length/start angle in degrees; stroke thickness; round, flush butt or extended flat caps; triangle, chevron, cone or no arrowhead; independent head length/width/depth; satin/polished/matte finishes; color and opacity. Arc length changes how much of the circle is drawn independently of its diameter or the overall scale. Head depth applies to the beveled triangle; cone/chevron use their own profiles.

Opening the section shows the arrow at its authored crank position and pauses idle rotation for precise editing, even after it has landed. Leaving the section, switching tabs or closing Studio returns to the idle spin, interrupted drop, landed pose or reduced-motion dismissal; this editor preview is runtime-only and never saved. All design values are validated, retained through style previews, kept in the browser draft and included in Save study JSON. Older studies receive the default arrow design. Geometry rebuilds/disposes only when shape parameters change; placement/material edits reuse it. No new dependencies.

What changed: an adjustable physical arrow and temporary editing preview. How it works: arc angle, radius and tube cross-section are independent, then a separate transform places/scales the complete guide relative to the crank. Try Arc length 180 versus 288 without changing Circle radius. Build and17 Node checks; expanded crank-hint-browser checks live position/thickness/arc updates, caps/heads, preview after release, style preservation, refresh persistence and normal/reduced motion behavior.

### Approved rotating-arrow study

Installed studies/ariel-rotating-crank-arrow.json through the real Save study UI as studies/current.json, with dated JSON/PNG archives. It contains Ariel’s provided nine-note melody (transpose 36), exact palette/button/material/light settings, low-angle camera (-29.13052 azimuth, 12.23129 elevation), base width 1.615/thickness 0.195 and authored arrow (.01/.16/.2 position, .75 scale, .21 radius, .013 stroke, 179-degree arc, -36 start angle, matte finish). New motion defaults fill in idleSpeed 18 degrees/second and fallDuration 1.1 seconds.

Compose > Crank arrow includes Arrow speed · degrees/second and Drop duration. Arrow speed was previously labeled Idle rotation. Set idle speed to 0 to stop the invitation spin. The guide never changes the actual crank/cylinder angle; only direct input does. Hidden-tab time is not queued. The release drops from its current world pose with a gentle turn, floor clearance and small decaying bounce, then stops rendering when settled (unless other notes are still moving). Reduced motion stays static and fades without translating. Existing geometry/material/placement controls and temporary preview remain.

What changed: a slow idle invitation and a physical release, plus the approved study applied. How it works: idle, falling, landed and reduced-motion dismissal states choose which transform is displayed; the existing angle-increment entry point triggers release once. Try idle speed 12 versus 18, or drop duration 1.4 versus 1.1. Build and17 Node tests pass. Chromium tests verify spin without mechanism movement, held/orbit behavior, first-turn drop/floor rest, reduced alternative, live design controls, style persistence and reload. Actual Save endpoint + fresh reload exact settings match verified; report verification/rotating-arrow-study-report.json and screenshots rotating-arrow-approved-view.png, approved-arrow-falling.png, approved-arrow-on-floor.png. Human motion taste and physical-device performance remain for Ariel to judge.

### Upward crank and faster transmission

The handle now starts at a visual +90-degree rest offset, pointing up, while the cumulative mechanism angle and cylinder tune phase remain zero. New/changed melodies reset to that same upward pose; geometry rebuilds preserve the current turn plus its visual offset. Reset view continues to affect only the camera.

GEAR_RATIO is now 1.25 / 12 (1 / 9.6): the same hand rotation advances the cylinder/tune 25% farther than before. Pointer motion still follows the hand directly, with no autoplay or inertia. The default demo crosses five pins per full crank turn rather than four. This changes transmission, not the independent idle arrow speed. Try GEAR_RATIO in src/mechanism.js to adjust that relationship. Build plus Node and browser checks cover the upward start, actual pointer circles, ratio, stationary/release rules and note crossings.

### Natural clockwise playing direction

Ariel clarified that the physical box plays in the opposite direction to the initial prototype. Clockwise turns when facing the handle now play the melody in its original sequence; counterclockwise turns silently rewind. The crank still tracks the hand one-for-one. cylinderAngleForCrank maps that signed hand angle to forward mechanism rotation, so the same pin geometry and crossing sequence drive sound and felt drops. The upward resting pose and 25%-faster transmission magnitude remain.

The 3D guide’s arc, arrowhead and idle spin now point in the playing direction. Keyboard Right/Up still plays and Left/Down silently rewinds; the footer states these mappings. No saved tune, pin phases, colors or camera settings changed. Build and19 Node tests cover direction mapping plus existing seam/fast-turn rules; browser checks cover physical clockwise pointer circles, reverse/keyboard, sound signal and guide/drop behavior.

2026-11-08: Raised the falling-note pool from 48 to 100 at Ariel’s request, retaining current detail, motion and recycling behavior. The Studio hint uses the shared limit constant. A newly allocated slot stays hidden until a landing location is found, avoiding an origin-position ghost if a crowded view rejects a spawn. Notes recycle once the pool is full; extremely crowded/narrow views may still reject placements. No saved settings or dependencies changed.

### Private source backup and visitor-facing defaults

Source is backed up privately at https://github.com/Ariels713/music-box on feature/initial-music-box. No site hosting/deployment is configured. Install with npm ci and run the local Vite server on port 5173. Source photos, saved studies and verification evidence are included; dependencies, build output and environment files are excluded.

Studio remains in source and is available only through the local development editor URL; it is not constructed in the visitor DOM or bundled into production. The footer has a Get in touch mailto link to **ariel.rodriguez@hey.com** and **@Ariel_Rodriguez** linking to https://x.com/Ariel_Rodriguez. Both are keyboard/touch accessible. The email link opens the visitor’s mail app with only the recipient filled in; no email is sent automatically. Contact links are in index.html.

### Visitor view and retained local editor

Normal localhost and production pages construct only the instrument, recording button and visitor controls. The full Studio source is preserved and loaded dynamically only on the development server with ?studio=1. Production ignores the parameter and omits editor code/CSS; no Studio button or panel is created. This is a presentation/build separation, not an authentication system.

src/scene-state.js keeps saved settings, camera changes and new microphone cylinders working independently of the UI. Production bundles studies/current.json, so the approved design and existing hummed tune survive a static build; it does not call the local Save API. New visitor recordings stay in that browser’s draft. The editor uses the same draft key, so opening the local editor restores the hum and allows Save study to update the project for the next build. The existing saved melody was left unchanged; no original jazz replacement was installed.

Build/19 Node tests and the visitor browser suite cover absent Studio DOM/modules, production ignoring ?studio=1, exact approved melody retained, synthetic microphone capture/reload/editor handoff, the updated email/X links, desktop/mobile layouts and no console errors. Fake audio only; no physical microphone accessed by the tests. A temporary local preview on port5174 was used to test dist; no deployment was performed.

### Sound enabled and personal underside signature

Sound starts enabled. No notes play on load: the first crank/key gesture unlocks Web Audio, and only subsequent physical pin crossings produce notes. The Sound on/off button now reports its enabled state through aria-pressed and toggles consistently, including its first click; muted state has a lighter visual treatment.

The original underside manufacturer URL is replaced by @Ariel_Rodriguez, matching IMG_3618.HEIC’s small, centered dark sans-serif printing directly on wood. It is a transparent, rough-lit surface decal rather than a plaque; rotate beneath the base to see it. Its default visibility is on and local Studio still has the maker-mark checkbox. The approved study only changed that visibility field—its hummed melody is unchanged. The footer retains the clickable X handle and Get in touch links.

Scene drafts now use music-box-scene-v1. The shared reader accepts legacy music-box-studio-v1 drafts without deleting or altering that backup, preserves the captured melody and enables the new personal signature (the old visibility preference described the manufacturer URL). The next edit writes the new key. A later explicit signature visibility choice in the new draft is respected. Node migration checks cover both cases.

Build and21 Node checks pass. Browser checks verify outward-facing underside text, default-enabled sound with no autoplay, user-gesture audio unlock/voices/toggling, visitor/prod/editor separation, fake-mic recording persistence and contact links. Evidence: verification/twitter-underside.png and visitor-defaults-*.png. Audio signal/state tested; not human listening. Local preview testing is not deployment.
