var fs        = require( 'fs' ),
    path      = require( 'path' ),
    should    = require( 'should' ),
    auth      = require( 'http-auth' ),
    crypto    = require( 'crypto' ),
    serverObj = require( './server' ),
    Curl      = require( '../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app;

describe( 'Curl', function() {

    var curl = new Curl(),
        username = 'user',
        password = 'pass',
        realm = 'libcurl testing',
        basic = auth.basic(
            {
                realm: realm
            },
            function ( usr, pass, callback ) {

                callback( usr === username && pass === password );
            }
        ),
        digest = auth.digest(
            {
                realm: realm
            }, function ( usr, callback ) {

                var hash = crypto.createHash( 'md5' );

                if ( usr === username ) {

                    hash.update( [username, realm, password].join( ':' ) );
                    callback( hash.digest( 'hex' ) );

                } else {

                    callback();
                }
            }
        );

    describe( 'HTTP Auth', function() {

        afterEach(function() {

            curl = new Curl;

            app._router.stack.pop();
            app._router.stack.pop();
        });

        it ( 'should authenticate using basic auth', function ( done ) {

            app.use( auth.connect( basic ) );
            app.get( '/', function( req, res ) {
                res.send( req.user );
            });

            curl.setOpt( 'HTTPAUTH', Curl.auth.BASIC );
            curl.setOpt( Curl.option.USERNAME, username );
            curl.setOpt( Curl.option.PASSWORD, password );

            curl.on( 'end', function( status, data ) {

                if ( status !== 200 )
                    throw Error( 'Invalid status code: ' + status );

                data.should.be.equal( username );

                done();
            });

            curl.on( 'error', done );

            server.listen( serverObj.port, serverObj.host, function() {

                var url = server.address().address + ':' + server.address().port;

                curl.setOpt( 'URL', url );

                curl.perform();
            });

        });

        it ( 'should authenticate using digest', function ( done ) {

            app.use( auth.connect( digest ) );
            app.get( '/', function( req, res ) {
                res.send( req.user );
            });

            curl.setOpt( 'HTTPAUTH', Curl.auth.DIGEST );
            curl.setOpt( Curl.option.USERNAME, username );
            curl.setOpt( Curl.option.PASSWORD, password );

            curl.on( 'end', function( status, data ) {

                if ( status !== 200 )
                    throw Error( 'Invalid status code: ' + status );

                data.should.be.equal( username );

                done();
            });

            curl.on( 'error', done );

            server.listen( serverObj.port, serverObj.host, function() {

                var url = server.address().address + ':' + server.address().port;

                curl.setOpt( 'URL', url );

                curl.perform();
            });

        });

        it ( 'should not authenticate using basic', function ( done ) {

            app.use( auth.connect( basic ) );
            app.get( '/', function( req, res ) {
                res.send( req.user );
            });

            curl.setOpt( 'HTTPAUTH', Curl.auth.ANYSAFE );
            curl.setOpt( Curl.option.USERNAME, username );
            curl.setOpt( Curl.option.PASSWORD, password );

            curl.on( 'end', function( status ) {

                if ( status === 200 )
                    throw Error( 'Invalid connection established.' );

                done();
            });

            curl.on( 'error', done );

            server.listen( serverObj.port, serverObj.host, function() {

                var url = server.address().address + ':' + server.address().port;

                curl.setOpt( 'URL', url );

                curl.perform();
            });

        });

    });



});
