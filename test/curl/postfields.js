/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const querystring = require('querystring')

const serverObj = require('./../helper/server')
const Curl = require('../../lib/Curl')

const { app, host, port, server } = serverObj

const url = `http://${host}:${port}/`

const postData = {
  'input-name': 'This is input-name value.',
  'input-name2': 'This is input-name2 value',
}

let curl = null

beforeEach(() => {
  curl = new Curl()
  curl.setOpt('URL', url)
})

afterEach(() => {
  curl.close()
  server.close()
})

before(done => {
  server.listen(port, host, done)

  app.post('/', (req, res) => {
    res.send(JSON.stringify(req.body))
  })
})

after(() => {
  app._router.stack.pop()
})

it('should post the correct data', done => {
  curl.setOpt('POSTFIELDS', querystring.stringify(postData))

  curl.on('end', (status, data) => {
    if (status !== 200) {
      throw Error('Invalid status code: ' + status)
    }

    const parsedData = JSON.parse(data)

    for (const field in parsedData) {
      if (parsedData.hasOwnProperty(field)) {
        parsedData[field].should.be.equal(postData[field])
      }
    }

    done()
  })

  curl.on('error', done)

  curl.perform()
})
