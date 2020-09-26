/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to send binary data using the READFUNCTION option
 * In this case, we are uploading a protobuf encoded data.
 * To run this example it's necessary to run the protobuf server available at ./19-binary-data-protobuf.
 */
const path = require('path')

const { Curl, CurlFeature } = require('node-libcurl')

const protobuf = require('protobufjs')

const HOST = process.env.HOST || 'localhost:8080'

const protoPath = path.join(__dirname, '19-binary-data-protobuf', 'mock.proto')

console.log(Curl.getVersionInfoString())

async function sendProtoBufMessage(url, message) {
  const curl = new Curl()
  curl.setOpt('URL', url)
  // enable if you want to see even more debug info
  // curl.setOpt('VERBOSE', true)
  curl.setOpt('POST', true)
  curl.setOpt('HTTPHEADER', ['Content-Type: application/octet-stream'])

  // we are working with binary response body, we don't want node-libcurl to try to parse it
  curl.enable(CurlFeature.NoDataParsing)

  let position = 0

  curl.setOpt(Curl.option.READFUNCTION, (buffer, size, nmemb) => {
    const amountToRead = size * nmemb

    console.log(`#--> libcurl is trying to read ${amountToRead} bytes`)
    console.log(`      the buffer argument will have this size pre-allocated`)
    console.log(`#--> message we are sending has ${message.length} bytes`)
    console.log(
      `#--> current position we are reading from is ${position} bytes`,
    )

    if (position === message.length) {
      console.log(`#--> no data remaining to be read`)
      return 0
    }

    const totalWritten = message.copy(
      buffer,
      0,
      position,
      Math.min(amountToRead, message.length),
    )
    position += totalWritten

    console.log(`#--> written ${totalWritten} bytes on libcurl buffer`)

    // we could also return CurlReadFunc.Abort or CurlReadFunc.Pause here.
    return totalWritten
  })

  return new Promise((resolve, reject) => {
    curl.on('end', (status, data, _headers) => {
      curl.close()
      resolve(data)
    })

    curl.on('error', (error) => {
      curl.close()
      reject(error)
    })

    console.log('--> starting request')
    curl.perform()
  })
}

async function main() {
  const root = await protobuf.load(protoPath)

  const RequestGreet = root.lookup('RequestGreet')
  const ResponseGreet = root.lookup('ResponseGreet')

  const message = RequestGreet.create({ name: 'Jonathan', message: 'Hello!' })
  const buffer = RequestGreet.encode(message).finish()

  const result = await sendProtoBufMessage(`${HOST}/greet`, buffer)
  console.log('--> raw result from node-libcurl request', result)
  const decoded = ResponseGreet.decode(result)
  console.log('--> decoded result from node-libcurl request', decoded)
}

main().catch((error) => console.error('Uncaught exception', error))
