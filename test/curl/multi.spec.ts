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

  describe('close', () => {
    // onMessage runs inside the callback scope opened by OnSocket / OnTimeout,
    // and since Node.js 25 the async resource stack points into that scope's
    // async context, so the context must outlive close(). Reading the stack
    // used to return garbage or crash the process.
    //
    // Pinned to the polling path: with the notifications API, onMessage runs
    // inside libcurl's notify callback, where curl_multi_cleanup fails with
    // CURLM_RECURSIVE_API_CALL.
    it('should keep the async resource valid when called from inside onMessage', async () => {
      const resourceAfterClose = await new Promise<unknown>(
        (resolve, reject) => {
          const multi = new Multi({ shouldUseNotificationsApi: false })
          const easy = new Easy()
          withCommonTestOptions(easy)
          easy.setOpt('URL', serverInstance.url)
          easy.setOpt('WRITEFUNCTION', (_buf, size, nmemb) => size * nmemb)

          multi.onMessage((error, handle) => {
            multi.removeHandle(handle)
            handle.close()
            multi.close()

            if (error) {
              reject(error)
              return
            }

            resolve(executionAsyncResource())
          })
          multi.addHandle(easy)
        },
      )

      expect(typeof resourceAfterClose).toBe('object')
    })
  })
})
