var Curl = require( '../lib/Curl' ),
    path = require( 'path' ),
    sites = require( './top-sites' ),
    sitesKeys = Object.keys( sites );

var maxNumberOfConnections = 200,
    certfile = path.join( __dirname, 'cacert.pem' );


var running = 0,
    timeStart = process.hrtime(), timeEnd,
    finished = false, i, j;


//start the timing
for ( i = 0; i < maxNumberOfConnections; i++ ) {

    doRequest();
}

function doRequest() {

    var siteKey, siteUrl;

    siteKey = sitesKeys.pop();

    if ( !siteKey )
        return;

    siteUrl = sites[siteKey];

    var curl = new Curl();

    curl.setOpt( Curl.option.HTTPHEADER, [
        'Expect:'
    ]);
    curl.setOpt( Curl.option.URL, siteUrl );
    curl.setOpt( Curl.option.FOLLOWLOCATION, 1 );
    curl.setOpt( Curl.option.PRIVATE, siteUrl );
    curl.setOpt( Curl.option.TIMEOUT, 30 );
    curl.setOpt( Curl.option.USERAGENT, "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:28.0) Gecko/20100101 Firefox/28.0 FirePHP/0.7.4" );
    curl.setOpt( Curl.option.REFERER, 'http://www.google.com' );
    curl.setOpt( Curl.option.AUTOREFERER, true );
    if ( certfile )
        curl.setOpt( Curl.option.CAINFO, certfile );

    curl.on( 'end', cb );
    curl.on( 'error', cb );

    ++running;
    curl.perform();

}

function cb( statusOrError ) {

    var siteName = this.getInfo( Curl.info.PRIVATE );

    this.close();
    --running;

    if ( typeof statusOrError !== "number" ) { //we have an error
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

setTimeout(function once(){

    console.info( 'To be processed: ', sitesKeys.length, ' - Current Instances: ', Curl.getCount() );

    if ( finished ) {

        timeEnd = process.hrtime( timeStart );

        console.info( 'Total Time ------------ ', timeEnd[0] + 's', timeEnd[1] / 1e6 + 'ms' );

        return;
    }

    setTimeout( once, delay );

}, delay );
