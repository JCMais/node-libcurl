/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example that shows all information you can get from a single request.
 */
const { Curl } = require('../dist')

const curl = new Curl()
const url = 'http://httpbin.org/cookies/set/cookie1name/cookie1value'

curl.setOpt(Curl.option.URL, url)
curl.setOpt(Curl.option.FOLLOWLOCATION, true)
curl.setOpt(Curl.option.COOKIEFILE, '')
curl.perform()

curl.on('end', () => {
  for (const infoName in Curl.info) {
    if (Curl.info.hasOwnProperty(infoName) && infoName !== 'debug') {
      console.info(infoName, ': ', curl.getInfo(infoName))
    }
  }

  curl.close()
})

curl.on('error', curl.close.bind(curl))
