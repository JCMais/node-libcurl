/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Example showing how one could use streams with the `curly` async fn

const fs = require('fs')

const { CurlProgressFunc, curly } = require('../dist')

const run = async () => {
  // the files we are going to read and write
  const uploadFilePath = './100mb.in.data.zip'
  const downloadFilePath = './100mb.out.data.zip'

  const curlyStreamUpload = fs.createReadStream(uploadFilePath)

  const {
    statusCode: _statusCode,
    data: stream,
    headers: _headers,
  } = await curly.get('https://some-domain.com/upload-file', {
    // we are doing a PUT upload
    upload: true,
    // as we are setting this, there is no need to specify the payload size
    httpHeader: ['Transfer-Encoding: chunked'],
    // we want the response to be returned as a stream to us
    curlyStreamResponse: true,
    // we are uploading a stream
    curlyStreamUpload,
    // this will just make libcurl use their own progress function (which is pretty neat)
    curlyProgressCallback() {
      return CurlProgressFunc.Continue
    },
  })

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
}

run()
  .then(() => console.log('finished!'))
  .catch((error) => {
    console.error('error: ', error)
  })
