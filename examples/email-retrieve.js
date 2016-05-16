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
 * Example showing how to retrieve emails through IMAP/SSL using node-libcurl.
 * Based on https://curl.haxx.se/libcurl/c/imap-ssl.html
 */
var Curl = require( '../lib/Curl' ),
    path = require( 'path' );

var curl = new Curl(),
    // This will fetch message 1 from the user's inbox. IMAPS is generally bound to port 993
    url  = 'imaps://sub.domain.tld:993/INBOX/;UID=1',
    certfile = path.join( __dirname, 'cacert.pem' );

curl.setOpt( Curl.option.USERNAME, 'username' );
curl.setOpt( Curl.option.PASSWORD, 'password' );

curl.setOpt( Curl.option.URL, url );

//enabling VERBOSE mode so we can get more details on what is going on.
curl.setOpt( Curl.option.VERBOSE, true );

curl.setOpt( Curl.option.USE_SSL, Curl.usessl.ALL );
curl.setOpt( Curl.option.CAINFO, certfile );
//This is not safe, but you probably will need it if you are using a self signed certificate.
//curl.setOpt( Curl.option.SSL_VERIFYPEER, false );

curl.on( 'end', function( statusCode, body ) {

    console.log( body );
    this.close();
});

curl.on( 'error', function( err ) {

    console.log( err );
    this.close();
});

curl.perform();
