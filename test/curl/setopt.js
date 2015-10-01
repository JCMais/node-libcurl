/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015, Jonathan Cardoso Machado
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
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

        } catch ( err ) {

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

        if ( invalidArgs.length === args.length ) {
            throw Error( 'Invalid property value accepted. Invalid Args: ' + JSON.stringify( invalidArgs ) + ', Args: ' + JSON.stringify( args ) );
        }

    });

});
