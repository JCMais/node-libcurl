/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { createServer } from '../helper/server'
import { Curl, CurlCode } from '../../lib'
import { CurlPreReqFunc } from '../../lib/enum/CurlPreReqFunc'
import {
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  it,
  expect,
} from 'vitest'

let curl: Curl
let serverInstance: ReturnType<typeof createServer>

describe('Callbacks', () => {
  beforeEach(() => {
    curl = new Curl()
  })

  afterEach(() => {
    curl.close()
  })

  beforeAll(async () => {
    serverInstance = createServer()
    await serverInstance.listen()
  })

  beforeAll(() => {
    serverInstance.app.get('/delayed', (_req, res) => {
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

    serverInstance.app.get('/trailers', (req, res) => {
      res.send({
        trailers,
      })
    })

    serverInstance.app.put('/headers', (req, res) => {
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

  afterAll(async () => {
    await serverInstance.close()
    serverInstance.app._router.stack.pop()
    serverInstance.app._router.stack.pop()
    serverInstance.app._router.stack.pop()
  })

  describe('progress', () => {
    it('should work', async () => {
      let wasCalled = false

      curl.setOpt('URL', `${serverInstance.url}/delayed`)
      curl.setOpt('NOPROGRESS', false)

      curl.setProgressCallback((dltotal, dlnow, ultotal, ulnow) => {
        wasCalled = true
        expect(dltotal).toBeTypeOf('number')
        expect(dlnow).toBeTypeOf('number')
        expect(ultotal).toBeTypeOf('number')
        expect(ulnow).toBeTypeOf('number')
        return 0
      })

      await new Promise<void>((resolve, reject) => {
        curl.on('end', () => {
          expect(wasCalled).toBe(true)
          resolve()
        })

        curl.on('error', reject)

        curl.perform()
      })
    })

    it('should not accept undefined return', async () => {
      curl.setOpt('URL', `${serverInstance.url}/delayed`)
      curl.setOpt('NOPROGRESS', false)

      // @ts-ignore we want to test returning undefined here
      curl.setProgressCallback((_dltotal, dlnow, _ultotal, _ulnow) => {
        return dlnow >= 40 ? undefined : 0
      })

      await new Promise<void>((resolve, reject) => {
        curl.on('end', () => {
          reject(new Error('end called - request was not aborted by request'))
        })

        curl.on('error', (error) => {
          expect(error).toBeInstanceOf(TypeError)
          resolve()
        })

        curl.perform()
      })
    }, 10000)
  }, 10000)

  describe.runIf(Curl.isVersionGreaterOrEqualThan(7, 64, 0))(
    'trailer',
    function () {
      it('should work', async () => {
        let wasCalled = false
        let isFirstCall = true

        curl.setOpt('URL', `${serverInstance.url}/headers`)
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

        await new Promise<void>((resolve, reject) => {
          curl.on('end', (statusCode, body) => {
            if (isFirstCall) {
              expect(wasCalled).toBe(true)
              expect(statusCode).toBe(200)

              curl.setOpt('URL', `${serverInstance.url}/trailers`)
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
        })
      })

      it('should abort request on false', async () => {
        curl.setOpt('URL', `${serverInstance.url}/headers`)
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

        await new Promise<void>((resolve, reject) => {
          curl.on('end', () => {
            reject(new Error('end called - request was not aborted by request'))
          })

          curl.on('error', (error, errorCode) => {
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        })
      })

      it('should rethrow error thrown inside callback', async () => {
        curl.setOpt('URL', `${serverInstance.url}/headers`)
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

        await new Promise<void>((resolve, reject) => {
          curl.on('end', () => {
            reject(new Error('end called - request was not aborted by request'))
          })

          curl.on('error', (error, errorCode) => {
            expect(error.message).toBe('thrown error inside callback')
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        })
      })

      it('should throw an error on invalid return value', async () => {
        curl.setOpt('URL', `${serverInstance.url}/headers`)
        curl.setOpt('UPLOAD', true)
        curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
        // @ts-ignore
        curl.setOpt('TRAILERFUNCTION', () => {
          return {}
        })

        let finished = false
        curl.setOpt(Curl.option.READFUNCTION, (buffer, _size, _nmemb) => {
          if (finished) return 0

          const data = 'HELLO'
          finished = true
          return buffer.write(data)
        })

        await new Promise<void>((resolve, reject) => {
          curl.on('end', () => {
            reject(new Error('end called - request was not aborted by request'))
          })

          curl.on('error', (error, errorCode) => {
            expect(error.message).toBe(
              'Return value from the Trailer callback must be an array of strings or false.',
            )
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        })
      })
    },
  )

  describe.runIf(Curl.isVersionGreaterOrEqualThan(7, 80, 0))(
    'prereq',
    function () {
      it('should work', async () => {
        let wasCalled = false

        curl.setOpt('URL', `${serverInstance.url}/headers`)
        curl.setOpt('PREREQFUNCTION', () => {
          wasCalled = true
          return CurlPreReqFunc.Ok
        })

        await new Promise<void>((resolve, reject) => {
          curl.on('end', () => {
            expect(wasCalled).toBe(true)
            resolve()
          })

          curl.on('error', reject)

          curl.perform()
        })
      })

      it('should abort request on Abort return value', async () => {
        let wasCalled = false

        curl.setOpt('URL', `${serverInstance.url}/headers`)
        curl.setOpt('PREREQFUNCTION', () => {
          wasCalled = true
          return CurlPreReqFunc.Abort
        })

        await new Promise<void>((resolve, reject) => {
          curl.on('end', () => {
            reject(new Error('end called - request was not aborted by request'))
          })

          curl.on('error', (_error, errorCode) => {
            expect(wasCalled).toBe(true)
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        })
      })

      it('should rethrow error thrown inside callback', async () => {
        let wasCalled = false

        curl.setOpt('URL', `${serverInstance.url}/headers`)
        curl.setOpt('PREREQFUNCTION', () => {
          wasCalled = true
          throw new Error('thrown error inside callback')
        })

        await new Promise<void>((resolve, reject) => {
          curl.on('end', () => {
            reject(new Error('end called - request was not aborted by request'))
          })

          curl.on('error', (error, errorCode) => {
            expect(wasCalled).toBe(true)
            expect(error.message).toBe('thrown error inside callback')
            expect(errorCode).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          })

          curl.perform()
        })
      })

      it('should throw an error on invalid return value', async () => {
        let wasCalled = false

        curl.setOpt('URL', `${serverInstance.url}/headers`)
        // @ts-expect-error this should require the fn to return an enum value!
        curl.setOpt('PREREQFUNCTION', () => {
          wasCalled = true
          return '123'
        })

        await new Promise<void>((resolve, reject) => {
          curl.on('end', () => {
            reject(new Error('end called - request was not aborted by request'))
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
        })
      })
    },
  )
}, 5000)
