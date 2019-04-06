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

let firstRun = true
let curl = null

before(done => {
  curl = new Curl()
  curl.setOpt('URL', url)

  app.get('/', (req, res) => {
    res.send('Hi')
  })

  server.listen(port, host, done)
})

after(() => {
  curl.close()
  server.close()
  app._router.stack.pop()
})

it('should reset the curl handler', done => {
  const endHandler = () => {
    if (!firstRun) {
      done(new Error('Failed to reset.'))
    }

    firstRun = false

    curl.reset()

    curl.on('end', endHandler)
    curl.on('error', errorHandler)

    //try to make another request
    curl.perform()
  }

  const errorHandler = (error, errorCode) => {
    //curlCode == 3 -> Invalid URL
    done(errorCode === 3 ? undefined : error)
  }

  curl.on('end', endHandler)
  curl.on('error', errorHandler)
  curl.perform()
})
