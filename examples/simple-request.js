/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could do a simple request using the Curl wrapper.
 */
var Curl = require('../lib/Curl'),
  curl = new Curl(),
  url = process.argv[2] || 'http://www.google.com';

//you can use a string as option
curl.setOpt('URL', url);
//or use an already defined constant
curl.setOpt(Curl.option.CONNECTTIMEOUT, 5);
curl.setOpt(Curl.option.FOLLOWLOCATION, true);
// Uncomment to show more debug information.
//curl.setOpt( Curl.option.VERBOSE, true );
//keep in mind that if you use an invalid option, a TypeError exception will be thrown

curl.on('end', function(statusCode, body, headers) {
  console.info('Status Code: ', statusCode);
  console.info('Headers: ', headers);
  console.info('Body length: ', body.length);

  this.close();
});

curl.on('error', function(err, curlErrCode) {
  console.error('Err: ', err);
  console.error('Code: ', curlErrCode);
  this.close();
});

curl.perform();
