/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { app, host, portHttps, serverHttps } from '../helper/server'
import { Curl } from '../../lib'

describe('SSL', () => {
  before((done) => {
    serverHttps.listen(portHttps, host, done)

    app.get('/', (_req, res) => {
      res.send('ok')
    })
  })

  after(() => {
    serverHttps.close()
    app._router.stack.pop()
  })

  it('should work with ssl site', (done) => {
    const curl = new Curl()

    curl.setOpt('URL', `https://${host}:${portHttps}/`)
    curl.setOpt('SSL_VERIFYPEER', false)

    curl.on('end', (statusCode) => {
      statusCode.should.be.equal(200)
      curl.close()
      done()
    })

    curl.on('error', (error) => {
      curl.close()
      done(error)
    })

    curl.perform()
  })
})
