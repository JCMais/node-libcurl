/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2019, Jonathan Cardoso Machado
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
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
