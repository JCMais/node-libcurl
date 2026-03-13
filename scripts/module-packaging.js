/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const { Octokit } = require('@octokit/rest')
const log = require('npmlog')
const fs = require('fs')
const path = require('path')
const tag =
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

const octo = new Octokit({
  auth: process.env['NODE_LIBCURL_GITHUB_TOKEN'],
})

const [owner, repo] = 'JCMais/node-libcurl'.split('/')
const commands = {
  publish: publish,
  unpublish: unpublish,
}

commands[args[0].replace('--', '')](args[1]).catch((error) => {
  console.error(error)
  process.exit(1)
})

/**
 * @param {string} pathToPackage
 */
async function publish(pathToPackage) {
  let release = await getReleaseByTag(tag)

  if (release) {
    log.info('', 'release for tag "%s" found: %s', tag, release.url)
  } else {
    log.info('', 'release "%s" not found', tag)
    release = await createRelease(tag)
  }

  await attachPackageToRelease(pathToPackage, release)
}

async function unpublish(pathToResource) {
  const release = await getReleaseByTag(tag)

  await removePackageFromRelease(pathToResource, release)
}

async function getReleaseByTag(tag) {
  log.info('', 'searching for release "%s"', tag)

  const release = await octo.repos
    .getReleaseByTag({
      owner,
      repo,
      tag,
    })
    .catch((error) => {
      if (error.status === 404) {
        return null
      }
      throw error
    })

  return release?.data
}

async function createRelease(tag) {
  log.info('', 'creating release for tag "%s"', tag)

  const { data } = await octo.repos.createRelease({
    owner,
    repo,
    tag_name: tag,
  })

  return data
}

/**
 *
 * @param {string} pckg
 * @param {Awaited<ReturnType<Octokit["repos"]["getRelease"]>>["data"]} release
 * @returns
 */
async function attachPackageToRelease(pckg, release) {
  const packagePath = path.resolve(pckg)

  if (!fs.existsSync(packagePath)) {
    throw new Error(
      `Could not find the package in the specified path: "${packagePath}"`,
    )
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
        'package "%s" already attached to release "%s" (%s)',
        packageFileName,
        release.tag_name,
        release.id,
      )
      return
    }
  }

  const fileContent = fs.readFileSync(packagePath)

  const { data } = await octo.repos.uploadReleaseAsset({
    owner,
    repo,
    name: packageFileName,
    data: fileContent,
    release_id: release.id,
    headers: {
      'Content-Type': 'application/x-gzip',
    },
  })

  log.info('', 'package attached with success: %s', data.browser_download_url)
}

/**
 *
 * @param {string} pckg
 * @param {Awaited<ReturnType<Octokit["repos"]["getRelease"]>>["data"]} release
 * @returns
 */
async function removePackageFromRelease(packageToDelete, release) {
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

      await octo.repos.deleteReleaseAsset({
        owner,
        repo,
        asset_id: releaseAsset.id,
      })

      log.info(
        '',
        'removed package "%s" from release "%s"',
        packageToDelete,
        release.tag_name,
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
  }
}
