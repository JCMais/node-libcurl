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
 * Example showing issue number #
 */
var Curl = require( '../lib/Curl' ),
    path = require( 'path' ),
    curl = new Curl(),
    proxy,
    url;

// this works https + socks5
//url = 'https://www.yahoo.com';
//proxy = 'socks5h://46.4.88.203:9050';

// this doesn't work. https + proxy. i get a timeout. on this proxy or any other http proxy
//url = 'https://www.yahoo.com';
//proxy = '220.255.3.170:80';

// but this works. http + proxy
url = 'https://www.google.com';
proxy = '200.180.32.58:80';

curl.setOpt( 'URL', url );
curl.setOpt( 'PROXY', proxy );
//curl.setOpt( 'CAINFO', path.join( __dirname, 'cacert.pem' ) );
curl.setOpt( 'MAXREDIRS', 50 );
//curl.setOpt( 'USERAGENT', "curl/7.38.0" );
curl.setOpt( 'TCP_KEEPALIVE', 1 );
curl.setOpt( 'VERBOSE', 1 );
//curl.setOpt( 'FOLLOWLOCATION', true );
curl.setOpt( 'SSL_VERIFYPEER', 0 );
curl.setOpt( 'SSL_VERIFYHOST', 0 );
curl.setOpt( 'HTTPPROXYTUNNEL', 1 );

curl.on('end', function (statusCode, body, headers) {
    console.log(statusCode, headers);
    curl.close();
});

curl.on('error', function(err, errCode) {
    console.error(err);
    curl.close();
});

curl.perform();
