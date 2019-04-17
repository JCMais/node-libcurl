/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { Curl } from '../../lib'

describe('Connection Timeout', () => {
  it('should give an error on timeout', done => {
    const curl = new Curl()

    //http://stackoverflow.com/a/904609/710693
    curl.setOpt('URL', '10.255.255.1')
    curl.setOpt('CONNECTTIMEOUT', 1)

    curl.on('end', () => {
      done(Error('Unexpected callback called.'))
    })

    curl.on('error', () => {
      done()
    })

    curl.perform()
  })
})
