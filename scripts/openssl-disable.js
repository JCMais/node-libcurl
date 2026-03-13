/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/nodejs/node-gyp/blob/64bb407c14149c216885a48e78df178cedaec8fd/bin/node-gyp.js#L25
if (process.platform !== 'win32') {
  process.exit(0)
}

const fs = require('fs')
const path = require('path')
const os = require('os')

const envPaths = require('env-paths')

const homeDir = os.homedir()

let { version } = process
let gypFolder = envPaths('node-gyp', { suffix: '' }).cache

if (process.env.npm_config_runtime === 'node-webkit') {
  version = process.env.npm_config_target
  gypFolder = path.resolve(homeDir, '.nw-gyp')
}

// node-gyp path from here: https://github.com/nodejs/node-gyp/blob/v5.0.3/bin/node-gyp.js#L31
const gypDir = path.resolve(gypFolder, version.replace('v', ''))

// we are renaming the openssl directory so it does not get used when compilling.
// node-gyp default addon.gyp file adds the above folder as include, which would make
// the c++ includes for openssl/* point to that folder, instead of using the one from the openssl
// we are building. This only happens for node >= 10, probably because only with this version
// openssl started to be have their symbols exported on Windows, or for another obscure reason.
const opensslFolder = path.resolve(gypDir, 'include', 'node', 'openssl')
const opensslFolderDisabled = `${opensslFolder}.disabled`
if (fs.existsSync(opensslFolder)) {
  fs.renameSync(opensslFolder, opensslFolderDisabled)
}
