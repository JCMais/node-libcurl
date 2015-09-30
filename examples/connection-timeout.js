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
var Curl   = require( '../lib/Curl' ),
    util  = require( 'util' );

var curl = new Curl();

//http://stackoverflow.com/a/904609/710693
curl.setOpt( Curl.option.URL, '10.255.255.1' );
curl.setOpt( Curl.option.CONNECTTIMEOUT, 1 );
curl.setOpt( Curl.option.VERBOSE, 1 );

console.log( util.inspect( process.versions ) );
console.log( util.inspect( Curl.getVersion() ) );

curl.on( 'end', function() {
    console.log( util.inspect( arguments ) );
    this.close();
});

curl.on( 'error', function() {
    console.log( util.inspect( arguments ) );
    this.close();
});

curl.perform();
