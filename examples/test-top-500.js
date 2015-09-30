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

/**
 * This is more or less a stress test.
 * Don't run this multiple times, since you can be temporarily blocked by some hosts.
 */
var path  = require( 'path' ),
    Curl  = require( '../lib/Curl' ),
    sites = require( './top-sites' ),
    sitesKeys = Object.keys( sites );

var maxNumberOfConnections = 100,
    certfile = path.join( __dirname, 'cacert.pem' ),
    running  = 0,
    timeStart = process.hrtime(), timeEnd,
    finished  = false, i;

//start the timing
for ( i = 0; i < maxNumberOfConnections; i++ ) {

    doRequest();
}

function doRequest() {

    var siteKey, siteUrl;

    siteKey = sitesKeys.pop();

    if ( !siteKey ) {
        return;
    }

    siteUrl = sites[siteKey];

    var curl = new Curl();

    curl.siteUrl = siteUrl;
    curl.setOpt( Curl.option.HTTPHEADER, ['Expect:'] );
    curl.setOpt( Curl.option.URL, siteUrl );
    curl.setOpt( Curl.option.FOLLOWLOCATION, 1 );
    curl.setOpt( Curl.option.TIMEOUT, 30 );
    curl.setOpt( Curl.option.USERAGENT, 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:28.0) Gecko/20100101 Firefox/28.0 FirePHP/0.7.4' );
    curl.setOpt( Curl.option.REFERER, 'http://www.google.com' );
    curl.setOpt( Curl.option.AUTOREFERER, true );

    if ( certfile ) {
        curl.setOpt( Curl.option.CAINFO, certfile );
    }

    curl.on( 'end', cb );
    curl.on( 'error', cb );

    ++running;
    curl.perform();

}

function cb( statusOrError ) {

    var siteName = this.siteUrl;

    this.close();
    --running;

    if ( typeof statusOrError !== 'number' ) { //we have an error
        console.error(
            siteName,
            ' - Error: ', statusOrError
        );
    } else {
        console.info(
            siteName, ': ', statusOrError
        );
    }

    if ( running === 0 && !sitesKeys.length ) { //nothing more to process

        finished = true;
        return;

    }

    doRequest();
}

var delay = 1000;

setTimeout( function once() {

    console.info( 'To be processed: ', sitesKeys.length, ' - Current Instances: ', Curl.getCount() );

    if ( finished ) {

        timeEnd = process.hrtime( timeStart );

        console.info( 'Total Time ------------ ', timeEnd[0] + 's', timeEnd[1] / 1e6 + 'ms' );

        return;
    }

    setTimeout( once, delay );

}, delay );
