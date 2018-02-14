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
