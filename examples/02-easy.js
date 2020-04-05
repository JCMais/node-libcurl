/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could do a simple request using the `Easy` handle.
 */
const { Curl, CurlCode, Easy } = require('../dist')

const url = process.argv[2] || 'http://www.google.com'

const handle = new Easy()

// Just like before, we can use the option name, or the constant
handle.setOpt('URL', url)
handle.setOpt(Curl.option.VERBOSE, url)

// This is used to receive the headers
// See https://curl.haxx.se/libcurl/c/CURLOPT_HEADERFUNCTION.html
handle.setOpt(Curl.option.HEADERFUNCTION, function (buf, size, nmemb) {
  console.log('HEADERFUNCTION: ')
  console.log(arguments)

  return size * nmemb
})

// This is used to receive the response data
// See https://curl.haxx.se/libcurl/c/CURLOPT_WRITEFUNCTION.html
handle.setOpt(Curl.option.WRITEFUNCTION, function (buf, size, nmemb) {
  console.log('WRITEFUNCTION: ')
  console.log(arguments)

  return size * nmemb
})

// this will trigger the request
const ret = handle.perform()
// The Easy handle will block the JS main thread:
console.log('I will only show after the request has finished')

// Remember to always close the handles
handle.close()

// In case there is something wrong, you can use Easy.strError to get a human readable string about the error
console.log(ret, ret === CurlCode.CURLE_OK, Easy.strError(ret))
