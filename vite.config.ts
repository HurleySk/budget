import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Plugin to handle JSON config file persistence
function jsonStoragePlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data')
  const configFile = path.join(dataDir, 'budget.json')

  return {
    name: 'json-storage',
    configureServer(server) {
      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      // Handle save requests
      server.middlewares.use('/__save-config', (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              // Validate JSON
              JSON.parse(body)
              fs.writeFileSync(configFile, body)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true }))
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Invalid JSON' }))
            }
          })
        } else {
          res.writeHead(405)
          res.end()
        }
      })

      // Handle load requests
      server.middlewares.use('/__load-config', (req, res) => {
        if (req.method === 'GET') {
          try {
            if (fs.existsSync(configFile)) {
              const data = fs.readFileSync(configFile, 'utf-8')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(data)
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'No config file' }))
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to read config' }))
          }
        } else {
          res.writeHead(405)
          res.end()
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), jsonStoragePlugin()],
  server: {
    watch: {
      ignored: ['**/data/**'],
    },
  },
})
