/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  describe,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  it,
  expect,
} from 'vitest'

import querystring from 'querystring'

import { createServer } from '../helper/server'
import { Curl } from '../../lib'

const postData: { [key: string]: string } = {
  'input-name': 'This is input-name value.',
  'input-name2': 'This is input-name2 value',
}

let curl: Curl
let serverInstance: ReturnType<typeof createServer>

describe('Option POSTFIELDS', () => {
  beforeEach(() => {
    curl = new Curl()
    curl.setOpt('URL', serverInstance.url)
  })

  afterEach(() => {
    curl.close()
  })

  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.post('/', (req, res) => {
      res.send(JSON.stringify(req.body))
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
    serverInstance.app._router.stack.pop()
  })

  it('should post the correct data', async () => {
    curl.setOpt('POSTFIELDS', querystring.stringify(postData))

    const result = await new Promise<{ status: number; data: string }>(
      (resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }

          resolve({ status, data: data as string })
        })

        curl.on('error', reject)

        curl.perform()
      },
    )

    const parsedData = JSON.parse(result.data)

    for (const field in parsedData) {
      if (Object.prototype.hasOwnProperty.call(parsedData, field)) {
        expect(parsedData[field]).toBe(postData[field])
      }
    }
  })
})
