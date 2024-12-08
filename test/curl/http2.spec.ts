/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import {
  ServerHttp2Session,
  ServerHttp2Stream,
  IncomingHttpHeaders,
} from 'http2'

import { createHttp2Server } from '../helper/server'
import { Curl, CurlHttpVersion } from '../../lib'

type OnSessionFn = (session: ServerHttp2Session) => void
type OnStreamFn = (
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  flags: number,
) => void

let session: ServerHttp2Session
let serverInstance: ReturnType<typeof createHttp2Server>

const onError = (error: Error) => console.error(error)
const onSession: OnSessionFn = (_session) => {
  session = _session
}
const onStream: OnStreamFn = (stream, _headers) => {
  console.log('Received headers:', _headers)
  stream.respond({
    'content-type': 'text/html',
    ':status': 200,
  })
  stream.end('<h1>Hello World</h1>')
}

describe('HTTP2', () => {
  beforeAll(async () => {
    serverInstance = createHttp2Server()
    serverInstance.server.on('error', onError)
    serverInstance.server.on('session', onSession)
    serverInstance.server.on('stream', onStream)
    await serverInstance.listen()
    console.log(serverInstance.url)
  })

  afterAll(async () => {
    serverInstance.server.removeListener('error', onError)
    serverInstance.server.removeListener('session', onSession)
    serverInstance.server.removeListener('stream', onStream)
    session?.destroy()
    await serverInstance.close()
  })

  it('should work with https2 site', async () => {
    const curl = new Curl()

    curl.setOpt('URL', serverInstance.url)
    curl.setOpt('HTTP_VERSION', CurlHttpVersion.V2_0)
    curl.setOpt('SSL_VERIFYPEER', false)

    const result = await new Promise<number>((resolve, reject) => {
      curl.on('end', (statusCode) => {
        curl.close()
        resolve(statusCode)
      })

      curl.on('error', (error) => {
        curl.close()
        reject(error)
      })

      curl.perform()
    })

    expect(result).toBe(200)
  })
})
