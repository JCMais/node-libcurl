/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
    var delayBetweenSends = 10;
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
  this.timeout(10000);
  it('should work', function(done) {
    let wasCalled = false;
    curl.setOpt(Curl.option.NOPROGRESS, false);
    curl.setProgressCallback(function(dltotal, dlnow, ultotal, ulnow) {
      wasCalled = true;
      dltotal.should.be.a.Number();
      dlnow.should.be.a.Number();
      ultotal.should.be.a.Number();
      ulnow.should.be.a.Number();
      return 0;
    });
    curl.setOpt('URL', url + '/delayed');

    curl.on('end', function() {
      wasCalled.should.be.true;
      done();
    });

    curl.on('error', function(err) {
      done(err);
    });

    curl.perform();
  });

  it('should not accept undefined return', function(done) {
    curl.setOpt('URL', url + '/delayed');
    curl.setOpt(Curl.option.NOPROGRESS, false);

    curl.setProgressCallback(function(dltotal, dlnow) {
      return dlnow >= 40 ? undefined : 0;
    });

    curl.on('end', function() {
      done();
    });

    curl.on('error', function(err) {
      // eslint-disable-next-line no-undef
      should(err).be.a.instanceOf(TypeError);
      done();
    });

    curl.perform();
  });
});
