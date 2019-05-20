/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could do a simple request using the `curlx` async fn
 */
const querystring = require('querystring')

const { curly } = require('../dist')

const run = async () => {
  try {
    // there are many ways to use the curly.* functions
    let response = null

    // 1. Calling directly, which will default to a GET
    console.log('==================== REQUEST #1 ====================')
    response = await curly('http://www.httpbin.org/get')
    console.log(response.statusCode, response.headers, response.data)

    // 2. Using the curly.<http-verb> functions

    // get
    console.log('==================== REQUEST #2 ====================')
    response = await curly.get('http://www.httpbin.org/get')
    console.log(response.statusCode, response.headers, response.data)

    // post
    console.log('==================== REQUEST #3 ====================')
    const dataToSend = {
      //Data to send, inputName : value
      'input-arr[0]': 'input-arr-val0',
      'input-arr[1]': 'input-arr-val1',
      'input-arr[2]': 'input-arr-val2',
      'input-name': 'input-val',
    }
    response = await curly.post('http://httpbin.org/post', {
      postFields: querystring.stringify(dataToSend),
      // would work too:
      // POSTFIELDS: querystring.stringify(dataToSend),
    })
    console.log(response.statusCode, response.headers, response.data)

    // 3 - Using writeFunction / headerFunction instead
    console.log('==================== REQUEST #4 ====================')
    response = await curly.get('http://httpbin.org/get', {
      writeFunction: (chunk, size, nmemb) => {
        // do something with chunk, which is a Buffer
        return size * nmemb
      },
      headerFunction: (chunk, size, nmemb) => {
        // do something with chunk, which is a Buffer
        return size * nmemb
      },
    })
    // In this case headers will be an empty array and data will be a 0 length string
    console.log(response.statusCode, response.headers, response.data)

    // in case of errors, the libcurl error code will be inside `error.code`
    await curly.get('http://www.non-existing-domain.com')
  } catch (error) {
    console.error(`Error: ${error.message} - Code: ${error.code}`)
  }
}

run()
