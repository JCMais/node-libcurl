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
import { Curl, CurlHttpVersion, CurlPush, Easy, Multi } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

type OnSessionFn = (session: ServerHttp2Session) => void
type OnStreamFn = (
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  flags: number,
) => void

const sessions = new Set<ServerHttp2Session>()
let serverInstance: ReturnType<typeof createHttp2Server>

const onError = (error: Error) => console.error(error)
const onSession: OnSessionFn = (_session) => {
  sessions.add(_session)
  _session.once('close', () => sessions.delete(_session))
}
const onStream: OnStreamFn = (stream, headers) => {
  if (headers[':path'] === '/push') {
    stream.pushStream({ ':path': '/asset' }, (error, pushed) => {
      if (!error) {
        pushed.on('error', () => {})
        pushed.respond({ ':status': 200 })
        pushed.end('asset')
      }
      stream.respond({ ':status': 200 })
      stream.end('parent')
    })
    return
  }
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
  })

  afterAll(async () => {
    serverInstance.server.removeListener('error', onError)
    serverInstance.server.removeListener('session', onSession)
    serverInstance.server.removeListener('stream', onStream)
    for (const session of sessions) session.destroy()
    await serverInstance.close()
  })

  it('should work with https2 site', async () => {
    const curl = new Curl()
    withCommonTestOptions(curl)

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

  it.runIf(Curl.isVersionGreaterOrEqualThan(8, 4, 0)).each([
    { accept: true, decision: 'accept' },
    { accept: false, decision: 'deny' },
    { accept: false, decision: 'throw while handling' },
  ])(
    'can $decision an HTTP/2 push',
    async ({ accept, decision }) => {
      const multi = new Multi()
      const parent = new Easy()
      withCommonTestOptions(parent)
      parent.setOpt('URL', `${serverInstance.url}/push`)
      parent.setOpt('HTTP_VERSION', CurlHttpVersion.V2_0)
      parent.setOpt('SSL_VERIFYPEER', false)
      let child: Easy | undefined
      let path: string | null = null
      let childBody = ''

      multi.setOpt('PUSHFUNCTION', (_parent, pushed, headers) => {
        child = pushed
        path = headers.getByName(':path')
        if (decision === 'throw while handling') throw new Error('push refused')
        if (!accept) return CurlPush.Deny
        pushed.setOpt('WRITEFUNCTION', (data) => {
          childBody += data.toString()
          return data.length
        })
        return CurlPush.Ok
      })

      try {
        await new Promise<void>((resolve, reject) => {
          let completed = 0
          multi.onMessage((error, handle) => {
            if (error) {
              reject(error)
              return
            }

            try {
              multi.removeHandle(handle)
              completed++
              if (completed === (accept ? 2 : 1)) resolve()
            } catch (removeError) {
              reject(removeError)
            }
          })
          multi.addHandle(parent)
        })

        expect(path).toBe('/asset')
        expect(child?.isOpen).toBe(accept)
        expect(childBody).toBe(accept ? 'asset' : '')
        expect(multi.getCount()).toBe(0)
      } finally {
        multi.close()
        if (child?.isOpen) child.close()
        parent.close()
      }
    },
    5000,
  )
})
