/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const serverObj = require('./../helper/server')
const Curl = require('../../lib/Curl')

const { serverHttp2 } = serverObj

let session = null

before(function(done) {
  serverHttp2.on('error', err => console.error(err))
  serverHttp2.on('session', sess => {
    session = sess
  })
  serverHttp2.on('stream', (stream, headers) => {
    stream.respond({
      'content-type': 'text/html',
      ':status': 200,
    })
    stream.end('<h1>Hello World</h1>')
  })

  serverHttp2.listen(serverObj.portHttp2, serverObj.host, function() {
    done()
  })
})

after(function() {
  serverHttp2.close()
})

it('should work with https2 site', function(done) {
  const curl = new Curl()

  curl.setOpt('URL', `https://${serverObj.host}:${serverObj.portHttp2}/`)
  curl.setOpt('HTTP_VERSION', Curl.http.VERSION_2)
  curl.setOpt('SSL_VERIFYPEER', false)

  curl.on('end', statusCode => {
    curl.close()
    session && session.destroy()

    statusCode.should.be.equal(200)
    done()
  })

  curl.on('error', error => {
    curl.close()
    session && session.destroy()
    done(error)
  })

  curl.perform()
})
