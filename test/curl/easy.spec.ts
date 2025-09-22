/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeEach, afterEach, it, expect } from 'vitest'

import { Curl, CurlCode, Easy, CurlHttpVersion } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

const url = 'http://example.com/'

// This is the only test that does not uses a express server
// It makes a request to a live server, which can cause issues if there are network problems
// @TODO Run a server side by side with the test suite to remove the need to make a external request

let curl: Easy

describe('easy', () => {
  beforeEach(() => {
    curl = new Easy()
    withCommonTestOptions(curl)
    curl.setOpt('URL', url)
  })

  afterEach(async () => {
    curl.close()
    // easy is sync, this is just to give some breathing room to vitest itself
    await new Promise((resolve) => setTimeout(resolve, 10))
  })

  it('works', () => {
    const retCode = curl.perform()
    expect(retCode).toBe(CurlCode.CURLE_OK)
  })

  describe('callbacks', () => {
    it('WRITEFUNCTION - should rethrow error', () => {
      const msg = `Error thrown on callback: ${Date.now()}`
      curl.setOpt('WRITEFUNCTION', () => {
        throw new Error(msg)
      })
      expect(() => curl.perform()).toThrow(msg)
    })

    it('WRITEFUNCTION - should throw error if has invalid return type', () => {
      // @ts-ignore
      curl.setOpt('WRITEFUNCTION', () => {
        return {}
      })
      expect(() => curl.perform()).toThrow(
        'Return value from the WRITE callback must be an integer.',
      )
    })

    it('HEADERFUNCTION - should rethrow error', () => {
      const msg = `Error thrown on callback: ${Date.now()}`
      curl.setOpt('HEADERFUNCTION', () => {
        throw new Error(msg)
      })
      expect(() => curl.perform()).toThrow(msg)
    })

    it('HEADERFUNCTION - should throw error if has invalid return type', () => {
      // @ts-ignore
      curl.setOpt('HEADERFUNCTION', () => {
        return {}
      })
      expect(() => curl.perform()).toThrow(
        'Return value from the HEADER callback must be an integer.',
      )
    })

    it('READFUNCTION - should rethrow error', () => {
      const msg = `Error thrown on callback: ${Date.now()}`
      curl.setOpt('URL', 'https://httpbin.org/put')
      curl.setOpt('SSL_VERIFYPEER', false)
      curl.setOpt('UPLOAD', true)
      // @ts-ignore
      curl.setOpt('READFUNCTION', () => {
        throw new Error(msg)
      })
      expect(() => curl.perform()).toThrow(msg)
    })

    it('READFUNCTION - should throw error if has invalid return type', () => {
      curl.setOpt('URL', 'https://httpbin.org/put')
      curl.setOpt('SSL_VERIFYPEER', false)
      curl.setOpt('UPLOAD', true)
      // @ts-ignore
      curl.setOpt('READFUNCTION', () => {
        return {}
      })
      expect(() => curl.perform()).toThrow(
        'Return value from the READ callback must be an integer.',
      )
    })

    it.runIf(Curl.isVersionGreaterOrEqualThan(7, 64, 0))(
      'TRAILERFUNCTION - should rethrow error',
      () => {
        const msg = `Error thrown on callback: ${Date.now()}`
        curl.setOpt('URL', 'https://httpbin.org/put')
        curl.setOpt('SSL_VERIFYPEER', false)
        curl.setOpt('UPLOAD', true)
        curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
        // chunked transfer (with trailers) are only supported in http 1.1
        curl.setOpt('HTTP_VERSION', CurlHttpVersion.V1_1)
        // @ts-ignore
        curl.setOpt('TRAILERFUNCTION', () => {
          throw new Error(msg)
        })
        let finished = false
        curl.setOpt(Curl.option.READFUNCTION, (buffer, _size, _nmemb) => {
          if (finished) return 0

          const data = 'HELLO'
          finished = true
          return buffer.write(data)
        })
        expect(() => curl.perform()).toThrow(msg)
      },
    )

    it.runIf(Curl.isVersionGreaterOrEqualThan(7, 64, 0))(
      'TRAILERFUNCTION - should throw error if has invalid return type',
      () => {
        curl.setOpt('URL', 'https://httpbin.org/put')
        curl.setOpt('SSL_VERIFYPEER', false)
        curl.setOpt('UPLOAD', true)
        curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
        // chunked transfer (with trailers) are only supported in http 1.1
        curl.setOpt('HTTP_VERSION', CurlHttpVersion.V1_1)
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
        expect(() => curl.perform()).toThrow(
          'Return value from the Trailer callback must be an array of strings or false.',
        )
      },
    )
  })
})
