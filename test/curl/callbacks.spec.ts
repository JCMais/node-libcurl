import {
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
} from 'vitest'

import { app, host, port, server } from '../helper/server'
import { Curl, CurlCode } from '../../lib'
import { CurlPreReqFunc } from '../../lib/enum/CurlPreReqFunc'

let curl: Curl

const url = `http://${host}:${port}`

describe('Callbacks', () => {
  beforeEach(() => {
    curl = new Curl()
  })

  afterEach(() => {
    curl.close()
  })

  beforeAll(
    () =>
      new Promise((done) => {
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
      }),
  )

  afterAll(() => {
    server.close()
    app._router.stack.pop()
    app._router.stack.pop()
    app._router.stack.pop()
  })

  describe('progress', () => {
    it('should work', () =>
      new Promise<void>((resolve, reject) => {
        expect.hasAssertions()

        let wasCalled = false

        curl.setOpt('URL', `${url}/delayed`)
        curl.setOpt('NOPROGRESS', false)

        curl.setProgressCallback((dltotal, dlnow, ultotal, ulnow) => {
          wasCalled = true
          expect(typeof dltotal).toBe('number')
          expect(typeof dlnow).toBe('number')
          expect(typeof ultotal).toBe('number')
          expect(typeof ulnow).toBe('number')
          return 0
        })

        curl.on('end', () => {
          expect(wasCalled).toBe(true)
          resolve()
        })

        curl.on('error', reject)

        curl.perform()
      }))

    it('should not accept undefined return', () =>
      new Promise<void>((resolve, reject) => {
        expect.hasAssertions()
        curl.setOpt('URL', `${url}/delayed`)
        curl.setOpt('NOPROGRESS', false)

        // @ts-ignore we want to test returning undefined here
        curl.setProgressCallback((_dltotal, dlnow, _ultotal, _ulnow) => {
          return dlnow >= 40 ? undefined : 0
        })

        curl.on('end', () => {
          resolve()
        })

        curl.on('error', (error) => {
          // eslint-disable-next-line no-undef
          expect(error).toBeInstanceOf(TypeError)
          resolve()
        })

        curl.perform()
      }))
  })

  if (Curl.isVersionGreaterOrEqualThan(7, 64, 0)) {
    describe('trailer', () => {
      it('should work', () =>
        new Promise<void>((resolve, reject) => {
          let wasCalled = false
          let isFirstCall = true

          curl.setOpt('URL', `${url}/headers`)
          curl.setOpt('UPLOAD', true)
          curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
          curl.setOpt('TRAILERFUNCTION', () => {
            wasCalled = true
            return ['x-random-header: random-value2']
          })

          let finished = false
          curl.setOpt(Curl.option.READFUNCTION, (buffer, _size, _nmemb) => {
            if (finished) return 0

            const data = 'HELLO'
            finished = true
            return buffer.write(data)
          })

          curl.on('end', (statusCode, body) => {
            if (isFirstCall) {
              expect(wasCalled).toBe(true)
              expect(statusCode).toBe(200)

              curl.setOpt('URL', `${url}/trailers`)
              curl.setOpt('UPLOAD', 0)
              curl.setOpt('HTTPHEADER', null)
              curl.setOpt('TRAILERFUNCTION', null)

              isFirstCall = false
              wasCalled = false

              curl.perform()
            } else {
              expect(wasCalled).toBe(false)
              expect(
                JSON.parse(body as string).trailers['x-random-header'],
              ).toBe('random-value2')
              resolve()
            }
          })

          curl.on('error', reject)

          curl.perform()
        }))

      it('should abort request on false', () =>
        new Promise<void>((resolve, reject) => {
          curl.setOpt('URL', `${url}/headers`)
          curl.setOpt('UPLOAD', true)
          curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
          curl.setOpt('TRAILERFUNCTION', () => {
            return false
          })

          let finished = false
          curl.setOpt(Curl.option.READFUNCTION, (buffer, _size, _nmemb) => {
            if (finished) return 0

            const data = 'HELLO'
            finished = true
            return buffer.write(data)
          })

          curl.on('end', () => {
            reject(
              new Error('end called - request wast not aborted by request'),
            )
          })

          curl.on('error', (error, errorCode) => {
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        }))

      it('should rethrow error thrown inside callback', () =>
        new Promise<void>((resolve, reject) => {
          curl.setOpt('URL', `${url}/headers`)
          curl.setOpt('UPLOAD', true)
          curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
          // @ts-ignore
          curl.setOpt('TRAILERFUNCTION', () => {
            throw new Error('thrown error inside callback')
          })

          let finished = false
          curl.setOpt(Curl.option.READFUNCTION, (buffer, _size, _nmemb) => {
            if (finished) return 0

            const data = 'HELLO'
            finished = true
            return buffer.write(data)
          })

          curl.on('end', () => {
            reject(
              new Error('end called - request wast not aborted by request'),
            )
          })

          curl.on('error', (error, errorCode) => {
            expect(error.message).toBe('thrown error inside callback')
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        }))

      it('should throw an error on invalid return value', () =>
        new Promise<void>((resolve, reject) => {
          curl.setOpt('URL', `${url}/headers`)
          curl.setOpt('UPLOAD', true)
          curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
          // @ts-expect-error this should require the fn to return an enum value!
          curl.setOpt('TRAILERFUNCTION', () => {
            console.log('CALLED')
            return {}
          })

          let finished = false
          curl.setOpt(Curl.option.READFUNCTION, (buffer, _size, _nmemb) => {
            if (finished) return 0

            const data = 'HELLO'
            finished = true
            return buffer.write(data)
          })

          curl.on('end', () => {
            reject(
              new Error('end called - request wast not aborted by request'),
            )
          })

          curl.on('error', (error, errorCode) => {
            expect(error.message).toBe(
              'Return value from the Trailer callback must be an array of strings or false.',
            )
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        }))
    })
  }

  if (Curl.isVersionGreaterOrEqualThan(7, 80, 0)) {
    describe('prereq', () => {
      it('should work', () =>
        new Promise<void>((resolve, reject) => {
          let wasCalled = false

          curl.setOpt('URL', `${url}/headers`)
          curl.setOpt('PREREQFUNCTION', () => {
            wasCalled = true
            return CurlPreReqFunc.Ok
          })

          curl.on('end', () => {
            expect(wasCalled).toBe(true)
            resolve()
          })

          curl.on('error', reject)

          curl.perform()
        }))

      it('should abort request on Abort return value', () =>
        new Promise<void>((resolve, reject) => {
          let wasCalled = false

          curl.setOpt('URL', `${url}/headers`)
          curl.setOpt('PREREQFUNCTION', () => {
            wasCalled = true
            return CurlPreReqFunc.Abort
          })

          curl.on('end', () => {
            reject(
              new Error('end called - request wast not aborted by request'),
            )
          })

          curl.on('error', (_error, errorCode) => {
            expect(wasCalled).toBe(true)
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        }))

      it('should rethrow error thrown inside callback', () =>
        new Promise<void>((resolve, reject) => {
          let wasCalled = false

          curl.setOpt('URL', `${url}/headers`)
          curl.setOpt('PREREQFUNCTION', () => {
            wasCalled = true
            throw new Error('thrown error inside callback')
          })

          curl.on('end', () => {
            reject(
              new Error('end called - request wast not aborted by request'),
            )
          })

          curl.on('error', (error, errorCode) => {
            expect(wasCalled).toBe(true)
            expect(error.message).toBe('thrown error inside callback')
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        }))

      it('should throw an error on invalid return value', () =>
        new Promise<void>((resolve, reject) => {
          let wasCalled = false

          curl.setOpt('URL', `${url}/headers`)
          // @ts-expect-error this should require the fn to return an enum value!
          curl.setOpt('PREREQFUNCTION', () => {
            wasCalled = true
            return '123'
          })

          curl.on('end', () => {
            reject(
              new Error('end called - request wast not aborted by request'),
            )
          })

          curl.on('error', (error, errorCode) => {
            expect(wasCalled).toBe(true)
            expect(error.message).toBe(
              'Return value from the PREREQ callback must be a number.',
            )
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        }))
    })
  }
})
