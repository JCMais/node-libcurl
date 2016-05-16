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
 * This is an example showing how one could use the send and recv methods
 */
var Easy = require( '../lib/Easy' ),
    Multi= require( '../lib/Multi' ),
    Curl = require( '../lib/Curl' ),
    easy = new Easy(),
    multi= new Multi(),
    send = new Buffer( 'GET / HTTP/1.0\r\nHost: example.com\r\n\r\n' ),
    recv = new Buffer( 5 * 1024 * 1024 ), //reserve 5mb
    isSent = false,
    shouldUseMultiHandle = true;

recv.fill( 0 );

easy.setOpt( Curl.option.URL, 'http://example.com' );
// CONNECT_ONLY must be set to send and recv work
easy.setOpt( Curl.option.CONNECT_ONLY, true );

//This callback is going to be called when there is some action
// in the socket responsible for this handle.
// Remember that, for it to be called, one must have called easy.monitorSocketEvents();
easy.onSocketEvent( function ( err, events ) {

    var ret,
        isWritable = events & Easy.socket.WRITABLE,
        isReadable = events & Easy.socket.READABLE;

    if ( err ) {
        throw err;
    }

    // Make sure the socket is writable, and, that we have not sent the request already.
    if ( isWritable && !isSent ) {

        console.log( 'Sending request.' );
        ret = easy.send( send );

        // ret is an array, with [0] being returnCode, and [1] the number of bytes sent.

        // just lets make sure the returnCode is correct and that all the data was sent.
        if ( ret[0] != Curl.code.CURLE_OK || ret[1] != send.length ) {

            throw Error( 'Something went wrong.' );
        }

        console.log( 'Sent ' + ret[1] + ' bytes.' );

        isSent = true;

    // Here we must check if the socket is readable, and that we have sent the data already.
    } else if ( isReadable && isSent ) {

        console.log( 'Reading request response.' );
        ret = easy.recv( recv );

        //same than above, but [1] now is the number of bytes we have read.

        if ( ret[0] !== Curl.code.CURLE_OK ) {

            throw Error( Easy.strError( ret[0] ) );
        }

        console.log( recv.toString( 'utf8', 0, ret[1] ) );

        //we don't need to monitor for events anymore, so let's just stop the socket polling
        this.unmonitorSocketEvents();

        if ( shouldUseMultiHandle ) {

            multi.removeHandle( easy );
            multi.close();
        }

        easy.close();
    }


});

//send and recv only works with the multi handle
// if you are using a libcurl version greater than 7.42
// See: https://github.com/bagder/curl/commit/ecc4940df2c286702262f8c21d7369f893e78968
if ( shouldUseMultiHandle ) {

    multi.onMessage( function ( err, easy, errorCode ) {

        if ( err ) {

            console.error( 'Error code: ' + errorCode );

            throw err;
        }

        //ok, connection made!
        // monitor for socket events
        easy.monitorSocketEvents();
    });

    multi.addHandle( easy );

} else {

    var result = easy.perform();

    if ( result != Curl.code.CURLE_OK ) {

        throw Error( Easy.strError( result ) );
    }

    //Using just the easy interface,
    // the connection is made right after the perform call
    // so we can already start monitoring for socket events
    easy.monitorSocketEvents();
}
