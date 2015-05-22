var serverObj = require( './../helper/server' ),
    should = require( 'should' ),
    Curl   = require( '../../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app,
    headerLength = 0,
    responseData = 'Ok',
    responseLength = responseData.length,
    curl = {};

beforeEach( function( done ) {

    curl = new Curl();

    server.listen( serverObj.port, serverObj.host, function() {

        var url = server.address().address + ':' + server.address().port;

        curl.setOpt( 'URL', url );
        done();
    });
});

afterEach( function() {

    curl.close();
    server.close();
});

before(function() {

    app.get( '/', function( req, res ) {

        res.send( responseData );

        headerLength = res._header.length;
    });
});

after(function() {

    app._router.stack.pop();
});


it( 'should not store data when NO_DATA_STORAGE is set', function( done ) {

    curl.enable( Curl.feature.NO_DATA_STORAGE );

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.on( 'end', function( status, data, headers ) {

        data.should.be.instanceOf( Buffer ).and.have.property( 'length', 0 );
        headers.should.be.an.Array.of.length( 1 );
        done();
    });

    curl.perform();
});

it( 'should not store headers when NO_HEADER_STORAGE is set', function( done ) {

    curl.enable( Curl.feature.NO_HEADER_STORAGE );

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.on( 'end', function( status, data, headers ) {

        data.should.be.an.String.and.have.property( 'length', responseLength );
        headers.should.be.instanceOf( Buffer ).and.have.property( 'length', 0 );
        done();
    });

    curl.perform();
});

it( 'should not parse data when NO_DATA_PARSING is set', function( done ) {

    curl.enable( Curl.feature.NO_DATA_PARSING );

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.on( 'end', function( status, data, headers ) {

        data.should.be.instanceOf( Buffer ).and.have.property( 'length', responseLength );
        headers.should.be.an.Array.and.have.property( 'length', 1 );
        done();
    });

    curl.perform();
});

it( 'should not parse headers when NO_HEADER_PARSING is set', function( done ) {

    curl.enable( Curl.feature.NO_HEADER_PARSING );

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.on( 'end', function( status, data, headers ) {

        data.should.be.an.String.and.have.property( 'length', responseLength );
        headers.should.be.instanceOf( Buffer ).and.have.property( 'length', headerLength );
        done();
    });

    curl.perform();
});
