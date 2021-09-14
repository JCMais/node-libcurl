#!/usr/bin/env node
/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// very crude CLI just to allow us to print a better error message when curl-config is not present
// but hey, there is no need for it to be more complex than this. :)

const { exec } = require('child_process')

const { argv } = process

if (!argv[2]) {
  console.error('Missing argument to curl-config')
  process.exit(1)
}

const arg = argv[2].trim()

const curlConfig = process.env.CURL_CONFIG ? process.env.CURL_CONFIG : 'curl-config';

exec(`${curlConfig} ${arg}`, function (error, stdout, stderr) {
  if (error != null) {
    console.error(
      'Could not run curl-config, please make sure libcurl dev package is installed.',
    )
    console.error('Output: ' + stderr)
    process.exit(1)
  }

  console.log(stdout)
  process.exit(0)
})
