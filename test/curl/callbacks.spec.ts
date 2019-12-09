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

const url = `http://${host}:${port}`

describe('Callbacks', () => {
  beforeEach(() => {
    curl = new Curl()
  })

  afterEach(() => {
    curl.close()
  })

  before(done => {
    server.listen(port, host, done)

    app.get('/delayed', (_req, res) => {
      const delayBetweenSends = 10
      const data = [
        '<html>',
        '<body>',
        '<h1>Hello, World!</h1>',
        '</body>',
        '</html>',
      ]
      const send = () => {
        const item = data.shift()

        if (!item) {
          res.end()
          return
        }

        res.write(item)
        setTimeout(send, delayBetweenSends)
      }

      send()
    })

    let trailers: { [key: string]: string | undefined }

    app.get('/trailers', (req, res) => {
      res.send({
        trailers,
      })
    })

    app.put('/headers', (req, res) => {

      req.resume()

      req.on('end', () => {
        trailers = req.trailers

        res.send({
          headers: req.headers,
          trailers: req.trailers,
        })
      })
    })
  })

  after(() => {
    server.close()
    app._router.stack.pop()
    app._router.stack.pop()
    app._router.stack.pop()
  })

  describe('progress', function() {
    this.timeout(10000)

    it('should work', done => {
      let wasCalled = false

      curl.setOpt('URL', `${url}/delayed`)
      curl.setOpt('NOPROGRESS', false)

      curl.setProgressCallback((dltotal, dlnow, ultotal, ulnow) => {
        wasCalled = true
        dltotal.should.be.a.Number()
        dlnow.should.be.a.Number()
        ultotal.should.be.a.Number()
        ulnow.should.be.a.Number()
        return 0
      })

      curl.on('end', () => {
        wasCalled.should.be.true
        done()
      })

      curl.on('error', done)

      curl.perform()
    })

    it('should not accept undefined return', done => {
      curl.setOpt('URL', `${url}/delayed`)
      curl.setOpt('NOPROGRESS', false)

      // @ts-ignore we want to test returning undefined here
      curl.setProgressCallback((_dltotal, dlnow, _ultotal, _ulnow) => {
        return dlnow >= 40 ? undefined : 0
      })

      curl.on('end', () => {
        done()
      })

      curl.on('error', error => {
        // eslint-disable-next-line no-undef
        error.should.be.a.instanceOf(TypeError)
        done()
      })

      curl.perform()
    })
  })

  if (Curl.isVersionGreaterOrEqualThan(7, 64, 0)) {
    describe('trailer', function() {
      this.timeout(5000)

      it('should work', done => {
        let wasCalled = false
        let isFirstCall = true

        curl.setOpt('URL', `${url}/headers`)
        curl.setOpt('UPLOAD', true)
        curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
        curl.setOpt('TRAILERFUNCTION', () => {
          wasCalled = true
          return ['x-random-header: random-value2']
        })
        curl.setOpt(Curl.option.READFUNCTION, (buffer, size, nmemb) => {
          const data = 'HELLO'
          buffer.write(data)
          return 0
        })

        curl.on('end', (statusCode, body) => {
          if (isFirstCall) {
            wasCalled.should.be.equal(true)
            statusCode.should.be.equal(200)

            curl.setOpt('URL', `${url}/trailers`)
            curl.setOpt('UPLOAD', 0)
            curl.setOpt('HTTPHEADER', null)
            curl.setOpt('TRAILERFUNCTION', null)

            isFirstCall = false
            wasCalled = false

            curl.perform()
          } else {
            wasCalled.should.be.equal(false)
            JSON.parse(body as string).trailers[
              'x-random-header'
            ].should.be.equal('random-value2')
            done()
          }
        })

        curl.on('error', done)

        curl.perform()
      })

      it('should abort request on false', done => {
        curl.setOpt('URL', `${url}/headers`)
        curl.setOpt('UPLOAD', true)
        curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
        curl.setOpt('TRAILERFUNCTION', () => {
          return false
        })
        curl.setOpt(Curl.option.READFUNCTION, (buffer, size, nmemb) => {
          const data = 'HELLO'
          buffer.write(data)
          return 0
        })

        curl.on('end', () => {
          done(new Error('end called - request wast not aborted by request'))
        })

        curl.on('error', (error, errorCode) => {
          errorCode.should.be.equal(CurlCode.CURLE_ABORTED_BY_CALLBACK)
          done()
        })

        curl.perform()
      })

      it('should throw an error on invalid return value', done => {
        curl.setOpt('URL', `${url}/headers`)
        curl.setOpt('UPLOAD', true)
        curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
        // @ts-ignore
        curl.setOpt('TRAILERFUNCTION', () => {
          return {}
        })

        curl.setOpt(Curl.option.READFUNCTION, (buffer, size, nmemb) => {
          const data = 'HELLO'
          buffer.write(data)
          return 0
        })

        curl.on('end', () => {
          done(new Error('end called - request wast not aborted by request'))
        })

        curl.on('error', (error, errorCode) => {
          error.message.should.be.equal(
            'Return value from the Trailer callback must be an array of strings or false.',
          )
          errorCode.should.be.equal(CurlCode.CURLE_ABORTED_BY_CALLBACK)
          done()
        })

        curl.perform()
      })
    })
  }
})
