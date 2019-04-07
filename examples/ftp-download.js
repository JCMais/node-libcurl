/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to directly download files from a FTP server using the Easy class
 */
const path = require('path')
const fs = require('fs')

const Curl = require('../lib/Curl')
const Easy = require('../lib/Easy')

const handle = new Easy()
const url = 'ftp://speedtest.tele2.net/1MB.zip'
const fileOutPath = process.argv[2] || path.join(process.cwd(), '1MB.zip')
const fileOut = fs.openSync(fileOutPath, 'w+')

handle.setOpt(Curl.option.URL, url)

handle.setOpt(Curl.option.WRITEFUNCTION, (buff, nmemb, size) => {
  let written = 0

  if (fileOut) {
    written = fs.writeSync(fileOut, buff, 0, nmemb * size)
  } else {
    /* listing output */
    process.stdout.write(buff.toString())
    written = size * nmemb
  }

  return written
})

handle.perform()
fs.closeSync(fileOut)
