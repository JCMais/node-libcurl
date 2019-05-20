/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to upload a file using a `Curl` instance using http method `PUT`
 */
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const { Curl } = require('../dist')

const curl = new Curl()
const url = 'httpbin.org/put'
const fileSize = 10 * 1024 //1KB
const fileName = path.resolve(__dirname, 'upload.test')

// write random bytes to a file, this will be our upload file.
fs.writeFileSync(fileName, crypto.randomBytes(fileSize))

console.log('File: ', fs.readFileSync(fileName, 'base64'))

fs.open(fileName, 'r+', function(err, fd) {
  // enabling VERBOSE mode so we can get more details on what is going on.
  curl.setOpt(Curl.option.VERBOSE, true)
  // set UPLOAD to a truthy value to enable PUT upload.
  curl.setOpt(Curl.option.UPLOAD, true)
  // pass the file descriptor to the READDATA option
  //  passing one invalid value here will cause an aborted by callback error.
  curl.setOpt(Curl.option.READDATA, fd)

  curl.setOpt(Curl.option.URL, url)

  curl.on('end', function(statusCode, body) {
    console.log('Response from httpbin:')
    console.log({
      statusCode,
      body: JSON.parse(body),
    })

    // remember to always close the file descriptor!
    fs.closeSync(fd)
    fs.unlinkSync(fileName)

    // the same for the `Curl` instance, always close it when you don't need it anymore.
    this.close()
  })

  curl.on('error', function(error, errorCode) {
    console.log(error, errorCode)

    fs.closeSync(fd)
    fs.unlinkSync(fileName)
    this.close()
  })

  curl.perform()
})
