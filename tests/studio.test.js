import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, validateSettings, makePreset, PRESETS } from '../src/studio-config.js'
import { studioMiddleware } from '../studio-server.js'

test('settings are bounded, known fields only, with independent presets', () => {
  assert.deepEqual(validateSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS)
  for (const name of PRESETS) assert.equal(validateSettings(makePreset(name)).name, name)
  const bad = structuredClone(DEFAULT_SETTINGS); bad.geometry.barrelRadius = NaN
  assert.throws(() => validateSettings(bad), /barrelRadius/)
  bad.geometry.barrelRadius = .24; bad.materials.comb.color = 'red'
  assert.throws(() => validateSettings(bad), /color/)
  assert.equal(validateSettings({ version: 1, unwanted: 'discard' }).unwanted, undefined)
  const preset = makePreset('Soft ceramic'); preset.materials.comb.color = '#ffffff'
  assert.notEqual(DEFAULT_SETTINGS.materials.comb.color, '#ffffff')
})
test('local save roundtrip archives preview and rejects invalid or cross-site writes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'music-box-studio-'))
  const middleware = studioMiddleware(directory)
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end() }))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/__musicbox/study`
  try {
    assert.deepEqual(await (await fetch(url)).json(), { settings: null })
    const settings = structuredClone(DEFAULT_SETTINGS); settings.notes = 'Keep this frame; soften the shadow.'
    const payload = { settings, preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=' }
    const post = (body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
    const result = await post(payload); assert.equal(result.status, 200)
    const saved = await result.json()
    assert.deepEqual((await (await fetch(url)).json()).settings, settings)
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'current.json'))).settings, settings)
    assert.equal((await readdir(directory)).length, 3)
    assert.equal((await readFile(join(directory, saved.preview.split('/').at(-1))))[0], 137)
    assert.equal((await post(payload, { Origin: 'https://other.example' })).status, 403)
    assert.equal((await post({ ...payload, preview: 'data:image/png;base64,YmFk' })).status, 400)
    assert.equal((await post({ ...payload, settings: { version: 2 } })).status, 400)
    assert.deepEqual((await (await fetch(url)).json()).settings, settings)
    assert.equal((await readdir(directory)).length, 3)
  } finally { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }) }
})

test('button settings validate, persist and supply defaults to older studies', () => {
  const settings = structuredClone(DEFAULT_SETTINGS)
  settings.recordButton.position = {x: -1.6, y: .15, z: .8}
  settings.recordButton.color = '#cc8844'
  settings.recordButton.glow = 1.4
  settings.recordButton.baseWidth = .9
  settings.recordButton.wellDepth = .22
  settings.recordButton.baseOffset = {x:.03,y:0,z:.02}
  settings.recordButton.lightPosition = {x:.1,y:.02,z:.4}
  settings.recordButton.lightPower = .4
  assert.deepEqual(validateSettings(JSON.parse(JSON.stringify(settings))), settings)
  assert.equal(validateSettings({version:1}).recordButton.idleColor, DEFAULT_SETTINGS.recordButton.idleColor)
  settings.recordButton.position.x = 100
  assert.throws(() => validateSettings(settings), /Button x position/)
})

test('flush button defaults and legacy migration retain deliberate custom widths', () => {
  const old = structuredClone(DEFAULT_SETTINGS)
  delete old.recordButton.restHeight; delete old.recordButton.pressDepth
  old.recordButton.baseWidth = old.recordButton.baseDepth = .7
  const migrated = validateSettings(old)
  assert.equal(migrated.recordButton.baseWidth, DEFAULT_SETTINGS.recordButton.baseWidth)
  assert.equal(migrated.recordButton.restHeight, .018)
  assert.equal(migrated.recordButton.pressDepth, .04)
  old.recordButton.baseWidth = .84
  assert.equal(validateSettings(old).recordButton.baseWidth, .84)
  old.recordButton.pressDepth = .3
  assert.throws(() => validateSettings(old), /pressDepth/)
})
