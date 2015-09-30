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
var auth      = require( 'http-auth' ),
    crypto    = require( 'crypto' ),
    serverObj = require( './../helper/server' ),
    Curl      = require( '../../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app,
    username = 'user',
    password = 'pass',
    realmBasic = 'basic',
    realmDigest= 'digest',
    basic = auth.basic(
        {
            realm: realmBasic
        },
        function ( usr, pass, callback ) {

            callback( usr === username && pass === password );
        }
    ),
    digest = auth.digest(
        {
            realm: realmDigest
        }, function ( usr, callback ) {

            var hash = crypto.createHash( 'md5' );

            if ( usr === username ) {

                hash.update( [username, realmDigest, password].join( ':' ) );
                callback( hash.digest( 'hex' ) );

            } else {

                callback();
            }
        }
    ),
    curl = {},
    url;

beforeEach( function() {

    curl = new Curl();
    curl.setOpt( 'URL', url );
});

afterEach( function() {

    curl.close();

    app._router.stack.pop();
    app._router.stack.pop();
});

before( function( done ) {

    server.listen( serverObj.port, serverObj.host, function() {

        url = server.address().address + ':' + server.address().port;

        done();
    });
});

it( 'should authenticate using basic auth', function ( done ) {

    app.use( auth.connect( basic ) );
    app.get( '/', function( req, res ) {
        res.send( req.user );
    });

    curl.setOpt( 'HTTPAUTH', Curl.auth.BASIC );
    curl.setOpt( Curl.option.USERNAME, username );
    curl.setOpt( Curl.option.PASSWORD, password );

    curl.on( 'end', function( status, data ) {

        if ( status !== 200 ) {
            throw Error( 'Invalid status code: ' + status );
        }

        data.should.be.equal( username );

        done();
    });

    curl.on( 'error', done );

    curl.perform();

});

it( 'should authenticate using digest', function ( done ) {

    //Currently, there is a bug with libcurl > 7.40 when using digest auth
    // on Windows, the realm is not populated from the Auth header.
    //  So we need to use the workaround below to make it work.
    var user = username;

    if ( process.platform === 'win32' && Curl.VERSION_NUM >=  0x072800 ) {
        user = realmDigest + '/' + username;
    }

    app.use( auth.connect( digest ) );
    app.get( '/', function( req, res ) {
        res.send( req.user );
    });

    curl.setOpt( 'HTTPAUTH', Curl.auth.DIGEST );
    curl.setOpt( Curl.option.USERNAME, user );
    curl.setOpt( Curl.option.PASSWORD, password );

    curl.on( 'end', function( status, data ) {

        if ( status !== 200 ) {
            throw Error( 'Invalid status code: ' + status );
        }

        data.should.be.equal( username );

        done();
    });

    curl.on( 'error', done );

    curl.perform();

});

it( 'should not authenticate using basic', function ( done ) {

    app.use( auth.connect( basic ) );
    app.get( '/', function( req, res ) {
        res.send( req.user );
    });

    curl.setOpt( 'HTTPAUTH', Curl.auth.ANYSAFE );
    curl.setOpt( Curl.option.USERNAME, username );
    curl.setOpt( Curl.option.PASSWORD, password );

    curl.on( 'end', function( status ) {

        status.should.be.equal( 401 );

        done();
    });

    curl.on( 'error', done );

    curl.perform();

});
