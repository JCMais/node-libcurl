var should = require( 'should' ),
    Curl   = require( '../../lib/Curl' ),
    curl   = {};

beforeEach(function(){

    curl = new Curl()
});

afterEach(function(){

    curl.close();
});

it( 'should not crash on timeout', function( done ) {

    //http://stackoverflow.com/a/904609/710693
    curl.setOpt( Curl.option.URL, "10.255.255.1" );
    curl.setOpt( Curl.option.CONNECTTIMEOUT, 1 );

    curl.on( 'end', function() {

        done( Error( "Unexpected callback called." ) );

    });

    curl.on( 'error', function () {

        done();
    });

    curl.perform();

});
