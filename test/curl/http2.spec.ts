/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import {
  ServerHttp2Session,
  ServerHttp2Stream,
  IncomingHttpHeaders,
} from 'http2'

import { host, portHttp2, serverHttp2 } from '../helper/server'
import { Curl, CurlHttpVersion } from '../../lib'

type OnSessionFn = (session: ServerHttp2Session) => void
type OnStreamFn = (
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  flags: number,
) => void

let session: ServerHttp2Session

const onError = (error: Error) => console.error(error)
const onSession: OnSessionFn = (_session) => {
  session = _session
}
const onStream: OnStreamFn = (stream, _headers) => {
  stream.respond({
    'content-type': 'text/html',
    ':status': 200,
  })
  stream.end('<h1>Hello World</h1>')
}

describe('HTTP2', () => {
  before((done) => {
    serverHttp2.on('error', onError)
    serverHttp2.on('session', onSession)
    serverHttp2.on('stream', onStream)

    serverHttp2.listen(portHttp2, host, () => {
      done()
    })
  })

  after((done) => {
    serverHttp2.removeListener('error', onError)
    serverHttp2.removeListener('session', onSession)
    serverHttp2.removeListener('stream', onStream)
    session
      ? session.close(() => {
          session.destroy()
          serverHttp2.close(done)
        })
      : serverHttp2.close(done)
  })

  it('should work with https2 site', (done) => {
    const curl = new Curl()

    curl.setOpt('URL', `https://${host}:${portHttp2}/`)
    curl.setOpt('HTTP_VERSION', CurlHttpVersion.V2_0)
    curl.setOpt('SSL_VERIFYPEER', false)

    curl.on('end', (statusCode) => {
      curl.close()

      statusCode.should.be.equal(200)
      done()
    })

    curl.on('error', (error) => {
      curl.close()
      done(error)
    })

    curl.perform()
  })
})
