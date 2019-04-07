/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to upload a file to a ftp server using node-libcurl
 * Mostly based on https://curl.haxx.se/libcurl/c/ftpupload.html
 * How to run:
 *  node ftp-upload.js ftp://example-of-ftp-host.com username password
 */
const path = require('path')
const fs = require('fs')

const Curl = require('../lib/Curl')

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

const fd = fs.openSync(path.join(__dirname, localFile), 'r')

const fileStat = fs.fstatSync(fd)

// enable verbose mode
curl.setOpt(Curl.option.VERBOSE, true)
// specify target, username and password
curl.setOpt(Curl.option.URL, url + uploadFileWithName)
curl.setOpt(Curl.option.USERNAME, username)
curl.setOpt(Curl.option.PASSWORD, password)
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

// enable raw mode
curl.enable(Curl.feature.RAW)

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
