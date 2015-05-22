var fs     = require( 'fs' ),
    path   = require( 'path' ),
    should = require( 'should' ),
    querystring = require( 'querystring' ),
    serverObj = require( './../helper/server' ),
    Curl   = require( '../../lib/Curl' ),
    server = serverObj.server,
    app    = serverObj.app,
    postData = {
        'input-name' : 'This is input-name value.',
        'input-name2': 'This is input-name2 value'
    },
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

before(function(){

    app.post( '/', function( req, res ) {

        res.send( JSON.stringify( req.body ) );
    });
});

after(function() {

    app._router.stack.pop();
});

it( 'should post the correct data', function ( done ) {

    curl.setOpt( 'POSTFIELDS', querystring.stringify( postData ) );

    curl.on( 'end', function( status, data ) {

        if ( status !== 200 )
            throw Error( 'Invalid status code: ' + status );

        data = JSON.parse( data );

        for ( var field in data ) {

            data[field].should.be.equal( postData[field] );
        }

        done();
    });

    curl.perform();
});
