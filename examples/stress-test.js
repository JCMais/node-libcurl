/**
 * This script does a stress test on the given domain.
 * Don't put a real domain here if you don't want to be blocked by some firewall.
 */
var Curl = require( '../lib/Curl' ),
    assert = require( 'assert' ),
    path = require( 'path' ),
    util = require( 'util' );

/*
 * Under a nginx running on a virtual box, I've got 15s, 245.152ms with the following config:
 */
var url = 'http://local.vm/', //local.vm in this case was the default nginx page.
    file= 'file:///' + path.join( __dirname, 'test.txt' ),
    instances   = 300,
    maxRequests = 10000,
    shouldTestFile = false,
    shouldUseHeaderRequest = true,
    precision = 3;

var calls   = 0,
    running = 0,
    i = 0,
    startTime,
    endTime;

function doRequest() {

    var curl = new Curl();
    curl.setOpt( Curl.option.URL, !shouldTestFile ? url : file  );
    curl.setOpt( Curl.option.ACCEPT_ENCODING, 'gzip' );
    curl.setOpt( Curl.option.TRANSFER_ENCODING, 1 );
    curl.setOpt( Curl.option.HTTP_CONTENT_DECODING, 0 );
    curl.setOpt( Curl.option.HTTP_TRANSFER_DECODING, 0 );
    curl.setOpt( Curl.option.NOBODY, shouldUseHeaderRequest );

    curl.on( 'end', function( code, body ) {

        --running;
        ++calls;

        this.close();

        if ( ( calls + running ) < maxRequests ) {

            doRequest();

        }

        if ( calls % 100 === 0 || maxRequests - calls <= instances )
            console.info( "Curl instances: ", Curl.getCount(), " -> Requests finished: ", calls );

        if ( running === 0 ) {

            //nano to milli
            endTime = process.hrtime( startTime );

            console.info( 'Request time: ',
                endTime[0] + "s, " + (endTime[1] / 1000000).toFixed( precision ) + "ms"
            );
        }
    });

    process.nextTick( curl.perform.bind( curl ) );
    ++running;
}

process.stdout.write( 'Press any key to start...' );
process.stdin.resume();
//start on any input.
process.stdin.once( 'data', function ( data ) {

    process.stdin.pause();

    startTime = process.hrtime();

    for ( i = 0; i <= instances; i++ ) {
        doRequest();
    }

});
