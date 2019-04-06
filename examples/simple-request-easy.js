/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could do a simple request using the Easy handle.
 */
var Easy = require('../lib/Easy'),
  Curl = require('../lib/Curl'),
  url = process.argv[2] || 'http://www.google.com',
  ret,
  ch;

ch = new Easy();

ch.setOpt(Curl.option.URL, url);
ch.setOpt(Curl.option.NOPROGRESS, false);

ch.setOpt(Curl.option.XFERINFOFUNCTION, function(dltotal, dlnow, ultotal, ulnow) {
  console.log('PROGRESS', dltotal, dlnow, ultotal, ulnow);
});

ch.setOpt(Curl.option.HEADERFUNCTION, function(buf, size, nmemb) {
  console.log('HEADERFUNCTION: ');
  console.log(arguments);

  return size * nmemb;
});

ch.setOpt(Curl.option.WRITEFUNCTION, function(buf, size, nmemb) {
  console.log('WRITEFUNCTION: ');
  console.log(arguments);

  return size * nmemb;
});

ret = ch.perform();

ch.close();

console.log(ret, ret === Curl.code.CURLE_OK, Easy.strError(ret));
