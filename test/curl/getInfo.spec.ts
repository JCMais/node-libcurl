/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { app, closeServer, host, port, server } from '../helper/server'
import { Curl } from '../../lib'

const url = `http://${host}:${port}/`

describe('getInfo()', () => {
  let curl: Curl

  beforeEach(() => {
    curl = new Curl()
    curl.setOpt('URL', url)
  })

  afterEach(() => {
    curl.close()
  })

  before((done) => {
    server.listen(port, host, done)

    app.get('/', (_req, res) => {
      res.send('Hello World!')
    })
  })

  after(() => {
    app._router.stack.pop()
    closeServer()
  })

  it('should not work with non-implemented infos', (done) => {
    curl.on('end', (status) => {
      if (status !== 200) {
        throw Error(`Invalid status code: ${status}`)
      }

      ;(() => {
        curl.getInfo(Curl.info.PRIVATE)
      }).should.throw(/^Unsupported/)

      done()
    })

    curl.on('error', done)

    curl.perform()
  })

  it('should get all infos', (done) => {
    curl.on('end', (status) => {
      if (status !== 200) {
        throw Error(`Invalid status code: ${status}`)
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

      done()
    })

    curl.on('error', done)

    curl.perform()
  })

  it('CERTINFO', (done) => {
    curl.setOpt('URL', 'https://github.com')
    curl.setOpt('CERTINFO', true)
    curl.setOpt('FOLLOWLOCATION', true)
    curl.setOpt('SSL_VERIFYPEER', false)
    curl.setOpt('SSL_VERIFYHOST', false)
    curl.on('end', (status) => {
      if (status !== 200) {
        throw Error(`Invalid status code: ${status}`)
      }

      let certInfo: string[] = []
      ;(() => {
        certInfo = curl.getInfo(Curl.info.CERTINFO)
      }).should.not.throw() // Enexpected error while collecting cert info

      Array.isArray(certInfo).should.be.true(
        'Returned CERTINFO value must be array',
      )

      certInfo.should.not.have.length(0)

      const cert = certInfo.find(
        (itm: string): boolean => itm.search('Cert:') === 0,
      )

      ;(typeof cert).should.not.be.equal(
        'undefined',
        'Certificate not returned',
      )

      done()
    })

    curl.on('error', done)

    curl.perform()
  })
})
