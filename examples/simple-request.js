var Curl = require( '../lib/Curl' );

var curl = new Curl(),
	url = process.argv[2] || 'http://www.google.com';

//you can use a string as option
curl.setOpt( 'URL', url );
//or use an already defined constant
curl.setOpt( Curl.option.CONNECTTIMEOUT, 5 );
curl.setOpt( Curl.option.FOLLOWLOCATION, true );
curl.setOpt( Curl.option.VERBOSE, true );
//keep in mind that if you use an invalid option, a TypeError exception will be thrown

//debug mode
curl.debug = true;

curl.on( 'end', function ( statusCode, body, headers ) {

    console.info( 'Status Code: ', statusCode );
    console.info( 'Headers: ', headers );
    console.info( 'Body length: ', body.length );
    this.close();
});

curl.on( 'error', function ( err, curlErrCode ) {

    console.error( 'Err: ', err );
    console.error( 'Code: ', curlErrCode );
    this.close();
});


curl.perform();
