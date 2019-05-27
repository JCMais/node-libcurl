/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const octonode = require('octonode')
const log = require('npmlog')
const fs = require('fs')
const path = require('path')
const versionTag =
  process.env['NODE_LIBCURL_VERSION_TAG'] ||
  'v' + require('../package.json').version //current version of the package.

const args = process.argv.splice(2, 2)
const validArgs = ['--publish', '--unpublish']

log.heading = 'node-libcurl'

if (args.length !== 2) {
  log.error('', 'invalid number of arguments passed to module-packaging script')
  process.exit(-1)
}

if (args[0] !== validArgs[0] && args[0] !== validArgs[1]) {
  log.error(
    '',
    'invalid argument "%s" passed to module-packaging script.',
    args[0],
  )
  process.exit(-1)
}

const octo = octonode.client(process.env['NODE_LIBCURL_GITHUB_TOKEN'])
const repo = octo.repo('JCMais/node-libcurl')
const commands = {
  publish: publish,
  unpublish: unpublish,
}

commands[args[0].replace('--', '')](args[1])

function publish(pathToPackage) {
  getReleaseByTag(versionTag, (error, data, headers) => {
    if (error) {
      if (error.statusCode && error.statusCode === 404) {
        createRelease(
          versionTag,
          attachPackageToRelease.bind(null, pathToPackage),
        )
      } else {
        doSomethingWithError(error)
      }
    } else {
      attachPackageToRelease(pathToPackage, null, data, headers)
    }
  })
}

function unpublish(pathToResource) {
  getReleaseByTag(versionTag, (error, release /*, headers*/) => {
    if (error) {
      doSomethingWithError(error)
      return
    }

    removePackageFromRelease(pathToResource, release)
  })
}

function getReleaseByTag(tagName, cb) {
  log.info('', 'searching for release "%s"', tagName)

  repo.release('tags/' + tagName).info((error, data, headers) => {
    if (error && error.statusCode && error.statusCode === 404) {
      log.info('', 'release for tag "%s" not found.', tagName)
    } else {
      log.info('', 'release for tag "%s" found: %s', tagName, data.url)
    }

    cb(error, data, headers)
  })
}

function createRelease(tagName, cb) {
  log.info('', 'creating release for tag "%s"', tagName)

  repo.release(
    {
      tag_name: tagName,
    },
    cb,
  )
}

function attachPackageToRelease(pckg, err, release /*, headers*/) {
  if (err) {
    doSomethingWithError(err)
    return
  }

  const packagePath = path.resolve(pckg)

  if (!fs.existsSync(packagePath)) {
    log.error(
      '',
      'could not find the package in the specified path: "%s"',
      packagePath,
    )
    process.exit(-1)
  }

  log.info(
    '',
    'attaching package "%s" to release "%s"',
    packagePath,
    release.url,
  )

  const packageFileName = path.basename(packagePath)

  // check if the package already exists, if so warn and bail out.
  for (let i = 0; i < release.assets.length; i++) {
    if (release.assets[i].name === packageFileName) {
      log.warn(
        '',
        'package "%s" already attached to release "%s"',
        packageFileName,
        release.tag_name,
      )
      process.exit(0)
    }
  }

  const fileContent = fs.readFileSync(packagePath)

  repo.release(release.id).uploadAssets(
    fileContent,
    {
      name: packageFileName,
      contentType: 'application/x-gzip',
    },
    (error, data /*, headers*/) => {
      if (error) {
        doSomethingWithError(error)
        return
      }

      log.info(
        '',
        'package attached with success: %s',
        data.browser_download_url,
      )
      process.exit(0)
    },
  )
}

function removePackageFromRelease(packageToDelete, release) {
  const packageToDeleteName = path.basename(packageToDelete)

  let found = false

  log.info(
    '',
    'removing package "%s" from release "%s"',
    packageToDelete,
    release.tag_name,
  )

  for (let i = 0; i < release.assets.length; i++) {
    const releaseAsset = release.assets[i]

    if (releaseAsset.name === packageToDeleteName) {
      found = true

      //@FIXME using internals because there is no way to remove directly
      // uri to remove assets is: repos/:owner/:repo/releases/assets/:id
      repo.client.del(
        '/repos/' + repo.name + '/releases/assets/' + releaseAsset.id,
        null,
        (error /*, data, headers*/) => {
          if (error) {
            doSomethingWithError(error)
            return
          }

          log.info(
            '',
            'removed package "%s" from release "%s"',
            packageToDelete,
            release.tag_name,
          )
          process.exit(0)
        },
      )
    }
  }

  if (!found) {
    log.error(
      '',
      'package "%s" could be found in release "%s"',
      packageToDelete,
      release.tag_name,
    )
    process.exit(-1)
  }
}

function doSomethingWithError(error) {
  log.error('', error)
  process.exit(-1)
}
