/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Curl = require('../../lib/Curl'),
  curl = {};

beforeEach(function() {
  curl = new Curl();
});

afterEach(function() {
  curl.close();
});

it('should not crash on timeout', function(done) {
  //http://stackoverflow.com/a/904609/710693
  curl.setOpt(Curl.option.URL, '10.255.255.1');
  curl.setOpt(Curl.option.CONNECTTIMEOUT, 1);

  curl.on('end', function() {
    done(Error('Unexpected callback called.'));
  });

  curl.on('error', function() {
    done();
  });

  curl.perform();
});
