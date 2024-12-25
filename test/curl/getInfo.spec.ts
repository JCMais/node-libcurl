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

import { createServer } from '../helper/server'
import { Curl } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

let curl: Curl
let serverInstance: ReturnType<typeof createServer>

describe('getInfo()', () => {
  beforeEach(() => {
    curl = new Curl()
    withCommonTestOptions(curl)
    curl.setOpt('URL', serverInstance.url)
  })

  afterEach(() => {
    curl.close()
  })

  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/', (_req, res) => {
      res.send('Hello World!')
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
    serverInstance.app._router.stack.pop()
  })

  it('should not work with non-implemented infos', async () => {
    await new Promise<void>((resolve, reject) => {
      curl.on('end', (status) => {
        if (status !== 200) {
          reject(new Error(`Invalid status code: ${status}`))
          return
        }

        expect(() => {
          curl.getInfo(Curl.info.PRIVATE)
        }).toThrow(/^Unsupported/)

        resolve()
      })

      curl.on('error', reject)

      curl.perform()
    })
  })

  it('should get all infos', async () => {
    await new Promise<void>((resolve, reject) => {
      curl.on('end', (status) => {
        if (status !== 200) {
          reject(new Error(`Invalid status code: ${status}`))
          return
        }

        for (const infoId in Curl.info) {
          if (
            Object.prototype.hasOwnProperty.call(Curl.info, infoId) &&
            infoId !== 'debug'
          ) {
            // @ts-ignore
            curl.getInfo(infoId)
          }
        }

        resolve()
      })

      curl.on('error', reject)

      curl.perform()
    })
  })

  it('CERTINFO', async () => {
    curl.setOpt('URL', 'https://github.com')
    curl.setOpt('CERTINFO', true)
    curl.setOpt('FOLLOWLOCATION', true)
    curl.setOpt('SSL_VERIFYPEER', false)
    curl.setOpt('SSL_VERIFYHOST', false)

    const certInfo = await new Promise<string[]>((resolve, reject) => {
      curl.on('end', (status) => {
        if (status !== 200) {
          reject(new Error(`Invalid status code: ${status}`))
          return
        }

        let certInfo: string[] = []
        expect(() => {
          certInfo = curl.getInfo(Curl.info.CERTINFO)
        }).not.toThrow()

        resolve(certInfo)
      })

      curl.on('error', reject)

      curl.perform()
    })

    expect(Array.isArray(certInfo)).toBe(true)
    expect(certInfo.length).toBeGreaterThan(0)

    const cert = certInfo.find(
      (itm: string): boolean => itm.search('Cert:') === 0,
    )

    expect(cert).toBeDefined()
  })
})
