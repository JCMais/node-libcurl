/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const serverObj = require('./../helper/server')
const Curl = require('../../lib/Curl')

const { app, serverHttps } = serverObj

before(function(done) {
  serverHttps.listen(serverObj.portHttps, serverObj.host, function() {
    done()
  })

  app.get('/', function(req, res) {
    res.send('ok')
  })
})

after(function() {
  serverHttps.close()
  app._router.stack.pop()
})

it('should work with ssl site', function(done) {
  const curl = new Curl()

  curl.setOpt('URL', `https://${serverObj.host}:${serverObj.portHttps}/`)
  curl.setOpt('SSL_VERIFYPEER', false)

  curl.on('end', statusCode => {
    statusCode.should.be.equal(200)
    curl.close()
    done()
  })

  curl.on('error', error => {
    curl.close()
    done(error)
  })

  curl.perform()
})
