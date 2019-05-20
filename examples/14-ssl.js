/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to make a request for an endpoint that uses SSL
 */
const path = require('path')

const { Curl } = require('../dist')

const url = 'https://www.google.com'
const certfile = path.join(__dirname, 'cacert.pem')

const curl = new Curl()

curl.setOpt('URL', url)
curl.setOpt('FOLLOWLOCATION', 1)
curl.setOpt('VERBOSE', 1)

// Generally libcurl knows where to find the CA Cert of the system
//  in case that does not work, you need to specify it yourself, otherwise
//  you are going to receive the error 'Peer certificate cannot be authenticated with given CA certificates'
// More info on http://curl.haxx.se/docs/sslcerts.html and http://curl.haxx.se/docs/caextract.html
if (certfile) {
  curl.setOpt('CAINFO', certfile)
  //This is not a boolean field! 0 -> Disabled, 2 -> Enabled
  curl.setOpt('SSL_VERIFYHOST', 2)
  curl.setOpt('SSL_VERIFYPEER', 1)
} else {
  curl.setOpt('SSL_VERIFYHOST', 0)
  curl.setOpt('SSL_VERIFYPEER', 0)
}

curl.on('end', curl.close.bind(curl))
curl.on('error', curl.close.bind(curl))

curl.perform()
