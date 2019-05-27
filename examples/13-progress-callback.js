/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example that shows the use of the the progress callback.
 * The progress bar is made using the node-progress (https://github.com/visionmedia/node-progress) module.
 * You need to install that package to make it work.
 */
const path = require('path')
const fs = require('fs')

const ProgressBar = require('progress')

const { Curl, CurlFeature } = require('../dist')

const curl = new Curl()
const url = process.argv[2] || 'http://ovh.net/files/100Mio.dat'

const complete = '\u001b[42m \u001b[0m'
const incomplete = '\u001b[43m \u001b[0m'
const outputFile = path.resolve(__dirname, 'result.out')

const speedInfo = {
  timeStart: [0, 0],
  timeSpent: 0,
  timeLast: [0, 0],
  counter: 0,
  speedAverage: 0,
}

let lastdlnow = 0
let bar = null

if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile)
}

curl.setOpt('URL', url)
curl.setOpt(Curl.option.NOPROGRESS, false)

//Since we are downloading a large file, disable internal storage
// used for automatic http data/headers parsing.
//Because of that, the end event will receive null for both data/header arguments.
curl.enable(CurlFeature.NoStorage)

// utility function to convert process.hrtime() call result to ms.
function hrtimeToMs(hrtimeTouple) {
  return (hrtimeTouple[0] * 1000 + hrtimeTouple[1] / 1e6) | 0
}

// The option XFERINFOFUNCTION was introduced in curl version 7.32.0,
// versions older than that should use PROGRESSFUNCTION.
// if you don't want to mess with version numbers,
// there is the following helper method to set the progress cb.
curl.setProgressCallback((dltotal, dlnow /*, ultotal, ulnow*/) => {
  if (dltotal === 0) {
    return 0
  }

  if (!bar) {
    console.log()
    bar = new ProgressBar(
      'Downloading [:bar] :percent :etas - Avg :speed Kb/s',
      {
        complete: complete,
        incomplete: incomplete,
        width: 20,
        total: dltotal,
      },
    )
  }

  speedInfo.timeSpent = process.hrtime(speedInfo.timeStart)

  const now = process.hrtime()

  //update no more than 1 time per second, or if it's the last call to the callback.
  if (
    ((hrtimeToMs(speedInfo.timeLast) / 1000) | 0) ===
      ((hrtimeToMs(now) / 1000) | 0) &&
    dlnow !== dltotal
  ) {
    return 0
  }

  speedInfo.timeLast = now

  //average speed
  speedInfo.speedAverage =
    dlnow / (speedInfo.timeSpent[0] > 0 ? speedInfo.timeSpent[0] : 1)

  if (bar) {
    bar.tick(dlnow - lastdlnow, {
      speed: (speedInfo.speedAverage / 1000).toFixed(2),
    })

    lastdlnow = dlnow
  }

  return 0
})

// This is basically the same than the `data` event emitted on
//  the `Curl` instance, but keep in mind that here the return value is considered.
// You must return the amount of data that was written.
curl.setOpt(Curl.option.WRITEFUNCTION, chunk => {
  fs.appendFileSync(outputFile, chunk)

  return chunk.length
})

curl.on('end', () => {
  console.log('Download ended')
  curl.close()
})

curl.on('error', error => {
  console.log('Failed to download file', error)
  curl.close()
})

speedInfo.timeStart = process.hrtime()
curl.perform()
