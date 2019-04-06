/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example that shows all information you can get from a single request.
 */
var Curl = require('../lib/Curl');

var curl = new Curl(),
  url = 'http://www.google.com';

curl.setOpt(Curl.option.URL, url);
curl.setOpt(Curl.option.FOLLOWLOCATION, true);
curl.setOpt(Curl.option.COOKIEFILE, ''); //enable cookies
curl.perform();

curl.on('end', function() {
  for (var infoName in Curl.info) {
    if (Curl.info.hasOwnProperty(infoName) && infoName !== 'debug') {
      console.info(infoName, ': ', this.getInfo(infoName));
    }
  }

  this.close();
});

curl.on('error', curl.close.bind(curl));
