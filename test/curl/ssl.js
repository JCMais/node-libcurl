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
