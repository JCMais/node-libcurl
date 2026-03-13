/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Interactive WebSocket client using native libcurl WebSocket support
 *
 * This is similar to 21-websockets-client.js but uses the native
 * WebSocket API (wsRecv/wsSend/wsMeta) instead of manual frame handling.
 *
 * Requires libcurl >= 7.86.0
 *
 * How to run this example:
 *  1. start the server (install the deps in there first)
 *    node examples/21-websockets-server/index.js
 *  2. start the client
 *    node examples/21-websockets-native.js
 *
 * Type commands in the terminal:
 *  - connect: establish WebSocket connection
 *  - close: send close frame
 *  - big:N: send large message (N repeats of alphabet)
 *  - multiple: send multiple messages
 *  - quit/exit: close connection and exit
 *  - anything else: send as text message
 */

const os = require('os')
const { Curl, CurlCode, Easy, Multi, CurlWs, SocketState } = require('../dist')

// Check libcurl version
if (!Curl.isVersionGreaterOrEqualThan(7, 86, 0)) {
  console.error('This example requires libcurl >= 7.86.0')
  console.error('Your version:', Curl.getVersion())
  process.exit(1)
}

const getCleanState = () => ({
  connectionOpen: false,
  closeRequestedByUs: false,
})

let state = getCleanState()

const closeHandle = (easyHandle) => {
  state = getCleanState()

  if (easyHandle.isMonitoringSockets) {
    easyHandle.unmonitorSocketEvents()
  }

  if (easyHandle.private.multi) {
    easyHandle.private.multi.removeHandle(easyHandle)
  }

  easyHandle.close()
}

// This is the function that is called when we
// have connected to the server
const onConnected = (easyHandle) => {
  try {
    state.connectionOpen = true
    console.log('✓ Connected! WebSocket ready.\n')
    console.log('Commands:')
    console.log('  close - close connection')
    console.log('  big:N - send large message (N repeats)')
    console.log('  multiple - send multiple messages')
    console.log('  ping:msg - send ping frame')
    console.log('  binary - send binary frame')
    console.log('  quit/exit - close and exit')
    console.log('  <message> - send text message\n')

    // We are using this callback to listen for changes in the socket.
    easyHandle.onSocketEvent((error, events) => {
      // oops, something went wrong with the socket polling itself
      if (error) {
        console.error('Socket error:', error)
        closeHandle(easyHandle)
        return
      }

      const isReadable = events & SocketState.Readable

      // if it's readable, let's try to get some data
      if (isReadable) {
        try {
          // Receive WebSocket frames using native API
          const buffer = Buffer.alloc(64 * 1024)
          const { code, bytesReceived, meta } = easyHandle.wsRecv(buffer)

          if (code === CurlCode.CURLE_AGAIN) {
            // No data available yet
            return
          }

          if (code === CurlCode.CURLE_GOT_NOTHING) {
            console.log('Connection closed by server')
            closeHandle(easyHandle)
            return
          }

          if (code !== CurlCode.CURLE_OK) {
            console.error('Receive error:', Easy.strError(code))
            closeHandle(easyHandle)
            return
          }

          if (!meta) {
            return
          }

          // Handle different frame types
          const isText = (meta.flags & CurlWs.Text) !== 0
          const isBinary = (meta.flags & CurlWs.Binary) !== 0
          const isClose = (meta.flags & CurlWs.Close) !== 0
          const isPing = (meta.flags & CurlWs.Ping) !== 0
          const isPong = (meta.flags & CurlWs.Pong) !== 0
          const isCont = (meta.flags & CurlWs.Cont) !== 0

          console.log('<- received ws frame:', {
            type: isText
              ? 'TEXT'
              : isBinary
                ? 'BINARY'
                : isClose
                  ? 'CLOSE'
                  : isPing
                    ? 'PING'
                    : isPong
                      ? 'PONG'
                      : 'UNKNOWN',
            continuation: isCont,
            bytesReceived,
            bytesleft: meta.bytesleft,
          })

          if (isClose) {
            console.log('<- received close frame')
            // send close frame if the connection close was not requested by us
            if (!state.closeRequestedByUs) {
              easyHandle.wsSend(Buffer.alloc(0), CurlWs.Close)
            }
            closeHandle(easyHandle)
            return
          }

          if (isPing) {
            console.log('<- received ping frame - sending pong')
            // Note: libcurl auto-responds to ping by default
            // We're just logging it here
            return
          }

          if (isPong) {
            console.log('<- received pong frame')
            return
          }

          if (isText) {
            const payload = buffer.toString('utf8', 0, bytesReceived)
            console.log('<- text frame payload:', payload)
            if (meta.bytesleft > 0) {
              console.log(`   (fragmented, ${meta.bytesleft} bytes remaining)`)
            }
          }

          if (isBinary) {
            console.log(
              '<- binary frame payload:',
              buffer.slice(0, bytesReceived),
            )
            if (meta.bytesleft > 0) {
              console.log(`   (fragmented, ${meta.bytesleft} bytes remaining)`)
            }
          }
        } catch (error) {
          console.error('Error processing frame:', error)
          closeHandle(easyHandle)
        }
      }
    })

    // think on this like using poll() on the socket
    // (internally this uses libuv to do the polling)
    easyHandle.monitorSocketEvents()

    // Send initial greeting
    const greeting = Buffer.from('hello :)', 'utf8')
    const { code } = easyHandle.wsSend(greeting, CurlWs.Text)
    if (code === CurlCode.CURLE_OK) {
      console.log('-> sent initial greeting:', greeting.toString())
    }
  } catch (error) {
    console.log('oops something went wrong', error)
    closeHandle(easyHandle)
  }
}

/////////////////////
// connect function
/////////////////////
const multi = new Multi()

multi.onMessage((error, easyHandle, errorCode) => {
  if (error) {
    console.error('Connection error:', error, errorCode)
    closeHandle(easyHandle)
    return
  }

  onConnected(easyHandle)
})

const connect = () => {
  const useMulti = true
  // first, we are going to create our easy handle
  const easyHandle = new Easy()
  easyHandle.setOpt('URL', 'ws://localhost:8080')
  // IMPORTANT: Use CONNECT_ONLY = 2 for WebSocket
  easyHandle.setOpt('CONNECT_ONLY', 2)
  easyHandle.private = {}

  console.log('Connecting to ws://localhost:8080...\n')

  if (useMulti) {
    multi.addHandle(easyHandle)
    easyHandle.private.multi = multi
  } else {
    const code = easyHandle.perform()
    console.assert(
      code === CurlCode.CURLE_OK,
      'perform() returned invalid response',
    )
    onConnected(easyHandle)
  }

  return easyHandle
}

///////////////////
// STDIN Handling
//////////////////

// let's read stdin to be able to
// interact with the code from the terminal
process.stdin.on(
  'data',
  (() => {
    let easyHandle = null

    return (data) => {
      const dataStrRaw = data
        .toString('utf-8')
        .replace(new RegExp(os.EOL, 'g'), '')
      const [dataStr, ...args] = dataStrRaw.split(':')

      // two special handlers
      switch (dataStr) {
        case 'connect':
          if (state.connectionOpen) {
            console.log('Already connected!')
            return
          }
          easyHandle = connect()
          return
        case 'quit':
        case 'exit':
          process.stdin.pause()

          console.log('Closing connection...')
          if (easyHandle && state.connectionOpen) {
            try {
              easyHandle.wsSend(Buffer.alloc(0), CurlWs.Close)
            } catch {
              // ignore
            }
            closeHandle(easyHandle)
          }
          if (multi) {
            multi.close()
          }
          console.log('Goodbye!')
          return
      }

      if (!easyHandle || !state.connectionOpen) {
        console.log('Not connected. Type "connect" first.')
        return
      }

      try {
        switch (dataStr) {
          case 'big': {
            const repeats = parseInt(args[0]) || 100
            const message = Buffer.from(
              'abcdefghijklmnopqrstuvwxyz'.repeat(repeats),
              'utf8',
            )
            const { code, bytesSent } = easyHandle.wsSend(message, CurlWs.Text)
            if (code === CurlCode.CURLE_OK) {
              console.log(`-> sent big message: ${bytesSent} bytes`)
            } else {
              console.error('Send error:', Easy.strError(code))
            }
            break
          }
          case 'close':
            state.closeRequestedByUs = true
            easyHandle.wsSend(Buffer.alloc(0), CurlWs.Close)
            console.log('-> sent close frame')
            break
          case 'multiple':
            console.log('-> sending multiple messages')
            easyHandle.wsSend(Buffer.from('double1!', 'utf8'), CurlWs.Text)
            easyHandle.wsSend(Buffer.from('double1!', 'utf8'), CurlWs.Text)
            easyHandle.wsSend(Buffer.from('double2!', 'utf8'), CurlWs.Text)
            easyHandle.wsSend(Buffer.from('double2!', 'utf8'), CurlWs.Text)
            break
          case 'ping': {
            const payload = Buffer.from(args[0] || 'ping', 'utf8')
            const { code } = easyHandle.wsSend(payload, CurlWs.Ping)
            if (code === CurlCode.CURLE_OK) {
              console.log('-> sent ping frame')
            }
            break
          }
          case 'binary': {
            const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff])
            const { code } = easyHandle.wsSend(binaryData, CurlWs.Binary)
            if (code === CurlCode.CURLE_OK) {
              console.log('-> sent binary frame:', binaryData)
            }
            break
          }
          default: {
            const message = Buffer.from(dataStr, 'utf8')
            const { code, bytesSent } = easyHandle.wsSend(message, CurlWs.Text)
            if (code === CurlCode.CURLE_OK) {
              console.log(`-> sent: "${dataStr}" (${bytesSent} bytes)`)
            } else if (code === CurlCode.CURLE_AGAIN) {
              console.log('-> send would block, try again')
            } else {
              console.error('Send error:', Easy.strError(code))
            }
          }
        }
      } catch (error) {
        console.error('Error sending:', error)
      }
    }
  })(),
)

console.log('WebSocket Native Client Ready')
console.log('Type "connect" to start\n')
