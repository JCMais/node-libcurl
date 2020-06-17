/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { app, host, port, server } from '../helper/server'
import { curly } from '../../lib'

const url = `http://${host}:${port}/`

describe('curly', () => {
  before((done) => {
    server.listen(port, host, done)

    app.get('/', (_req, res) => {
      res.send('Hello World!')
    })
  })

  after(() => {
    server.close()
    app._router.stack.pop()
  })

  describe('get()', () => {
    it('is successful', async () => {
      const { statusCode } = await curly.get(url)
      statusCode.should.be.equal(200)
    })
  })
})
