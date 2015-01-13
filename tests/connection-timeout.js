var should = require( 'should' ),
    Curl   = require( '../lib/Curl' );

describe( 'Curl', function() {

    var curl = new Curl();

    afterEach( function() {
        curl.reset();
    });

    describe( 'connection-timeout', function() {

        it( 'should not crash on timeout', function( done ) {

            //http://stackoverflow.com/a/904609/710693
            curl.setOpt( Curl.option.URL, "10.255.255.1" );
            curl.setOpt( Curl.option.CONNECTTIMEOUT, 1 );

            curl.perform();

            curl.on( 'end', function() {

                done( Error( "Unexpected callback called." ) );

            });

            curl.on( 'error', function () {

                done();
            });

        });



    });

});
