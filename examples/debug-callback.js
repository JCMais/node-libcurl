/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example of how to use the DEBUGFUNCTION option
 */
const Curl = require('../lib/Curl')

const curl = new Curl()
const url = process.argv[2] || 'http://www.google.com'
const infoTypes = Curl.info.debug
const EOL = process.platform === 'win32' ? '\r\n' : '\n'

const debugCallback = (infoType, content) => {
  let text = ''

  const contentString = content.toString('utf8')

  switch (infoType) {
    case infoTypes.TEXT:
      text = contentString
      break
    case infoTypes.DATA_IN:
      text = '-- RECEIVING DATA: ' + EOL + contentString
      break
    case infoTypes.DATA_OUT:
      text = '-- SENDING DATA: ' + EOL + contentString
      break
    case infoTypes.HEADER_IN:
      text = '-- RECEIVING HEADER: ' + EOL + contentString
      break
    case infoTypes.HEADER_OUT:
      text = '-- SENDING HEADER: ' + EOL + contentString
      break
    case infoTypes.SSL_DATA_IN:
      text = '-- RECEIVING SSL DATA: ' + EOL + contentString
      break
    case infoTypes.SSL_DATA_OUT:
      text = '-- SENDING SSL DATA: ' + EOL + contentString
      break
  }

  console.log(text)

  return 0
}

curl.setOpt('URL', url)
curl.setOpt('VERBOSE', true)
curl.setOpt('DEBUGFUNCTION', debugCallback)

curl.on('end', curl.close.bind(curl))
curl.on('error', curl.close.bind(curl))

curl.perform()
