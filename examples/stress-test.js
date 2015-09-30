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

/*
 * This script does a stress test on the given domain.
 * Don't put a real domain here if you don't want to be blocked by some firewall.
 */

var Curl = require( '../lib/Curl' ),
    path = require( 'path' );

var url = 'http://local.vm/', //local.vm in this case was the default nginx page.
    file= 'file:///' + path.join( __dirname, 'test.txt' ),
    instances   = 100,
    maxRequests = 1e5, //100K requests in total
    iterations  = 3, //repeat n times to collect data
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

    if ( code !== 200 ) {
        ++data.errors;
    }

    --runningRequests;
    ++finishedRequests;

    if ( ( finishedRequests + runningRequests ) < maxRequests ) {

        doRequest( data );

    }

    if ( finishedRequests % 100 === 0 || maxRequests - finishedRequests <= instances ) {
        console.info(
            'Curl instances: ', Curl.getCount(),
            ' -> Requests finished: ', finishedRequests,
            ' -> Time: ', process.hrtime( data.startTime )[0], 's'
        );
    }

    if ( runningRequests === 0 ) {

        //nano to milli
        data.endTime = process.hrtime( data.startTime );

        console.error( 'Request time: ',
            data.endTime[0] + 's, ' + ( data.endTime[1] / 1e9 ).toFixed( precision ) + 'ms'
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

    finishedRequests = 0;
    runningRequests = 0;

    if ( requestData[id] === undefined ) {
        requestData[id] = {
            errors: 0,
            startTime: process.hrtime(),
            endTime: 0
        };
    }

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
