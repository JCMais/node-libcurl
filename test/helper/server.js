/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const http = require('http')
const https = require('https')
const http2 = require('http2')
const fs = require('fs')
const path = require('path')

const express = require('express')
const bodyParser = require('body-parser')
const cookiesParser = require('cookie-parser')

const file = path.resolve.bind(this, __dirname)
const key = fs.readFileSync(file('./ssl/cert.key'))
const cert = fs.readFileSync(file('./ssl/cert.pem'))

const app = express()
const serverHttp = http.createServer(app)
const serverHttps = https.createServer(
  {
    key,
    cert,
  },
  app,
)
const serverHttp2 = http2.createSecureServer({
  key,
  cert,
})

app
  .use(bodyParser.urlencoded({ extended: true }))
  .use(bodyParser.raw({ limit: '100MB', type: 'application/node-libcurl.raw' }))
  .use(cookiesParser())

app.disable('etag')

module.exports = {
  server: serverHttp,
  serverHttps,
  serverHttp2,
  app: app,
  port: 3000,
  portHttps: 3443,
  portHttp2: 3333,
  host: 'localhost',
}
