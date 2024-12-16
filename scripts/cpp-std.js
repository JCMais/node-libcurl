/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const isGreaterOrEqual = (a, b) => {
  return a.localeCompare(b, undefined, { numeric: true }) >= 0
}

if (process.env.NODE_LIBCURL_CPP_STD) {
  console.log(process.env.NODE_LIBCURL_CPP_STD)
} else {
  // e.g: '/Users/jcm/.electron-gyp/32.2.6'
  const nodeRootDir = process.argv[2]

  // detect electron related env vars coming from
  // npm flags, e.g: npm_config_runtime
  // we could also use node-abi here!
  const isElectron =
    process.env['npm_config_runtime'] === 'electron' ||
    nodeRootDir?.includes('electron-gyp')
  const electronVersion = isElectron
    ? process.env['npm_config_target'] ?? nodeRootDir?.split('/').pop()
    : null

  if (isElectron && electronVersion) {
    if (isGreaterOrEqual(electronVersion, '32.0.0')) {
      console.log('c++20')
    } else if (isGreaterOrEqual(electronVersion, '13.0.0')) {
      console.log('c++17')
    } else {
      console.log('c++98')
    }
  } else {
    // https://github.com/nodejs/node/blob/main/doc/abi_version_registry.json
    // https://github.com/nodejs/node/blob/main/doc/abi_version_registry.json
    // 129 === Node.js v23
    if (process.versions.modules && parseInt(process.versions.modules) >= 129) {
      console.log('c++20')
    } else if (
      process.versions.modules &&
      parseInt(process.versions.modules) >= 88
    ) {
      // 88 === Node.js v15
      console.log('c++17')
    } else {
      console.log('c++98')
    }
  }
}
