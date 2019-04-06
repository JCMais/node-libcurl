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
  curl = {},
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

  app.get('/', function(req, res) {
    res.send('Hello World!');
  });
});

after(function() {
  app._router.stack.pop();
  server.close();
});

it('should not work with non-implemented infos', function(done) {
  curl.on('end', function(status) {
    if (status !== 200) {
      throw Error('Invalid status code: ' + status);
    }

    (function() {
      curl.getInfo(Curl.info.PRIVATE);
    }.should.throw(/^Unsupported/));

    done();
  });

  curl.on('error', function(err) {
    done(err);
  });

  curl.perform();
});

it('should get all infos', function(done) {
  curl.on('end', function(status) {
    if (status !== 200) {
      throw Error('Invalid status code: ' + status);
    }

    for (var infoId in Curl.info) {
      if (Curl.info.hasOwnProperty(infoId) && infoId !== 'debug') {
        curl.getInfo(infoId);
      }
    }

    done();
  });

  curl.on('error', function(err) {
    done(err);
  });

  curl.perform();
});
