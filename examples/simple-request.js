var Curl = require( '../lib/Curl' );

var curl = new Curl();

//you can use a string as option
curl.setOpt( 'URL', 'http://www.google.com' );
//or use an already defined constant
curl.setOpt( Curl.option.FOLLOWLOCATION, true );
curl.setOpt( Curl.option.VERBOSE, true );
//keep in mind that if you use an invalid option, a TypeError exception will be thrown

//debug mode
curl.debug = true;

curl.on( 'end', function ( statusCode, body, headers ) {

    console.info( 'Status Code: ', statusCode );
    console.info( 'Headers: ', headers );
    console.info( 'Body: ', body );
});

curl.on( 'error', function ( err, curlErrCode ) {

    console.error( 'Err: ', err );
    console.error( 'Code: ', curlErrCode );
});

curl.perform();
