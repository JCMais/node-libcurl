/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { createServer, createHttpsServer } from './helper/server'
import type { TestProject } from 'vitest/node'
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

  // Create HTTPS server
  const httpsServer = createHttpsServer()
  httpsServer.app.get('/', (_req, res) => {
    res.send('Hello World!')
  })
  httpsServer.app.put('/put', (req, res) => {
    res.json({ success: true })
  })

  // Start servers
  const httpPort = await httpServer.listen()
  const httpsPort = await httpsServer.listen()

  // Provide server URLs to tests
  provide('httpServerUrl', `http://localhost:${httpPort}`)
  provide('httpsServerUrl', `https://localhost:${httpsPort}`)

  // Return teardown function
  return async () => {
    if (teardown) {
      throw new Error('teardown called twice')
    }
    teardown = true

    await Promise.all([httpServer.close(), httpsServer.close()])
  }
}

declare module 'vitest' {
  export interface ProvidedContext {
    httpServerUrl: string
    httpsServerUrl: string
  }
}
