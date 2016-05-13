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

it ( 'should not work with non-implemented infos', function ( done ) {

    curl.on( 'end', function( status ) {

        if ( status !== 200 ) {
            throw Error( 'Invalid status code: ' + status );
        }

        (function() {
            curl.getInfo( Curl.info.PRIVATE );
        }).should.throw( /^Unsupported/ );

        done();
    });

    curl.on( 'error', function ( err ) {

        done( err );
    });

    curl.perform();

});

it( 'should get all infos', function ( done ) {

    curl.on( 'end', function( status ) {

        if ( status !== 200 ) {
            throw Error( 'Invalid status code: ' + status );
        }

        for ( var infoId in Curl.info ) {

            if ( Curl.info.hasOwnProperty( infoId ) ) {

                curl.getInfo( infoId );
            }
        }

        done();
    });

    curl.on( 'error', function ( err ) {

        done( err );
    });

    curl.perform();

});
