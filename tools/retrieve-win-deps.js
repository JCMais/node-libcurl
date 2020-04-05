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

/*
 * Notes about this script:
 * It's a mess because of the callback hell, I could have used a promise library here,
 * but adding a dependency that is going to be used only in a single script, that is executed
 * only on Windows machines during install is not worth it.
 */

const { exec } = require('child_process')
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

// we are renaming openssl directory
//  so it does not get used when compilling.
// node-gyp default addon.gyp file adds the above folder as include, which would make
//  the c++ includes for openssl/* point to that folder, instead of using the one from the openssl
//  we are building. This only happens for node >= 10, probably because only there openssl started to
//  to be have their symbols exported on Windows. Or for other obscure motive.
const opensslFolder = path.resolve(gypDir, 'include', 'node', 'openssl')
const opensslFolderDisabled = `${opensslFolder}.disabled`
if (fs.existsSync(opensslFolder)) {
  fs.renameSync(opensslFolder, opensslFolderDisabled)
}

const execConfig = {
  cwd: path.resolve(__dirname + '/..'),
}

const depsGypTarget = 'curl-for-windows/curl.gyp:libcurl'

const fileWithDepsTag = 'LIBCURL_VERSION_WIN_DEPS'
const depsRepo = 'https://github.com/JCMais/curl-for-windows.git'
const envCurlForWindowsDepsVersionTag = process.env.NODE_LIBCURL_WINDEPS_TAG

const cleanupAndExit = (code = 0) => {
  process.exit(code)
}

// Check if we are on the root git dir. That is, someone is running this
//  directly from the node-libcurl repo.
exec('git rev-parse --show-toplevel', execConfig, function (err, stdout) {
  // Make sure we are the root git repo
  //  path.relative will return an empty string if both paths are equal
  if (!err && path.relative(execConfig.cwd, stdout.trim()) === '') {
    replaceTokensOnFiles(
      path.resolve(__dirname, '..', 'deps', 'curl-for-windows'),
    )
    process.stdout.write('deps/' + depsGypTarget)
    cleanupAndExit()
  } else {
    retrieveWinDeps()
  }
})

function retrieveWinDeps() {
  const fileExists = fs.existsSync(fileWithDepsTag)

  if (!fileExists && !envCurlForWindowsDepsVersionTag) {
    console.error(
      'File: ',
      fileWithDepsTag,
      ' not found, and no NODE_LIBCURL_WINDEPS_TAG environment variable found.',
    )
    cleanupAndExit(1)
  }

  const depsTag = envCurlForWindowsDepsVersionTag
    ? envCurlForWindowsDepsVersionTag.trim()
    : fs.readFileSync(fileWithDepsTag).toString().replace(/\n|\s/g, '')

  exec('git clone --branch ' + depsTag + ' ' + depsRepo, execConfig, function (
    err,
  ) {
    if (err) {
      if (
        err
          .toString()
          .indexOf('already exists and is not an empty directory') !== -1
      ) {
        exec('rmdir curl-for-windows /S /Q', execConfig, function (err) {
          if (err) {
            console.error(err.toString())
            cleanupAndExit(1)
          }

          retrieveWinDeps()
        })
      } else {
        console.error(err.toString())
        cleanupAndExit(1)
      }
    } else {
      exec(
        'cd curl-for-windows && git submodule update --init && python configure.py',
        execConfig,
        function (err) {
          if (err) {
            console.error(err.toString())
            cleanupAndExit(1)
          }

          // Grab gyp config files and replace <(library) with static_library
          replaceTokensOnFiles(
            path.resolve(__dirname, '..', 'curl-for-windows'),
          )

          // remove git folder
          exec('rmdir curl-for-windows\\.git /S /Q', execConfig, function (
            err,
          ) {
            if (err) {
              console.error(err.toString())
              cleanupAndExit(1)
            }

            process.stdout.write(depsGypTarget)
            cleanupAndExit()
          })
        },
      )
    }
  })
}

function replaceTokensOnFiles(dir) {
  const filesToCheck = [
    'libssh2.gyp',
    'openssl/openssl.gyp',
    'nghttp2/nghttp2.gyp',
    'zlib.gyp',
    'curl.gyp',
  ]
  // const pattern = /<\(library\)/g;
  const replacements = [
    {
      pattern: /<\(library\)/g,
      replacement: 'static_library',
    },
    // {
    //   pattern: /curl_for_windows_build_openssl%': 'true'/g,
    //   replacement: 'curl_for_windows_build_openssl\': \'false\'',
    // },
  ]

  for (const file of filesToCheck) {
    const filePath = path.resolve(dir, file)
    for (const patternReplacementPair of replacements) {
      replaceOnFile(
        filePath,
        patternReplacementPair.pattern,
        patternReplacementPair.replacement,
      )
    }
  }
}

function replaceOnFile(file, search, replacement) {
  if (!fs.existsSync(file)) {
    console.error('File: ', file, ' not found.')
    cleanupAndExit(1)
  }

  const fileContent = fs
    .readFileSync(file)
    .toString()
    .replace(search, replacement)

  fs.writeFileSync(file, fileContent)
}
