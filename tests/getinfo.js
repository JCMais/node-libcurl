var serverObj = require( './server' ),
    should = require( 'should' ),
    Curl   = require( '../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app;

describe( 'Curl', function() {

    var curl = new Curl();

    describe( 'getInfo()', function() {

        before(function(){

            app.get( '/', function( req, res ) {

                res.send( 'Hello World!' );
            });
        });

        after(function() {

            app._router.stack.pop();
        });

        it ( 'should get all infos', function ( done ) {

            server.listen( 3000, 'localhost', function() {

                var url = server.address().address + ':' + server.address().port;

                curl.setOpt( 'URL', url );

                curl.on( 'end', function( status ) {

                    if ( status !== 200 )
                        throw Error( 'Invalid Status Code' );

                    for ( var infoId in Curl.info ) {
                        curl.getInfo( infoId );
                    }

                    done();
                });

                curl.perform();
            });


        });

    });



});
