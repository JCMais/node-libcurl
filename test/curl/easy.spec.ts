/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { Curl, CurlCode, Easy } from '../../lib'

const url = 'http://www.google.com/'

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
    retCode.should.be.equal(CurlCode.CURLE_OK)
  })

  describe('callbacks', () => {
    it('should rethrow error thrown on callback', () => {
      curl.setOpt('UPLOAD', true)
      curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
      // @ts-ignore
      curl.setOpt('TRAILERFUNCTION', () => {
        throw new Error('Error thrown on callback')
      })
      curl.setOpt(Curl.option.READFUNCTION, (buffer) => {
        const data = 'HELLO'
        buffer.write(data)
        return 0
      })
      const perform = () => curl.perform()
      perform.should.throw('Error thrown on callback')
    })

    it('should throw error if callback has invalid return type', () => {
      curl.setOpt('UPLOAD', true)
      curl.setOpt('HTTPHEADER', ['x-random-header: random-value'])
      // @ts-ignore
      curl.setOpt('TRAILERFUNCTION', () => {
        return {}
      })
      curl.setOpt(Curl.option.READFUNCTION, (buffer) => {
        const data = 'HELLO'
        buffer.write(data)
        return 0
      })
      const perform = () => curl.perform()
      perform.should.throw(
        'Return value from the Trailer callback must be an array of strings or false.',
      )
    })
  })
})
