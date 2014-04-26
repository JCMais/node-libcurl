var Curl = require( '../lib/Curl' ),
    path = require( 'path' ),
    sites = require( './top-sites' ),
    sitesKeys = Object.keys( sites );

var maxNumberOfConnections = 50,
    running = 0,
    i, j;

function doRequest() {

    var siteKey, siteUrl;

    if ( running >= maxNumberOfConnections )
        return;

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
    curl.setOpt( Curl.option.CAINFO, path.join( __dirname, 'cacert.pem' ) );

    curl.on( 'end', onEnd );
    curl.on( 'error', onError );

    curl.perform();

}

for ( i = 0; i < maxNumberOfConnections; i++ ) {

    doRequest();
}

function onEnd( statusCode ) {

    var siteName = this.getInfo( Curl.info.PRIVATE );

    console.info(
        siteName, ': ', statusCode
    );

    doRequest();

    this.close();
}

function onError( err ) {

    var siteName = this.getInfo( Curl.info.PRIVATE );

    console.error(
        siteName,
        ' - Error: ', err
    );

    doRequest();

    this.close();
}

var delay = 1000;

setTimeout(function once(){

    console.info( 'To be processed: ', sitesKeys.length, ' - Current Instances: ', Curl.getCount() );

    if ( !(sitesKeys.length === 0 && Curl.getCount() === 0) ) {
        setTimeout( once, delay );
    }

}, delay );
