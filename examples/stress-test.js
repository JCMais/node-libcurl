/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015-2016, Jonathan Cardoso Machado
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

var url  = 'http://localhost/index.html', //localhost in this case was a blank html page served via Apache 2.4
    file = 'file:///' + path.join( __dirname, 'test.txt' ),
    instances   = 25,  // 25 instances running at max per iteration
    maxRequests = 1e4, // 10000 requests in total per iteration
    iterations  = 3,   // repeat n times to collect data
    shouldTestFile = true,
    shouldUseHeaderRequest = true,
    precision = 3;

var finishedRequests = 0,
    runningRequests  = 0,
    requestData = [],
    currentIteration = 0,
    timeBetweenStdouWrite = 1000,
    lastTimeStdoutWrite = 0;

function doRequest( data ) {

    var curl = new Curl();
    curl.setOpt( Curl.option.URL, shouldTestFile ? file : url );
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

    var data = this.data,
        now = Date.now(),
        shouldWrite = false;

    if ( now - lastTimeStdoutWrite >= timeBetweenStdouWrite ) {

        shouldWrite = true;
        lastTimeStdoutWrite = now;
    }

    this.close();

    if ( code instanceof Error ) {
        ++data.errors;
    }

    --runningRequests;
    ++finishedRequests;

    if ( ( finishedRequests + runningRequests ) < maxRequests ) {

        doRequest( data );
    }

    if ( shouldWrite ) {
        console.info(
            'Curl instances: ', Curl.getCount(),
            ' -> Requests finished: ', finishedRequests,
            ' -> Time: ', process.hrtime( data.startTime )[0], 's'
        );
    }

    if ( runningRequests === 0 ) {

        //nano to milli
        data.endTime = process.hrtime( data.startTime );

        console.info( 'Request time: ',
            data.endTime[0] + 's, ' + ( data.endTime[1] / 1e9 ).toFixed( precision ) + 'ms'
        );

        process.nextTick( startRequests );
    }
}

function startRequests() {

    var i;

    if ( currentIteration == iterations ) {

        return printCollectedData();
    }

    console.log( 'Iteration -> ', currentIteration+1 );

    finishedRequests = 0;
    runningRequests = 0;

    if ( requestData[currentIteration] === undefined ) {
        requestData[currentIteration] = {
            errors: 0,
            startTime: process.hrtime(),
            endTime: 0
        };
    }

    for ( i = 0; i < instances; i++ ) {

        doRequest( requestData[currentIteration] );
    }

    return currentIteration++;
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
