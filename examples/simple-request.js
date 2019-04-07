/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could do a simple request using the Curl wrapper.
 */
const Curl = require('../lib/Curl')

const curl = new Curl()
const url = process.argv[2] || 'http://www.google.com'

//you can use a string as option
curl.setOpt('URL', url)
//or use an already defined constant
curl.setOpt(Curl.option.CONNECTTIMEOUT, 5)
curl.setOpt(Curl.option.FOLLOWLOCATION, true)
// Uncomment to show more debug information.
//curl.setOpt(Curl.option.VERBOSE, true);
//keep in mind that if you use an invalid option, a TypeError exception will be thrown

// events are emitted with this bound to the handle, however if you use a arrow function the binding will be lost
curl.on('end', (statusCode, body, headers) => {
  console.info('Status Code: ', statusCode)
  console.info('Headers: ', headers)
  console.info('Body length: ', body.length)

  curl.close()
})

curl.on('error', (error, errorCode) => {
  console.error('Error: ', error)
  console.error('Code: ', errorCode)
  curl.close()
})

curl.perform()
