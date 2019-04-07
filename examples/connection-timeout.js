/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const util = require('util')

const Curl = require('../lib/Curl')

const curl = new Curl()

//http://stackoverflow.com/a/904609/710693
curl.setOpt(Curl.option.URL, '10.255.255.1')
curl.setOpt(Curl.option.CONNECTTIMEOUT, 1)
curl.setOpt(Curl.option.VERBOSE, 1)

console.log(util.inspect(process.versions))
console.log(util.inspect(Curl.getVersion()))

curl.on('end', () => {
  console.log(util.inspect(arguments))
  curl.close()
})

curl.on('error', () => {
  console.log(util.inspect(arguments))
  curl.close()
})

curl.perform()
