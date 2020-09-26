/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one can use the `Share` class to share data between handles
 */
const { Curl, CurlShareLock, Share } = require('../dist')

// first create the share instance that will be used
const share = new Share()
// specify what is going to be shared
share.setOpt('SHARE', CurlShareLock.DataConnect)
share.setOpt('SHARE', CurlShareLock.DataDns)
share.setOpt('SHARE', CurlShareLock.DataCookie)
share.setOpt('SHARE', CurlShareLock.DataSslSession)

// create our handles
const curl1 = new Curl()
const curl2 = new Curl()

// this endpoint will set some Cookies on the first handle
const url1 = 'http://httpbin.org/cookies/set/cookie1name/cookie1value'
// then we are going to call this endpoint with the second one, since the cookies are shared using
//  the `Share` instance, it will show the Cookies set on the first request.
const url2 = 'http://httpbin.org/cookies'

curl1.setOpt(Curl.option.URL, url1)
curl1.setOpt(Curl.option.FOLLOWLOCATION, true)
curl1.setOpt(Curl.option.COOKIEFILE, '')
curl1.setOpt(Curl.option.SHARE, share)

curl2.setOpt(Curl.option.URL, url2)
curl2.setOpt(Curl.option.FOLLOWLOCATION, true)
curl2.setOpt(Curl.option.COOKIEFILE, '')
curl2.setOpt(Curl.option.SHARE, share)

curl1.on('end', (statusCode, body, _headers) => {
  console.info('Cookies: ', JSON.parse(body))

  curl1.close()

  console.log()
  console.log()
  console.log('==================================================')
  console.log('================= CURL 2 REQUEST =================')
  console.log('==================================================')
  curl2.perform()
})

console.log('==================================================')
console.log('================= CURL 1 REQUEST =================')
console.log('==================================================')

curl1.on('error', (error, errorCode) => {
  console.error('Error: ', error)
  console.error('Code: ', errorCode)
  curl1.close()
})

curl2.on('end', (statusCode, body, _headers) => {
  console.info('Cookies: ', JSON.parse(body))

  curl2.close()
})

curl2.on('error', (error, errorCode) => {
  console.error('Error: ', error)
  console.error('Code: ', errorCode)
  curl2.close()
})

curl1.perform()
