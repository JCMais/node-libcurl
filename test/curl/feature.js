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
    headerLength = 0,
    responseData = 'Ok',
    responseLength = responseData.length,
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

    app.get( '/', function( req, res ) {

        res.send( responseData );

        headerLength = res._header.length;
    });
});

after( function() {

    app._router.stack.pop();
});


it( 'should not store data when NO_DATA_STORAGE is set', function( done ) {

    curl.enable( Curl.feature.NO_DATA_STORAGE );

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.on( 'end', function( status, data, headers ) {

        data.should.be.an.instanceOf( Buffer ).and.have.property( 'length', 0 );
        headers.should.be.an.instanceOf( Array ).and.have.property( 'length', 1 );
        done();
    });

    curl.perform();
});

it( 'should not store headers when NO_HEADER_STORAGE is set', function( done ) {

    curl.enable( Curl.feature.NO_HEADER_STORAGE );

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.on( 'end', function( status, data, headers ) {

        data.should.be.an.instanceOf( String ).and.have.property( 'length', responseLength );
        headers.should.be.instanceOf( Buffer ).and.have.property( 'length', 0 );
        done();
    });

    curl.perform();
});

it( 'should not parse data when NO_DATA_PARSING is set', function( done ) {

    curl.enable( Curl.feature.NO_DATA_PARSING );

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.on( 'end', function( status, data, headers ) {

        data.should.be.an.instanceOf( Buffer ).and.have.property( 'length', responseLength );
        headers.should.be.an.instanceOf( Array ).and.have.property( 'length', 1 );
        done();
    });

    curl.perform();
});

it( 'should not parse headers when NO_HEADER_PARSING is set', function( done ) {

    curl.enable( Curl.feature.NO_HEADER_PARSING );

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.on( 'end', function( status, data, headers ) {

        data.should.be.an.instanceOf( String ).and.have.property( 'length', responseLength );
        headers.should.be.an.instanceOf( Buffer ).and.have.property( 'length', headerLength );
        done();
    });

    curl.perform();
});
