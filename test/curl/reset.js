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
var serverObj = require( './../helper/server' ),
    Curl      = require( '../../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app,
    firstRun = true,
    curl = {};

before( function( done ) {

    curl = new Curl();

    app.get( '/', function( req, res ) {

        res.send( 'Hi' );
    });

    server.listen( serverObj.port, serverObj.host, function() {

        var url = server.address().address + ':' + server.address().port;

        curl.setOpt( 'URL', url );

        done();
    });
});

after( function() {

    curl.close();

    app._router.stack.pop();

    server.close();
});

it( 'should reset the curl handler', function ( done ) {

    curl.on( 'end', function() {

        if ( !firstRun ) {
            done( new Error( 'Failed to reset.' ) );
            return;
        }

        firstRun = false;

        this.reset();

        //try to make another request
        this.perform();
    });

    curl.on( 'error', function( err, curlCode ) {

        //curlCode == 3 -> Invalid URL
        done( ( curlCode === 3 ) ? undefined : err );
    });

    curl.perform();
});
