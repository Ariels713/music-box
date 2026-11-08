# Browser microphone-to-music-box research

Research date: 2026-11-07. Scope: explicit microphone recording through the native browser permission prompt, then local analysis of a short humming/whistling/single-instrument melody. Tab/system capture and audio-file import are outside the current requested scope. This is source/package research, not an accuracy or performance benchmark; no app dependencies were installed and no microphone was activated.

## Recommendation

Start by evaluating **Pitchy** for the monophonic microphone version. It supplies the pitch-detection algorithm we should reuse, with a small JavaScript distribution and a simple frequency-plus-clarity interface. Build only the app-specific recording, note segmentation/review and cylinder mapping around it. Keep **Spotify Basic Pitch** as the richer candidate if its ready-made note events materially outperform that approach on our recordings. Do not implement DSP pitch detection from scratch before trying these.

The ranking below is an engineering recommendation, not a measured accuracy ranking. Trial both on the same short clips before choosing: clean humming, repeated notes, legato pitch changes, pauses, an instrument, and a melody played through speakers into the microphone. A finished song can contain multiple simultaneous sources; recording it through a microphone does not make it monophonic.

## Comparison

| Candidate | What it provides | Browser / integration fit | Why / why not first |
| --- | --- | --- | --- |
| **Pitchy 4.1.0** | McLeod fundamental-frequency detection; `findPitch` returns frequency and clarity for a sample frame | Pure JavaScript, ESM, one runtime dependency (`fft.js`); no model | Best lightweight first trial for one melody at a time. Does not produce complete note-on/note-off events or distinguish every repeated note automatically. [README](https://github.com/ianprime0509/pitchy), [published source](https://github.com/ianprime0509/pitchy/blob/v4.1.0/index.js), [registry](https://registry.npmjs.org/pitchy) |
| **Spotify Basic Pitch 1.0.1** | Polyphonic note transcription, onsets, contours and conversion to timed note events; optional pitch bends | JavaScript/TypeScript, AudioBuffer input, TensorFlow.js plus `@tonejs/midi`; model assets need serving locally | Stronger complete transcription candidate, substantially more runtime machinery. Official guidance says it works best on one instrument at a time; this is not a guarantee of isolating a song's lead melody. [README](https://github.com/spotify/basic-pitch-ts), [event conversion source](https://github.com/spotify/basic-pitch-ts/blob/main/src/toMidi.ts), [registry](https://registry.npmjs.org/@spotify%2Fbasic-pitch) |
| **pitchfinder 2.3.4** | Several classical pitch estimators, including YIN, McLeod, AMDF; sampled frequency-series helper | Browser/Node raw Float32Array input; published CommonJS, no declared runtime dependencies | Useful algorithm comparison alternative. Still frequency detection rather than full transcription; frequency helper uses specified tempo/quantization. Package license metadata is `GNU v3`, less straightforward than Pitchy's published MIT license. [README](https://github.com/peterkhayes/pitchfinder), [registry](https://registry.npmjs.org/pitchfinder) |
| **aubiojs 0.2.1** | Compiled aubio pitch, tempo and onset primitives; published declarations expose Pitch, Tempo and Onset | Async initialization; Emscripten-generated browser/Node module | Could reuse onset detection as well as pitch. Still needs a note-assembly layer. Wrapper MIT branding does not erase embedded aubio GPL notices; inspect the full distribution's terms before choosing. [repository](https://github.com/qiuxiang/aubiojs), [API declarations and aubio notice](https://github.com/qiuxiang/aubiojs/blob/main/index.d.ts), [registry](https://registry.npmjs.org/aubiojs) |
| **Essentia.js 0.1.3** | Broad audio-analysis toolkit powered by Essentia WASM, including pitch and segmentation functions in the inspected distribution | Browser/Node, real-time or offline; WASM initialization and a much broader API | Capable, but a larger toolkit than this feature needs. AGPL-3.0 distribution and more integration surface; not the lightweight first choice. [repository](https://github.com/MTG/essentia.js), [registry](https://registry.npmjs.org/essentia.js) |

Essentia's published `dist/essentia.js-core.es.js` was inspected directly: `PitchYin`, `PitchYinFFT`, `PredominantPitchMelodia` and `PitchContourSegmentation` are present; `Audio2Midi` / `Pitch2Midi` are not. Do not assume every algorithm in the newer [C++/Python algorithms reference](https://essentia.upf.edu/algorithms_reference.html) exists in the older npm browser distribution. Package tarball: [essentia.js 0.1.3](https://registry.npmjs.org/essentia.js/-/essentia.js-0.1.3.tgz).

## Size evidence and maintenance

These are **published npm artifacts**, inspected on the research date using registry metadata and tarballs downloaded into memory. Unpacked package sizes include docs, source, multiple formats or assets. Tarball bytes are compressed package archives. **Neither is the added minified/gzipped Vite browser bundle size.** No production bundle delta, runtime latency or memory benchmark was performed.

| Package | Version publication date | Unpacked package bytes | Compressed tarball bytes | Relevant runtime assets inspected |
| --- | --- | ---: | ---: | --- |
| Pitchy 4.1.0 | 2024-01-04 | 33,090 | 8,745 | `index.js` 18,393 bytes; dependency fft.js 4.0.4 has `lib/fft.js` 13,124 bytes and 6,430-byte package archive |
| pitchfinder 2.3.4 | 2025-12-16 | 228,607 | 53,549 | Multiple detector implementations, no runtime dependencies declared |
| @spotify/basic-pitch 1.0.1 | 2022-08-05 | 1,761,856 | 599,714 | Model weights 742,392 bytes + model JSON 174,537 bytes; excludes the additional TensorFlow.js and Tone MIDI dependency payload |
| aubiojs 0.2.1 | 2022-11-08 | 427,009 | 144,820 | `build/aubio.esm.js` 208,577 bytes; also ships another JS format |
| essentia.js 0.1.3 | 2021-06-24 | 10,143,669 | 2,693,291 | Web WASM 1,987,689 bytes + web glue JS 220,465 bytes + core ES module 323,653 bytes; alternate distributions also included |

Sources: [Pitchy registry](https://registry.npmjs.org/pitchy), [fft.js registry](https://registry.npmjs.org/fft.js), [pitchfinder registry](https://registry.npmjs.org/pitchfinder), [Basic Pitch registry](https://registry.npmjs.org/@spotify%2Fbasic-pitch), [aubiojs registry](https://registry.npmjs.org/aubiojs), [Essentia.js registry](https://registry.npmjs.org/essentia.js). Each registry supplies the exact version's tarball URL and publication timestamp. The `time.modified` field is **not** necessarily the last version's publication time.

GitHub repository metadata on this date reported none of these five repositories archived. Most recent repository push timestamps: Pitchy 2026-11-05, pitchfinder 2025-12-16, Basic Pitch TS 2023-05-23, aubiojs 2023-08-17, Essentia.js 2025-12-10. Pushes are a maintenance signal, not evidence of a tested release or compatibility. Sources: [Pitchy API](https://api.github.com/repos/ianprime0509/pitchy), [pitchfinder API](https://api.github.com/repos/peterkhayes/pitchfinder), [Basic Pitch API](https://api.github.com/repos/spotify/basic-pitch-ts), [aubiojs API](https://api.github.com/repos/qiuxiang/aubiojs), [Essentia.js API](https://api.github.com/repos/MTG/essentia.js).

Important version distinction: **published Pitchy 4.1.0 is MIT**, confirmed by npm metadata and its tarball LICENSE. GitHub main currently identifies **0BSD**; do not describe that as the license of the existing published package. Basic Pitch is Apache-2.0. pitchfinder's package literally labels its license `GNU v3`; its inspected archive did not include a standalone license file. aubiojs includes an MIT wrapper license and GPL-3.0-or-later aubio notices in its declarations. Essentia.js includes AGPL-3.0. These are source observations, not a legal interpretation. [Published Pitchy archive](https://registry.npmjs.org/pitchy/-/pitchy-4.1.0.tgz), [Pitchy main license](https://github.com/ianprime0509/pitchy/blob/main/LICENSE), [aubiojs declarations](https://github.com/qiuxiang/aubiojs/blob/main/index.d.ts).

## What we would still build

The browser already supplies microphone access through `getUserMedia({audio: true})`, with its native permission prompt. No recording framework is required merely to request the microphone. This requires a secure context; localhost is treated as trustworthy. A user-facing start/stop recording flow should release microphone tracks on stop/cancel. [Browser microphone API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [secure-context treatment](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).

Proposed pipeline, adapted to this app:

1. Capture a short mono recording locally, then analyze it after stopping. This avoids making a live pitch-processing loop compete unnecessarily with the Three.js interaction; actual performance remains to be measured.
2. Run an existing detector/transcriber. With Pitchy, retain frequency, clarity, amplitude and frame time. Apply silence/confidence gating, pitch smoothing and segmentation. Repeated same-pitch notes, vibrato and octave mistakes need explicit review rather than assuming every sample is a new pin.
3. Normalize to app note events `{midi, startSec, durationSec, confidence}`. With Basic Pitch, adapt its timed-note outputs to that shape. Keep uncertain events editable.
4. Fit/transpose to the existing comb or flag unplayable notes. The current app's estimated 18-tine pitch set is diatonic C major, MIDI 72–101, so arbitrary chromatic melodies cannot be reproduced unchanged on it.
5. Map onset time to cylinder phase and pitch to tine index. Use the same resulting pin list for both visible geometry and `crossedPins`, preserving angle-driven sound. Note durations help segmentation/review; a physical-style pluck still decays naturally rather than sustaining until a note-off.

Items 2–5 are product glue and mechanism constraints, not reasons to reimplement pitch detection. The current source exports static `PITCHES`/`PINS`; dynamic tunes require making that shared data configurable across `src/mechanism.js`, `src/model.js` and `src/main.js`. `src/audio.js` can retain its synthesized plucks.

## Small evaluation before implementation

Compare Pitchy and, if useful, Basic Pitch on identical user-consented recordings. Measure wrong/missed/extra notes, octave errors, repeated-note separation, onset timing, seconds to process, peak memory and actual Vite bundle/model transfer. Include silence and background noise. Keep original estimated sequence separate from corrected/range-adapted output so users can understand adjustments. This research does not establish that either candidate already handles Ariel's voice or speaker-recorded songs accurately.

No tab/system capture, file-upload workflow, audio uploads, cloud transcription service, hardware changes, visual pulse animation or new sound synthesis is included in this recommendation.

## Follow-up: Only One Music Box Tune Creator

Ariel supplied https://onlyonemusicbox.com/tune-creator/ during the Pitchy trial. Checked the first-party guide and [embedded editor](https://onlyonemusicbox.com/tunecreator/index.html). The documented creation flow places melody and chord notes on a grid, with tempo/resolution, transpose and manufacturing checks. The embedded app exposes MIDI-file import; no microphone recording or audio-transcription control was present in the inspected page. Its Upload command generates a share/order link according to the guide, rather than meaning microphone upload/transcription. This is a reference for a later editable note grid, not a replacement for microphone analysis. Do not adopt its manufacturing Note Index rules as universal constraints for our simulated mechanism.

## Follow-up: Lullaby Converter

Ariel supplied [lullabyconverter.com](https://lullabyconverter.com/). Unlike the manual grid editor above, it advertises an audio-recording/YouTube-input workflow. Its [terms, section 2](https://lullabyconverter.com/terms) describe separation of a recording, melody estimation and sparse music-box arrangement, with editing/playback/export/sharing. The same page states recordings are uploaded, held for up to seven days, and the full arrangement is paid after a free preview. This is a hosted-service workflow, unlike our local microphone-only implementation. These are the service’s descriptions, not independently tested conversion quality. No audio was uploaded, account created or conversion purchased.

The [first-party comparison page](https://lullabyconverter.com/compare/music-box-maniacs-for-song-conversion) says output is for digital listening rather than physical-strip export. It is therefore useful inspiration for separating melody extraction from arrangement/review, but not proof that arbitrary recordings will translate to our fixed comb or angle-driven pins.

Its [acknowledgements](https://lullabyconverter.com/acknowledgements) identify one music-box voice as FluidR3 GM music-box note recordings by Benjamin Gleitzman from [MIDI.js Soundfonts](https://github.com/gleitz/midi-js-soundfonts), under CC BY 3.0. That is a concrete reusable sample-bank candidate for a future voice-quality comparison; no samples/dependency were added. The inspected public pages did not identify the melody-extraction/source-separation library or an open-source conversion API. Do not infer a specific model such as Basic Pitch or Demucs from the marketing description alone.
