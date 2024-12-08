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

const pemFormattedPrivateKey = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEILeQs78xyjaibQhUrMQJ1Fsxeb8LAaDPeat8SGEFEVQ+
-----END PRIVATE KEY-----
`

let curl: Curl
let serverInstance: ReturnType<typeof createServer>

describe('setOpt()', () => {
  beforeEach(() => {
    curl = new Curl()
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

  it('should accept Curl.option constants', () => {
    curl.setOpt(Curl.option.URL, serverInstance.url)
  })

  it('should be able to set string value back to null', () => {
    curl.setOpt('URL', serverInstance.url)
    curl.setOpt('URL', null)
  })

  it('should be able to set integer value back to null', () => {
    curl.setOpt('ACCEPTTIMEOUT_MS', 30000)
    curl.setOpt('ACCEPTTIMEOUT_MS', null)
  })

  it('should be able to set function value back to null', () => {
    curl.setOpt('WRITEFUNCTION', () => {
      return 0
    })
    curl.setOpt('WRITEFUNCTION', null)
  })

  it('should not accept invalid argument type', () => {
    const optionsToTest = [
      ['URL', 0],
      ['HTTPPOST', 0],
      ['POSTFIELDS', 0],
    ] as const

    let errorsCaught = 0

    for (const optionTuple of optionsToTest) {
      try {
        // @ts-expect-error
        curl.setOpt(...optionTuple)
      } catch (error) {
        errorsCaught += 1
      }
    }

    expect(errorsCaught).toBe(optionsToTest.length)
  })

  it('should not work with non-implemented options', () => {
    expect(() => {
      // @ts-ignore
      curl.setOpt(Curl.option.SSL_CTX_FUNCTION, 1)
    }).toThrow(/^Unsupported/)
  })

  it('should restore default internal callbacks when setting WRITEFUNCTION and HEADERFUNCTION callback back to null', async () => {
    let shouldCallEvents = false
    let lastCall = false
    let headerEvtCalled = false
    let dataEvtCalled = false

    curl.setOpt('WRITEFUNCTION', (buffer) => {
      expect(buffer).toBeInstanceOf(Buffer)
      return buffer.length
    })

    curl.setOpt('HEADERFUNCTION', (buffer) => {
      expect(buffer).toBeInstanceOf(Buffer)
      return buffer.length
    })

    curl.on('data', () => {
      expect(shouldCallEvents).toBe(true)
      dataEvtCalled = true
    })

    curl.on('header', () => {
      expect(shouldCallEvents).toBe(true)
      headerEvtCalled = true
    })

    await new Promise<void>((resolve, reject) => {
      curl.on('end', () => {
        curl.setOpt('WRITEFUNCTION', null)
        curl.setOpt('HEADERFUNCTION', null)

        if (!lastCall) {
          lastCall = true
          shouldCallEvents = true
          curl.perform()
          return
        }

        expect(dataEvtCalled).toBe(true)
        expect(headerEvtCalled).toBe(true)

        resolve()
      })

      curl.on('error', reject)

      curl.perform()
    })
  })

  describe('HTTPPOST', () => {
    it('should work', () => {
      curl.setOpt('HTTPPOST', [
        {
          name: 'field',
          contents: 'value',
        },
      ])
    })

    it('should be able to set option back to null', () => {
      curl.setOpt('HTTPPOST', [
        {
          name: 'field',
          contents: 'value',
        },
      ])

      curl.setOpt('HTTPPOST', null)
    })

    it('should not accept invalid arrays', () => {
      expect(() => {
        // @ts-ignore
        curl.setOpt('HTTPPOST', [1, 2, {}])
      }).toThrow()
    })

    it('should not accept invalid property names', () => {
      expect(() => {
        // @ts-ignore
        curl.setOpt('HTTPPOST', [{ dummy: 'property' }])
      }).toThrow()
    })

    it('should not accept invalid property value', () => {
      const args = [{}, [], 1, null, false, undefined]
      let invalidArgs: string[] = []

      for (const arg of args) {
        try {
          // @ts-ignore
          curl.setOpt('HTTPPOST', [{ name: arg }])
        } catch (error) {
          invalidArgs = [...invalidArgs, arg === null ? 'null' : typeof arg]
        }
      }

      expect(invalidArgs.length).toBe(args.length)
    })
  })

  if (Curl.isVersionGreaterOrEqualThan(7, 71, 0)) {
    describe('BLOB', () => {
      it('should be able to set blob value back to null', () => {
        curl.setOpt('SSLKEY_BLOB', Buffer.from([]))
        curl.setOpt('SSLKEY_BLOB', null)
      })

      it('should be able to set blob value to buffer', () => {
        curl.setOpt('SSLKEY_BLOB', Buffer.from(pemFormattedPrivateKey, 'utf-8'))
      })

      it('should be able to set blob value to string', () => {
        curl.setOpt('SSLKEY_BLOB', pemFormattedPrivateKey)
      })
    })
  }
})
