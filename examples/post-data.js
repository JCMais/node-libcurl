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
 * Example showing how to send post data using the POSTFIELDS option.
 */
var Curl = require( '../lib/Curl' ),
    querystring = require( 'querystring' );

var curl = new Curl(),
    url  = 'http://posttestserver.com/post.php',
    data = { //Data to send, inputName : value
        'input-arr[0]' : 'input-arr-val0',
        'input-arr[1]' : 'input-arr-val1',
        'input-arr[2]' : 'input-arr-val2',
        'input-name' : 'input-val'
    };

//You need to build the query string,
// node has this helper function, but it's limited for real use cases (no support for array values for example)
data = querystring.stringify( data );

curl.setOpt( Curl.option.URL, url );
curl.setOpt( Curl.option.POSTFIELDS, data );
curl.setOpt( Curl.option.HTTPHEADER, ['User-Agent: node-libcurl/1.0'] );
curl.setOpt( Curl.option.VERBOSE, true );

console.log( querystring.stringify( data ) );

curl.perform();

curl.on( 'end', function( statusCode, body ) {

    console.log( body );

    this.close();
});

curl.on( 'error', curl.close.bind( curl ) );
