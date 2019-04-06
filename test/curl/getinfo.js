/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const serverObj = require('./../helper/server')
const Curl = require('../../lib/Curl')

const { app, host, port, server } = serverObj

const url = `http://${host}:${port}/`

let curl = null

beforeEach(() => {
  curl = new Curl()
  curl.setOpt('URL', url)
})

afterEach(() => {
  curl.close()
})

before(done => {
  server.listen(port, host, done)

  app.get('/', (req, res) => {
    res.send('Hello World!')
  })
})

after(() => {
  app._router.stack.pop()
  server.close()
})

it('should not work with non-implemented infos', done => {
  curl.on('end', status => {
    if (status !== 200) {
      throw Error('Invalid status code: ' + status)
    }

    ;(() => {
      curl.getInfo(Curl.info.PRIVATE)
    }).should.throw(/^Unsupported/)

    done()
  })

  curl.on('error', done)

  curl.perform()
})

it('should get all infos', done => {
  curl.on('end', status => {
    if (status !== 200) {
      throw Error('Invalid status code: ' + status)
    }

    for (const infoId in Curl.info) {
      if (Curl.info.hasOwnProperty(infoId) && infoId !== 'debug') {
        curl.getInfo(infoId)
      }
    }

    done()
  })

  curl.on('error', done)

  curl.perform()
})
