var serverObj = require( './../helper/server' ),
    should = require( 'should' ),
    Curl   = require( '../../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app,
    curl = {},
    url;

beforeEach( function() {

    curl = new Curl();
    curl.setOpt( 'URL', url );
});

afterEach( function() {

    curl.close();
});

before(function( done ){

    server.listen( serverObj.port, serverObj.host, function() {

        url = server.address().address + ':' + server.address().port;

        done();
    });

    app.get( '/', function( req, res ) {

        res.send( 'Hello World!' );
    });
});

after(function() {

    app._router.stack.pop();
    server.close();
});

it ( 'should get all infos', function ( done ) {

    curl.on( 'end', function( status ) {

        if ( status !== 200 )
            throw Error( 'Invalid status code: ' + status );

        for ( var infoId in Curl.info ) {
            curl.getInfo( infoId );
        }

        done();
    });

    curl.on( 'error', function ( err ) {

        done( err );
    });

    curl.perform();

});
