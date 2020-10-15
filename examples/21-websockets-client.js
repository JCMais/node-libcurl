/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// This code is pretty big, but shows how to use node-libcurl
// as a VERY simple websockets client. There are many scenarios
// that are not currently handled, so keep that in mind :)
// How to run this example:
//  1. start the server (install the deps in there first)
//    node examples/21-websockets-server/index.js
//  2. start the client
//    node examples/21-websockets-client.js
// type "connect" in the terminal running the client and hit enter
// There are more commands available, in both server and client.
// Take a look at the respective stdin on data handlers.

// The following source-code/article was very useful when writing this:
// https://blog.pusher.com/websockets-from-scratch/
// https://github.com/websockets/ws
// https://github.com/teusbenschop/laboratory/blob/34a3610538dc07c62543c079ff2f030272bec5ff/curl-websocket/curl-websocket.c
// https://github.com/lzet/libcurl_ws/blob/5f69fae05205ef42050593e6270dc06e3b091d10/websocketio.cpp
// https://github.com/ga2arch/slack/blob/961dec741764dfb81999703b84989d93ec7a88ee/include/WebsocketClient.hpp
// https://github.com/GrupaPracuj/hermes/blob/e9d2be3d0600926cd99190cebd65dd1d077164aa/source/hmsNetwork.cpp

// If you are going to build anything on top of the idea shown here
// it's required for you to read the WebSockets RFC: https://tools.ietf.org/html/rfc6455

const os = require('os')

const { CurlCode, Easy, Multi, SocketState } = require('node-libcurl')
const {
  packCloseFrame,
  packMessageFrame,
  packPongFrame,
  readFrame,
  WEBSOCKET_FRAME_OPCODE,
  WebSocketError,
} = require('./21-websockets-client-helpers')

// Two bad reads means a stale socket, and so the connection is going to be closed after that.
const BAD_READ_MAX = 2

const getCleanState = () => ({
  connectionOpen: false,
  hasRequestBeenUpgraded: false,
  hasSentUpgradeRequest: false,
  closeRequestedByUs: false,
  badReads: 0,
})

let state = getCleanState()

const closeHandle = (easyHandle) => {
  state = getCleanState()

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

    // We are using this callback to listen for changes in the socket.
    // see the monitorSocketEvents call right after this one.
    easyHandle.onSocketEvent((error, events) => {
      // oops, something went wrong with the socket polling itself
      if (error) {
        console.error(error)
        closeHandle(easyHandle)
        return
      }

      const isWritable = events & SocketState.Writable
      const isReadable = events & SocketState.Readable

      // if it's readable, let's try to get some data
      if (isReadable) {
        console.log('easy handle - onSocketEvent - isReadable')

        try {
          let receivedData = receiveData(easyHandle)

          // there was nothing to be read...
          if (!receivedData.length) {
            state.badReads++
            if (state.badReads >= BAD_READ_MAX) {
              console.error('Connection has been shutdown - exiting')
              closeHandle(easyHandle)
            }
            return
          }

          state.badReads = 0

          // this is the answer to the request to upgrade the connection
          if (!state.hasRequestBeenUpgraded) {
            // let's grab the headers
            const headersEnd = receivedData.lastIndexOf('\r\n\r\n')
            const httpHeaderResponse = receivedData
              .slice(0, headersEnd)
              .toString('utf8')
              .split('\r\n')
            console.assert(
              httpHeaderResponse[0] === 'HTTP/1.1 101 Switching Protocols',
              'Invalid HTTP Response',
            )
            const headers = httpHeaderResponse.reduce(
              (acc, headerLine, idx) => {
                // skip first index, as it's the http result above
                if (idx === 0) return acc
                const [headerName, headerValue] = headerLine.trim().split(':')
                return {
                  ...acc,
                  [headerName.trim().toLowerCase()]: headerValue.trim(),
                }
              },
              {},
            )

            console.assert(
              headers.connection === 'Upgrade' &&
                headers.upgrade === 'websocket',
              'Invalid response headers',
            )

            // mark the connection as upgraded, we are ready!
            state.hasRequestBeenUpgraded = true

            // the message may already include some
            // ws frames, let's handle them
            receivedData = receivedData.slice(headersEnd + 4)

            // let's also send a message
            const packedFrame = packMessageFrame(
              Buffer.from('hello :)', 'utf8'),
            )
            sendData(easyHandle, packedFrame)
          }

          // no ws data was received - we are done here.
          if (!receivedData.length) {
            return
          }

          // if we are here, it means we got a frame!
          // remember, a single message can include multiple frames.

          console.log('-> received ws frame(s) =', receivedData)

          try {
            const frames = []
            let frame
            do {
              frame = readFrame(frame ? frame.remaining : receivedData)
              console.log('-> frame =', frame)

              if (frame) {
                switch (frame.opc) {
                  case WEBSOCKET_FRAME_OPCODE.CONT:
                    console.log(
                      '-> frame is a continuation frame from the previous data',
                    )
                    break
                  case WEBSOCKET_FRAME_OPCODE.NON_CONTROL_TEXT:
                    console.log(
                      '-> frame is a text frame - payload =',
                      frame.payload && frame.payload.toString(),
                    )
                    break
                  case WEBSOCKET_FRAME_OPCODE.NON_CONTROL_BINARY:
                    console.log(
                      '-> frame is a binary frame - payload =',
                      frame.payload,
                    )
                    break
                }

                frames.push(frame)
              }
            } while (frame && frame.remaining)

            // we could do anything with the frames here...

            // TODO: Handle extensions, compression, etc

            ///////////////////////
            // Handle close opcode
            ///////////////////////
            const closeFrame = frames.find(
              (f) => f.opc === WEBSOCKET_FRAME_OPCODE.CONTROL_CLOSE,
            )
            if (closeFrame) {
              // send close frame if the connection close was not requested by us
              if (!state.closeRequestedByUs) {
                // TODO: use code from req
                sendData(easyHandle, packCloseFrame(1005))
              }
              closeHandle(easyHandle)
              return
            }

            ///////////////////////
            // Handle ping opcode
            ///////////////////////
            const pingFrame = frames.find(
              (f) => f.opc === WEBSOCKET_FRAME_OPCODE.CONTROL_PING,
            )
            if (pingFrame) {
              sendData(
                easyHandle,
                packPongFrame(
                  Buffer.from('random number here: 5 (got with a dice =D)'),
                ),
              )
            }
          } catch (error) {
            if (error instanceof WebSocketError) {
              console.error('We got a WebSocketError: ', error, error.code)
              sendData(easyHandle, packCloseFrame(error.code || 1006))
            } else {
              throw error
            }
          }
        } catch (error) {
          console.error(error)
          closeHandle(easyHandle)
        }
      }

      // no requests were made  yet, let's try to upgrade the connection
      if (isWritable && !state.hasSentUpgradeRequest) {
        const initialBuffer = Buffer.from(
          [
            // TODO: You probably want to make this dynamic based on the URL ;)
            'GET / HTTP/1.1',
            'Host: localhost:8080',
            'Upgrade: websocket',
            'Connection: Upgrade',
            'Sec-WebSocket-Key: j7KDNecyi7GXbAW7SzhSPQ==',
            'Sec-WebSocket-Version: 13',
            'Origin: http://localhost:8080',
            '\r\n',
          ].join('\r\n'),
        )
        state.hasSentUpgradeRequest = sendData(easyHandle, initialBuffer)
      }
    })

    // think on this like using poll() on the socket
    // (internally this uses libuv to do the polling)
    easyHandle.monitorSocketEvents()
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
    console.error(error, errorCode)
    closeHandle(easyHandle)
    return
  }

  onConnected(easyHandle)
})

const connect = () => {
  const useMulti = true
  // first, we are going to create our easy handle
  const easyHandle = new Easy()
  easyHandle.setOpt('URL', 'http://localhost:8080')
  easyHandle.setOpt('FRESH_CONNECT', true)
  easyHandle.setOpt('CONNECT_ONLY', true)
  easyHandle.private = {}

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
          easyHandle = connect()
          return
        case 'exit':
          process.exit(0)
          return
      }

      if (state.hasRequestBeenUpgraded && state.connectionOpen) {
        switch (dataStr) {
          case 'big':
            sendData(
              easyHandle,
              packMessageFrame(
                Buffer.from(
                  'abcdefghijklmnopqrstuvwxyz'.repeat(args[0] || 100),
                  'utf8',
                ),
              ),
            )
            break
          case 'close':
            state.closeRequestedByUs = true
            sendData(easyHandle, packCloseFrame())
            break
          case 'multiple':
            sendData(
              easyHandle,
              packMessageFrame(Buffer.from('double1!', 'utf8')),
            )
            sendData(
              easyHandle,
              packMessageFrame(Buffer.from('double1!', 'utf8')),
            )
            sendData(
              easyHandle,
              packMessageFrame(Buffer.from('double2!', 'utf8')),
            )
            sendData(
              easyHandle,
              packMessageFrame(Buffer.from('double2!', 'utf8')),
            )
            break
          default:
            sendData(easyHandle, packMessageFrame(Buffer.from(dataStr, 'utf8')))
        }
      }
    }
  })(),
)

//////////////////////
// Helpers Functions
/////////////////////

/**
 * Sends data with an easy handle `send` method.
 *
 * @param {Easy} handle
 * @param {Buffer} buffer
 */
function sendData(handle, buffer) {
  let bufferToSend = buffer
  while (bufferToSend) {
    const { code, bytesSent } = handle.send(bufferToSend)

    console.log('-> sendData - send called =', {
      code,
      bytesSent,
    })

    if (code !== CurlCode.CURLE_OK && code !== CurlCode.CURLE_AGAIN) {
      throw new Error(Easy.strError(code))
    }

    if (code === CurlCode.CURLE_AGAIN) break

    if (code === CurlCode.CURLE_OK) {
      if (bytesSent !== bufferToSend.length) {
        bufferToSend = buffer.slice(bufferToSend.slice(0, bytesSent))
      } else {
        bufferToSend = null
      }
    }
  }

  return !bufferToSend
}

/**
 * Receives data using a Easy handle `recv` method.
 *
 * @param {Easy} handle
 * @param {number?} bufferSize The default buffer size to use, the bigger this is, the less calls to recv()
 */
function receiveData(handle, bufferSize = 32 * 1024) {
  const buffers = []

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = Buffer.alloc(bufferSize)
    const { code, bytesReceived } = handle.recv(data)

    console.log('<- receiveData - recv called =', {
      code,
      bytesReceived,
    })

    if (code !== CurlCode.CURLE_OK && code !== CurlCode.CURLE_AGAIN) {
      throw new Error(Easy.strError(code))
    }

    if (code === CurlCode.CURLE_AGAIN) break

    if (code === CurlCode.CURLE_OK) {
      if (bytesReceived === 0) {
        break
      } else {
        buffers.push(data.slice(0, bytesReceived))
      }
    }
  }

  return Buffer.concat(buffers)
}
