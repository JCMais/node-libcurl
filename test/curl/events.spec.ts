/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { app, host, port, server } from '../helper/server'
import { Curl, CurlCode } from '../../lib'

let curl: Curl
let timeout: NodeJS.Timeout

describe('Events', () => {
  beforeEach(() => {
    curl = new Curl()
    curl.setOpt('URL', `http://${host}:${port}`)
  })

  afterEach(() => {
    curl.close()
  })

  before(done => {
    app.all('/', (req, res) => {
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

    server.listen(port, host, done)
  })

  after(() => {
    app._router.stack.pop()
    server.close()
  })

  it('should emit "end" event when the connection ends without errors.', done => {
    curl.on('end', () => {
      clearTimeout(timeout)

      done()
    })

    curl.on('error', error => {
      clearTimeout(timeout)

      done(error)
    })

    curl.perform()
  })

  it('should emit "error" event when the connection fails', done => {
    curl.setOpt('POSTFIELDS', 'errReq=true')
    curl.setOpt('FAILONERROR', true)

    curl.on('end', () => {
      clearTimeout(timeout)
      done(Error('end event was called, but the connection failed.'))
    })

    curl.on('error', (error, errorCode) => {
      error.should.be.instanceof(Error)
      errorCode.should.be.of
        .type('number')
        .and.equal(CurlCode.CURLE_HTTP_RETURNED_ERROR)

      clearTimeout(timeout)

      done()
    })

    curl.perform()
  })

  it('should emit "error" when the connection is aborted in the progress cb', done => {
    curl.setProgressCallback(() => {
      return 1
    })

    curl.setOpt('NOPROGRESS', false)

    curl.on('end', () => {
      clearTimeout(timeout)

      done(Error('end event was called, but the connection was aborted.'))
    })

    curl.on('error', error => {
      error.should.be.instanceof(Error)

      clearTimeout(timeout)

      done()
    })

    curl.perform()
  })

  it('should emit "error" when the connection is aborted in the header cb', done => {
    curl.setOpt('HEADERFUNCTION', (_data, _size, _nmemb) => {
      return -1
    })

    curl.on('end', () => {
      clearTimeout(timeout)

      done(Error('end event was called, but the connection was aborted.'))
    })

    curl.on('error', (error, errorCode) => {
      error.should.be.instanceof(Error)
      errorCode.should.be.of
        .type('number')
        .and.equal(CurlCode.CURLE_WRITE_ERROR)

      clearTimeout(timeout)

      done()
    })

    curl.perform()
  })

  it('should emit "error" when the connection is aborted in the data cb', done => {
    curl.setOpt('WRITEFUNCTION', (_data, _size, _nmemb) => {
      return -1
    })

    curl.on('end', () => {
      clearTimeout(timeout)

      done(Error('end event was called, but the connection was aborted.'))
    })

    curl.on('error', (error, errorCode) => {
      error.should.be.instanceof(Error)
      errorCode.should.be.of
        .type('number')
        .and.equal(CurlCode.CURLE_WRITE_ERROR)

      clearTimeout(timeout)

      done()
    })

    curl.perform()
  })
})
