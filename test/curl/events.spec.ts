/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  describe,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  it,
  expect,
} from 'vitest'

import { createServer } from '../helper/server'
import { Curl, CurlCode } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

let curl: Curl
let timeout: NodeJS.Timeout
let serverInstance: ReturnType<typeof createServer>

describe('Events', () => {
  beforeEach(() => {
    curl = new Curl()
    withCommonTestOptions(curl)
    curl.setOpt('URL', serverInstance.url)
  })

  afterEach(() => {
    curl.close()
  })

  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.all('/', (req, res) => {
      if (req.body.errReq) {
        res.status(500)
        res.end()
      } else {
        res.send('Hello World!')
      }

      timeout = setTimeout(() => {
        throw Error('No action taken.')
      }, 1000)
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
    serverInstance.app._router.stack.pop()
  })

  it('should emit "end" event when the connection ends without errors.', async () => {
    const result = await new Promise<void>((resolve, reject) => {
      curl.on('end', () => {
        clearTimeout(timeout)
        resolve()
      })

      curl.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })

      curl.perform()
    })

    expect(result).toBeUndefined()
  })

  it('should emit "error" event when the connection fails', async () => {
    curl.setOpt('POSTFIELDS', 'errReq=true')
    curl.setOpt('FAILONERROR', true)

    const error = await new Promise<{ error: Error; errorCode: number }>(
      (resolve, reject) => {
        curl.on('end', () => {
          clearTimeout(timeout)
          reject(new Error('end event was called, but the connection failed.'))
        })

        curl.on('error', (error, errorCode) => {
          clearTimeout(timeout)
          resolve({ error, errorCode })
        })

        curl.perform()
      },
    )

    expect(error.error).toBeInstanceOf(Error)
    expect(error.errorCode).toBe(CurlCode.CURLE_HTTP_RETURNED_ERROR)
  })

  it('should emit "error" when the connection is aborted in the progress cb', async () => {
    curl.setProgressCallback(() => {
      return 1
    })

    curl.setOpt('NOPROGRESS', false)

    const error = await new Promise<Error>((resolve, reject) => {
      curl.on('end', () => {
        clearTimeout(timeout)
        reject(
          new Error('end event was called, but the connection was aborted.'),
        )
      })

      curl.on('error', (error) => {
        clearTimeout(timeout)
        resolve(error)
      })

      curl.perform()
    })

    expect(error).toBeInstanceOf(Error)
  })

  it('should emit "error" when the connection is aborted in the header cb', async () => {
    curl.setOpt('HEADERFUNCTION', (_data, _size, _nmemb) => {
      return -1
    })

    const error = await new Promise<{ error: Error; errorCode: number }>(
      (resolve, reject) => {
        curl.on('end', () => {
          clearTimeout(timeout)
          reject(
            new Error('end event was called, but the connection was aborted.'),
          )
        })

        curl.on('error', (error, errorCode) => {
          clearTimeout(timeout)
          resolve({ error, errorCode })
        })

        curl.perform()
      },
    )

    expect(error.error).toBeInstanceOf(Error)
    expect(error.errorCode).toBe(CurlCode.CURLE_WRITE_ERROR)
  })

  it('should emit "error" when the connection is aborted in the data cb', async () => {
    curl.setOpt('WRITEFUNCTION', (_data, _size, _nmemb) => {
      return -1
    })

    const error = await new Promise<{ error: Error; errorCode: number }>(
      (resolve, reject) => {
        curl.on('end', () => {
          clearTimeout(timeout)
          reject(
            new Error('end event was called, but the connection was aborted.'),
          )
        })

        curl.on('error', (error, errorCode) => {
          clearTimeout(timeout)
          resolve({ error, errorCode })
        })

        curl.perform()
      },
    )

    expect(error.error).toBeInstanceOf(Error)
    expect(error.errorCode).toBe(CurlCode.CURLE_WRITE_ERROR)
  })
})
