/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could do a simple request using the Easy handle.
 */
const Easy = require('../lib/Easy')
const Curl = require('../lib/Curl')

const url = process.argv[2] || 'http://www.google.com'

const ch = new Easy()

ch.setOpt(Curl.option.URL, url)
ch.setOpt(Curl.option.NOPROGRESS, false)

ch.setOpt(Curl.option.XFERINFOFUNCTION, (dltotal, dlnow, ultotal, ulnow) => {
  console.log('PROGRESS', dltotal, dlnow, ultotal, ulnow)
  return 0
})

ch.setOpt(Curl.option.HEADERFUNCTION, (buf, size, nmemb) => {
  console.log('HEADERFUNCTION: ')
  console.log(arguments)

  return size * nmemb
})

ch.setOpt(Curl.option.WRITEFUNCTION, function(buf, size, nmemb) {
  console.log('WRITEFUNCTION: ')
  console.log(arguments)

  return size * nmemb
})

const ret = ch.perform()

ch.close()

console.log(ret, ret === Curl.code.CURLE_OK, Easy.strError(ret))
