var fs     = require( 'fs' ),
    path   = require( 'path' ),
    should = require( 'should' ),
    serverObj = require( './../helper/server' ),
    Curl      = require( '../../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app,
    firstRun = true,
    curl = {};

before(function( done ){

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

after(function() {

    curl.close();

    app._router.stack.pop();

    server.close();
});

it ( 'should reset the curl handler', function ( done ) {

    curl.on( 'end', function() {

        if ( !firstRun )
            done( new Error( 'Failed to reset.' ) );

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
