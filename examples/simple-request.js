var Curl = require( '../lib/Curl' );

var curl = new Curl(),
	url = process.argv[2] || 'http://payza.com/';

//you can use a string as option
curl.setOpt( 'URL', url );
//or use an already defined constant
curl.setOpt( Curl.option.CONNECTTIMEOUT, 5 );
curl.setOpt( Curl.option.FOLLOWLOCATION, true );
curl.setOpt( Curl.option.VERBOSE, true );
curl.setOpt( Curl.option.USERAGENT, 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:29.0) Gecko/20100101 Firefox/29.0' );
curl.setOpt( Curl.option.PROTOCOLS, Curl.protocol.HTTPS );
curl.setOpt( Curl.option.CAINFO, require( 'path' ).resolve( __dirname, 'cacert.pem' ) );
curl.setOpt( Curl.option.REDIR_PROTOCOLS, Curl.protocol.HTTPS );
//keep in mind that if you use an invalid option, a TypeError exception will be thrown

//debug mode
curl.debug = true;

curl.on( 'end', function ( statusCode, body, headers ) {

    console.info( 'Status Code: ', statusCode );
    //console.info( 'Headers: ', headers );
    //console.info( 'Body: ', body );
});

curl.on( 'error', function ( err, curlErrCode ) {

    console.error( 'Err: ', err );
    console.error( 'Code: ', curlErrCode );
});

curl.perform();
