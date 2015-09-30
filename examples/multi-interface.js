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
 * Example showing how to use the Multi handle to make async requests.
 */
var Curl = require( '../lib/Curl' ),
    Easy = require( '../lib/Easy' ),
    Multi= require( '../lib/Multi' ),
    urls = [
        'http://google.com', 'http://bing.com',
        'http://msn.com', 'http://ask.com/'
    ],
    multi = new Multi(),
    finished = 0,
    handles = [],
    handle;


multi.onMessage(function( err, handle, errCode ) {

    if ( err ) {
        console.log( err );
    }

    var responseCode = handle.getInfo( 'RESPONSE_CODE' ).data;

    console.log( '# of handles active: ' + multi.getCount() );
    console.log( urls[ handles.indexOf( handle ) ] + ' returned response code: ' + responseCode );

    multi.removeHandle( handle );
    handle.close();

    if ( ++finished == urls.length ) {

        console.log( 'Finished all requests!' );
        multi.close();
    }
});


for ( var i = 0, len = urls.length; i < len; i++ ) {

    handle = new Easy();
    handle.setOpt( 'URL', urls[i] );
    handle.setOpt( 'FOLLOWLOCATION', true );

    handles.push( handle );

    multi.addHandle( handle );
}
