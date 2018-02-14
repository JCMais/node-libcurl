/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2016, Jonathan Cardoso Machado
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
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
