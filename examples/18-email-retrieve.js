/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to retrieve emails through IMAP/SSL
 * Based on https://curl.haxx.se/libcurl/c/imap-ssl.html
 */
const path = require('path')

const { Curl, CurlUseSsl } = require('../dist')

const curl = new Curl()
// This will fetch message 1 from the user's inbox.
// IMAPS is generally bound to port 993
const url = 'imaps://sub.domain.tld:993/INBOX/;UID=1'
const certfile = path.join(__dirname, 'cacert.pem')

curl.setOpt(Curl.option.USERNAME, 'username')
curl.setOpt(Curl.option.PASSWORD, 'password')

curl.setOpt(Curl.option.URL, url)

// enabling VERBOSE mode so we can get more details on what is going on.
curl.setOpt(Curl.option.VERBOSE, true)

curl.setOpt(Curl.option.USE_SSL, CurlUseSsl.All)
curl.setOpt(Curl.option.CAINFO, certfile)
//This is not safe, but you probably will need it if you are using a self signed certificate.
//curl.setOpt(Curl.option.SSL_VERIFYPEER, false);

curl.on('end', function(statusCode, body) {
  console.log(body)
  this.close()
})

curl.on('error', function(error, errorCode) {
  console.log(error, errorCode)
  this.close()
})

curl.perform()
