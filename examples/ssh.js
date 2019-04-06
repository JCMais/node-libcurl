/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could connect to one ssh server using sftp
 */
var Easy = require('../lib/Easy'),
  Curl = require('../lib/Curl'),
  host = process.argv[2] || 'sftp://user:pass@host',
  ch,
  ret;

ch = new Easy();

ch.setOpt(Curl.option.URL, host);
ch.setOpt(Curl.option.VERBOSE, true);
ch.setOpt(Curl.option.SSH_AUTH_TYPES, Curl.ssh_auth.PASSWORD);

ch.setOpt(Curl.option.WRITEFUNCTION, function(buf, size, nmemb) {
  console.log(buf.toString('utf8'));
  return size * nmemb;
});

ret = ch.perform();

ch.close();

console.log(ret, ret === Curl.code.CURLE_OK, Easy.strError(ret));
