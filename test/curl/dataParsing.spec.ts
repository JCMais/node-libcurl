/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { createServer } from '../helper/server'
import { Curl, HeaderInfo } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

let serverInstance: ReturnType<typeof createServer>

// a body that ends in the middle of a multibyte UTF-8 character (truncated 🚀)
const truncatedUtf8Body = Buffer.concat([
  Buffer.from('hello '),
  Buffer.from([0xf0, 0x9f]),
])

const performRequest = (handle: Curl) =>
  new Promise<{
    status: number
    data: string | Buffer
    headers: Buffer | HeaderInfo[]
  }>((resolve, reject) => {
    handle.once('end', (status, data, headers) =>
      resolve({ status, data, headers }),
    )
    handle.once('error', (error) => reject(error))
    handle.perform()
  })

describe('data parsing', () => {
  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/truncated-utf8', (_req, res) => {
      res.set('Content-Type', 'application/octet-stream')
      res.send(truncatedUtf8Body)
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
  })

  it('should not corrupt header parsing when the body ends mid UTF-8 character', async () => {
    const curl = new Curl()
    withCommonTestOptions(curl)
    curl.setOpt('URL', serverInstance.path('/truncated-utf8'))

    try {
      const { headers } = await performRequest(curl)

      expect(Array.isArray(headers)).toBe(true)
      const headerGroups = headers as HeaderInfo[]
      expect(headerGroups[0].result?.version).toBe('HTTP/1.1')
      expect(headerGroups[0].result?.code).toBe(200)
    } finally {
      curl.close()
    }
  })

  it('should not leak decoder state into other requests', async () => {
    const firstCurl = new Curl()
    withCommonTestOptions(firstCurl)
    firstCurl.setOpt('URL', serverInstance.path('/truncated-utf8'))

    const secondCurl = new Curl()
    withCommonTestOptions(secondCurl)
    secondCurl.setOpt('URL', serverInstance.path('/truncated-utf8'))

    try {
      const firstResponse = await performRequest(firstCurl)
      const secondResponse = await performRequest(secondCurl)

      // each request must decode its own body independently:
      // the truncated trailing bytes become a single replacement char
      expect(firstResponse.data).toBe('hello �')
      expect(secondResponse.data).toBe('hello �')
    } finally {
      firstCurl.close()
      secondCurl.close()
    }
  })
})
