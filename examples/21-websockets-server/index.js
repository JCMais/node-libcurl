/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// This is a very simple echo server to be used with the example
// 21-websockets-client.js

const { Server: WebSocketServer } = require('ws')

const port = 8080
const wss = new WebSocketServer({ port: port, maxPayload: 240 * 1024 })

console.log('listening on port: ' + port)

const PING_INTERVAL = 5000

let lastSocket = null

wss.on('listening', () => console.log('listening'))
wss.on('error', (error) => console.error('error', error))

// let's read stdin to be able to
// interact with the code from the terminal
process.stdin.on('data', (data) => {
  if (lastSocket) {
    const dataStrRaw = data.toString('utf-8').replace(/\n/g, '')
    const [dataStr, ...args] = dataStrRaw.split(':')

    switch (dataStr) {
      case 'big':
        lastSocket.send('abcdefghijklmnopqrstuvwxyz'.repeat(args[0] || 100))
        break
      case 'close':
        lastSocket.close()
        break
      case 'multiple':
        lastSocket.send('double1!')
        lastSocket.send('double1!')
        lastSocket.send('double2!')
        lastSocket.send('double2!')
        break
      default:
        lastSocket.send(dataStr)
    }
  }
})

wss.on('connection', function connection(ws) {
  let pingTimeout = null
  lastSocket = ws
  ws.on('message', function (message) {
    console.log('ws.on - message:', message)
    ws.send('echo: ' + message)
  })

  ws.on('ping', (data) => {
    console.log('ws.on - ping:', data)
  })
  ws.on('pong', (data) => {
    console.log('ws.on - pong:', data.toString('utf8'))
    pingTimeout = setTimeout(sendPing, PING_INTERVAL)
  })

  ws.on('open', () => {
    console.error('ws.on - open')
  })

  ws.on('close', (code, reason) => {
    console.error('ws.on - close:', code, reason)
    clearTimeout(pingTimeout)
  })

  ws.on('upgrade', () => {
    console.error('ws.on - upgrade')
  })

  ws.on('unexpected-response', () => {
    console.error('ws.on - unexpected-response')
  })

  ws.on('error', (error) => {
    console.error('ws.on - error', error)
  })

  console.log('new client connected!')

  ws.send('Connected!')

  const sendPing = () => {
    if (ws.readyState === ws.CLOSING) return

    console.log('ws - sending ping')
    ws.ping('test data :)', (error) => {
      if (error) {
        console.error('ws ping error', error)
      }
    })
  }
  sendPing()
})

wss.on('headers', () => {
  console.log('headers!')
})
