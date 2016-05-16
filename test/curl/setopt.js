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
var serverObj = require( './../helper/server' ),
    Curl   = require( '../../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app,
    curl = {},
    url;

beforeEach( function() {

    curl = new Curl();
    curl.setOpt( 'URL', url );
});

afterEach( function() {

    curl.close();
});

before( function( done ) {

    server.listen( serverObj.port, serverObj.host, function() {

        url = server.address().address + ':' + server.address().port;

        done();
    });

    app.get( '/', function( req, res ) {

        res.send( 'Hello World!' );
    });
});

after( function() {

    app._router.stack.pop();
    server.close();
});

it( 'should not accept invalid argument type', function() {

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

        return;
    }

    throw Error( 'Invalid option was accepted.' );
});

it( 'should not work with non-implemented options', function () {

    (function() {
        curl.setOpt( Curl.option.SSL_CTX_FUNCTION, 1 );
    }).should.throw( /^Unsupported/ );
});

it( 'should restore default internal callbacks when setting WRITEFUNCTION and HEADERFUNCTION callback back to null', function ( done ) {

    var shouldCallEvents = false,
        lastCall = false,
        headerEvtCalled = false,
        dataEvtCalled = false;

    curl.setOpt( 'WRITEFUNCTION', function ( buf ) {

        buf.should.be.instanceof( Buffer );
        return buf.length;
    });

    curl.setOpt( 'HEADERFUNCTION', function ( buf ) {

        buf.should.be.instanceof( Buffer );
        return buf.length;
    });

    curl.on( 'data', function( buf ) {

        shouldCallEvents.should.be.true();
        dataEvtCalled = true;
    });

    curl.on( 'header', function( buf ) {

        shouldCallEvents.should.be.true();
        headerEvtCalled = true;
    });

    curl.on( 'end', function() {

        curl.setOpt( 'WRITEFUNCTION', null );
        curl.setOpt( 'HEADERFUNCTION', null );

        if ( !lastCall ) {

            lastCall = true;
            shouldCallEvents = true;
            curl.perform();
            return;
        }

        dataEvtCalled.should.be.true();
        headerEvtCalled.should.be.true();

        done();
    });

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.perform();
});

describe( 'HTTPPOST', function() {

    it( 'should not accept invalid arrays', function() {

        try {

            curl.setOpt( 'HTTPPOST', [1, 2, {}] );

        } catch ( err ) {

            return;
        }

        throw Error( 'Invalid array accepted.' );
    });

    it( 'should not accept invalid property names', function() {

        try {

            curl.setOpt( 'HTTPPOST', [{ dummy : 'property' }] );

        } catch ( err ) {

            return;
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
