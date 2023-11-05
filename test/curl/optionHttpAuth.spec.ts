/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import crypto from 'crypto'

import httpAuth from 'http-auth'
import httpAuthConnect from 'http-auth-connect'

import { app, host, port, server } from '../helper/server'
import { Curl, CurlAuth } from '../../lib'

const url = `http://${host}:${port}/`

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

describe('Option HTTPAUTH', () => {
  beforeEach(() => {
    curl = new Curl()
    curl.setOpt('URL', url)
  })

  afterEach(() => {
    curl.close()

    app._router.stack.pop()
  })

  before((done) => {
    server.listen(port, host, done)
  })

  after(() => {
    server.close()
  })

  it('should authenticate using basic auth', (done) => {
    app.get('/', httpAuthConnect(basic), (req, res) => {
      // @ts-ignore
      res.send(req.user)
    })

    curl.setOpt('HTTPAUTH', CurlAuth.Basic)
    curl.setOpt('USERNAME', username)
    curl.setOpt('PASSWORD', password)

    curl.on('end', (status, data) => {
      if (status !== 200) {
        throw Error(`Invalid status code: ${status}`)
      }

      data.should.be.equal(username)

      done()
    })

    curl.on('error', done)

    curl.perform()
  })

  it('should authenticate using digest', (done) => {
    // Currently, there is a bug with libcurl > 7.40 when using digest auth
    // on Windows, the realm is not populated from the Auth header.
    //  So we need to use the workaround below to make it work.
    let user = username

    if (process.platform === 'win32' && Curl.VERSION_NUM >= 0x072800) {
      user = `${realmDigest}/${username}`
    }

    app.get('/', httpAuthConnect(digest), (req, res) => {
      // @ts-ignore
      res.send(req.user)
    })

    curl.setOpt('HTTPAUTH', CurlAuth.Digest)
    curl.setOpt('USERNAME', user)
    curl.setOpt('PASSWORD', password)

    curl.on('end', (status, data) => {
      if (status !== 200) {
        throw Error(`Invalid status code: ${status}`)
      }

      data.should.be.equal(username)

      done()
    })

    curl.on('error', done)

    curl.perform()
  })

  it('should not authenticate using basic', (done) => {
    app.get('/', httpAuthConnect(basic), (req, res) => {
      // @ts-ignore
      res.send(req.user)
    })

    curl.setOpt('HTTPAUTH', CurlAuth.AnySafe)
    curl.setOpt('USERNAME', username)
    curl.setOpt('PASSWORD', password)

    curl.on('end', (status) => {
      status.should.be.equal(401)

      done()
    })

    curl.on('error', done)

    curl.perform()
  })
})
