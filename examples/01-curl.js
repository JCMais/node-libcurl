/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could do a simple request using the `Curl` wrapper.
 *
 * The `Curl` class is just a wrapper around the `Easy` class, it has all their methods, but instead
 *  of being `sync`, it's `async`. This is achieved by using a `Multi` instance internally.
 */
const { Curl, CurlFeature } = require('../dist')

// by default all Curl instances set their user agent to `node-libcurl/${addonVersion}`
//  when they are created
//  you can change it using:
Curl.defaultUserAgent = 'Something Else'
// or simply remove it
Curl.defaultUserAgent = null

const curl = new Curl()

// if you want to change the user agent for an already created instance you will need
//  to use their respective libcurl option, USERAGENT

// can pass the url via argument to this example. node examples/01-simple-request.js http://www.example.com
const url = process.argv[2] || 'http://www.google.com'

// you can use the option name directly
curl.setOpt('URL', url)

// or use an already defined constant
curl.setOpt(Curl.option.CONNECTTIMEOUT, 5)
curl.setOpt(Curl.option.FOLLOWLOCATION, true)

// Enable verbose mode
curl.setOpt(Curl.option.VERBOSE, true)

// If you use an invalid option, a TypeError exception will be thrown

// By default, this can emit 4 events, `data`, `header`, `end` and `error`.
// events are emitted with `this` bound to the handle, however if you
//  use an arrow function like below, you can still access the curl instance from the last argument

// The `chunk` argument passed to the `data` and `header` events are raw Buffer objects.
// The `body` argument passed to the `end` event is a string, which is the result of converting
//  all received data chunks to a utf8 string.
// The `headers` one passed to the `end` event is an array of objects, it is an array because each redirect has their own
//  headers, in case there were no redirects in the request or the `FOLLOWLOCATION` option was
//  not used, the array will contain a single item.
// You can disable this automatic conversion of the `body` and `headers` on the `end` event by enabling some features
//  on the `Curl` instance. For example:
curl.enable(CurlFeature.NoDataParsing)
curl.enable(CurlFeature.NoHeaderParsing)
// or just:
curl.enable(CurlFeature.Raw)

// that way the `end` event will receive the raw `Buffer` objects for `data` and `headers`.
// If you dont even want the `Curl` instance to store the data / headers, you can also enable features for that:
curl.enable(CurlFeature.NoDataStorage)
curl.enable(CurlFeature.NoHeaderStorage)
// or just:
curl.enable(CurlFeature.NoStorage)
// NoStorage imples Raw

// to get back to what it was before we can disable those features:
curl.disable(CurlFeature.Raw | CurlFeature.NoStorage)

// the curlInstance parameter is an easy way to have access to the
// original handler, even if you are using arrow functions (which this is not bound)
curl.on('data', (chunk, _curlInstance) => {
  console.log('Receiving data with size: ', chunk.length)
})

curl.on('header', (chunk, _curlInstance) => {
  console.log('Receiving headers with size: ', chunk.length)
})

curl.on('end', (statusCode, body, headers, _curlInstance) => {
  console.info('Status Code: ', statusCode)
  console.info('Headers: ', headers)
  console.info('Body length: ', body.length)

  // always close the `Curl` instance when you don't need it anymore
  // Keep in mind we can do multiple requests with the same `Curl` instance
  //  before it's closed, we just need to set new options if needed
  //  and call `.perform()` again.
  curl.close()
})

// Error will be a JS error, errorCode will be the raw error code (as int) returned from libcurl
curl.on('error', (error, errorCode) => {
  console.error('Error: ', error)
  console.error('Code: ', errorCode)
  curl.close()
})

// this triggers the request
curl.perform()

// It's async, so it does not block the Node.js thread
console.log('I will show before the request starts')
