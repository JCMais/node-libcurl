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

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const util = require('util')

const envPaths = require('env-paths')

// we cannot use fs.promises because it was added on Node.js 10
//  but we need to support Node.js >= 8
const fsOpenAsync = util.promisify(fs.open)
const fsCloseAsync = util.promisify(fs.close)
const fsReadAsync = util.promisify(fs.read)
const fsWriteAsync = util.promisify(fs.write)
const fsStatAsync = util.promisify(fs.stat)
const execAsync = util.promisify(exec)

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

const execConfig = {
  cwd: path.resolve(__dirname + '/..'),
}

const depsGypTarget = 'curl-for-windows/curl.gyp:libcurl'

const fileWithDepsTag = 'LIBCURL_VERSION_WIN_DEPS'
const depsRepo = 'https://github.com/JCMais/curl-for-windows.git'
const envCurlForWindowsDepsVersionTag = process.env.NODE_LIBCURL_WINDEPS_TAG

const cleanupAndExit = (code = 0) => {
  // we are not reverting the openssl change we did above in here because
  // this is being done inside scripts/postinstall.js
  process.exit(code)
}

// let the magic begins
const run = async () => {
  try {
    const { stdout } = await execAsync(
      'git rev-parse --show-toplevel',
      execConfig,
    )

    // Check if we are in the root git dir.
    // That is, someone is running this directly from the node-libcurl repo.
    // if we are, just replace the tokens.
    if (path.relative(execConfig.cwd, stdout.trim()) === '') {
      return replaceTokensOnFiles(
        path.resolve(__dirname, '..', 'deps', 'curl-for-windows'),
      ).then(() => {
        process.stdout.write(`deps/${depsGypTarget}`)
      })
    }
  } catch (_) {
    // ignore errors
  }

  // otherwise retrieve the deps
  return retrieveWinDeps()
}

const retrieveWinDeps = async () => {
  const fileExists = fs.existsSync(fileWithDepsTag)

  if (!fileExists && !envCurlForWindowsDepsVersionTag) {
    console.error(
      `File: ${fileWithDepsTag} not found, and no NODE_LIBCURL_WINDEPS_TAG environment variable found.`,
    )
    cleanupAndExit(1)
  }

  const depsTag = envCurlForWindowsDepsVersionTag
    ? envCurlForWindowsDepsVersionTag.trim()
    : fs.readFileSync(fileWithDepsTag).toString().replace(/\n|\s/g, '')

  try {
    await execAsync(`git clone --branch ${depsTag} ${depsRepo}`, execConfig)
  } catch (error) {
    if (
      error
        .toString()
        .indexOf('already exists and is not an empty directory') !== -1
    ) {
      await execAsync('rmdir curl-for-windows /S /Q', execConfig)

      return retrieveWinDeps()
    } else {
      throw error
    }
  }

  await execAsync(
    'cd curl-for-windows && git submodule update --init && python configure.py',
    execConfig,
  )

  // Grab gyp config files and replace <(library) with static_library
  await replaceTokensOnFiles(path.resolve(__dirname, '..', 'curl-for-windows'))

  // remove git folder
  await execAsync('rmdir curl-for-windows\\.git /S /Q', execConfig)

  process.stdout.write(depsGypTarget)
}

async function replaceTokensOnFiles(dir) {
  const filesToCheck = [
    'libssh2.gyp',
    'openssl/openssl.gyp',
    'cares/cares.gyp',
    'nghttp2/nghttp2.gyp',
    'zlib.gyp',
    'curl.gyp',
  ]

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

  await Promise.all(
    filesToCheck.map(async (file) => {
      const filePath = path.resolve(dir, file)
      for (const patternReplacementPair of replacements) {
        await replaceOnFile(
          filePath,
          patternReplacementPair.pattern,
          patternReplacementPair.replacement,
        )
      }
    }),
  )
}

const REPLACE_ON_FILE_INITIAL_CHUNK_SIZE = 2048

async function replaceOnFile(file, search, replacement) {
  const fd = await fsOpenAsync(file, 'r+')

  try {
    const stat = await fsStatAsync(file)

    const totalSize = stat.size
    const buffer = Buffer.alloc(totalSize)

    let chunkSize = REPLACE_ON_FILE_INITIAL_CHUNK_SIZE
    let totalRead = 0

    // this while is not the best way to do this
    // but hey, it works, and we are processing just 5 files :D
    // The best way here probably would be to use a readable stream
    while (totalRead < totalSize) {
      if (totalRead + chunkSize > totalSize) {
        chunkSize = totalSize - totalRead
      }
      const { bytesRead } = await fsReadAsync(
        fd,
        buffer,
        totalRead,
        chunkSize,
        totalRead,
      )
      totalRead += bytesRead
    }

    const fileNewContent = buffer.toString('utf8').replace(search, replacement)

    await fsWriteAsync(fd, fileNewContent, 0, 'utf8')
  } finally {
    await fsCloseAsync(fd)
  }
}

run()
  .then(() => {
    cleanupAndExit()
  })
  .catch((error) => {
    console.error(error.toString())
    cleanupAndExit(1)
  })
