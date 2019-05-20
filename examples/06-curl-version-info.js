/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const { Curl } = require('../dist')

// there are many helpers to retrieve version information from libcurl:

console.log('Curl.VERSION_NUM, integer:')
console.log(Curl.VERSION_NUM)

console.log('Curl.getVersion():')
console.log(Curl.getVersion())

console.log('Curl.getVersionInfo():')
console.log(Curl.getVersionInfo())

console.log('Curl.getVersionInfoString():')
console.log(Curl.getVersionInfoString())
