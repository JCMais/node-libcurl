var serverObj = require( './server' ),
    should = require( 'should' ),
    Curl   = require( '../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app;

describe( 'Curl', function() {

    var curl = new Curl();

    describe( 'getInfo()', function() {

        beforeEach( function( done ) {

            server.listen( serverObj.port, serverObj.host, function() {

                var url = server.address().address + ':' + server.address().port;

                curl.setOpt( 'URL', url );
                done();
            });
        });

        afterEach( function() {

            curl = new Curl();

            server.close();
        });

        before(function(){

            app.get( '/', function( req, res ) {

                res.send( 'Hello World!' );
            });
        });

        after(function() {

            app._router.stack.pop();
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

            curl.perform();

        });

    });

});
