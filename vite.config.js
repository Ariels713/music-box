import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { studioMiddleware } from './studio-server.js'

export default defineConfig({
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  plugins: [{
    name: 'local-music-box-studio',
    configureServer(server) {
      server.middlewares.use(studioMiddleware(fileURLToPath(new URL('./studies', import.meta.url))))
    },
  }],
})
