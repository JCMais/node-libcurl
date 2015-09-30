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
var querystring = require( 'querystring' ),
    serverObj = require( './../helper/server' ),
    Curl   = require( '../../lib/Curl' ),
    server = serverObj.server,
    app    = serverObj.app,
    postData = {
        'input-name' : 'This is input-name value.',
        'input-name2': 'This is input-name2 value'
    },
    curl = {};

beforeEach( function( done ) {

    curl = new Curl();

    server.listen( serverObj.port, serverObj.host, function() {

        var url = server.address().address + ':' + server.address().port;

        curl.setOpt( 'URL', url );
        done();
    });
});

afterEach( function() {

    curl.close();
    server.close();
});

before( function() {

    app.post( '/', function( req, res ) {

        res.send( JSON.stringify( req.body ) );
    });
});

after( function() {

    app._router.stack.pop();
});

it( 'should post the correct data', function ( done ) {

    curl.setOpt( 'POSTFIELDS', querystring.stringify( postData ) );

    curl.on( 'end', function( status, data ) {

        if ( status !== 200 ) {
            throw Error( 'Invalid status code: ' + status );
        }

        data = JSON.parse( data );

        for ( var field in data ) {

            if ( data.hasOwnProperty( field ) ) {

                data[field].should.be.equal( postData[field] );
            }
        }

        done();
    });

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.perform();
});
