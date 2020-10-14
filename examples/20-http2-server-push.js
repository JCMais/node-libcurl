/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs')
const path = require('path')

const { Curl, CurlPush, Easy, Multi, CurlHttpVersion } = require('node-libcurl')

console.log(Curl.getVersionInfoString())

const multi = new Multi()

const outFilePath = path.join(__dirname, 'result.out')

const handlesData = new Map()

multi.onMessage((error, handle, errorCode) => {
  const responseCode = handle.getInfo('RESPONSE_CODE').data
  // For versions of libcurl <= 7.71 this will always be the URL of the parent transfer
  // To get the one from each pushed resource, you need to build them manually. Like we did below.
  const urlInfo = handle.getInfo('EFFECTIVE_URL').data
  const url = handle.private.url || urlInfo
  const redirect = handle.getInfo('REDIRECT_URL').data

  if (error) {
    console.error(
      `Handle for ${url} (${redirect}) returned error: "${error.message}" with errcode: ${errorCode}`,
    )
  } else {
    console.log(
      `Handle for ${url} (${redirect}) finished with response code ${responseCode}`,
    )
  }

  // if the private object we added to the Easy instance has a fd property
  //  it means we must close it.
  if (handle.private && handle.private.fd) {
    fs.closeSync(handle.private.fd)
  }

  // This will have all the data from this Request - In case the original WRITEFUNCTION at the
  //  bottom of this file is used by the handle.
  // You can notice that as we are overwriting the WRITEFUNCTION option on the Easy instances
  //  that will process the pushed frames, this is going to be empty for them.
  const data = handlesData.get(handle)
  console.log(data)

  // We are done with this handle, remove it from the Multi instance and close it.
  // If you are not closing the handle here, some precaution must be taken
  //  as handles created by libcurl and that were accepted to handle the http2 push
  //  will be put into the original Multi handle instance automatically, but must be closed manually.
  multi.removeHandle(handle)
  handle.close()
})

// `duplicatedHandle` below will be a duplicated Easy instance based on the parent one.
// If accepting this push, it will be automatically added to the original `Multi` instance
//  by libcurl, but we must close it manually later on.
// If denying the push, nothing needs to be done with it, as libcurl will close it automatically.
// Please read the documentation for the overloaded method Multi.setOpt("PUSHFUNCTION")
//  for more details on some gotchas when setting this.
multi.setOpt(
  Multi.option.PUSHFUNCTION,
  (_parent, duplicatedHandle, pushFrameHeaders) => {
    console.log(
      '-> received push frame with %d headers',
      pushFrameHeaders.numberOfHeaders,
    )

    for (let i = 0; i < pushFrameHeaders.numberOfHeaders; i++) {
      const header = pushFrameHeaders.getByIndex(i)
      console.log('|-> header %d value is: %s', i, header)
    }

    const scheme = pushFrameHeaders.getByName(':scheme')
    const authority = pushFrameHeaders.getByName(':authority')
    const path = pushFrameHeaders.getByName(':path')
    console.log('|-> :scheme header value is: "%s"', scheme)
    console.log('|-> :authority header value is: "%s"', authority)
    console.log('|-> :path header value is: "%s"', path)

    if (
      scheme &&
      authority &&
      path &&
      path.startsWith('/serverpush/static/playground.js')
    ) {
      console.log('||-> push allowed as it is a known file')

      console.log('||-> adding callback to write file to disk')

      duplicatedHandle.private = {
        fd: fs.openSync(outFilePath, 'w+'),
        position: 0,
        url: `${scheme}://${authority}${path}`,
      }

      // If we do not set the callback, the same one that was
      //  set on the parent is going to be used here.
      duplicatedHandle.setOpt('WRITEFUNCTION', function (data, size, nmemb) {
        const written = fs.writeSync(
          this.private.fd,
          data,
          0,
          size * nmemb,
          this.private.position,
        )
        this.private.position += written
        return written
      })

      return CurlPush.Ok
    }

    console.log('||-> unknown file - denying push')
    return CurlPush.Deny
  },
)

process.on('exit', () => {
  multi.close()
})

const handle = new Easy()
handle.private = {}
handle.setOpt('URL', 'https://http2.golang.org/serverpush')
// As this is just an example, we are setting this to false to not have to
//  set CAINFO or  CAPATH if running this from a platform that does not provide
//  SSL certificates.
// But keep in mind that this is not safe, do not use it in production, unless you know what you are doing.
handle.setOpt('SSL_VERIFYPEER', false)
handle.setOpt('FOLLOWLOCATION', true)
handle.setOpt('HTTP_VERSION', CurlHttpVersion.V2Tls)
handle.setOpt('VERBOSE', true)
handle.setOpt('WRITEFUNCTION', function onData(data, n, nmemb) {
  let existingData = handlesData.get(this)

  if (!existingData) {
    existingData = []
    handlesData.set(this, existingData)
  }

  existingData.push(data)

  return n * nmemb
})

multi.addHandle(handle)
