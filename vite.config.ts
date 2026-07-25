import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const runtimeErrorReporter: Plugin = {
  name: 'bean-runtime-error-reporter',
  configureServer(server) {
    let lastError: unknown = null
    server.middlewares.use('/__bean_runtime_error', (request, response) => {
      response.setHeader('Content-Type', 'application/json')
      if (request.method === 'POST') {
        let body = ''
        request.on('data', (chunk) => { body += chunk })
        request.on('end', () => {
          try { lastError = JSON.parse(body) } catch { lastError = { message: body } }
          response.statusCode = 204
          response.end()
        })
        return
      }
      response.end(JSON.stringify(lastError))
    })
  },
}

export default defineConfig({
  plugins: [runtimeErrorReporter, react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
