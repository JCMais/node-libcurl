/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  createServer,
  createHttpsServer,
  createWebSocketServer,
} from './helper/server'
import type { TestProject } from 'vitest/node'
// @ts-ignore
import formidable from 'formidable'

let teardown = false

export default async function setup({ provide }: TestProject) {
  // Create HTTP server
  const httpServer = createServer()
  httpServer.app.get('/', (_req, res) => {
    res.send('Hello World!')
  })
  httpServer.app.put('/put', (req, res) => {
    res.json({ success: true })
  })

  // Add multipart form data handler
  httpServer.app.post('/multipart', (req, res, next) => {
    // @ts-ignore
    const form = formidable({ multiples: true })

    // @ts-ignore
    form.parse(req, (error, fields, files) => {
      if (error) {
        next(error)
        return
      }

      const parts: Array<{
        name: string
        type: 'field' | 'file'
        byteSize: number
        value?: string
        filename?: string
        mimetype?: string
      }> = []

      // Process fields
      for (const [name, valueArray] of Object.entries(fields)) {
        if (Array.isArray(valueArray)) {
          for (const value of valueArray) {
            const stringValue = String(value)
            parts.push({
              name,
              type: 'field',
              byteSize: Buffer.byteLength(stringValue),
              value: stringValue,
            })
          }
        }
      }

      // Process files
      for (const [name, fileArray] of Object.entries(files)) {
        if (Array.isArray(fileArray)) {
          for (const file of fileArray as any[]) {
            parts.push({
              name,
              type: 'file',
              byteSize: file.size,
              filename: file.originalFilename,
              mimetype: file.mimetype,
            })
          }
        }
      }

      res.json(parts)
    })
  })

  // Create HTTPS server
  const httpsServer = createHttpsServer()
  httpsServer.app.get('/', (_req, res) => {
    res.send('Hello World!')
  })
  httpsServer.app.put('/put', (req, res) => {
    res.json({ success: true })
  })

  // Create WebSocket server with echo functionality
  const wsServer = createWebSocketServer()

  // Setup WebSocket server to echo all messages with proper frame types
  wsServer.wss!.on('connection', (ws, req) => {
    const url = req.url
    const fullUrl = `ws://${req.headers.host}${url}`

    if (fullUrl.includes('/close-immediately')) {
      ws.send('Hello!')
      ws.close()
      return
    }

    ws.on('message', (data, isBinary) => {
      ws.send(data, { binary: isBinary })
    })

    ws.on('ping', (data) => {
      ws.pong(data)
    })
  })

  // Start servers
  const httpPort = await httpServer.listen()
  const httpsPort = await httpsServer.listen()
  const wsPort = await wsServer.listen()

  // Provide server URLs to tests
  provide('httpServerUrl', `http://localhost:${httpPort}`)
  provide('httpsServerUrl', `https://localhost:${httpsPort}`)
  provide('wsServerUrl', `ws://localhost:${wsPort}`)

  // Return teardown function
  return async () => {
    if (teardown) {
      throw new Error('teardown called twice')
    }
    teardown = true

    await Promise.all([
      httpServer.close(),
      httpsServer.close(),
      wsServer.close(),
    ])
  }
}

declare module 'vitest' {
  export interface ProvidedContext {
    httpServerUrl: string
    httpsServerUrl: string
    wsServerUrl: string
  }
}
