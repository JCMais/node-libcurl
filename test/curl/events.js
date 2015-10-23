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
    Curl   = require( '../../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app,
    url    = '',
    timeout= 0;

var curl;

beforeEach( function() {

    curl = new Curl();
    curl.setOpt( 'URL', url );
});

afterEach( function() {

    curl.close();
});

before( function( done ) {

    app.all( '/', function( req, res ) {

        if ( req.body.errReq ) {

            res.status( 500 );
            res.end();

        } else {

            res.send( 'Hello World!' );
        }

        timeout = setTimeout( function () {
            throw Error( 'No action taken.' );
        }, 1000 );
    });

    server.listen( serverObj.port, serverObj.host, function() {

        url = server.address().address + ':' + server.address().port;

        done();
    });
});

after( function() {

    app._router.stack.pop();
});

it( 'should emit "end" event when the connection ends without errors.', function ( done ) {

    curl.on( 'end', function() {

        clearTimeout( timeout );

        done();
    });

    curl.on( 'error', function( err ) {

        clearTimeout( timeout );

        done( err );
    });

    curl.perform();

});

it( 'should emit "error" event when the connection fails', function( done ) {

    curl.setOpt( 'POSTFIELDS', 'errReq=true' );
    curl.setOpt( 'FAILONERROR', true );

    curl.on( 'end', function() {

        clearTimeout( timeout );

        done( Error( 'end event was called, but the connection failed.' ) );
    });

    curl.on( 'error', function( err, errCode ) {

        err.should.be.instanceof( Error );
        errCode.should.be.of.type( 'number' ).and.equal( Curl.code.CURLE_HTTP_RETURNED_ERROR );

        clearTimeout( timeout );

        done();
    });

    curl.perform();

});

it( 'should emit "error" when the connection is aborted in the progress cb', function ( done ) {

    curl.setProgressCallback( function() {

        return -1;
    });

    curl.setOpt( 'NOPROGRESS', false );

    curl.on( 'end', function() {

        clearTimeout( timeout );

        done( Error( 'end event was called, but the connection was aborted.' ) );
    });

    curl.on( 'error', function( err, errCode ) {

        err.should.be.instanceof( Error );
        errCode.should.be.of.type( 'number' ).and.equal( Curl.code.CURLE_ABORTED_BY_CALLBACK );

        clearTimeout( timeout );

        done();
    });

    curl.perform();

});

it( 'should emit "error" when the connection is aborted in the header cb', function( done ) {

    curl.onHeader = function() {

        return -1;
    };

    curl.on( 'end', function() {

        clearTimeout( timeout );

        done( Error( 'end event was called, but the connection was aborted.' ) );
    });

    curl.on( 'error', function( err, errCode ) {

        err.should.be.instanceof( Error );
        errCode.should.be.of.type( 'number' ).and.equal( Curl.code.CURLE_WRITE_ERROR );

        clearTimeout( timeout );

        done();
    });

    curl.perform();

});

it( 'should emit "error" when the connection is aborted in the data cb', function( done ) {

    curl.onData = function() {

        return -1;
    };

    curl.on( 'end', function() {

        clearTimeout( timeout );

        done( Error( 'end event was called, but the connection was aborted.' ) );
    });

    curl.on( 'error', function( err, errCode ) {

        err.should.be.instanceof( Error );
        errCode.should.be.of.type( 'number' ).and.equal( Curl.code.CURLE_WRITE_ERROR );

        clearTimeout( timeout );

        done();
    });

    curl.perform();

});
