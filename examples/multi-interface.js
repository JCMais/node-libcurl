/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015-2016, Jonathan Cardoso Machado
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
var Easy = require( '../lib/Easy' ),
    Multi= require( '../lib/Multi' ),
    urls = [
        'http://google.com', 'http://bing.com',
        'http://msn.com', 'http://ask.com/'
    ],
    multi       = new Multi(),
    finished    = 0,
    handles     = [],
    handlesData = [],
    handle;


multi.onMessage( function( err, handle, errCode ) {

    var responseCode = handle.getInfo( 'RESPONSE_CODE' ).data,
        handleData   = handlesData[ handles.indexOf( handle  ) ],
        handleUrl    = urls[ handles.indexOf( handle ) ],
        responseData = '',
        i, len;

    console.log( '# of handles active: ' + multi.getCount() );

    if ( err ) {

        console.log( handleUrl + ' returned error: "' + err.message + '" with errcode: ' + errCode );

    } else {

        for ( i = 0, len = handleData.length; i < len; i++ ) {

            responseData += handleData[i].toString();
        }

        console.log( handleUrl + ' returned response code: ' + responseCode );

        console.log( handleUrl + ' returned response body: ' + responseData );
    }

    multi.removeHandle( handle );
    handle.close();

    if ( ++finished == urls.length ) {

        console.log( 'Finished all requests!' );
        multi.close();
    }
});

/**
 * @param {Buffer} data
 * @param {Number} n
 * @param {Number} nmemb
 * @returns {number}
 */
function onData( data, n, nmemb ) {

    //this === the handle
    var key = handles.indexOf( this );

    handlesData[key].push( data );

    return n * nmemb;
}


for ( var i = 0, len = urls.length; i < len; i++ ) {

    handle = new Easy();
    handle.setOpt( 'URL', urls[i] );
    handle.setOpt( 'FOLLOWLOCATION', true );
    handle.setOpt( 'WRITEFUNCTION', onData );

    handlesData.push( [] );
    handles.push( handle );

    multi.addHandle( handle );
}
