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
  server.close();
  app._router.stack.pop();
});

it('should not accept invalid argument type', function() {
  var optionsToTest = [['URL', 0], ['HTTPPOST', 0], ['POSTFIELDS', 0]];

  try {
    for (var i = 0; i < optionsToTest.length; i++) {
      curl.setOpt.apply(curl, optionsToTest[i]);
    }
  } catch (err) {
    return;
  }

  throw Error('Invalid option was accepted.');
});

it('should not work with non-implemented options', function() {
  (function() {
    curl.setOpt(Curl.option.SSL_CTX_FUNCTION, 1);
  }.should.throw(/^Unsupported/));
});

it('should restore default internal callbacks when setting WRITEFUNCTION and HEADERFUNCTION callback back to null', function(done) {
  var shouldCallEvents = false,
    lastCall = false,
    headerEvtCalled = false,
    dataEvtCalled = false;

  curl.setOpt('WRITEFUNCTION', function(buf) {
    buf.should.be.instanceof(Buffer);
    return buf.length;
  });

  curl.setOpt('HEADERFUNCTION', function(buf) {
    buf.should.be.instanceof(Buffer);
    return buf.length;
  });

  curl.on('data', function() {
    shouldCallEvents.should.be.true();
    dataEvtCalled = true;
  });

  curl.on('header', function() {
    shouldCallEvents.should.be.true();
    headerEvtCalled = true;
  });

  curl.on('end', function() {
    curl.setOpt('WRITEFUNCTION', null);
    curl.setOpt('HEADERFUNCTION', null);

    if (!lastCall) {
      lastCall = true;
      shouldCallEvents = true;
      curl.perform();
      return;
    }

    dataEvtCalled.should.be.true();
    headerEvtCalled.should.be.true();

    done();
  });

  curl.on('error', function(err) {
    done(err);
  });

  curl.perform();
});

describe('HTTPPOST', function() {
  it('should not accept invalid arrays', function() {
    try {
      curl.setOpt('HTTPPOST', [1, 2, {}]);
    } catch (err) {
      return;
    }

    throw Error('Invalid array accepted.');
  });

  it('should not accept invalid property names', function() {
    try {
      curl.setOpt('HTTPPOST', [{ dummy: 'property' }]);
    } catch (err) {
      return;
    }

    throw Error('Invalid property name accepted.');
  });

  it('should not accept invalid property value', function() {
    var args = [{}, [], 1, null, false, undefined],
      invalidArgs = [],
      len = args.length;

    while (--len) {
      var arg = args.pop();

      try {
        curl.setOpt('HTTPPOST', [{ name: arg }]);
      } catch (err) {
        invalidArgs.push(arg === null ? 'null' : typeof arg);
      }
    }

    if (invalidArgs.length === args.length) {
      throw Error(
        'Invalid property value accepted. Invalid Args: ' +
          JSON.stringify(invalidArgs) +
          ', Args: ' +
          JSON.stringify(args)
      );
    }
  });
});
