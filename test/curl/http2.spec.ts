/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { ServerHttp2Session } from 'http2'

import { host, portHttp2, serverHttp2 } from '../helper/server'
import { Curl, CurlHttpVersion } from '../../lib'

let session: ServerHttp2Session

describe('HTTP2', () => {
  before(done => {
    serverHttp2.on('error', error => console.error(error))
    serverHttp2.on('session', sess => {
      session = sess
    })
    serverHttp2.on('stream', (stream, _headers) => {
      stream.respond({
        'content-type': 'text/html',
        ':status': 200,
      })
      stream.end('<h1>Hello World</h1>')
    })

    serverHttp2.listen(portHttp2, host, () => {
      done()
    })
  })

  after(() => {
    serverHttp2.close()
  })

  it('should work with https2 site', done => {
    const curl = new Curl()

    curl.setOpt('URL', `https://${host}:${portHttp2}/`)
    curl.setOpt('HTTP_VERSION', CurlHttpVersion.V2_0)
    curl.setOpt('SSL_VERIFYPEER', false)

    curl.on('end', statusCode => {
      curl.close()
      session && session.destroy()

      statusCode.should.be.equal(200)
      done()
    })

    curl.on('error', error => {
      curl.close()
      session && session.destroy()
      done(error)
    })

    curl.perform()
  })
})
