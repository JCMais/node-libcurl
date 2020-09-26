/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
if (process.platform !== 'win32') {
  process.exit(0)
}

const { exec } = require('child_process')
const { resolve } = require('path')

const config = { cwd: resolve(__dirname, '..') }

exec(
  'git submodule update --init --recursive && python deps/curl-for-windows/configure.py',
  function (err) {
    if (err) {
      console.log(err.toString())
      process.exit(1)
    }

    process.exit(0)
  },
  config,
)
