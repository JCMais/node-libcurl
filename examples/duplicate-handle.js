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
 * Example just showing how to use the dupHandle method
 * to keep requesting the same stuff again and again but using new
 * instances instead of the same.
 */
var Curl = require( '../lib/Curl' ),
    querystring = require( 'querystring' ),
    url  = 'http://localhost/',
    data = {'Hi!' : 'This was sent using node-libcurl <3!'},
    curl,
    count = 0,
    iterations = 1e4,
    handles = [],
    shouldCopyCallbacks = true,
    shouldCopyEventListeners = true;

curl = new Curl();
curl.handleNumber = 0; //just so we know which handle is running
handles.push( curl );

//you can use a string as option
curl.setOpt( 'URL', url );
curl.setOpt( 'CONNECTTIMEOUT', 5 );
curl.setOpt( 'FOLLOWLOCATION', true );
curl.setOpt( 'HTTPHEADER', ['User-Agent: node-libcurl/1.0'] );
curl.setOpt( 'POSTFIELDS', querystring.stringify( data ) );

curl.on( 'end', function ( statusCode, body, headers ) {

    ++count;

    console.log( 'Handle #' + this.handleNumber + ' finished' );

    console.log( 'Headers: ', headers );
    console.log( 'Status Code: ', statusCode );
    console.log( 'Body: ', body );

    if ( count < iterations ) {

        console.log( 'Duplicating handle #' + this.handleNumber );

        var duplicatedHandle = this.dupHandle( shouldCopyCallbacks, shouldCopyEventListeners );
        duplicatedHandle.handleNumber= count;
        handles.push( duplicatedHandle );

        console.log( 'Running handle #' + count );
        handles[count].perform();
    }


    console.log( 'Closing handle #' + this.handleNumber );
    this.close();
    handles[( count-1 )] = null;
});

curl.on( 'error', function ( err, curlErrCode ) {

    console.error( 'Err: ', err );
    console.error( 'Code: ', curlErrCode );

    this.close();
});

console.log( 'Running handle #' + count );
curl.perform();
