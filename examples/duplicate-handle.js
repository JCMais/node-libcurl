/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example just showing how to use the dupHandle method
 * to keep requesting the same stuff again and again but using new
 * instances instead of the same.
 * You will also see that since we are closing the previous handle,
 *  the memory usage will stay constant
 */
const querystring = require('querystring')

const Curl = require('../lib/Curl')

// Do not run this against some real site unless you want to trigger some DDOS protection against you
const url = 'http://localhost:8080/'
const data = { 'Hi!': 'This was sent using node-libcurl <3!' }

const shouldCopyCallbacks = true
const shouldCopyEventListeners = true

const iterations = 1e3

let count = 0

const curl = new Curl()
curl.handleNumber = 0 //just so we know which handle is running

//you can use a string as option
curl.setOpt('URL', url)
curl.setOpt('CONNECTTIMEOUT', 5)
curl.setOpt('FOLLOWLOCATION', true)
curl.setOpt('HTTPHEADER', ['User-Agent: node-libcurl/1.0'])
curl.setOpt('POSTFIELDS', querystring.stringify(data))

// if you pass an arrow function here, keep in mind this will refer to the outer scope
//  in this case, you can use the last argument, which will be the curl handle
curl.on('end', function(statusCode, body, headers /*, curlHandle */) {
  ++count

  console.log('Handle #' + this.handleNumber + ' finished')

  console.log('Headers: ', headers)
  console.log('Status Code: ', statusCode)
  console.log('Body: ', body)

  if (count < iterations) {
    console.log('Duplicating handle #' + this.handleNumber)

    const duplicatedHandle = this.dupHandle(
      shouldCopyCallbacks,
      shouldCopyEventListeners,
    )
    duplicatedHandle.handleNumber = count

    console.log('Running handle #' + count)
    duplicatedHandle.perform()
  }

  console.log('Closing handle #' + this.handleNumber)
  this.close()
})

curl.on('error', function(error, errorCode) {
  console.error('Err: ', error)
  console.error('Code: ', errorCode)

  this.close()
})

console.log('Running handle #' + count)
curl.perform()
