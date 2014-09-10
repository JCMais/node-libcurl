var Curl = require( '../lib/Curl' );

var curl = new Curl(),
	url = process.argv[2] || 'http://www.google.com';

//you can use a string as option
curl.setOpt( 'URL', url );
curl.setOpt( 'NOPROGRESS', false );
curl.setOpt( 'VERBOSE', true )

var infoTypes = Curl.info.debug;

curl.setOpt( Curl.option.DEBUGFUNCTION, function( infoType, content ) {

    var text = '';

    switch ( infoType ) {

        case infoTypes.TEXT:
            text = content;
            break;
        case infoTypes.DATA_IN:
            text = 'RECEIVING DATA: ' + content;
            break;
        case infoTypes.DATA_OUT:
            text = 'SENDING DATA: ' + content;
            break;
        case infoTypes.HEADER_IN:
            text = 'RECEIVING HEADER: ' + content;
            break;
        case infoTypes.HEADER_OUT:
            text = 'SENDING HEADER: ' + content;
            break;
        case infoTypes.SSL_DATA_IN:
            text = 'RECEIVING SSL DATA: ' + content;
            break;
        case infoTypes.SSL_DATA_OUT:
            text = 'SENDING SSL DATA: ' + content;
            break;
    }

    console.log( text );

    return 0;

});

curl.setOpt( Curl.option.XFERINFOFUNCTION, function() {

    return 0;
});

curl.on( 'end', function ( statusCode, body, headers ) {

    this.reset();
});

curl.on( 'error', function ( err, curlErrCode ) {

    console.log( err );

    this.close();
});


try {



} catch ( e ) {

    console.log( e );

}
