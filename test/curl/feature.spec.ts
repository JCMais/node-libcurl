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
import { Curl, CurlFeature, HeaderInfo } from '../../lib'

const responseData = 'Ok'
const responseLength = responseData.length

let curl: Curl
let headerLength: number
let serverInstance: ReturnType<typeof createServer>

describe('Features', () => {
  beforeEach(() => {
    curl = new Curl()
    curl.setOpt('URL', serverInstance.url)
  })

  afterEach(() => {
    curl.close()
  })

  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/', (_req, res) => {
      res.send(responseData)

      // @ts-ignore
      headerLength = res._header.length
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
    serverInstance.app._router.stack.pop()
  })

  it('should not store data when NoDataStorage is set', async () => {
    curl.enable(CurlFeature.NoDataStorage)

    const result = await new Promise<{
      status: number
      data: Buffer | string
      headers: Buffer | HeaderInfo[]
    }>((resolve, reject) => {
      curl.on('end', (status, data, headers) => {
        resolve({ status, data, headers })
      })

      curl.on('error', reject)

      curl.perform()
    })

    expect(result.data).toBeInstanceOf(Buffer)
    expect(result.data.length).toBe(0)
    expect(result.headers).toBeInstanceOf(Array)
    expect(result.headers.length).toBe(1)
  })

  it('should not store headers when NoHeaderStorage is set', async () => {
    curl.enable(CurlFeature.NoHeaderStorage)

    const result = await new Promise<{
      status: number
      data: Buffer | string
      headers: Buffer | HeaderInfo[]
    }>((resolve, reject) => {
      curl.on('end', (status, data, headers) => {
        resolve({ status, data, headers })
      })

      curl.on('error', reject)

      curl.perform()
    })

    expect(result.data).toBeTypeOf('string')
    expect(result.data.length).toBe(responseLength)
    expect(result.headers).toBeInstanceOf(Buffer)
    expect(result.headers.length).toBe(0)
  })

  it('should not parse data when NoDataParsing is set', async () => {
    curl.enable(CurlFeature.NoDataParsing)

    const result = await new Promise<{
      status: number
      data: Buffer | string
      headers: Buffer | HeaderInfo[]
    }>((resolve, reject) => {
      curl.on('end', (status, data, headers) => {
        resolve({ status, data, headers })
      })

      curl.on('error', reject)

      curl.perform()
    })

    expect(result.data).toBeInstanceOf(Buffer)
    expect(result.data.length).toBe(responseLength)
    expect(result.headers).toBeInstanceOf(Array)
    expect(result.headers.length).toBe(1)
  })

  it('should not parse headers when NoHeaderParsing is set', async () => {
    curl.enable(CurlFeature.NoHeaderParsing)

    const result = await new Promise<{
      status: number
      data: Buffer | string
      headers: Buffer | HeaderInfo[]
    }>((resolve, reject) => {
      curl.on('end', (status, data, headers) => {
        resolve({ status, data, headers })
      })

      curl.on('error', reject)

      curl.perform()
    })

    expect(result.data).toBeTypeOf('string')
    expect(result.data.length).toBe(responseLength)
    expect(result.headers).toBeInstanceOf(Buffer)
    expect(result.headers.length).toBe(headerLength)
  })
})
