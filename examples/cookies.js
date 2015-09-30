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
 * Example showing how one can receive cookies and store them in a file.
 */
var Curl = require( '../lib/Curl' ),
    path = require( 'path' ),
    fs   = require( 'fs' );

var curl = new Curl(),
    url  = 'http://www.google.com',
    cookieJarFile = path.join( __dirname, 'cookiejar.txt' );

curl.setOpt( Curl.option.URL, url );
curl.setOpt( Curl.option.VERBOSE, true );
curl.setOpt( Curl.option.FOLLOWLOCATION, true );
curl.setOpt( Curl.option.COOKIEFILE, cookieJarFile );
curl.setOpt( Curl.option.COOKIEJAR, cookieJarFile );

if ( !fs.existsSync( cookieJarFile ) ) {
    fs.writeFileSync( cookieJarFile );
}

curl.perform();

curl.on( 'end', function() {

    this.close();

    console.info( 'Cookie file contents:' );
    console.info( fs.readFileSync( cookieJarFile ).toString( 'utf8' ) );
});

curl.on( 'error', curl.close.bind( curl ) );
