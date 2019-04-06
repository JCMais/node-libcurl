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
  firstRun = true,
  curl = {};

before(function(done) {
  curl = new Curl();

  app.get('/', function(req, res) {
    res.send('Hi');
  });

  server.listen(serverObj.port, serverObj.host, function() {
    var url = server.address().address + ':' + server.address().port;

    curl.setOpt('URL', url);

    done();
  });
});

after(function() {
  curl.close();
  server.close();
  app._router.stack.pop();
});

it('should reset the curl handler', function(done) {
  var endHandler = function() {
    if (!firstRun) {
      done(new Error('Failed to reset.'));
      return;
    }

    firstRun = false;

    this.reset();

    curl.on('end', endHandler);
    curl.on('error', errorHandler);
    
    //try to make another request
    this.perform();
  };
  
  var errorHandler = function(err, curlCode) {
    //curlCode == 3 -> Invalid URL
    done(curlCode === 3 ? undefined : err);
  };
  
  curl.on('end', endHandler);
  curl.on('error', errorHandler);
  curl.perform();
});
