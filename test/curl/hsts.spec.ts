/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import should from 'should'
import tls from 'tls'

// import { app, host, port, server } from '../helper/server'
// import { Curl, CurlCode } from '../../lib'
import {
  Curl,
  CurlCode,
  CurlHsts,
  CurlHstsCallback,
  CurlHstsCacheEntry,
  CurlHstsCacheCount,
  Easy,
} from '../../lib'

let curl: Curl

// using a real page for this - may cause timing issues in the tests ¯\_(ツ)_/¯
const url = `https://owasp.org/`

// TODO(jonathan): use correct type
const getHstsCache = (): CurlHstsCacheEntry[] => [
  {
    host: 'donotcall.gov',
    includeSubDomains: true,
    // default -> expire: null,
  },
  {
    host: 'owasp.org',
    includeSubDomains: false,
    expire: null, // infinite
  },
  {
    host: 'github.com',
    // default -> includeSubDomains: false,
    expire: '20350101 00:00:00', // a long time
  },
  {
    host: 'google.com',
    // default -> includeSubDomains: false,
    // default -> expire: null,
  },
]

if (Curl.isVersionGreaterOrEqualThan(7, 74, 0)) {
  describe('Callbacks', () => {
    beforeEach(() => {
      curl = new Curl()
      curl.setOpt('URL', url)
      if (process.version.startsWith('v10.')) {
        curl.setOpt('SSL_VERIFYPEER', false)
      } else {
        curl.setOpt('CAINFO_BLOB', tls.rootCertificates.join('\n'))
      }
    })

    afterEach(() => {
      if (curl.isOpen) {
        curl.close()
      }
    })

    describe('hsts', function () {
      it('HSTSREADFUNCTION should work if returning null', (done) => {
        curl.setOpt('HSTS_CTRL', CurlHsts.Enable)
        let callCount = 0
        curl.setOpt('HSTSREADFUNCTION', () => {
          callCount++
          return null
        })

        curl.on('end', () => {
          done(
            callCount > 1
              ? new Error(
                  'HSTSREADFUNCTION was called more than once when returning null',
                )
              : undefined,
          )
        })
        curl.on('error', done)
        curl.perform()
      })

      // libcurl <= 7.79 has a bug where HSTSREADFUNCTION is always called if it is set, see:
      // https://github.com/curl/curl/issues/7710
      if (Curl.isVersionGreaterOrEqualThan(7, 80, 0)) {
        it('HSTSREADFUNCTION should not be called if HSTS_CTRL is disabled', (done) => {
          curl.setOpt('HSTS_CTRL', CurlHsts.Disabled)
          let wasCalled = false
          curl.setOpt('HSTSREADFUNCTION', () => {
            wasCalled = true
            return null
          })

          curl.on('end', () => {
            wasCalled
              ? done(
                  new Error(
                    'HSTSREADFUNCTION was called while HSTS_CTRL was set to CurlHsts.Disabled',
                  ),
                )
              : done()
          })

          curl.on('error', done)

          curl.perform()
        })
      }

      it('HSTSREADFUNCTION should work correctly by returning object multiple times', (done) => {
        curl.setOpt('HSTS_CTRL', CurlHsts.Enable)
        const cache = getHstsCache()
        const initialCacheLength = cache.length
        let hstsReadFunctionCallCount = 0

        curl.setOpt('HSTSREADFUNCTION', () => {
          hstsReadFunctionCallCount++
          const entry = cache.shift()

          return entry ?? null
        })

        curl.on('end', () => {
          cache.should.have.lengthOf(0)
          hstsReadFunctionCallCount.should.be.equal(initialCacheLength + 1)
          done()
        })

        curl.on('error', done)

        curl.perform()
      })

      it('HSTSREADFUNCTION should work correctly by returning an array a single time', (done) => {
        curl.setOpt('HSTS_CTRL', CurlHsts.Enable)
        const cache = getHstsCache()

        const callsToHstsReadFunction: boolean[] = []

        // callback will be called 3 times, as when we call duphandle libcurl calls this automatically
        curl.setOpt('HSTSREADFUNCTION', function () {
          // @ts-expect-error .handle is protected
          callsToHstsReadFunction.push(this === curl.handle)

          return cache ?? null
        })

        curl.on('end', () => {
          const dupHandle = curl.dupHandle(false)

          // kill the original just to make sure we are not relying on memory from it
          curl.close()

          dupHandle.on('end', () => {
            // first two calls will be true, as it is realted for the first instance:
            // 1: perform
            // 2: duphandle
            // the third call will be false, as the instance will not be === curl.handle, but === dupHandle.handle
            callsToHstsReadFunction.should.match([true, true, false])

            done()
          })
          dupHandle.on('error', done)

          dupHandle.perform()
        })

        curl.on('error', done)

        curl.perform()
      })

      it('HSTSWRITEFUNCTION should work correctly by returning the same number of items that were provided by HSTSREADFUNCTION', (done) => {
        curl.setOpt('HSTS_CTRL', CurlHsts.Enable)

        const originalHstsCache = getHstsCache()
        const savedHstsCache = [] as CurlHstsCacheEntry[]
        const savedCount = [] as CurlHstsCacheCount[]

        const callsToHstsReadFunction: boolean[] = []

        // callback will be called 3 times, as when we call duphandle libcurl calls this automatically
        curl.setOpt('HSTSREADFUNCTION', function () {
          // @ts-expect-error .handle is protected
          callsToHstsReadFunction.push(this === curl.handle)
          return originalHstsCache ?? null
        })

        // callback will be called once, when handle is closed
        curl.setOpt('HSTSWRITEFUNCTION', function (data, count) {
          savedHstsCache.push(data)
          savedCount.push(count)
          return CurlHstsCallback.Ok
        })

        curl.on('end', () => {
          // kill the handle so the cache is saved - this is a sync operation so everything will happen in a synchronous way
          curl.close()

          savedHstsCache.should.have.lengthOf(originalHstsCache.length)

          // cache is already updated here
          savedHstsCache.forEach((value, index) => {
            const matchingHstsCache = originalHstsCache[index]

            value.host.should.be.equal(matchingHstsCache.host)

            // this one should be equal, as it should have been updated
            if (value.host.indexOf('owasp') !== -1) {
              should.exist(value.expire)
              value.expire!.should.not.be.equal(matchingHstsCache.expire)
              // should be false as this is what is returned from the domain
              value.includeSubDomains!.should.be.equal(true)
            } else {
              should(value.expire).be.equal(matchingHstsCache.expire || null)
              value.includeSubDomains!.should.be.equal(
                matchingHstsCache.includeSubDomains || false,
              )
            }
          })

          savedCount.should.match(
            new Array(originalHstsCache.length)
              .fill(null)
              .map((_v, index, arr) => ({
                index,
                total: arr.length,
              })),
          )

          done()
        })

        curl.on('error', done)

        curl.perform()
      })

      it('returning invalid data from HSTSREADFUNCTION should throw an error', (done) => {
        curl.setOpt('HSTS_CTRL', CurlHsts.Enable)

        let hstsReadFunctionCallCount = 0
        let onErrorCallCount = 0

        const values = [
          'this-is-invalid',
          {},
          {
            host: 123,
          },
          {
            host: 'domain.com',
            includeSubDomains: 'abc',
          },
          {
            host: 'domain.com',
            expire: false,
          },
          {
            host: 'a'.repeat(1024),
          },
        ]

        const initialValuesLength = values.length

        // @ts-expect-error this should give an error because the values we are returning are not the ones HSTSREADFUNCTION expects
        curl.setOpt('HSTSREADFUNCTION', function () {
          hstsReadFunctionCallCount++

          return values.pop() ?? null
        })

        curl.on('end', () => {
          done(
            onErrorCallCount !== initialValuesLength
              ? new Error(
                  `End event emitted too soon - Errors: ${onErrorCallCount} - Expected: ${initialValuesLength}`,
                )
              : null,
          )
        })

        curl.on('error', (error, errorCode) => {
          ++onErrorCallCount

          if (onErrorCallCount > initialValuesLength) {
            return done(
              new Error(
                `onError called more times than expected - Expected: ${initialValuesLength} - Error: ${error.message}`,
              ),
            )
          }

          error.message.should.match(/fix the HSTS callback/)
          errorCode.should.be.equal(CurlCode.CURLE_ABORTED_BY_CALLBACK)

          hstsReadFunctionCallCount.should.be.equal(onErrorCallCount)

          curl.perform()
        })

        curl.perform()
      })

      it('throwing an error from inside HSTSREADFUNCTION should work correctly', (done) => {
        curl.setOpt('HSTS_CTRL', CurlHsts.Enable)

        let hstsReadFunctionCallCount = 0

        const errorMessage = 'Something went wrong'

        curl.setOpt('HSTSREADFUNCTION', function () {
          if (hstsReadFunctionCallCount++ === 0) {
            throw new Error(errorMessage)
          }

          // this should never get here as the cb should not be called again if we find an error
          return null
        })

        curl.on('end', () => {
          done(new Error('No error found - end was called'))
        })

        curl.on('error', (error, errorCode) => {
          error.message.should.be.equal(errorMessage)
          errorCode.should.be.equal(CurlCode.CURLE_ABORTED_BY_CALLBACK)

          hstsReadFunctionCallCount.should.be.equal(1)

          done()
        })

        curl.perform()
      })

      describe('Easy', () => {
        let easy: Easy

        beforeEach(() => {
          easy = new Easy()
          easy.setOpt('URL', url)
        })

        afterEach(() => {
          if (easy.isOpen) {
            easy.close()
          }
        })

        it('throwing an error from inside HSTSREADFUNCTION should work correctly', () => {
          easy.setOpt('HSTS_CTRL', CurlHsts.Enable)

          let hstsReadFunctionCallCount = 0

          const errorMessage = 'Something went wrong'

          easy.setOpt('HSTSREADFUNCTION', function () {
            if (hstsReadFunctionCallCount++ === 0) {
              throw new TypeError(errorMessage)
            }

            // this should never get here as the cb should not be called again if we find an error
            return null
          })

          const perform = () => easy.perform()

          perform.should.throw(TypeError, {
            message: errorMessage,
          })

          hstsReadFunctionCallCount.should.be.equal(1)
        })
      })

      // test Easy errors
    })
  })
}
