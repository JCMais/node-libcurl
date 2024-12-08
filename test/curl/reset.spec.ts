/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it } from 'vitest'

import { createServer } from '../helper/server'
import { Curl, CurlCode } from '../../lib'

let firstRun = true
let curl: Curl
let serverInstance: ReturnType<typeof createServer>

describe('reset()', () => {
  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/', (_req, res) => {
      res.send('Hi')
    })
    await serverInstance.listen()

    curl = new Curl()
    curl.setOpt('URL', serverInstance.url)
  })

  afterAll(async () => {
    curl.close()
    await serverInstance.close()
    serverInstance.app._router.stack.pop()
  })

  it('should reset the curl handler', async () => {
    const makeRequest = () =>
      new Promise<void>((resolve, reject) => {
        const endHandler = () => {
          if (!firstRun) {
            reject(new Error('Failed to reset.'))
            return
          }

          firstRun = false

          curl.reset()

          curl.on('end', endHandler)
          curl.on('error', errorHandler)

          // try to make another request
          curl.perform()
        }

        const errorHandler = (error: Error, errorCode: CurlCode) => {
          // curlCode == 3 -> Invalid URL
          if (errorCode === 3) {
            resolve()
          } else {
            reject(error)
          }
        }

        curl.on('end', endHandler)
        curl.on('error', errorHandler)
        curl.perform()
      })

    await makeRequest()
  })
})
