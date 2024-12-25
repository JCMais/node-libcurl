/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, it } from 'vitest'
import { Curl } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

describe('Connection Timeout', () => {
  it('should give an error on timeout', async () => {
    const curl = new Curl()
    withCommonTestOptions(curl)

    // http://stackoverflow.com/a/904609/710693
    curl.setOpt('URL', '10.255.255.1')
    curl.setOpt('CONNECTTIMEOUT', 1)

    await new Promise<void>((resolve, reject) => {
      curl.on('end', () => {
        reject(new Error('Unexpected callback called.'))
      })

      curl.on('error', () => {
        resolve()
      })

      curl.perform()
    })
  })
})
