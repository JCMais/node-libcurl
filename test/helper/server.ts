/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import http from 'http'
import https from 'https'
import http2 from 'http2'
import fs from 'fs'
import path from 'path'
import { Socket } from 'net'
import { AddressInfo } from 'net'

import express from 'express'
import cookieParser from 'cookie-parser'

const host = 'localhost'

const file = path.resolve.bind(this, __dirname)
const key = fs.readFileSync(file('./ssl/cert.key'))
const cert = fs.readFileSync(file('./ssl/cert.pem'))

// Server setup
export const createApp = () => {
  const app = express()
  app
    .use(express.urlencoded({ extended: true }))
    .use(express.raw({ limit: '100MB', type: 'application/node-libcurl.raw' }))
    // @ts-expect-error - no time for fixing this right now
    .use(cookieParser())

  app.disable('etag')
  return app
}

export interface ServerInstance<S extends http.Server | http2.Http2Server> {
  app: ReturnType<typeof createApp>
  server: S
  close: () => Promise<void>
  listen: () => Promise<number>
  path: (path: string) => string
  url: string
  port: number
}

function _createServer<
  S extends http.Server | https.Server | http2.Http2Server,
>(app: ReturnType<typeof createApp>, server: S): ServerInstance<S> {
  const serverSockets = new Set<Socket>()

  if (server instanceof http.Server || server instanceof https.Server) {
    server.on('connection', (socket) => {
      serverSockets.add(socket)
      socket.on('close', () => {
        serverSockets.delete(socket)
      })
    })
  }

  const isHttps = server instanceof https.Server || 'updateSettings' in server

  let port = 0

  const listen = () => {
    return new Promise<number>((resolve) => {
      server.listen(0, 'localhost', () => {
        const address = server.address() as AddressInfo
        port = address.port
        resolve(port)
      })
    })
  }

  function close() {
    return new Promise<void>((resolve) => {
      for (const socket of serverSockets.values()) {
        socket.destroy()
      }
      server.close(() => resolve())
    })
  }

  return {
    app,
    server,
    close,
    listen,
    path(path: string) {
      return `${this.url}/${path.replace(/^\/+/, '')}`
    },
    get url() {
      return `${isHttps ? 'https' : 'http'}://${host}:${this.port}`
    },
    get port() {
      if (port === 0) {
        throw new Error('Server is not listening')
      }
      return port
    },
  }
}

export const createServer = (): ServerInstance<http.Server> => {
  const app = createApp()
  const server = http.createServer(app)

  return _createServer(app, server)
}

export const createHttpsServer = () => {
  const app = createApp()
  const server = https.createServer({ key, cert }, app)

  return _createServer(app, server)
}

export const createHttp2Server = (): ServerInstance<http2.Http2Server> => {
  const app = createApp()
  const server = http2.createSecureServer({ key, cert })

  return _createServer(app, server)
}
