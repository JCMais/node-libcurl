/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to upload a file using a `Curl` instance using http method `PUT`
 * But now instead of passing the file descriptor as the `READDATA` option, we will use the
 *  `READFUNCTION` option.
 */
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const { Curl } = require('../dist')

const curl = new Curl()
const url = 'httpbin.org/put'
const fileSize = 64 * 1024 //64KB
const fileName = path.resolve(__dirname, 'upload.test')

// write random bytes to a file, this will be our upload file.
fs.writeFileSync(fileName, crypto.randomBytes(fileSize))

console.log('File Size: ', fs.statSync(fileName).size)

console.log('\n'.repeat(5))

const stream = fs.createReadStream(fileName)

stream.on('ready', () => {
  // enabling VERBOSE mode so we can get more details on what is going on.
  curl.setOpt(Curl.option.VERBOSE, true)
  // set UPLOAD to a truthy value to enable PUT upload.
  curl.setOpt(Curl.option.UPLOAD, true)
  // this is not required, but it let us tell libcurl
  //  the amount of data we are going to send
  // If we don't specify this, libcurl will keep calling our READFUNCTION
  //  until we return 0 from it. You can test that commenting this line.
  curl.setOpt(Curl.option.INFILESIZE, fileSize)
  // the internal upload buffer is by default 64kb, let's set it to 16 which is the minimum possible
  curl.setOpt(Curl.option.UPLOAD_BUFFERSIZE, 19 * 1024)

  curl.setOpt(Curl.option.READFUNCTION, (buffer, size, nmemb) => {
    const amountToRead = size * nmemb

    console.log(`There are ${stream.readableLength} bytes ready to be read`)
    console.log(`Trying to read ${amountToRead} bytes`)

    const data = stream.read(amountToRead)

    if (!data) {
      console.log('No data remaining in the stream')
      return 0
    }

    console.log(`Read ${data.length} bytes`)

    const totalWritten = data.copy(buffer)

    console.log(`Written ${data.length} bytes`)

    // we could also return CurlReadFunc.Abort or CurlReadFunc.Pause here.
    return totalWritten
  })

  curl.setOpt(Curl.option.URL, url)

  curl.on('end', function(statusCode, body) {
    console.log('Response from httpbin:')
    console.log({
      statusCode,
      body: JSON.parse(body),
    })

    fs.unlinkSync(fileName)

    this.close()
  })

  curl.on('error', function(error, errorCode) {
    console.log(error, errorCode)

    fs.unlinkSync(fileName)
    this.close()
  })

  curl.perform()
})
