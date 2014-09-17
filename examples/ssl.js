var Curl = require( '../lib/Curl' ),
    path = require( 'path' );

var curl = new Curl(),
    url  = 'https://www.google.com',
    certfile = path.join( __dirname, 'cacert.pem' );

curl.setOpt( 'URL', url );
curl.setOpt( 'FOLLOWLOCATION', 1 );
curl.setOpt( 'VERBOSE', 1 );

//cURL is not bundled with CA cert anymore
//you need to specify the CA cert to be used, if not, you are
// going to receive the error "Peer certificate cannot be authenticated with given CA certificates"
// more info http://curl.haxx.se/docs/sslcerts.html and http://curl.haxx.se/docs/caextract.html
if ( certfile ) {

    curl.setOpt( Curl.option.CAINFO , certfile );
    //This is not a boolean field! 0 -> Disabled, 2 -> Enabled
    curl.setOpt( 'SSL_VERIFYHOST', 2 );
    curl.setOpt( 'SSL_VERIFYPEER', 1 );

} else {

    curl.setOpt( 'SSL_VERIFYHOST', 0 );
    curl.setOpt( 'SSL_VERIFYPEER', 0 );
}

curl.perform();

curl.on( 'end', curl.close.bind( curl ) );
curl.on( 'error', curl.close.bind( curl ) );
