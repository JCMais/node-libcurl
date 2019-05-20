/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to directly download files from a FTP server
 */
const path = require('path')
const fs = require('fs')

const { Curl, CurlFeature } = require('../dist')

const curl = new Curl()
const url = 'ftp://speedtest.tele2.net/1MB.zip'

const fileOutPath = process.argv[2] || path.join(process.cwd(), '1MB.zip')
const fileOut = fs.openSync(fileOutPath, 'w+')

curl.setOpt(Curl.option.URL, url)

curl.setOpt(Curl.option.WRITEFUNCTION, (buff, nmemb, size) => {
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

// we don't need Curl to parse the data or store it internally
//  since we specified WRITEFUNCTION above, the data for the body of the response (the file itself in this case)
//  would not be stored anyway. But there are still the headers, which for FTP are the operations output.
curl.enable(CurlFeature.Raw | CurlFeature.NoStorage)

curl.on('end', (code, body, headers) => {
  console.log('Finished download of FTP file')

  fs.closeSync(fileOut)
  curl.close()
})

curl.on('error', error => {
  console.error(error)

  fs.closeSync(fileOut)
  curl.close()
})

curl.perform()
