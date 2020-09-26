/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { app, host, port, server } from '../helper/server'
import { Curl } from '../../lib'

const url = `http://${host}:${port}/`

let curl: Curl
describe('getInfo()', () => {
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
    server.close()
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
})
