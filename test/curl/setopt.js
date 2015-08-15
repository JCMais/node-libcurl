var Curl   = require( '../../lib/Curl' ),
    curl = {};

beforeEach( function() {

    curl = new Curl();
});

afterEach( function() {

    curl.close();
});

it( 'should not accept invalid argument type', function( done ) {

    var optionsToTest = [
        ['URL', 0],
        ['HTTPPOST', 0],
        ['POSTFIELDS', 0]
    ];

    try {

        for ( var i = 0; i < optionsToTest.length; i++ ) {

            curl.setOpt.apply( curl, optionsToTest[i] );
        }

    } catch ( err ) {

        return done();
    }

    throw Error( 'Invalid option was accepted.' );


});

describe( 'HTTPPOST', function() {

    it( 'should not accept invalid arrays', function( done ) {

        try {

            curl.setOpt( 'HTTPPOST', [1, 2, {}] );

        } catch( err ) {

            return done();
        }

        throw Error( 'Invalid array accepted.' );
    });

    it( 'should not accept invalid property names', function( done ) {

        try {

            curl.setOpt( 'HTTPPOST', [{ dummy : 'property' }] );

        } catch ( err ) {

            return done();
        }

        throw Error( 'Invalid property name accepted.' );

    });

    it( 'should not accept invalid property value', function () {

        var args = [
                {}, [], 1, null, false, undefined
            ],
            invalidArgs = [],
            len = args.length;

        while ( --len ) {

            var arg = args.pop();

            try {

                curl.setOpt( 'HTTPPOST', [{ 'name' : arg }] );

            } catch ( err ) {

                invalidArgs.push( arg === null ? 'null' : typeof arg );

            }
        }

        if ( invalidArgs.length == args.length ) {
            throw Error( 'Invalid property value accepted. Invalid Args: ' + JSON.stringify( invalidArgs ) + ', Args: ' + JSON.stringify( args ) );
        }

    });

});
