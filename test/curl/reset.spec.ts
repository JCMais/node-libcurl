/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { app, host, port, server } from '../helper/server'
import { Curl, CurlCode } from '../../lib'

const url = `http://${host}:${port}/`

let firstRun = true
let curl: Curl

describe('reset()', () => {
  before((done) => {
    curl = new Curl()
    curl.setOpt('URL', url)

    app.get('/', (_req, res) => {
      res.send('Hi')
    })

    server.listen(port, host, done)
  })

  after(() => {
    curl.close()
    server.close()
    app._router.stack.pop()
  })

  it('should reset the curl handler', (done) => {
    const endHandler = () => {
      if (!firstRun) {
        done(new Error('Failed to reset.'))
      }

      firstRun = false

      curl.reset()

      curl.on('end', endHandler)
      curl.on('error', errorHandler)

      // try to make another request
      curl.perform()
    }

    const errorHandler = (error: Error, errorCode: CurlCode) => {
      // curlCode == 3 -> Invalid URL
      done(errorCode === 3 ? undefined : error)
    }

    curl.on('end', endHandler)
    curl.on('error', errorHandler)
    curl.perform()
  })
})
