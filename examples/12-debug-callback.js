/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example of how to use the DEBUGFUNCTION option.
 * This can be used to change the behavior of the VERBOSE option.
 * You can for instance use this to save that log somewhere else.
 */
const { Curl, CurlInfoDebug } = require('../dist')

const curl = new Curl()
const url = process.argv[2] || 'http://www.google.com'

const EOL = process.platform === 'win32' ? '\r\n' : '\n'

const debugCallback = (infoType, content) => {
  let text = ''

  const contentString = content.toString('utf8')

  switch (infoType) {
    case CurlInfoDebug.Text:
      text = contentString
      break
    case CurlInfoDebug.DataIn:
      text = '-- RECEIVING DATA: ' + EOL + contentString
      break
    case CurlInfoDebug.DataOut:
      text = '-- SENDING DATA: ' + EOL + contentString
      break
    case CurlInfoDebug.HeaderIn:
      text = '-- RECEIVING HEADER: ' + EOL + contentString
      break
    case CurlInfoDebug.HeaderOut:
      text = '-- SENDING HEADER: ' + EOL + contentString
      break
    case CurlInfoDebug.SslDataIn:
      text = '-- RECEIVING SSL DATA: ' + EOL + contentString
      break
    case CurlInfoDebug.SslDataOut:
      text = '-- SENDING SSL DATA: ' + EOL + contentString
      break
  }

  // we are just printing it to stdout.
  console.log(text)

  // must return 0, otherwise libcurl will abort the request.
  return 0
}

curl.setOpt('URL', url)
curl.setOpt('VERBOSE', true)
curl.setOpt('DEBUGFUNCTION', debugCallback)

curl.on('end', curl.close.bind(curl))
curl.on('error', curl.close.bind(curl))

curl.perform()
