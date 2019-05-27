/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to upload a file to a ftp server and rename it right after.
 * Mostly based on https://curl.haxx.se/libcurl/c/ftpupload.html
 * How to run:
 *  node examples/16-ftp-full-upload.js ftp://example-of-ftp-host.com username password
 * To test you can use ftp://speedtest.tele2.net:
 *  node examples/16-ftp-full-upload.js ftp://speedtest.tele2.net/upload anonymous
 * Keep in mind the speedtest server does not accept file renaming, so it will fail on the quote command
 */
const path = require('path')
const fs = require('fs')

const { Curl, CurlFeature } = require('../dist')

const curl = new Curl()
const url = process.argv[2].replace(/\/$/, '') + '/'
const username = process.argv[3]
const password = process.argv[4]
const localFile = 'test.txt'
const uploadFileWithName = 'file-uploading.txt'
const renameUploadedFileTo = 'file-uploaded.txt'

const headerList = [
  'RNFR ' + uploadFileWithName,
  'RNTO ' + renameUploadedFileTo,
]

const filePath = path.join(__dirname, localFile)
const fileContent = Buffer.from(`
  This was a test file uploaded using node-libcurl
`)

fs.writeFileSync(filePath, fileContent)

const fd = fs.openSync(filePath, 'r')

const fileStat = fs.fstatSync(fd)

// enable verbose mode
curl.setOpt(Curl.option.VERBOSE, true)
// specify target, username and password
curl.setOpt(Curl.option.URL, url + uploadFileWithName)
curl.setOpt(Curl.option.USERNAME, username)
// only set password if one was provided
password && curl.setOpt(Curl.option.PASSWORD, password)
// enable uploading
curl.setOpt(Curl.option.UPLOAD, true)
// pass in that last of FTP commands to run after the transfer
curl.setOpt(Curl.option.POSTQUOTE, headerList)
// now specify which file to upload, in this case
//  we are using a file descriptor given by fs.openSync
curl.setOpt(Curl.option.READDATA, fd)
// Set the size of the file to upload (optional).
//  You must the *_LARGE option if the file is greater than 2GB.
curl.setOpt(Curl.option.INFILESIZE_LARGE, fileStat.size)

// enable feature flag to not use storage / parsing
curl.enable(CurlFeature.NoStorage)

curl.perform()

curl.on('end', function() {
  curl.close()
  fs.closeSync(fd)
})

curl.on('error', function(error, errorCode) {
  console.log(error, errorCode)

  curl.close()
  fs.closeSync(fd)
})
