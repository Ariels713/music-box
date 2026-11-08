import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateSettings } from './src/studio-config.js'

export function studioMiddleware(directory) {
  return async (req, res, next) => {
    const path = (req.url ?? '').split('?')[0]
    if (path !== '/__musicbox/study') return next()
    const respond = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return respond(403, { error: 'Studio saves are local to this Mac.' })
    const origin = req.headers.origin
    if (req.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== `http://${req.headers.host}`)) return respond(403, { error: 'Open the studio on this local server before saving.' })
    try {
      if (req.method === 'GET') {
        try { return respond(200, JSON.parse(await readFile(join(directory, 'current.json'), 'utf8'))) }
        catch (error) { if (error.code === 'ENOENT') return respond(200, { settings: null }); throw error }
      }
      if (req.method !== 'POST') return respond(405, { error: 'Use GET or POST.' })
      if (!req.headers['content-type']?.startsWith('application/json')) return respond(415, { error: 'Save a JSON study.' })
      let size = 0
      const chunks = []
      for await (const chunk of req) {
        size += chunk.length
        if (size > 10_000_000) return respond(413, { error: 'The preview is too large. Export a smaller preview.' })
        chunks.push(chunk)
      }
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      const settings = validateSettings(payload.settings)
      if (typeof payload.preview !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(payload.preview)) return respond(400, { error: 'A PNG scene preview is required.' })
      const png = Buffer.from(payload.preview.split(',')[1], 'base64')
      if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return respond(400, { error: 'The preview is not a PNG.' })
      const savedAt = new Date().toISOString()
      const id = savedAt.replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8)
      const document = { settings, savedAt, preview: `studies/${id}.png` }
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, `${id}.png`), png, { flag: 'wx' })
      await writeFile(join(directory, `${id}.json`), JSON.stringify(document, null, 2) + '\n', { flag: 'wx' })
      await writeFile(join(directory, `current-${id}.tmp`), JSON.stringify(document, null, 2) + '\n')
      await rename(join(directory, `current-${id}.tmp`), join(directory, 'current.json'))
      return respond(200, { ...document, path: 'studies/current.json', archive: `studies/${id}.json` })
    } catch (error) {
      const malformed = error instanceof SyntaxError || !error.code
      respond(malformed ? 400 : 500, { error: malformed ? error.message : 'Could not save the study on this Mac. Download the JSON and PNG to keep your changes.' })
    }
  }
}
