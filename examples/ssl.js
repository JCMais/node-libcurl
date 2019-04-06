/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to make a request for an endpoint that uses SSL
 */
var Curl = require('../lib/Curl'),
  path = require('path');

var curl = new Curl(),
  url = 'https://www.google.com',
  certfile = path.join(__dirname, 'cacert.pem');

curl.setOpt('URL', url);
curl.setOpt('FOLLOWLOCATION', 1);
curl.setOpt('VERBOSE', 1);

//cURL is not bundled with CA cert anymore
//you need to specify the CA cert to be used, if not, you are
// going to receive the error 'Peer certificate cannot be authenticated with given CA certificates'
// more info http://curl.haxx.se/docs/sslcerts.html and http://curl.haxx.se/docs/caextract.html
if (certfile) {
  curl.setOpt(Curl.option.CAINFO, certfile);
  curl.setOpt('SSL_VERIFYHOST', 2); //This is not a boolean field! 0 -> Disabled, 2 -> Enabled
  curl.setOpt('SSL_VERIFYPEER', 1);
} else {
  curl.setOpt('SSL_VERIFYHOST', 0);
  curl.setOpt('SSL_VERIFYPEER', 0);
}

curl.perform();

curl.on('end', curl.close.bind(curl));
curl.on('error', curl.close.bind(curl));
