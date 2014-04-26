
var Curl = require( '../lib/Curl' ),
    assert = require( 'assert' ),
    path = require( 'path' ),
    util = require( 'util' );

/*
 * This script does a stress test on the given domain.
 * Don't put a real domain here if you don't want to be blocked by some firewall.
 */

var url = 'http://local.vm/', //local.vm in this case was the default nginx page.
    file= 'file:///' + path.join( __dirname, 'test.txt' ),
    instances   = 100,
    maxRequests = 1e5, //100K requests in total
    iterations = 3, //repeat n times to collect data
    shouldTestFile = false,
    shouldUseHeaderRequest = true,
    precision = 3;

/*
 * With the above configuration, I got the following under nginx running on a virtual box:
     Iterations ------------  3
     Requests   ------------  100000
     Instances  ------------  100
     Total Time ------------  107.173071657s
     Iteration Avg ---------  35.724357219s
     Errors Avg  ------------  0
 */

var finishedRequests   = 0,
    runningRequests = 0,
    requestData = [],
    id = 0;

function doRequest( data ) {

    var curl = new Curl();
    curl.setOpt( Curl.option.URL, !shouldTestFile ? url : file  );
    curl.setOpt( Curl.option.NOBODY, shouldUseHeaderRequest );
    curl.setOpt( Curl.option.CONNECTTIMEOUT, 5 );
    curl.setOpt( Curl.option.TIMEOUT, 10 );
    curl.on( 'end', cb.bind( curl ) );
    curl.on( 'error', cb.bind( curl ) );

    curl.data = data;

    curl.perform();
    ++runningRequests;
}

function cb( code ) {

    var data = this.data;

    if ( code !== 200 )
        ++data.errors;

    --runningRequests;
    ++finishedRequests;

    if ( ( finishedRequests + runningRequests ) < maxRequests ) {

        doRequest( data );

    }

    if ( finishedRequests % 100 === 0 || maxRequests - finishedRequests <= instances )
        console.info(
            "Curl instances: ", Curl.getCount(),
            " -> Requests finished: ", finishedRequests,
            " -> Time: ", process.hrtime( data.startTime )[0], 's'
        );

    if ( runningRequests === 0 ) {

        //nano to milli
        data.endTime = process.hrtime( data.startTime );

        console.error( 'Request time: ',
            data.endTime[0] + "s, " + ( data.endTime[1] / 1e9 ).toFixed( precision ) + "ms"
        );

        process.nextTick( startRequests );
    }

    this.close();
}

function startRequests() {

    var i;

    if ( id >= iterations ) {

        return printCollectedData();
    }

    console.log( 'Iteration -> ', id+1 );

    finishedRequests = 0,
    runningRequests = 0;

    if ( requestData[id] === undefined )
        requestData[id] = {
            errors : 0,
            startTime : process.hrtime(),
            endTime : 0
        };

    for ( i = 0; i < instances; i++ ) {

        doRequest( requestData[id] );
    }

    return id++;
}

function printCollectedData() {

    //Sum all timings
    var timingSumNs = requestData.reduce( function( prev, curr ) {

        var currTimingNs = curr.endTime[0] * 1e9 + curr.endTime[1];

        return prev + currTimingNs;

    }, 0 );

    var errors = requestData.reduce( function( prev, curr ) {

        return prev + curr.errors;

    }, 0 );

    console.info( 'Iterations ------------ ', iterations );
    console.info( 'Requests   ------------ ', maxRequests );
    console.info( 'Instances  ------------ ', instances );

    console.info( 'Total Time ------------ ', timingSumNs / 1e9 + 's' );
    console.info( 'Iteration Avg --------- ', ( timingSumNs / 1e9 ) / iterations + 's' );
    console.info( 'Errors Avg  ------------ ', errors );
}

console.log( 'Starting...' );
process.nextTick( startRequests );
