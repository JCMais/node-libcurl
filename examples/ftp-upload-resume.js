/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to continue uploading a file to a ftp server using node-libcurl
 * How to run:
 *  node ftp-upload.js ftp://example-of-ftp-host.com username password /some/local/file.ext /some/remote/file.ext 0-100
 */
var Curl = require('../lib/Curl'),
  fs = require('fs');

var curl = new Curl(),
  url = process.argv[2].replace(/\/$/, '') + '/',
  username = process.argv[3],
  password = process.argv[4],
  localFile = process.argv[5],
  remoteFile = process.argv[6],
  percentage = +process.argv[7] / 100,
  fd,
  fileStat;

fd = fs.openSync(localFile, 'r');

fileStat = fs.fstatSync(fd);

// enable verbose mode
curl.setOpt(Curl.option.VERBOSE, true);
// specify target, username and password
curl.setOpt(Curl.option.URL, url + remoteFile);
curl.setOpt(Curl.option.USERNAME, username);
curl.setOpt(Curl.option.PASSWORD, password);
// enable uploading
curl.setOpt(Curl.option.UPLOAD, true);
// now specify which file to upload, in this case
//  we are using a file descriptor given by fs.openSync
curl.setOpt(Curl.option.READDATA, fd);
// Set the size of the file to upload (optional).
//  You must the *_LARGE option if the file is greater than 2GB.
curl.setOpt(Curl.option.INFILESIZE_LARGE, fileStat.size);

// enable raw mode
curl.enable(Curl.feature.RAW);

// tell curl to figure out the remote file size by itself
curl.setOpt(Curl.option.RESUME_FROM, -1);

// (ab)use the progress callback to stop the upload after the given percentage
curl.setOpt(Curl.option.NOPROGRESS, false);
curl.setProgressCallback(function(dltotal, dlnow, ultotal, ulnow) {
  if (ultotal === fileStat.size) {
    if (ulnow > fileStat.size * percentage) {
      return 1;
    }
  }

  return 0;
});

curl.perform();

curl.on('end', function() {
  curl.close();
  fs.closeSync(fd);
});

curl.on('error', function(err) {
  console.log(err);

  curl.close();
  fs.closeSync(fd);
});
