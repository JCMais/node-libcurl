/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Easy = require('../lib/Easy'),
  Curl = require('../lib/Curl'),
  readline = require('readline')

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

var instances = [],
  amount = 1e3,
  iteration = 0,
  handle

var postData = [
  {
    name: 'file',
    file: 'test.img',
    type: 'image/png',
  },
]

function createOrCloseCurlHandles() {
  var i = amount,
    shouldClose = iteration++ % 2

  if (shouldClose) {
    console.log('Closing handles.')
  } else {
    console.log('Opening handles.')
  }

  while (i--) {
    if (shouldClose) {
      instances[i].close()
      instances[i] = null
    } else {
      handle = new Easy()
      handle.setOpt('HTTPPOST', postData)
      handle.setOpt(Curl.option.XFERINFOFUNCTION, () => {})
      instances[i] = handle
    }
  }

  if (global.gc && shouldClose) {
    console.log('Calling garbage collector.')
    global.gc()
  }

  handle = null
}

function loop() {
  rl.question('Type anything to go to the next iteration: ', function () {
    createOrCloseCurlHandles()

    process.nextTick(loop)
  })
}

loop()
