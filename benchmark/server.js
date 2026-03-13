import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load index.html into memory
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'))
const contentLength = Buffer.byteLength(indexHtml)

const HOST = process.env.HOST || '127.0.0.1'
const PORT = process.env.PORT || '8080'

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Content-Length': contentLength,
  })
  res.end(indexHtml)
})

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`)
})
