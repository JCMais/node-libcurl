var fs     = require( 'fs' ),
    path   = require( 'path' ),
    should = require( 'should' ),
    serverObj = require( './server' ),
    Curl   = require( '../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app;

describe( 'Curl', function() {

    var curl = new Curl(),
        firstRun = true;

    describe( 'reset()', function() {

        before(function(){

            app.get( '/', function( req, res ) {
                res.send( 'Hi' );
            });
        });

        after(function() {

            app._router.stack.pop();
        });

        it ( 'should reset the curl handler', function ( done ) {

            server.listen( 3000, 'localhost', function() {

                var url = server.address().address + ':' + server.address().port;

                curl.setOpt( 'URL', url );

                curl.perform();
            });

            curl.on( 'end', function( status ) {

                if ( !firstRun )
                    done( new Error( 'Reset failed.' ) );

                firstRun = false;

                this.reset();

                //try to make another request, that will fails.
                this.perform();
            });

            curl.on( 'error', function( err, curlCode ) {

                done( ( curlCode === 3 ) ? undefined : err );
            });

        });

    });



});
