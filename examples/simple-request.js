/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015, Jonathan Cardoso Machado
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
 * Example showing how one could do a simple request using the Curl wrapper.
 */
var Curl = require('../lib/Curl'),
  curl = new Curl(),
  url = process.argv[2] || 'http://www.google.com';

//you can use a string as option
curl.setOpt('URL', url);
//or use an already defined constant
curl.setOpt(Curl.option.CONNECTTIMEOUT, 5);
curl.setOpt(Curl.option.FOLLOWLOCATION, true);
// Uncomment to show more debug information.
//curl.setOpt( Curl.option.VERBOSE, true );
//keep in mind that if you use an invalid option, a TypeError exception will be thrown

curl.on('end', function(statusCode, body, headers) {
  console.info('Status Code: ', statusCode);
  console.info('Headers: ', headers);
  console.info('Body length: ', body.length);

  this.close();
});

curl.on('error', function(err, curlErrCode) {
  console.error('Err: ', err);
  console.error('Code: ', curlErrCode);
  this.close();
});

curl.perform();
