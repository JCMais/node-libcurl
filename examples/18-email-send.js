/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to send emails through SMTP/TLS
 * Based on https://curl.haxx.se/libcurl/c/smtp-tls.html
 */
const path = require('path')

const { Curl, CurlUseSsl } = require('../dist')

const curl = new Curl()

const receiver = 'recipient@domain.tld'
const sender = 'sender@domain.tld (Example Sender)'

//smtp/TLS is generally bound to 587
const url = 'smtp://sub.domain.tld:587'

// this is going to be our email. Check RFC2821 and RFC2822
const rawEmail = [
  'Date: Tue, 03 May 2016 10:58:00 -0300\r\n',
  'To: ' + receiver + '\r\n',
  'From: ' + sender + '\r\n',
  //remember the message-ID must be different for each email sent
  'Message-ID: <node-libcurl-email-test-1@sub.domain.tld>\r\n',
  'Subject: SMTP TLS example message\r\n',
  '\r\n',
  'The body of the message starts here.\r\n',
  '\r\n',
  'It could be a lot of lines, could be MIME encoded, whatever.\r\n',
  'Check RFC5322.\r\n',
  '\r\n',
  '.\r\n',
]

let linesRead = 0
const certfile = path.join(__dirname, 'cacert.pem')

curl.setOpt(Curl.option.USERNAME, 'username')
curl.setOpt(Curl.option.PASSWORD, 'password')

curl.setOpt(Curl.option.URL, url)

// enabling VERBOSE mode so we can get more details on what is going on.
curl.setOpt(Curl.option.VERBOSE, true)

curl.setOpt(Curl.option.USE_SSL, CurlUseSsl.All)
curl.setOpt(Curl.option.CAINFO, certfile)
// This is not safe, but you probably will need it if you are using a self signed certificate.
//curl.setOpt(Curl.option.SSL_VERIFYPEER, false);

curl.setOpt(Curl.option.MAIL_FROM, sender)
// Make sure that MAIL_RCPT is an array
curl.setOpt(Curl.option.MAIL_RCPT, [receiver])

// As we are sending data, we need to set this option.
curl.setOpt(Curl.option.UPLOAD, true)

// This callback is responsible for sending the email to the server.
// Check https://curl.haxx.se/libcurl/c/CURLOPT_READFUNCTION.html for more info about it.
// buffer is a Node.js Buffer instance with length of size * nmemb
// You must return the number of bytes written.
curl.setOpt(Curl.option.READFUNCTION, (buffer, size, nmemb) => {
  const data = rawEmail[linesRead]

  if (linesRead === rawEmail.length || size === 0 || nmemb === 0) {
    return 0
  }

  const ret = buffer.write(data)

  linesRead++

  return ret
})

curl.on('end', (statusCode, body) => {
  console.log(body)
  this.close()
})

curl.on('error', (error) => {
  console.log(error)
  this.close()
})

curl.perform()
