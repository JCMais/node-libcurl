var server = require( './server' ),
    should = require( 'should' ),
    Curl   = require( '../lib/Curl' );

describe( 'Curl', function() {

    var curl = new Curl();

    afterEach( function() {

        curl.reset();
    });

    describe( 'setOpt()', function() {

        it( 'should not accept invalid argument type', function( done ) {

            var setOptArgsToTest = [
                ['URL', 0],
                ['HTTPPOST', 0],
                ['POSTFIELDS', 0]
            ];

            try {

                for ( var i = 0; i < setOptArgsToTest.length; i++ ) {

                    curl.setOpt.apply( curl, setOptArgsToTest[i] );
                }

            } catch ( err ) {

                return done();
            }

            throw Error( 'Invalid option was accepted.' );


        });

        describe( 'HTTPPOST', function() {

            it ( 'should not accept invalid arrays', function( done ) {

                try {

                    curl.setOpt( 'HTTPPOST', [1, 2, {}]);

                } catch( err ) {

                    return done();
                }

                throw Error( 'Invalid array accepted.' );
            });

            it ( 'should not accept invalid property names', function( done ) {

                try {

                    curl.setOpt( 'HTTPPOST', [{ dummy : 'property' }] )

                } catch ( err ) {

                    return done();
                }

                throw Error( 'Invalid property name accepted.' );

            });

            it ( 'should not accept invalid property value', function () {

                var args = [
                        {}, [], 1, null, false, undefined
                    ],
                    argsAccepted = [],
                    len = args.length;

                while ( --len ) {

                    var arg = args.pop();

                    try {

                        curl.setOpt( 'HTTPPOST', [{ 'name' : arg }] );
                        argsAccepted.push( arg === null ? "null" : typeof arg );

                    } catch ( err ) {}
                }

                if ( argsAccepted.length )
                    throw Error( 'Invalid property value accepted. Args: ' + JSON.stringify( argsAccepted ) );

            });

        });



    });

});
