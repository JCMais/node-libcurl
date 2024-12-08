/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { createHttpsServer } from '../helper/server'
import { Curl } from '../../lib'

describe('SSL', () => {
  const serverInstance = createHttpsServer()

  beforeAll(async () => {
    serverInstance.app.get('/', (_req, res) => {
      res.send('ok')
    })

    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
    serverInstance.app._router.stack.pop()
  })

  it('should work with ssl site', async () => {
    const curl = new Curl()

    curl.setOpt('URL', `${serverInstance.url}/`)
    curl.setOpt('SSL_VERIFYPEER', false)

    const statusCode = await new Promise<number>((resolve, reject) => {
      curl.on('end', (statusCode) => {
        curl.close()
        resolve(statusCode)
      })

      curl.on('error', (error) => {
        curl.close()
        reject(error)
      })

      curl.perform()
    })

    expect(statusCode).toBe(200)
  })
})
