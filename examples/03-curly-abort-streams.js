/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Example showing how one could download only the start of a big file
// using streams with the`curly` async fn

const fs = require('fs')

const { curly, CurlCode } = require('../dist')

const run = async () => {
  const { data: stream } = await curly.get(
    'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    {
      // we want the unparsed binary response to be returned as a stream to us
      curlyStreamResponse: true,
      curlyResponseBodyParsers: false,
    },
  )

  // we are going to write the response stream to this file
  const writableStream = fs.createWriteStream('big_buck_bunny_720p_1mb.mp4')

  let count = 0
  stream.on('data', (chunk) => {
    count += chunk.length
    console.info('downloaded', Math.floor(count / 1000), 'KB')
    // abort after 50KB
    if (count >= 65536) {
      console.info('abort download')
      stream.destroy()
    }
  })
  stream.on('error', (err) => {
    if (err.isCurlError && err.code === CurlCode.CURLE_ABORTED_BY_CALLBACK) {
      // this is expected
    } else {
      throw err
    }
  })
  stream.pipe(writableStream)
}

run()
  .then(() => console.log('finished!'))
  .catch((error) => {
    console.error('error: ', error)
  })
