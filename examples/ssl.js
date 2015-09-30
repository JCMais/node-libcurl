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
 * Example showing how to make a request for an endpoint that uses SSL
 */
var Curl = require( '../lib/Curl' ),
    path = require( 'path' );

var curl = new Curl(),
    url  = 'https://www.google.com',
    certfile = path.join( __dirname, 'cacert.pem' );

curl.setOpt( 'URL', url );
curl.setOpt( 'FOLLOWLOCATION', 1 );
curl.setOpt( 'VERBOSE', 1 );

//cURL is not bundled with CA cert anymore
//you need to specify the CA cert to be used, if not, you are
// going to receive the error 'Peer certificate cannot be authenticated with given CA certificates'
// more info http://curl.haxx.se/docs/sslcerts.html and http://curl.haxx.se/docs/caextract.html
if ( certfile ) {

    curl.setOpt( Curl.option.CAINFO, certfile );
    curl.setOpt( 'SSL_VERIFYHOST', 2 ); //This is not a boolean field! 0 -> Disabled, 2 -> Enabled
    curl.setOpt( 'SSL_VERIFYPEER', 1 );

} else {

    curl.setOpt( 'SSL_VERIFYHOST', 0 );
    curl.setOpt( 'SSL_VERIFYPEER', 0 );
}

curl.perform();

curl.on( 'end', curl.close.bind( curl ) );
curl.on( 'error', curl.close.bind( curl ) );
