var serverObj = require( './server' ),
    should = require( 'should' ),
    Curl   = require( '../lib/Curl' );

var server = serverObj.server,
    app    = serverObj.app,
    url    = '',
    timeout= 0;

describe( 'Curl', function() {

    var curl;

    describe( 'pause', function() {

        beforeEach( function() {

            curl = new Curl();
            curl.setOpt( 'URL', url );
        });

        afterEach( function() {

            curl.close();
        });

        before(function( done ){

            app.all( '/', function( req, res ) {

                if ( req.body.errReq ) {

                    res.status( 500 );
                }

                setTimeout( res.end.bind( res ), 2000 );

                timeout = setTimeout( function () {

                    throw Error( "No action taken." );

                }, 4000 );
            });

            server.listen( serverObj.port, serverObj.host, function() {

                url = server.address().address + ':' + server.address().port;

                done();
            });
        });

        after(function() {

            app._router.stack.pop();
        });

        // The logic here is that the request waits 2s to send the data
        //  and we are pausing the connection for 2s,
        it ( 'should pause the connection for 2s.', function ( done ) {

            this.timeout( 4000 );

            curl.setOpt( 'URL', 'http://httpbin.org/stream-bytes/10240' );

            setTimeout( curl.pause.bind( curl, Curl.pause.CONT ), 3000 );

            curl.on( 'end', function() {

                clearTimeout( timeout );

                console.log( this.getInfo( Curl.info.TOTAL_TIME ) );

                done();
            });

            curl.on( 'error', function( err ) {

                clearTimeout( timeout );

                done( err );
            });

            curl.perform();
            curl.pause( Curl.pause.ALL );

        });

    });

});
