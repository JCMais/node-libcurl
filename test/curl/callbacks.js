/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2018, Jonathan Cardoso Machado
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
var serverObj = require('./../helper/server'),
  Curl = require('../../lib/Curl');

var server = serverObj.server,
  app = serverObj.app,
  curl = new Curl(),
  url;

beforeEach(function() {
  curl = new Curl();
  curl.setOpt('URL', url);
});

afterEach(function() {
  curl.close();
});

before(function(done) {
  server.listen(serverObj.port, serverObj.host, function() {
    url = server.address().address + ':' + server.address().port;
    done();
  });

  app.get('/delayed', function(req, res) {
    var delayBetweenSends = 500;
    var data = ['<html>', '<body>', '<h1>Hello, World!</h1>', '</body>', '</html>'];
    function send() {
      const item = data.shift();

      if (!item) {
        res.end();
        return;
      }

      res.write(item);
      setTimeout(send, delayBetweenSends);
    }

    send();
  });
});

after(function() {
  server.close();
  app._router.stack.pop();
});

describe('progress', function() {
  it('should work', function(done) {
    curl.setOpt(Curl.option.NOPROGRESS, false);
    curl.setProgressCallback(function(dltotal, dlnow) {
      dltotal.should.be.a.Number();
      dlnow.should.be.a.Number();
      return 0;
    });
    curl.setOpt('URL', url + '/delayed');

    curl.on('end', function() {
      done();
    });

    curl.on('error', function(err) {
      done(err);
    });

    curl.perform();
  });

  // skipped, see https://github.com/JCMais/node-libcurl/issues/140
  it.skip('should not accept undefined return', function(done) {
    curl.setOpt('URL', url + '/delayed');
    curl.setOpt(Curl.option.NOPROGRESS, false);

    curl.setProgressCallback(function(dltotal, dlnow) {
      return dlnow >= 40 ? undefined : 0;
    });

    curl.on('end', function() {
      done();
    });

    curl.on('error', function(err) {
      done(err);
    });

    curl.perform();
  });
});
