/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { createServer } from '../helper/server'
import { Curl, CurlCode, CurlFeature } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

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
    withCommonTestOptions(curl)
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

describe('reset() state restoration', () => {
  let server: ReturnType<typeof createServer>

  const performRequest = (handle: Curl) =>
    new Promise<{ status: number; data: string | Buffer }>(
      (resolve, reject) => {
        handle.once('end', (status, data) => resolve({ status, data }))
        handle.once('error', (error) => reject(error))
        handle.perform()
      },
    )

  beforeAll(async () => {
    server = createServer()
    server.app.get('/ua', (req, res) => {
      res.send(String(req.headers['user-agent']))
    })
    await server.listen()
  })

  afterAll(async () => {
    await server.close()
  })

  it('should clear enabled features', async () => {
    const handle = new Curl()
    withCommonTestOptions(handle)
    handle.setOpt('URL', server.path('/ua'))
    handle.enable(CurlFeature.Raw)

    try {
      const firstResponse = await performRequest(handle)
      expect(Buffer.isBuffer(firstResponse.data)).toBe(true)

      handle.reset()
      withCommonTestOptions(handle)
      handle.setOpt('URL', server.path('/ua'))

      // after reset the handle should be back to its initial state,
      // which means data parsing is enabled again
      const secondResponse = await performRequest(handle)
      expect(typeof secondResponse.data).toBe('string')
    } finally {
      handle.close()
    }
  })

  it('should restore the default USERAGENT', async () => {
    const handle = new Curl()
    withCommonTestOptions(handle)
    handle.setOpt('URL', server.path('/ua'))

    try {
      const firstResponse = await performRequest(handle)
      expect(firstResponse.data).toContain('node-libcurl/')

      handle.reset()
      withCommonTestOptions(handle)
      handle.setOpt('URL', server.path('/ua'))

      const secondResponse = await performRequest(handle)
      expect(secondResponse.data).toContain('node-libcurl/')
    } finally {
      handle.close()
    }
  })
})
