var serverObj = require( './server' ),
    should = require( 'should' ),
    EventEmitter = require( 'events' ).EventEmitter,
    inherits = require( 'util' ).inherits,
    Curl   = require( '../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app;

var Test = function() {

};

inherits( Test, EventEmitter );

var tst = new Test();

describe( 'Curl', function() {

    var curl = new Curl();

    afterEach( function() {

        curl.reset();
    });

    describe( 'feature()', function() {

        before(function(){

            app.get( '/', function( req, res ) {

                res.send( 'Ok.' );
            });
        });

        after(function() {

            app._router.stack.pop();
        });

        it( 'should not store data with NO_DATA_STORAGE set', function( done ) {

            server.listen( 3000, 'localhost', function() {

                var url = server.address().address + ':' + server.address().port;

                curl.enable( Curl.feature.NO_DATA_STORAGE );

                curl.setOpt( 'URL', url );

                curl.on( 'error', function( err ) {

                    done( err );
                });

                curl.on( 'end', function( status, data, headers ) {

                    //I don't know why, but these errors are not being caught automatically.
                    data.length.should.be.equal( 0 );
                    headers.should.not.be.empty;

                    done();
                });

                curl.perform();
            });

        });

    });

});
