/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeEach, afterEach, it, expect } from 'vitest'

import { Curl, CurlCode, Easy } from '../../lib'

const url = 'http://example.com/'

// This is the only test that does not uses a express server
// It makes a request to a live server, which can cause issues if there are network problems
// @TODO Run a server side by side with the test suite to remove the need to make a external request

let curl: Easy

describe('easy', () => {
  beforeEach(() => {
    curl = new Easy()
    curl.setOpt('URL', url)
  })

  afterEach(() => {
    curl.close()
  })

  it('works', () => {
    const retCode = curl.perform()
    expect(retCode).toBe(CurlCode.CURLE_OK)
  })

  describe('callbacks', () => {
    it('WRITEFUNCTION - should rethrow error', () => {
      curl.setOpt('WRITEFUNCTION', () => {
        throw new Error('Error thrown on callback')
      })
      expect(() => curl.perform()).toThrow('Error thrown on callback')
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
      curl.setOpt('HEADERFUNCTION', () => {
        throw new Error('Error thrown on callback')
      })
      expect(() => curl.perform()).toThrow('Error thrown on callback')
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
      curl.setOpt('UPLOAD', true)
      // @ts-ignore
      curl.setOpt('READFUNCTION', () => {
        throw new Error('Error thrown on callback')
      })
      expect(() => curl.perform()).toThrow('Error thrown on callback')
    })

    it('READFUNCTION - should throw error if has invalid return type', () => {
      curl.setOpt('UPLOAD', true)
      // @ts-ignore
      curl.setOpt('READFUNCTION', () => {
        return {}
      })
      expect(() => curl.perform()).toThrow(
        'Return value from the READ callback must be an integer.',
      )
    })

    describe.runIf(Curl.isVersionGreaterOrEqualThan(7, 64, 0))(
      'TRAILERFUNCTION - should rethrow error',
      () => {
        curl.setOpt('UPLOAD', true)
        curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
        // @ts-ignore
        curl.setOpt('TRAILERFUNCTION', () => {
          throw new Error('Error thrown on callback')
        })
        let finished = false
        curl.setOpt(Curl.option.READFUNCTION, (buffer, _size, _nmemb) => {
          if (finished) return 0

          const data = 'HELLO'
          finished = true
          return buffer.write(data)
        })
        expect(() => curl.perform()).toThrow('Error thrown on callback')
      },
    )

    it('TRAILERFUNCTION - should throw error if has invalid return type', () => {
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
      expect(() => curl.perform()).toThrow(
        'Return value from the Trailer callback must be an array of strings or false.',
      )
    })
  })
})
