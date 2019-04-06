/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to directly download files from a FTP server
 */
var Curl = require('../lib/Curl'),
  Easy = require('../lib/Easy'),
  path = require('path'),
  fs = require('fs');

var handle = new Easy(),
  url = 'ftp://speedtest.tele2.net/1MB.zip',
  fileOutPath = process.argv[2] || path.join(process.cwd(), '1MB.zip'),
  fileOut = fs.openSync(fileOutPath, 'w+');

handle.setOpt(Curl.option.URL, url);

handle.setOpt(Curl.option.WRITEFUNCTION, function(buff, nmemb, size) {
  var written = 0;

  if (fileOut) {
    written = fs.writeSync(fileOut, buff, 0, nmemb * size);
  } else {
    /* listing output */
    process.stdout.write(buff.toString());
    written = size * nmemb;
  }

  return written;
});

handle.perform();
fs.closeSync(fileOut);
