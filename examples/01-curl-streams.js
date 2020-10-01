/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Example showing how one could use streams with the `Curl` wrapper.

const fs = require('fs')

const { Curl, CurlFeature, CurlProgressFunc } = require('../dist')

const uploadFilePath = './100mb.in.data.zip'
const downloadFilePath = './100mb.out.data.zip'

const curl = new Curl()

// we want the response to be returned as a stream to us
curl.enable(CurlFeature.StreamResponse)

curl.setOpt('URL', 'https://some-domain.com/upload-file')
// we are doing a PUT upload
curl.setOpt('UPLOAD', true)
// as we are setting this, there is no need to specify the payload size
curl.setOpt('HTTPHEADER', ['Transfer-Encoding: chunked'])

const uploadStream = fs.createReadStream(uploadFilePath)
// we are uploading a stream
curl.setUploadStream(uploadStream)

curl.setStreamProgressCallback(() => {
  // this will use the default progress callback from libcurl
  return CurlProgressFunc.Continue
})

curl.on('end', (statusCode, data) => {
  console.log('\n'.repeat(5))
  // data length should be 0, as it was sent using the response stream
  console.log(
    `curl - end - status: ${statusCode} - data length: ${data.length}`,
  )
  curl.close()
})

curl.on('error', (error, errorCode) => {
  console.log('\n'.repeat(5))
  console.error('curl - error: ', error, errorCode)
  curl.close()
})

curl.on('stream', async (stream, _statusCode, _headers) => {
  // we are going to write the response stream to this file
  const writableStream = fs.createWriteStream(downloadFilePath)

  // two ways to go here

  // using pipe
  stream.pipe(writableStream)
  console.log('response stream: writing')
  stream.on('end', () => {
    console.log('response stream: finished!')
  })
  stream.on('error', (error) => {
    console.log('response stream: error', error)
  })
  stream.on('close', () => {
    console.log('response stream: close')
  })

  // usinc async iterators (Node.js >= 10)
  for await (const chunk of stream) {
    writableStream.write(chunk)
  }
  writableStream.end()
})

curl.perform()
