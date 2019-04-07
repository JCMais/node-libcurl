/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could do a simple request using the curl async fn
 */
const querystring = require('querystring')

const curl = require('../lib/curlFn')

const run = async () => {
  try {
    // there are many ways to use the curl.* functions

    // 1. passing just the url

    // the promise resolves to an object with properties data, headers and statusCode
    const response1 = await curl.get('http://www.httpbin.org/get')
    console.log('==================== FIRST REQUEST ====================')
    console.log(response1.statusCode, response1.headers, response1.data)

    // 2. Passing extra libcurl options, using their corresponding name, or using their camel case variant
    const dataToSend = {
      //Data to send, inputName : value
      'input-arr[0]': 'input-arr-val0',
      'input-arr[1]': 'input-arr-val1',
      'input-arr[2]': 'input-arr-val2',
      'input-name': 'input-val',
    }

    const response2 = await curl.post('http://httpbin.org/post', {
      postFields: querystring.stringify(dataToSend),
      // would work too:
      // POSTFIELDS: querystring.stringify(dataToSend),
    })

    console.log('==================== SECOND REQUEST ====================')
    console.log(response2.statusCode, response2.headers, response2.data)

    // 3 - Using writeFunction / headerFunction instead
    await curl.get('http://httpbin.org/get', {
      writeFunction: (chunk, size, nmemb) => {
        // do something with chunk, which is a Buffer
        return size * nmemb
      },
      headerFunction: (chunk, size, nmemb) => {
        // do something with chunk, which is a Buffer
        return size * nmemb
      },
    })

    // in case of errors, the libcurl error code will be inside `error.code`

    await curl.get('http://www.non-existing-domain.com')
  } catch (error) {
    console.error(`Error: ${error.message} - Code: ${error.code}`)
  }
}

run()
