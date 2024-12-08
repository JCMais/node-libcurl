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

import crypto from 'crypto'

import httpAuth from 'http-auth'
import httpAuthConnect from 'http-auth-connect'

import { createServer } from '../helper/server'
import { Curl, CurlAuth } from '../../lib'

const username = 'user'
const password = 'pass'
const realmBasic = 'basic'
const realmDigest = 'digest'
const basic = httpAuth.basic(
  {
    realm: realmBasic,
  },
  (usr: string, pass: string, callback: (...args: any[]) => void) => {
    callback(usr === username && pass === password)
  },
)
const digest = httpAuth.digest(
  {
    realm: realmDigest,
  },
  (usr: string, callback: (...args: any[]) => void) => {
    const hash = crypto.createHash('md5')

    if (usr === username) {
      hash.update([username, realmDigest, password].join(':'))
      const hashDigest = hash.digest('hex')

      callback(hashDigest)
    } else {
      callback()
    }
  },
)

let curl: Curl
let serverInstance: ReturnType<typeof createServer>

describe('Option HTTPAUTH', () => {
  beforeEach(() => {
    curl = new Curl()
    curl.setOpt('URL', serverInstance.url)
  })

  afterEach(() => {
    curl.close()
    serverInstance.app._router.stack.pop()
  })

  beforeAll(async () => {
    serverInstance = createServer()
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
  })

  it('should authenticate using basic auth', async () => {
    serverInstance.app.get('/', httpAuthConnect(basic), (req, res) => {
      // @ts-ignore
      res.send(req.user)
    })

    curl.setOpt('HTTPAUTH', CurlAuth.Basic)
    curl.setOpt('USERNAME', username)
    curl.setOpt('PASSWORD', password)

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

    expect(result.data).toBe(username)
  })

  it('should authenticate using digest', async () => {
    // Currently, there is a bug with libcurl > 7.40 when using digest auth
    // on Windows, the realm is not populated from the Auth header.
    //  So we need to use the workaround below to make it work.
    let user = username

    if (process.platform === 'win32' && Curl.VERSION_NUM >= 0x072800) {
      user = `${realmDigest}/${username}`
    }

    serverInstance.app.get('/', httpAuthConnect(digest), (req, res) => {
      // @ts-ignore
      res.send(req.user)
    })

    curl.setOpt('HTTPAUTH', CurlAuth.Digest)
    curl.setOpt('USERNAME', user)
    curl.setOpt('PASSWORD', password)

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

    expect(result.data).toBe(username)
  })

  it('should not authenticate using basic', async () => {
    serverInstance.app.get('/', httpAuthConnect(basic), (req, res) => {
      // @ts-ignore
      res.send(req.user)
    })

    curl.setOpt('HTTPAUTH', CurlAuth.AnySafe)
    curl.setOpt('USERNAME', username)
    curl.setOpt('PASSWORD', password)

    const result = await new Promise<number>((resolve, reject) => {
      curl.on('end', (status) => {
        resolve(status)
      })

      curl.on('error', reject)

      curl.perform()
    })

    expect(result).toBe(401)
  })
})
