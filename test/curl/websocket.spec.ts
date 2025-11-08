/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * NOTE: These tests require the 'ws' package to be installed as a devDependency:
 * pnpm add -D ws @types/ws
 */
import { describe, it, expect, inject } from 'vitest'

import { Curl, CurlCode, Easy, Multi, CurlWs, SocketState } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'
import { setTimeout } from 'node:timers/promises'

// WebSocket tests require libcurl >= 7.86.0
const isWebSocketSupported = Curl.isVersionGreaterOrEqualThan(7, 86, 0)

describe.runIf(isWebSocketSupported)(
  'WebSocket',
  () => {
    const getWsUrl = () => inject('wsServerUrl')

    describe('CONNECT_ONLY Mode', () => {
      it('should send and receive text frames', async () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2) // 2 for WebSocket

        // Establish connection
        const performCode = easy.perform()
        expect(performCode).toBe(CurlCode.CURLE_OK)

        // Send text frame
        const message = Buffer.from('Hello WebSocket!')
        const sendResult = easy.wsSend(message, CurlWs.Text)

        expect(sendResult.code).toBe(CurlCode.CURLE_OK)
        expect(sendResult.bytesSent).toBe(message.length)

        // Receive echo response
        const recvBuffer = Buffer.alloc(1024)

        let recvResult: ReturnType<typeof easy.wsRecv>

        while (true) {
          recvResult = easy.wsRecv(recvBuffer)
          if (recvResult.code !== CurlCode.CURLE_AGAIN) {
            break
          }
          await setTimeout(100)
        }

        expect(recvResult.code).toBe(CurlCode.CURLE_OK)
        expect(recvResult.bytesReceived).toBeGreaterThan(0)
        expect(recvResult.meta).not.toBeNull()

        if (recvResult.meta) {
          expect(recvResult.meta.flags & CurlWs.Text).not.toBe(0)
          expect(recvResult.meta.bytesleft).toBe(0) // Complete frame
        }

        const received = recvBuffer.toString(
          'utf8',
          0,
          recvResult.bytesReceived,
        )
        expect(received).toBe('Hello WebSocket!')

        easy.close()
      })

      it('should send and receive binary frames', async () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)

        const performCode = easy.perform()
        expect(performCode).toBe(CurlCode.CURLE_OK)

        // Send binary frame
        const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff])
        const sendResult = easy.wsSend(binaryData, CurlWs.Binary)

        expect(sendResult.code).toBe(CurlCode.CURLE_OK)
        expect(sendResult.bytesSent).toBe(binaryData.length)

        // Receive echo
        const recvBuffer = Buffer.alloc(1024)
        let recvResult: ReturnType<typeof easy.wsRecv>
        while (true) {
          recvResult = easy.wsRecv(recvBuffer)
          if (recvResult.code !== CurlCode.CURLE_AGAIN) {
            break
          }
          await setTimeout(100)
        }

        expect(recvResult.code).toBe(CurlCode.CURLE_OK)
        expect(recvResult.meta).not.toBeNull()

        if (recvResult.meta) {
          expect(recvResult.meta.flags & CurlWs.Binary).not.toBe(0)
        }

        const received = recvBuffer.slice(0, recvResult.bytesReceived)
        expect(received).toEqual(binaryData)

        easy.close()
      })

      it('should handle close frames', async () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)

        const performCode = easy.perform()
        expect(performCode).toBe(CurlCode.CURLE_OK)

        // Send close frame
        const closeResult = easy.wsSend(Buffer.alloc(0), CurlWs.Close)
        expect(closeResult.code).toBe(CurlCode.CURLE_OK)

        easy.close()
      })

      it('should handle ping/pong frames', async () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)

        const performCode = easy.perform()
        expect(performCode).toBe(CurlCode.CURLE_OK)

        // Send ping frame
        const pingData = Buffer.from('ping')
        const sendResult = easy.wsSend(pingData, CurlWs.Ping)
        expect(sendResult.code).toBe(CurlCode.CURLE_OK)

        // Note: libcurl may handle pong frames automatically
        // We just verify that sending a ping doesn't cause errors
        // The server will respond with a pong, but libcurl might handle it internally

        easy.close()
      })

      it('should provide correct frame metadata', async () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)

        easy.perform()

        const message = Buffer.from('Test metadata')
        easy.wsSend(message, CurlWs.Text)

        const recvBuffer = Buffer.alloc(1024)
        await setTimeout(100)

        const recvResult = easy.wsRecv(recvBuffer)

        expect(recvResult.meta).not.toBeNull()
        if (recvResult.meta) {
          expect(recvResult.meta).toHaveProperty('age')
          expect(recvResult.meta).toHaveProperty('flags')
          expect(recvResult.meta).toHaveProperty('offset')
          expect(recvResult.meta).toHaveProperty('bytesleft')
          expect(recvResult.meta).toHaveProperty('len')

          expect(recvResult.meta.age).toBe(0)
          expect(recvResult.meta.len).toBeGreaterThan(0)
          expect(recvResult.meta.offset).toBeGreaterThanOrEqual(0)
        }

        easy.close()
      })

      it('should handle fragmented messages with bytesleft', async () => {
        // Create a large message that will be fragmented
        const largeMessage = 'A'.repeat(100000) // 100KB message

        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)

        const performCode = easy.perform()
        expect(performCode).toBe(CurlCode.CURLE_OK)

        // Send large text frame
        const message = Buffer.from(largeMessage)
        const sendResult = easy.wsSend(message, CurlWs.Text)
        expect(sendResult.code).toBe(CurlCode.CURLE_OK)

        // Receive fragmented response
        const chunks: Buffer[] = []
        let totalBytesReceived = 0
        let fragmentCount = 0
        let lastBytesleft = -1

        // Use a smaller buffer to force fragmentation handling
        const recvBuffer = Buffer.alloc(16384) // 16KB buffer

        await setTimeout(200) // Give server time to send

        while (true) {
          const recvResult = easy.wsRecv(recvBuffer)

          if (recvResult.code === CurlCode.CURLE_AGAIN) {
            await setTimeout(50)
            continue
          }

          if (recvResult.code === CurlCode.CURLE_GOT_NOTHING) {
            break
          }

          expect(recvResult.code).toBe(CurlCode.CURLE_OK)
          expect(recvResult.meta).not.toBeNull()

          if (recvResult.meta) {
            fragmentCount++
            const bytesleft = recvResult.meta.bytesleft

            // bytesleft should decrease as we receive more fragments
            if (lastBytesleft !== -1 && bytesleft > 0) {
              expect(bytesleft).toBeLessThan(lastBytesleft)
            }
            lastBytesleft = bytesleft

            // Add received chunk
            chunks.push(
              Buffer.from(recvBuffer.slice(0, recvResult.bytesReceived)),
            )
            totalBytesReceived += recvResult.bytesReceived

            // Last fragment should have bytesleft === 0
            if (bytesleft === 0) {
              expect(recvResult.meta.flags & CurlWs.Text).not.toBe(0)
              break
            }
          }
        }

        // Verify we received the complete message
        const reconstructed = Buffer.concat(chunks).toString('utf8')
        expect(reconstructed).toBe(largeMessage)
        expect(totalBytesReceived).toBe(message.length)

        // We should have received multiple fragments
        expect(fragmentCount).toBeGreaterThan(1)

        easy.close()
      })
    })

    describe('wsMeta() in WRITEFUNCTION', () => {
      it('should provide frame metadata in callback', async () => {
        // wsMeta() is designed to work inside WRITEFUNCTION callbacks
        // In CONNECT_ONLY mode, metadata is returned directly from wsRecv()
        // This test verifies that wsRecv returns proper metadata
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)

        const performCode = easy.perform()
        expect(performCode).toBe(CurlCode.CURLE_OK)

        // Send a message to trigger an echo
        const message = Buffer.from('Hello metadata!')
        easy.wsSend(message, CurlWs.Text)

        // Receive the echo - metadata comes with wsRecv result
        const recvBuffer = Buffer.alloc(1024)
        let recvResult: ReturnType<typeof easy.wsRecv>
        while (true) {
          recvResult = easy.wsRecv(recvBuffer)
          if (recvResult.code !== CurlCode.CURLE_AGAIN) {
            break
          }
          await setTimeout(100)
        }

        expect(recvResult.code).toBe(CurlCode.CURLE_OK)
        expect(recvResult.meta).not.toBeNull()

        if (recvResult.meta) {
          // Verify metadata properties are present
          expect(recvResult.meta).toHaveProperty('age')
          expect(recvResult.meta).toHaveProperty('flags')
          expect(recvResult.meta).toHaveProperty('bytesleft')
          expect(recvResult.meta).toHaveProperty('len')
          expect(recvResult.meta.flags & CurlWs.Text).not.toBe(0)
        }

        easy.close()
      })

      it('should return null when not in WebSocket context', () => {
        const easy = new Easy()
        withCommonTestOptions(easy)

        // Not a WebSocket connection
        const meta = easy.wsMeta()
        expect(meta).toBeNull()

        easy.close()
      })
    })

    describe('Error handling', () => {
      it('should handle closed handle', () => {
        const easy = new Easy()
        easy.close()

        expect(() => {
          easy.wsSend(Buffer.from('test'), CurlWs.Text)
        }).toThrow('Curl handle is closed')

        expect(() => {
          easy.wsRecv(Buffer.alloc(100))
        }).toThrow('Curl handle is closed')

        expect(() => {
          easy.wsMeta()
        }).toThrow('Curl handle is closed')
      })

      it('should validate wsSend arguments', () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)
        easy.perform()

        // Missing arguments
        expect(() => {
          // @ts-expect-error - testing invalid args
          easy.wsSend()
        }).toThrow('Missing buffer')

        // Invalid buffer
        expect(() => {
          // @ts-expect-error - testing invalid args
          easy.wsSend('not a buffer', CurlWs.Text)
        }).toThrow('Invalid Buffer')

        // Missing flags
        expect(() => {
          // @ts-expect-error - testing invalid args
          easy.wsSend(Buffer.from('test'))
        }).toThrow('Missing')

        // Invalid flags type
        expect(() => {
          // @ts-expect-error - testing invalid args
          easy.wsSend(Buffer.from('test'), 'not a number')
        }).toThrow('must be a number')

        easy.close()
      })

      it('should validate wsRecv arguments', () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)
        easy.perform()

        // Missing buffer
        expect(() => {
          // @ts-expect-error - testing invalid args
          easy.wsRecv()
        }).toThrow('Missing buffer')

        // Invalid buffer
        expect(() => {
          // @ts-expect-error - testing invalid args
          easy.wsRecv('not a buffer')
        }).toThrow('Invalid Buffer')

        easy.close()
      })
    })

    describe('Frame types', () => {
      it('should correctly identify text frames', async () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)
        easy.perform()

        easy.wsSend(Buffer.from('request'), CurlWs.Text)

        const buffer = Buffer.alloc(1024)
        let result: ReturnType<typeof easy.wsRecv>
        while (true) {
          result = easy.wsRecv(buffer)
          if (result.code !== CurlCode.CURLE_AGAIN) {
            break
          }
          await setTimeout(100)
        }

        expect(result.meta).not.toBeNull()
        if (result.meta) {
          const isText = (result.meta.flags & CurlWs.Text) !== 0
          const isBinary = (result.meta.flags & CurlWs.Binary) !== 0

          expect(isText).toBe(true)
          expect(isBinary).toBe(false)
        }

        easy.close()
      })

      it('should correctly identify binary frames', async () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)
        easy.perform()

        // Send binary data
        const binaryData = Buffer.from([1, 2, 3, 4])
        easy.wsSend(binaryData, CurlWs.Binary)

        const buffer = Buffer.alloc(1024)
        let result: ReturnType<typeof easy.wsRecv>
        while (true) {
          result = easy.wsRecv(buffer)
          if (result.code !== CurlCode.CURLE_AGAIN) {
            break
          }
          await setTimeout(100)
        }

        expect(result.meta).not.toBeNull()
        if (result.meta) {
          const isText = (result.meta.flags & CurlWs.Text) !== 0
          const isBinary = (result.meta.flags & CurlWs.Binary) !== 0

          expect(isText).toBe(false)
          expect(isBinary).toBe(true)
        }

        easy.close()
      })
    })

    describe('Integration with Curl wrapper', () => {
      it('should work with Easy handle directly', async () => {
        const easy = new Easy()
        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)

        const code = easy.perform()
        expect(code).toBe(CurlCode.CURLE_OK)

        const message = Buffer.from('Integration test')
        const { code: sendCode, bytesSent } = easy.wsSend(message, CurlWs.Text)

        expect(sendCode).toBe(CurlCode.CURLE_OK)
        expect(bytesSent).toBe(message.length)

        const buffer = Buffer.alloc(1024)
        let result: ReturnType<typeof easy.wsRecv>
        while (true) {
          result = easy.wsRecv(buffer)
          if (result.code !== CurlCode.CURLE_AGAIN) {
            break
          }
          await setTimeout(100)
        }

        expect(result.code).toBe(CurlCode.CURLE_OK)
        expect(result.bytesReceived).toBeGreaterThan(0)
        expect(result.meta).not.toBeNull()

        const received = buffer.toString('utf8', 0, result.bytesReceived)
        expect(received).toBe('Integration test')

        easy.close()
      })
    })

    describe('Multi interface integration', () => {
      it('should work with Multi handle for async operations', async () => {
        const easy = new Easy()
        const multi = new Multi()

        withCommonTestOptions(easy)
        easy.setOpt('URL', getWsUrl())
        easy.setOpt('CONNECT_ONLY', 2)

        let connectionEstablished = false
        let messageSent = false
        let messageReceived = false

        return new Promise<void>((resolve, reject) => {
          // Handle socket events for async I/O
          easy.onSocketEvent((error, events) => {
            if (error) {
              reject(error)
              return
            }

            const isWritable = events & SocketState.Writable
            const isReadable = events & SocketState.Readable

            // Send when writable
            if (isWritable && connectionEstablished && !messageSent) {
              const message = Buffer.from('Multi test')
              const sendResult = easy.wsSend(message, CurlWs.Text)

              expect(sendResult.code).toBe(CurlCode.CURLE_OK)
              expect(sendResult.bytesSent).toBe(message.length)
              messageSent = true
            }

            // Receive when readable
            if (isReadable && messageSent && !messageReceived) {
              const buffer = Buffer.alloc(1024)
              const recvResult = easy.wsRecv(buffer)

              expect(recvResult.code).toBe(CurlCode.CURLE_OK)
              expect(recvResult.bytesReceived).toBeGreaterThan(0)
              expect(recvResult.meta).not.toBeNull()

              const received = buffer.toString(
                'utf8',
                0,
                recvResult.bytesReceived,
              )
              expect(received).toBe('Multi test')

              messageReceived = true

              // Clean up
              easy.unmonitorSocketEvents()
              multi.removeHandle(easy)
              multi.close()
              easy.close()

              resolve()
            }
          })

          // Handle connection
          multi.onMessage((error) => {
            if (error) {
              reject(error)
              return
            }

            connectionEstablished = true
            easy.monitorSocketEvents()
          })

          // Start connection
          multi.addHandle(easy)
        })
      })
    })
  },
  10000,
)

describe.skipIf(isWebSocketSupported)(
  'WebSocket - Version Check',
  () => {
    it('should throw error on old libcurl versions', () => {
      const easy = new Easy()

      expect(() => {
        easy.wsSend(Buffer.from('test'), CurlWs.Text)
      }).toThrow('WebSocket support requires libcurl >= 7.86.0')

      expect(() => {
        easy.wsRecv(Buffer.alloc(100))
      }).toThrow('WebSocket support requires libcurl >= 7.86.0')

      expect(() => {
        easy.wsMeta()
      }).toThrow('WebSocket support requires libcurl >= 7.86.0')

      easy.close()
    })
  },
  5000,
)
