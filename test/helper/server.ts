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

import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'

const file = path.resolve.bind(this, __dirname)
const key = fs.readFileSync(file('./ssl/cert.key'))
const cert = fs.readFileSync(file('./ssl/cert.pem'))

export const app = express()

const serverSockets = new Set<Socket>()
export const server = http.createServer(app)
export const closeServer = () => {
  for (const socket of serverSockets.values()) {
    socket.destroy()
  }
  server.close()
}
server.on('connection', (socket) => {
  serverSockets.add(socket)
  socket.on('close', () => {
    serverSockets.delete(socket)
  })
})

export const serverHttps = https.createServer(
  {
    key,
    cert,
  },
  app,
)
export const serverHttp2 = http2.createSecureServer({
  key,
  cert,
})

app
  .use(bodyParser.urlencoded({ extended: true }))
  .use(bodyParser.raw({ limit: '100MB', type: 'application/node-libcurl.raw' }))
  .use(cookieParser())

app.disable('etag')

export const port = process.env.TEST_PORT
  ? parseInt(process.env.TEST_PORT, 10)
  : 3000
export const portHttps = 3443
export const portHttp2 = 3333
export const host = 'localhost'
