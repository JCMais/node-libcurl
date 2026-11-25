/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { createServer } from '../helper/server'
import { Curl, Multi } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

let serverInstance: ReturnType<typeof createServer>

describe('close()', () => {
  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/', (_req, res) => {
      res.send('Hello World!')
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
  })

  it('should safely abort an in-flight request', async () => {
    const curl = new Curl()
    withCommonTestOptions(curl)
    curl.setOpt('URL', serverInstance.url)

    await new Promise<void>((resolve, reject) => {
      curl.on('data', () => {
        try {
          curl.close()
        } catch (error) {
          reject(error)
          return
        }

        // the rejection of the internal multi.perform() promise is processed
        // asynchronously - give it time to settle so an uncaught 'error' emit
        // (which would crash the process) has a chance to happen
        setTimeout(resolve, 100)
      })

      curl.perform()
    })

    expect(curl.isOpen).toBe(false)
  })

  it('should remove the handle from the custom Multi instance set with setMulti()', async () => {
    const multi = new Multi()
    const curl = new Curl()
    withCommonTestOptions(curl)
    curl.setMulti(multi)
    curl.setOpt('URL', serverInstance.url)

    try {
      await new Promise<void>((resolve, reject) => {
        curl.on('data', () => {
          try {
            // with the bug, this tries to remove the handle from the global
            // multi instead of the custom one and throws
            curl.close()
          } catch (error) {
            reject(error)
            return
          }

          setTimeout(resolve, 100)
        })

        curl.perform()
      })

      expect(curl.isOpen).toBe(false)
    } finally {
      if (curl.isOpen) {
        curl.close()
      }
      multi.close()
    }
  })
})
