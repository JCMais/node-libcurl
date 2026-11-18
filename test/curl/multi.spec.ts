/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { executionAsyncResource } from 'async_hooks'
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { createServer } from '../helper/server'
import { Easy, Multi } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

let serverInstance: ReturnType<typeof createServer>

const createEasy = () => {
  const easy = new Easy()
  withCommonTestOptions(easy)
  easy.setOpt('URL', serverInstance.url)
  easy.setOpt('WRITEFUNCTION', (_buf, size, nmemb) => size * nmemb)
  return easy
}

// Lets libuv run a few more iterations. If close() left sockets or timers in a
// bad state, the process crashes or this never resolves.
const pumpLoop = () => new Promise((resolve) => setTimeout(resolve, 50))

describe('Multi', () => {
  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/', (_req, res) => {
      res.send('Hello World!')
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
    serverInstance.app._router.stack.pop()
  })

  // With the notifications API (libcurl >= 8.17), onMessage runs inside
  // libcurl's notify callback, that is, while curl_multi_socket_action is still
  // on the stack. With polling it runs after curl_multi_socket_action returned.
  // On libcurl < 8.17 both entries use polling.
  describe.each([
    { name: 'notifications API', shouldUseNotificationsApi: true },
    { name: 'polling', shouldUseNotificationsApi: false },
  ])('close ($name)', ({ shouldUseNotificationsApi }) => {
    // onMessage runs inside the callback scope opened when entering JS from
    // libuv, and since Node.js 25 the async resource stack points into that
    // scope's async context, so the context must outlive close(). Reading the
    // stack used to return garbage or crash the process.
    it('should keep the async resource valid when called from inside onMessage', async () => {
      const { before, after } = await new Promise<{
        before: object
        after: object
      }>((resolve, reject) => {
        const multi = new Multi({ shouldUseNotificationsApi })

        multi.onMessage((error, handle) => {
          const before = executionAsyncResource()

          multi.removeHandle(handle)
          handle.close()
          multi.close()

          if (error) {
            reject(error)
            return
          }

          resolve({ before, after: executionAsyncResource() })
        })
        multi.addHandle(createEasy())
      })

      expect(typeof before).toBe('object')
      expect(after).toBe(before)

      await pumpLoop()
    })

    // libcurl rejects curl_multi_cleanup with CURLM_RECURSIVE_API_CALL while
    // its own callbacks are running, which used to trip an assert in Dispose.
    it('should not crash when called from inside an Easy callback', async () => {
      const multi = new Multi({ shouldUseNotificationsApi })
      const easy = createEasy()

      let closed = false

      await new Promise<void>((resolve) => {
        easy.setOpt('WRITEFUNCTION', (_buf, size, nmemb) => {
          if (!closed) {
            closed = true
            multi.close()
            resolve()
          }
          return size * nmemb
        })

        multi.onMessage(() => {})
        multi.addHandle(easy)
      })

      await pumpLoop()

      expect(() => multi.close()).toThrow('Multi handle already closed.')
    })
  })
})
