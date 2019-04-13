/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * This is an example showing how one could use the send and recv methods
 */
const Easy = require('../lib/Easy')
const Multi = require('../lib/Multi')
const Curl = require('../lib/Curl')

const easy = new Easy()
const multi = new Multi()

const send = Buffer.from('GET / HTTP/1.0\r\nHost: example.com\r\n\r\n')
const recv = Buffer.alloc(5 * 1024 * 1024) //reserve 5mb

const shouldUseMultiHandle = true

let wasSent = false

easy.setOpt(Curl.option.URL, 'http://example.com')
// CONNECT_ONLY must be set to send and recv work
easy.setOpt(Curl.option.CONNECT_ONLY, true)

//This callback is going to be called when there is some action
// in the socket responsible for this handle.
// Remember that, for it to be called, one must have called easy.monitorSocketEvents();
easy.onSocketEvent((error, events) => {
  const isWritable = events & Easy.socket.WRITABLE
  const isReadable = events & Easy.socket.READABLE

  if (error) {
    throw error
  }

  // Make sure the socket is writable, and, that we have not sent the request already.
  if (isWritable && !wasSent) {
    console.log('Sending request.')
    const { code, bytesSent } = easy.send(send)

    // just lets make sure the return code is correct and that all the data was sent.
    if (code !== Curl.code.CURLE_OK || bytesSent !== send.length) {
      throw Error('Something went wrong.')
    }

    console.log(`Sent ${bytesSent} bytes.`)

    wasSent = true

    // Here we must check if the socket is readable, and that we have sent the data already.
  } else if (isReadable && wasSent) {
    console.log('Reading request response.')
    const { code, bytesReceived } = easy.recv(recv)
    console.log(`Received ${bytesReceived} bytes.`)

    if (code !== Curl.code.CURLE_OK) {
      throw Error(Easy.strError(code))
    }

    console.log(recv.toString('utf8', 0, bytesReceived))

    //we don't need to monitor for events anymore, so let's just stop the socket polling
    easy.unmonitorSocketEvents()

    if (shouldUseMultiHandle) {
      multi.removeHandle(easy)
      multi.close()
    }

    easy.close()
  }
})

//send and recv only works with the multi handle
// if you are using a libcurl version greater than 7.42
// See: https://github.com/bagder/curl/commit/ecc4940df2c286702262f8c21d7369f893e78968
if (shouldUseMultiHandle) {
  multi.onMessage((error, easy, errorCode) => {
    if (error) {
      console.error('Error code: ' + errorCode)

      throw error
    }

    //ok, connection made!
    // monitor for socket events
    easy.monitorSocketEvents()
  })

  multi.addHandle(easy)
} else {
  const result = easy.perform()

  if (result !== Curl.code.CURLE_OK) {
    throw Error(Easy.strError(result))
  }

  //Using just the easy interface,
  // the connection is made right after the perform call
  // so we can already start monitoring for socket events
  easy.monitorSocketEvents()
}
