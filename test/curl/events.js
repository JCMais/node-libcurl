var serverObj = require( './../helper/server' ),
    should = require( 'should' ),
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

before(function( done ){

    app.all( '/', function( req, res ) {

        if ( req.body.errReq ) {

            res.status( 500 );
            res.end();

        } else {

            res.send( 'Hello World!' );
        }

        timeout = setTimeout( function () {
            throw Error( "No action taken." );
        }, 1000 );
    });

    server.listen( serverObj.port, serverObj.host, function() {

        url = server.address().address + ':' + server.address().port;

        done();
    });
});

after(function() {

    app._router.stack.pop();
});

it ( 'should emit "end" event when the connection ends without errors.', function ( done ) {

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

    curl.on( 'error', function( err ) {

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

        //CURLE_ABORTED_BY_CALLBACK (42)
        errCode.should.be.of.type( "number" ).and.equal( 42 );

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

        //CURLE_WRITE_ERROR (23)
        errCode.should.be.of.type( "number" ).and.equal( 23 );

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

        //CURLE_WRITE_ERROR (23)
        errCode.should.be.of.type( "number" ).and.equal( 23 );

        clearTimeout( timeout );

        done();
    });

    curl.perform();

});
